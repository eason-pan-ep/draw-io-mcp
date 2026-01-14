import * as fs from "fs/promises";
import * as path from "path";
import type { ToolResponse } from "../types.js";
import { resolvePath } from "../utils/path-resolver.js";
import { escapeXml } from "../utils/xml-helpers.js";

export const createDiagramTool = {
  name: "create_diagram",
  description: "Create a new Draw.io diagram file",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description:
          "Path where the diagram file should be saved (must end with .drawio)",
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

  // Make it very clear where the file was saved (user's machine, not Claude's)
  const locationHint = resolvedPath.includes("/Desktop/")
    ? " (saved to your Desktop)"
    : "";

  return {
    content: [
      {
        type: "text",
        text: `Created diagram at: ${resolvedPath}${locationHint}\n\nThis file is on YOUR computer and can be opened with Draw.io (https://app.diagrams.net)`,
      },
    ],
  };
}
