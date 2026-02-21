/**
 * Layout algorithms for auto-arranging Draw.io diagrams
 */

import type { DiagramGraph, ParsedShape } from "./diagram-parser.js";

export interface LayoutOptions {
  spacing: number;
  startX: number;
  startY: number;
}

export type LayoutResult = Map<string, { x: number; y: number; width?: number; height?: number }>;

/**
 * Grid Layout: Arrange shapes in a grid pattern
 * Uses current positions as hints for ordering (top-to-bottom, left-to-right)
 */
export function gridLayout(
  graph: DiagramGraph,
  options: LayoutOptions
): LayoutResult {
  const { spacing, startX, startY } = options;
  const positions: LayoutResult = new Map();

  // Get shapes sorted by current position (top-to-bottom, left-to-right)
  const shapes = Array.from(graph.shapes.values());
  shapes.sort((a, b) => {
    // Primary sort by Y (top to bottom), secondary by X (left to right)
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > 50) return yDiff; // Threshold for "same row"
    return a.x - b.x;
  });

  // Calculate optimal columns (roughly square grid)
  const columns = Math.ceil(Math.sqrt(shapes.length));
  const rows = Math.ceil(shapes.length / columns);

  // Calculate per-column widths and per-row heights so shapes of different
  // sizes never overlap regardless of content length.
  const colWidths: number[] = new Array(columns).fill(0);
  const rowHeights: number[] = new Array(rows).fill(0);

  shapes.forEach((shape, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    colWidths[col] = Math.max(colWidths[col], shape.width);
    rowHeights[row] = Math.max(rowHeights[row], shape.height);
  });

  // Build cumulative offsets for each column and row
  const colOffsets: number[] = new Array(columns).fill(0);
  for (let c = 1; c < columns; c++) {
    colOffsets[c] = colOffsets[c - 1] + colWidths[c - 1] + spacing;
  }
  const rowOffsets: number[] = new Array(rows).fill(0);
  for (let r = 1; r < rows; r++) {
    rowOffsets[r] = rowOffsets[r - 1] + rowHeights[r - 1] + spacing;
  }

  // Position shapes in grid, and enforce uniform row height / column width
  // so every cell in the same row is the same height and every cell in the
  // same column is the same width (matching the tallest/widest peer).
  shapes.forEach((shape, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;

    positions.set(shape.id, {
      x: startX + colOffsets[col],
      y: startY + rowOffsets[row],
      width: colWidths[col],
      height: rowHeights[row],
    });
  });

  return positions;
}

/**
 * Flowchart Layout: Arrange shapes based on connector relationships
 * Supports swim lanes for parallel paths
 * Uses current positions as hints for ordering within levels
 */
