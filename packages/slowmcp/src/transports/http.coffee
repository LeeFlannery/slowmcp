# Streamable HTTP, delegated entirely to the official handler.
#
# The returned object is the SDK's own `McpHttpHandler`, not a SlowMCP wrapper.
# A fresh official server is built per exchange from the definition snapshot,
# which is the stateless model `createMcpHandler` expects.

import { createMcpHandler } from '@modelcontextprotocol/server'

import { buildMcpServer } from '../server/build-mcp-server.js'

export createHttpHandler = (app, options = {}) ->
  snapshot = app.snapshot()
  createMcpHandler (-> buildMcpServer snapshot), options
