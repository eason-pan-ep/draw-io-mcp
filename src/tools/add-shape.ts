import * as fs from "fs/promises";
import type { ToolResponse, ShapeType } from "../types.js";
import { resolvePath } from "../utils/path-resolver.js";
import { escapeXml } from "../utils/xml-helpers.js";
import { getShapeStyle } from "../utils/style-generator.js";
import { calculateShapeDimensions } from "../utils/text-sizing.js";

let nextId = 2; // Start from 2 (0 and 1 are reserved for root cells)

export const addShapeTool = {
  name: "add_shape",
  description:
    "Add a shape to an existing Draw.io diagram on the user's computer. Use the exact filepath returned by create_diagram. Supports multi-line text using newline characters (\\n). Shape dimensions are automatically calculated to fit the text content if not explicitly provided.",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description:
          "Exact filepath to the diagram file (use the path returned by create_diagram)",
      },
      shapeType: {
        type: "string",
        description:
          "Type of shape: rectangle, ellipse, rhombus, cylinder, hexagon, cloud, step, parallelogram, trapezoid, triangle",
        enum: [
          "rectangle",
          "ellipse",
          "rhombus",
          "cylinder",
          "hexagon",
          "cloud",
          "step",
          "parallelogram",
          "trapezoid",
          "triangle",
        ],
      },
      text: {
        type: "string",
        description:
          "Text to display in the shape. Use \\n for line breaks (e.g., 'ClassName\\n---\\n+ method(): void')",
      },
      x: {
        type: "number",
        description: "X coordinate position (default: 100)",
      },
      y: {
        type: "number",
        description: "Y coordinate position (default: 100)",
      },
      width: {
        type: "number",
        description: "Width of the shape (auto-calculated to fit text if not provided)",
      },
      height: {
        type: "number",
        description: "Height of the shape (auto-calculated to fit text if not provided)",
      },
      fillColor: {
        type: "string",
        description: "Fill color in hex format (e.g., #dae8fc, default: #dae8fc)",
      },
      strokeColor: {
        type: "string",
        description:
          "Stroke/border color in hex format (e.g., #6c8ebf, default: #6c8ebf)",
      },
    },
    required: ["filepath", "shapeType", "text"],
  },
};

export async function addShape(
  filepath: string,
  shapeType: ShapeType,
  text: string,
  x = 100,
  y = 100,
  width?: number,
  height?: number,
  fillColor = "#dae8fc",
  strokeColor = "#6c8ebf"
): Promise<ToolResponse> {
  const resolvedPath = resolvePath(filepath);
  const content = await fs.readFile(resolvedPath, "utf-8");
  const shapeId = `shape_${nextId++}`;
  const style = getShapeStyle(shapeType, fillColor, strokeColor);

  // Auto-calculate dimensions based on text content if not provided
  const dimensions = calculateShapeDimensions(text, width, height, shapeType);
  const finalWidth = dimensions.width;
  const finalHeight = dimensions.height;

  const shapeXml = `        <mxCell id="${shapeId}" value="${escapeXml(text)}" style="${style}" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${finalWidth}" height="${finalHeight}" as="geometry" />
        </mxCell>`;

  const updatedContent = content.replace(
    "</root>",
    `${shapeXml}\n      </root>`
  );

  await fs.writeFile(resolvedPath, updatedContent, "utf-8");

  // Recommended gap between shapes so callers can easily position the next shape
  const GAP = 30;
  const nextRight = x + finalWidth + GAP;
  const nextBelow = y + finalHeight + GAP;

  return {
    content: [
      {
        type: "text",
        text: `Added ${shapeType} shape with ID: ${shapeId} at position (${x}, ${y}) with dimensions ${finalWidth}x${finalHeight}. Next shape positions (with ${GAP}px gap): right → x=${nextRight}, y=${y} | below → x=${x}, y=${nextBelow}`,
      },
    ],
  };
}
