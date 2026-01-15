/**
 * Layout algorithms for auto-arranging Draw.io diagrams
 */

import type { DiagramGraph, ParsedShape } from "./diagram-parser.js";

export interface LayoutOptions {
  spacing: number;
  startX: number;
  startY: number;
}

export type LayoutResult = Map<string, { x: number; y: number }>;

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

  // Find max dimensions for uniform spacing
  let maxWidth = 0;
  let maxHeight = 0;
  for (const shape of shapes) {
    maxWidth = Math.max(maxWidth, shape.width);
    maxHeight = Math.max(maxHeight, shape.height);
  }

  // Position shapes in grid
  shapes.forEach((shape, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;

    positions.set(shape.id, {
      x: startX + col * (maxWidth + spacing),
      y: startY + row * (maxHeight + spacing),
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

  // Find max dimensions
  let maxWidth = 0;
  let maxHeight = 0;
  for (const shape of shapes.values()) {
    maxWidth = Math.max(maxWidth, shape.width);
    maxHeight = Math.max(maxHeight, shape.height);
  }

  // Find the maximum number of shapes at any level (widest level)
  // Use this to scale horizontal spacing so connectors can route around shapes
  let maxShapesAtLevel = 1;
  for (const group of levelGroups.values()) {
    maxShapesAtLevel = Math.max(maxShapesAtLevel, group.length);
  }

  // Increase spacing when there are parallel paths to give connectors room
  // Add extra space proportional to the number of parallel shapes
  const parallelSpacingMultiplier = maxShapesAtLevel > 2 ? 1.5 : 1;
  const effectiveSpacing = spacing * parallelSpacingMultiplier;

  // Also increase vertical spacing when there are many parallel paths
  // This gives orthogonal connectors more room to route
  const verticalSpacingMultiplier = maxShapesAtLevel > 2 ? 1.3 : 1;
  const effectiveVerticalSpacing = spacing * verticalSpacingMultiplier;

  for (const level of sortedLevels) {
    const group = levelGroups.get(level)!;
    const groupWidth = group.length * (maxWidth + effectiveSpacing) - effectiveSpacing;

    group.forEach((shape, index) => {
      // For parallel paths (3+ shapes at same level), stagger vertically
      // Outer shapes are higher, middle shapes are lower
      // This helps orthogonal connectors route around shapes when converging
      let staggerOffset = 0;
      if (group.length >= 3) {
        const middleIndex = (group.length - 1) / 2;
        const distanceFromMiddle = Math.abs(index - middleIndex);
        // Outer shapes get negative offset (higher up), middle stays at base level
        staggerOffset = (middleIndex - distanceFromMiddle) * (maxHeight * 0.4);
      }

      if (direction === "vertical") {
        // Center the group horizontally
        const groupStartX = startX + (groupWidth > 0 ? -groupWidth / 2 + maxWidth / 2 : 0);
        positions.set(shape.id, {
          x: groupStartX + index * (maxWidth + effectiveSpacing),
          y: startY + level * (maxHeight + effectiveVerticalSpacing) + staggerOffset,
        });
      } else {
        // Center the group vertically
        const groupStartY = startY + (groupWidth > 0 ? -groupWidth / 2 + maxHeight / 2 : 0);
        positions.set(shape.id, {
          x: startX + level * (maxWidth + effectiveVerticalSpacing) + staggerOffset,
          y: groupStartY + index * (maxHeight + effectiveSpacing),
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
