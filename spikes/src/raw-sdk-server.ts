// T02: the greet contract implemented directly on the official MCP SDK.
//
// This is the baseline SlowMCP must justify itself against. Nothing here is
// wrapped or abstracted.

import { McpServer, createMcpHandler } from '@modelcontextprotocol/server'

import {
  SERVER_NAME,
  SERVER_VERSION,
  TOOL_DESCRIPTION,
  TOOL_NAME,
  greetInput,
  greetText
} from './greet-contract.ts'

/**
 * The 2026 HTTP model is stateless: the handler builds a fresh server per
 * request from this factory.
 */
export function createGreetServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION })

  server.registerTool(
    TOOL_NAME,
    { description: TOOL_DESCRIPTION, inputSchema: greetInput },
    async (args) => ({ content: [{ type: 'text', text: greetText(args) }] })
  )

  return server
}

export function createGreetHandler() {
  return createMcpHandler(() => createGreetServer())
}
