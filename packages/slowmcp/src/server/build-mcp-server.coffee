# The core adapter: a definition snapshot becomes an official `McpServer`.
#
# Everything protocol-shaped is the SDK's. This function only translates
# SlowMCP definitions into official registration calls.

import { McpServer } from '@modelcontextprotocol/server'

export buildMcpServer = (snapshot) ->
  server = new McpServer { name: snapshot.name, version: snapshot.version }

  for tool in snapshot.tools
    config = {}
    config.description = tool.description if tool.description?
    config.inputSchema = tool.input if tool.input?

    server.registerTool tool.name, config, tool.handler

  server
