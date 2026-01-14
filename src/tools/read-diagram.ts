import * as fs from "fs/promises";
import type { ToolResponse } from "../types.js";
import { resolvePath } from "../utils/path-resolver.js";

export const readDiagramTool = {
  name: "read_diagram",
  description: "Read and parse a Draw.io diagram file to see its contents and structure",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description: "Path to the diagram file to read",
      },
    },
    required: ["filepath"],
  },
};

export async function readDiagram(filepath: string): Promise<ToolResponse> {
  const resolvedPath = resolvePath(filepath);
  const content = await fs.readFile(resolvedPath, "utf-8");

  return {
    content: [
      {
        type: "text",
        text: `Diagram contents:\n\n${content}`,
      },
    ],
  };
}
