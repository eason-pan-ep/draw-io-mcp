import { createDiagramTool, createDiagram } from "./create-diagram.js";
import { addShapeTool, addShape } from "./add-shape.js";
import { addConnectorTool, addConnector } from "./add-connector.js";
import { readDiagramTool, readDiagram } from "./read-diagram.js";
import { listShapesTool, listShapes } from "./list-shapes.js";

/**
 * Registry of all available tools with their definitions and handlers.
 */
export const toolRegistry = {
  create_diagram: {
    definition: createDiagramTool,
    handler: createDiagram,
  },
  add_shape: {
    definition: addShapeTool,
    handler: addShape,
  },
  add_connector: {
    definition: addConnectorTool,
    handler: addConnector,
  },
  read_diagram: {
    definition: readDiagramTool,
    handler: readDiagram,
  },
  list_shapes: {
    definition: listShapesTool,
    handler: listShapes,
  },
};

/**
 * Get array of all tool definitions for ListTools handler.
 */
export function getAllToolDefinitions() {
  return Object.values(toolRegistry).map((tool) => tool.definition);
}

/**
 * Execute a tool by name with given arguments.
 */
export async function executeTool(name: string, args: any) {
  const tool = toolRegistry[name as keyof typeof toolRegistry];

  if (!tool) {
    return {
      content: [
        {
          type: "text",
          text: `Unknown tool: ${name}`,
        },
      ],
    };
  }

  // Route to the appropriate handler based on tool name
  switch (name) {
    case "create_diagram":
      return await createDiagram(args.filepath, args.title);

    case "add_shape":
      return await addShape(
        args.filepath,
        args.shapeType,
        args.text,
        args.x,
        args.y,
        args.width,
        args.height,
        args.fillColor,
        args.strokeColor
      );

    case "add_connector":
      return await addConnector(
        args.filepath,
        args.sourceId,
        args.targetId,
        args.label,
        args.style
      );

    case "read_diagram":
      return await readDiagram(args.filepath);

    case "list_shapes":
      return await listShapes(args.filepath);

    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}`,
          },
        ],
      };
  }
}