export function flowchartLayout(
  graph: DiagramGraph,
  options: LayoutOptions,
  direction: "vertical" | "horizontal" = "vertical"
): LayoutResult {
  const { spacing, startX, startY } = options;
  const positions: LayoutResult = new Map();

  const shapes = graph.shapes;
  const { outgoing, incoming } = graph;

  if (shapes.size === 0) return positions;

  // Step 1: Find root nodes (no incoming edges, or lowest Y position if all have incoming)
  let roots: string[] = [];
  for (const [id] of shapes) {
    const incomingEdges = incoming.get(id) || [];
    if (incomingEdges.length === 0) {
      roots.push(id);
    }
  }

  // If no clear roots, use position hints (topmost/leftmost shapes)
  if (roots.length === 0) {
    const shapeList = Array.from(shapes.values());
    if (direction === "vertical") {
      shapeList.sort((a, b) => a.y - b.y);
    } else {
      shapeList.sort((a, b) => a.x - b.x);
    }
    roots = [shapeList[0].id];
  }

  // Sort roots by position hint
  roots.sort((a, b) => {
    const shapeA = shapes.get(a)!;
    const shapeB = shapes.get(b)!;
    return direction === "vertical"
      ? shapeA.x - shapeB.x
      : shapeA.y - shapeB.y;
  });

  // Step 2: Assign levels using BFS (handles cycles by tracking visited)
  const levels = new Map<string, number>();
  const swimLanes = new Map<string, number>(); // Track parallel paths
  const visited = new Set<string>();
  const queue: Array<{ id: string; level: number; lane: number }> = [];

  // Initialize with roots
  roots.forEach((rootId, laneIndex) => {
    queue.push({ id: rootId, level: 0, lane: laneIndex });
  });

  while (queue.length > 0) {
    const { id, level, lane } = queue.shift()!;

    if (visited.has(id)) {
      // Already visited - might need to update level if this path is longer
      const existingLevel = levels.get(id) || 0;
      if (level > existingLevel) {
        levels.set(id, level);
      }
      continue;
    }

    visited.add(id);
    levels.set(id, level);
    swimLanes.set(id, lane);

    // Process children
    const children = outgoing.get(id) || [];

    // Sort children by position hint
    const sortedChildren = [...children].sort((a, b) => {
      const shapeA = shapes.get(a);
      const shapeB = shapes.get(b);
      if (!shapeA || !shapeB) return 0;
      return direction === "vertical"
        ? shapeA.x - shapeB.x
        : shapeA.y - shapeB.y;
    });

    // Assign swim lanes to children
    sortedChildren.forEach((childId, index) => {
      // If multiple children, they get different swim lanes (parallel paths)
      const childLane =
        sortedChildren.length > 1 ? lane + index : lane;
      queue.push({ id: childId, level: level + 1, lane: childLane });
    });
  }

  // Handle any disconnected shapes (not reachable from roots)
  for (const [id] of shapes) {
    if (!visited.has(id)) {
      const shape = shapes.get(id)!;
      // Place disconnected shapes at the end, use their position as hint
      const maxLevel = Math.max(...Array.from(levels.values()), 0);
      levels.set(id, maxLevel + 1);
      swimLanes.set(id, 0);
    }
  }

  // Step 3: Group shapes by level
  const levelGroups = new Map<number, ParsedShape[]>();
  for (const [id, level] of levels) {
    const shape = shapes.get(id)!;
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(shape);
  }

  // Step 4: Sort shapes within each level by swim lane, then by position hint
  for (const [, group] of levelGroups) {
    group.sort((a, b) => {
      const laneA = swimLanes.get(a.id) || 0;
      const laneB = swimLanes.get(b.id) || 0;
      if (laneA !== laneB) return laneA - laneB;
      // Within same lane, use position hint
      return direction === "vertical" ? a.x - b.x : a.y - b.y;
    });
  }

  // Step 5: Calculate positions
  const sortedLevels = Array.from(levelGroups.keys()).sort((a, b) => a - b);

  // Find the maximum number of shapes at any level (widest level)
  // Use this to scale cross-axis spacing so connectors can route around shapes
  let maxShapesAtLevel = 1;
  for (const group of levelGroups.values()) {
    maxShapesAtLevel = Math.max(maxShapesAtLevel, group.length);
  }

  // Increase spacing when there are parallel paths to give connectors room
  const parallelSpacingMultiplier = maxShapesAtLevel > 2 ? 1.5 : 1;
  const effectiveSpacing = spacing * parallelSpacingMultiplier;
  const verticalSpacingMultiplier = maxShapesAtLevel > 2 ? 1.3 : 1;
  const effectiveVerticalSpacing = spacing * verticalSpacingMultiplier;

  // Per-level dimensions: each level's height/width is determined by the
  // tallest/widest shape in that level. This guarantees no cross-level overlap.
  const levelMainSize = new Map<number, number>(); // height (vertical) or width (horizontal)
  const levelCrossSize = new Map<number, number>(); // width (vertical) or height (horizontal)
  for (const level of sortedLevels) {
    const group = levelGroups.get(level)!;
    let mainMax = 0;
    let crossMax = 0;
    for (const shape of group) {
      if (direction === "vertical") {
        mainMax = Math.max(mainMax, shape.height);
        crossMax = Math.max(crossMax, shape.width);
      } else {
        mainMax = Math.max(mainMax, shape.width);
        crossMax = Math.max(crossMax, shape.height);
      }
    }
    levelMainSize.set(level, mainMax);
    levelCrossSize.set(level, crossMax);
  }

  // Build cumulative main-axis offsets so each level starts after the
  // previous one's tallest/widest shape plus spacing.
  const levelMainOffset = new Map<number, number>();
  let cumulativeMain = 0;
  for (const level of sortedLevels) {
    levelMainOffset.set(level, cumulativeMain);
    cumulativeMain += (levelMainSize.get(level) ?? 0) + effectiveVerticalSpacing;
  }

  for (const level of sortedLevels) {
    const group = levelGroups.get(level)!;
    const crossSize = levelCrossSize.get(level) ?? 0;
    const groupCrossExtent = group.length * (crossSize + effectiveSpacing) - effectiveSpacing;
    const mainOffset = levelMainOffset.get(level) ?? 0;

    // All shapes in the same level share the same main-axis size so they
    // align neatly (uniform row height for vertical, uniform column width
    // for horizontal).
    const uniformMainSize = levelMainSize.get(level) ?? 0;

    group.forEach((shape, index) => {
      if (direction === "vertical") {
        // Center the group horizontally
        const groupStartX = startX + (groupCrossExtent > 0 ? -groupCrossExtent / 2 + crossSize / 2 : 0);
        positions.set(shape.id, {
          x: groupStartX + index * (crossSize + effectiveSpacing),
          y: startY + mainOffset,
          width: crossSize,
          height: uniformMainSize,
        });
      } else {
        // Center the group vertically
        const groupStartY = startY + (groupCrossExtent > 0 ? -groupCrossExtent / 2 + crossSize / 2 : 0);
        positions.set(shape.id, {
          x: startX + mainOffset,
          y: groupStartY + index * (crossSize + effectiveSpacing),
          width: uniformMainSize,
          height: crossSize,
        });
      }
    });
  }

  // Step 6: Normalize positions (ensure no negative coordinates)
  let minX = Infinity;
  let minY = Infinity;
  for (const pos of positions.values()) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
  }

  if (minX < startX || minY < startY) {
    const offsetX = minX < startX ? startX - minX : 0;
    const offsetY = minY < startY ? startY - minY : 0;
    for (const [id, pos] of positions) {
      positions.set(id, {
        x: pos.x + offsetX,
        y: pos.y + offsetY,
      });
    }
  }

  return positions;
}
