// T03: the same greet contract implemented with Prefect FastMCP TypeScript.
//
// Written the way the FastMCP docs lead you to write it, not translated from
// the raw-SDK version. The point is to observe its real ergonomics.

import { FastMCP } from '@prefecthq/fastmcp-ts/server'

import {
  SERVER_NAME,
  SERVER_VERSION,
  TOOL_DESCRIPTION,
  TOOL_NAME,
  greetInput,
  greetText
} from './greet-contract.ts'

export function createGreetServer(): FastMCP {
  const server = new FastMCP({ name: SERVER_NAME, version: SERVER_VERSION })

  server.tool(
    { name: TOOL_NAME, description: TOOL_DESCRIPTION, input: greetInput },
    (args) => greetText(args)
  )

  return server
}
