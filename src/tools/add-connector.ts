import * as fs from "fs/promises";
import type { ToolResponse, ConnectorStyle } from "../types.js";
import { resolvePath } from "../utils/path-resolver.js";
import { escapeXml } from "../utils/xml-helpers.js";
import { getConnectorStyle } from "../utils/style-generator.js";

let nextId = 2; // Start from 2 (0 and 1 are reserved for root cells)

export const addConnectorTool = {
  name: "add_connector",
  description: "Add a connector/arrow between two shapes in a diagram",
  inputSchema: {
    type: "object",
    properties: {
      filepath: {
        type: "string",
        description: "Path to the diagram file",
      },
      sourceId: {
        type: "string",
        description: "ID of the source shape",
      },
      targetId: {
        type: "string",
        description: "ID of the target shape",
      },
      label: {
        type: "string",
        description: "Label text for the connector (optional)",
      },
      style: {
        type: "string",
        description: "Connector style: straight, curved, orthogonal (default: orthogonal)",
        enum: ["straight", "curved", "orthogonal"],
      },
    },
    required: ["filepath", "sourceId", "targetId"],
  },
};

export async function addConnector(
  filepath: string,
  sourceId: string,
  targetId: string,
  label = "",
  style: ConnectorStyle = "orthogonal"
): Promise<ToolResponse> {
  const resolvedPath = resolvePath(filepath);
  const content = await fs.readFile(resolvedPath, "utf-8");
  const connectorId = `connector_${nextId++}`;
  const connectorStyle = getConnectorStyle(style);

  const connectorXml = `        <mxCell id="${connectorId}" value="${escapeXml(label)}" style="${connectorStyle}" edge="1" parent="1" source="${sourceId}" target="${targetId}">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>`;

  const updatedContent = content.replace(
    "</root>",
    `${connectorXml}\n      </root>`
  );

  await fs.writeFile(resolvedPath, updatedContent, "utf-8");

  return {
    content: [
      {
        type: "text",
        text: `Added connector from ${sourceId} to ${targetId} with ID: ${connectorId}`,
      },
    ],
  };
}
