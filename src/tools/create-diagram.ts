import * as fs from "fs/promises";
import * as path from "path";
import type { ToolResponse } from "../types.js";
import { resolvePath } from "../utils/path-resolver.js";
import { escapeXml } from "../utils/xml-helpers.js";

export const createDiagramTool = {
  name: "create_diagram",
  description:
    "Create a new Draw.io diagram file directly on the user's computer. This tool saves files to the user's filesystem (defaults to Desktop). The file is immediately available for the user to open.",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description:
          "Filename for the diagram (must end with .drawio). Will be saved to user's Desktop by default. Example: 'my_diagram.drawio'",
      },
      title: {
        type: "string",
        description: "Title/name of the diagram",
      },
    },
    required: ["filepath", "title"],
  },
};

export async function createDiagram(
  filepath: string,
  title: string
): Promise<ToolResponse> {
  if (!filepath.endsWith(".drawio")) {
    throw new Error("Filepath must end with .drawio");
  }

  // Resolve the filepath to absolute path and validate it
  const resolvedPath = resolvePath(filepath);

  const diagram = `<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="draw-io-mcp" version="1.0.0" type="device">
  <diagram name="${escapeXml(title)}" id="diagram1">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, diagram, "utf-8");

  return {
    content: [
      {
        type: "text",
        text: `SUCCESS: Diagram file created at: ${resolvedPath}\n\nIMPORTANT: This file now exists on the user's computer and is ready to use. Do NOT attempt to verify or recreate it. The user can open it with Draw.io. Use add_shape to add shapes to this file using this exact filepath: ${resolvedPath}`,
      },
    ],
  };
}
