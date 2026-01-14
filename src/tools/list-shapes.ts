import * as fs from "fs/promises";
import type { ToolResponse } from "../types.js";
import { resolvePath } from "../utils/path-resolver.js";
import { unescapeXml } from "../utils/xml-helpers.js";

export const listShapesTool = {
  name: "list_shapes",
  description: "List all shapes in a diagram with their IDs, types, and text",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description: "Path to the diagram file",
      },
    },
    required: ["filepath"],
  },
};

export async function listShapes(filepath: string): Promise<ToolResponse> {
  const resolvedPath = resolvePath(filepath);
  const content = await fs.readFile(resolvedPath, "utf-8");
  const shapes: Array<{
    id: string;
    type: string;
    text: string;
    position: string;
  }> = [];

  const cellRegex =
    /<mxCell[^>]*id="([^"]*)"[^>]*value="([^"]*)"[^>]*style="([^"]*)"[^>]*vertex="1"[^>]*>[\s\S]*?<mxGeometry[^>]*x="([^"]*)"[^>]*y="([^"]*)"[^>]*\/>/g;

  let match;
  while ((match = cellRegex.exec(content)) !== null) {
    const [, id, value, style, x, y] = match;

    let shapeType = "rectangle";
    if (style.includes("ellipse")) shapeType = "ellipse";
    else if (style.includes("rhombus")) shapeType = "rhombus";
    else if (style.includes("cylinder")) shapeType = "cylinder";
    else if (style.includes("hexagon")) shapeType = "hexagon";
    else if (style.includes("cloud")) shapeType = "cloud";
    else if (style.includes("parallelogram")) shapeType = "parallelogram";
    else if (style.includes("trapezoid")) shapeType = "trapezoid";
    else if (style.includes("triangle")) shapeType = "triangle";

    shapes.push({
      id,
      type: shapeType,
      text: unescapeXml(value),
      position: `(${x}, ${y})`,
    });
  }

  const shapeList = shapes
    .map(
      (s) =>
        `- ID: ${s.id}, Type: ${s.type}, Text: "${s.text}", Position: ${s.position}`
    )
    .join("\n");

  return {
    content: [
      {
        type: "text",
        text: `Shapes in diagram:\n\n${shapeList || "No shapes found"}`,
      },
    ],
  };
}
