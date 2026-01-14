#!/usr/bin/env node

/**
 * Draw.io MCP Server
 *
 * A Model Context Protocol server that enables Claude Desktop to create
 * and manipulate Draw.io diagrams through natural conversation.
 *
 * Entry point - starts the MCP server on stdio transport.
 */

import { DrawioMCPServer } from "./server.js";

const server = new DrawioMCPServer();
server.run().catch(console.error);
