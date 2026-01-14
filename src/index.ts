#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";

interface Shape {
  id: string;
  value: string;
  style: string;
  vertex: string;
  parent: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface Edge {
  id: string;
  value: string;
  style: string;
  edge: string;
  parent: string;
  source: string;
  target: string;
}

class DrawioMCPServer {
  private server: Server;
  private nextId: number = 2;

  constructor() {
    this.server = new Server(
      {
        name: "draw-io-mcp",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "create_diagram",
          description: "Create a new Draw.io diagram file",
          inputSchema: {
            type: "object",
            properties: {
              filepath: {
                type: "string",
                description: "Path where the diagram file should be saved (must end with .drawio)",
              },
              title: {
                type: "string",
                description: "Title/name of the diagram",
              },
            },
            required: ["filepath", "title"],
          },
        },
        {
          name: "add_shape",
          description: "Add a shape (rectangle, ellipse, etc.) to a diagram",
          inputSchema: {
            type: "object",
            properties: {
              filepath: {
                type: "string",
                description: "Path to the diagram file",
              },
              shapeType: {
                type: "string",
                description: "Type of shape: rectangle, ellipse, rhombus, cylinder, hexagon, cloud, step, parallelogram, trapezoid, triangle",
                enum: ["rectangle", "ellipse", "rhombus", "cylinder", "hexagon", "cloud", "step", "parallelogram", "trapezoid", "triangle"],
              },
              text: {
                type: "string",
                description: "Text to display in the shape",
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
                description: "Width of the shape (default: 120)",
              },
              height: {
                type: "number",
                description: "Height of the shape (default: 60)",
              },
              fillColor: {
                type: "string",
                description: "Fill color in hex format (e.g., #dae8fc, default: #dae8fc)",
              },
              strokeColor: {
                type: "string",
                description: "Stroke/border color in hex format (e.g., #6c8ebf, default: #6c8ebf)",
              },
            },
            required: ["filepath", "shapeType", "text"],
          },
        },
        {
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
        },
        {
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
        },
        {
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
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error("No arguments provided");
      }

      try {
        switch (name) {
          case "create_diagram":
            return await this.createDiagram(
              args.filepath as string,
              args.title as string
            );

          case "add_shape":
            return await this.addShape(
              args.filepath as string,
              args.shapeType as string,
              args.text as string,
              args.x as number | undefined,
              args.y as number | undefined,
              args.width as number | undefined,
              args.height as number | undefined,
              args.fillColor as string | undefined,
              args.strokeColor as string | undefined
            );

          case "add_connector":
            return await this.addConnector(
              args.filepath as string,
              args.sourceId as string,
              args.targetId as string,
              args.label as string | undefined,
              args.style as string | undefined
            );

          case "read_diagram":
            return await this.readDiagram(args.filepath as string);

          case "list_shapes":
            return await this.listShapes(args.filepath as string);

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
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getShapeStyle(shapeType: string, fillColor = "#dae8fc", strokeColor = "#6c8ebf"): string {
    const baseStyles: Record<string, string> = {
      rectangle: "rounded=0",
      ellipse: "ellipse",
      rhombus: "rhombus",
      cylinder: "shape=cylinder3",
      hexagon: "shape=hexagon",
      cloud: "ellipse;shape=cloud",
      step: "shape=step",
      parallelogram: "shape=parallelogram",
      trapezoid: "shape=trapezoid",
      triangle: "triangle",
    };

    const baseStyle = baseStyles[shapeType] || "rounded=0";
    return `${baseStyle};whiteSpace=wrap;html=1;fillColor=${fillColor};strokeColor=${strokeColor};`;
  }

  private getConnectorStyle(style = "orthogonal"): string {
    const styles: Record<string, string> = {
      straight: "edgeStyle=none",
      curved: "edgeStyle=none;curved=1",
      orthogonal: "edgeStyle=orthogonalEdgeStyle",
    };

    const edgeStyle = styles[style] || styles.orthogonal;
    return `${edgeStyle};rounded=0;orthogonalLoop=1;jettySize=auto;html=1;`;
  }

  private async createDiagram(filepath: string, title: string) {
    if (!filepath.endsWith(".drawio")) {
      throw new Error("Filepath must end with .drawio");
    }

    const diagram = `<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="draw-io-mcp" version="1.0.0" type="device">
  <diagram name="${this.escapeXml(title)}" id="diagram1">
    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, diagram, "utf-8");

    return {
      content: [
        {
          type: "text",
          text: `Created diagram at ${filepath}`,
        },
      ],
    };
  }

  private async addShape(
    filepath: string,
    shapeType: string,
    text: string,
    x = 100,
    y = 100,
    width = 120,
    height = 60,
    fillColor = "#dae8fc",
    strokeColor = "#6c8ebf"
  ) {
    const content = await fs.readFile(filepath, "utf-8");
    const shapeId = `shape_${this.nextId++}`;
    const style = this.getShapeStyle(shapeType, fillColor, strokeColor);

    const shapeXml = `        <mxCell id="${shapeId}" value="${this.escapeXml(text)}" style="${style}" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry" />
        </mxCell>`;

    const updatedContent = content.replace(
      "</root>",
      `${shapeXml}\n      </root>`
    );

    await fs.writeFile(filepath, updatedContent, "utf-8");

    return {
      content: [
        {
          type: "text",
          text: `Added ${shapeType} shape with ID: ${shapeId} at position (${x}, ${y})`,
        },
      ],
    };
  }

  private async addConnector(
    filepath: string,
    sourceId: string,
    targetId: string,
    label = "",
    style = "orthogonal"
  ) {
    const content = await fs.readFile(filepath, "utf-8");
    const connectorId = `connector_${this.nextId++}`;
    const connectorStyle = this.getConnectorStyle(style);

    const connectorXml = `        <mxCell id="${connectorId}" value="${this.escapeXml(label)}" style="${connectorStyle}" edge="1" parent="1" source="${sourceId}" target="${targetId}">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>`;

    const updatedContent = content.replace(
      "</root>",
      `${connectorXml}\n      </root>`
    );

    await fs.writeFile(filepath, updatedContent, "utf-8");

    return {
      content: [
        {
          type: "text",
          text: `Added connector from ${sourceId} to ${targetId} with ID: ${connectorId}`,
        },
      ],
    };
  }

  private async readDiagram(filepath: string) {
    const content = await fs.readFile(filepath, "utf-8");

    return {
      content: [
        {
          type: "text",
          text: `Diagram contents:\n\n${content}`,
        },
      ],
    };
  }

  private async listShapes(filepath: string) {
    const content = await fs.readFile(filepath, "utf-8");
    const shapes: Array<{ id: string; type: string; text: string; position: string }> = [];

    const cellRegex = /<mxCell[^>]*id="([^"]*)"[^>]*value="([^"]*)"[^>]*style="([^"]*)"[^>]*vertex="1"[^>]*>[\s\S]*?<mxGeometry[^>]*x="([^"]*)"[^>]*y="([^"]*)"[^>]*\/>/g;

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
        text: this.unescapeXml(value),
        position: `(${x}, ${y})`,
      });
    }

    const shapeList = shapes.map(s => `- ID: ${s.id}, Type: ${s.type}, Text: "${s.text}", Position: ${s.position}`).join("\n");

    return {
      content: [
        {
          type: "text",
          text: `Shapes in diagram:\n\n${shapeList || "No shapes found"}`,
        },
      ],
    };
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private unescapeXml(text: string): string {
    return text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&");
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Draw.io MCP Server running on stdio");
  }
}

const server = new DrawioMCPServer();
server.run().catch(console.error);
