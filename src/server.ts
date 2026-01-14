import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getAllToolDefinitions, executeTool } from "./tools/index.js";

/**
 * DrawioMCPServer class handles MCP protocol communication
 * and delegates tool execution to the tool registry.
 */
export class DrawioMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "draw-io-mcp",
        version: "1.0.2",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Set up MCP request handlers for ListTools and CallTool.
   */
  private setupHandlers() {
    // Handle ListTools request - returns all available tool definitions
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: getAllToolDefinitions(),
    }));

    // Handle CallTool request - executes the requested tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args) {
        throw new Error("No arguments provided");
      }

      try {
        return await executeTool(name, args);
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

  /**
   * Start the MCP server and connect it to stdio transport.
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Draw.io MCP Server running on stdio");
  }
}
