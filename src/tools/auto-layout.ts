import * as fs from "fs/promises";
import type { ToolResponse } from "../types.js";
import { resolvePath } from "../utils/path-resolver.js";
import { parseDiagram, updateShapePositions } from "../utils/diagram-parser.js";
import { gridLayout, flowchartLayout } from "../utils/layout-algorithms.js";

export const autoLayoutTool = {
  name: "auto_layout",
  description:
    "Automatically arrange shapes in a Draw.io diagram. Uses current positions as hints for ordering. Supports grid layout for simple arrangements and flowchart layout (with swim lanes for parallel paths) for connected diagrams.",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description: "Path to the diagram file",
      },
      layout: {
        type: "string",
        description:
          "Layout algorithm: 'grid' for simple grid arrangement, 'flowchart-vertical' for top-to-bottom flow, 'flowchart-horizontal' for left-to-right flow",
        enum: ["grid", "flowchart-vertical", "flowchart-horizontal"],
      },
      spacing: {
        type: "number",
        description: "Space between shapes in pixels (default: 50)",
      },
      startX: {
        type: "number",
        description: "Starting X coordinate (default: 50)",
      },
      startY: {
        type: "number",
        description: "Starting Y coordinate (default: 50)",
      },
    },
    required: ["filepath", "layout"],
  },
};

export type LayoutType = "grid" | "flowchart-vertical" | "flowchart-horizontal";

export async function autoLayout(
  filepath: string,
  layout: LayoutType,
  spacing = 50,
  startX = 50,
  startY = 50
): Promise<ToolResponse> {
  const resolvedPath = resolvePath(filepath);
  const content = await fs.readFile(resolvedPath, "utf-8");

  // Parse the diagram
  const graph = parseDiagram(content);

  if (graph.shapes.size === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No shapes found in the diagram to layout.",
        },
      ],
    };
  }

  const options = { spacing, startX, startY };

  // Apply the selected layout algorithm
  let newPositions;
  let layoutDescription: string;

  switch (layout) {
    case "grid":
      newPositions = gridLayout(graph, options);
      layoutDescription = "grid";
      break;
    case "flowchart-vertical":
      newPositions = flowchartLayout(graph, options, "vertical");
      layoutDescription = "vertical flowchart";
      break;
    case "flowchart-horizontal":
      newPositions = flowchartLayout(graph, options, "horizontal");
      layoutDescription = "horizontal flowchart";
      break;
    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown layout type: ${layout}`,
          },
        ],
        isError: true,
      };
  }

  // Update the XML with new positions
  const updatedContent = updateShapePositions(content, newPositions);

  // Write back to file
  await fs.writeFile(resolvedPath, updatedContent, "utf-8");

  // Build summary
  const shapeCount = graph.shapes.size;
  const edgeCount = graph.edges.length;

  return {
    content: [
      {
        type: "text",
        text: `Applied ${layoutDescription} layout to ${shapeCount} shapes${edgeCount > 0 ? ` with ${edgeCount} connectors` : ""}. Shapes have been repositioned.`,
      },
    ],
  };
}
