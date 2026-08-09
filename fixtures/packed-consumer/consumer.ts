// TypeScript consumer. Compiles and runs against the installed tarball only.
//
// Every public subpath is imported here, so declaration resolution is proven
// for all four, not just the root.
import assert from 'node:assert/strict'

import { createServer, text } from 'slowmcp'
import type { SlowMcpServer, ToolResult, ServerDescription } from 'slowmcp'
import { createHttpHandler } from 'slowmcp/http'
import type { McpHttpHandlerLike } from 'slowmcp/http'
import { testServer } from 'slowmcp/testing'
import type { TestServer, AdvertisedTool } from 'slowmcp/testing'
import { protocolPolicy, satisfiesProtocolPolicy, assertProtocolPolicy } from 'slowmcp/protocol'
import type { ProtocolPolicy } from 'slowmcp/protocol'
import * as z from 'zod'

const app: SlowMcpServer = createServer({ name: 'greeter', version: '1.0.0' })

app.tool({
  name: 'greet',
  description: 'Greet someone by name.',
  input: z.object({ name: z.string().min(1), excited: z.boolean().optional() }),
  handler: (input) => {
    // Inferred from the schema, with no annotation here.
    const name: string = input.name
    const excited: boolean | undefined = input.excited
    return text(`Hello, ${name}${excited ? '!!' : '!'}`)
  }
})

// A tool with no schema still types, and its handler input is not `any`.
app.tool({ name: 'ping', handler: (): ToolResult => text('pong') })

// Registration is chainable.
const chained: SlowMcpServer = app.tool({ name: 'pong', handler: () => text('ping') })
assert.equal(chained.name, 'greeter')

const description: ServerDescription = app.describe()
assert.equal(description.tools.length, 3)

// slowmcp/protocol
const policy: ProtocolPolicy = protocolPolicy
const accepts: readonly string[] = policy.accepts
assert.ok(satisfiesProtocolPolicy(policy.preferred))
assert.equal(assertProtocolPolicy(policy.preferred), policy.preferred)

// slowmcp/http
const handler: McpHttpHandlerLike = createHttpHandler(app)

// slowmcp/testing
const mcp: TestServer = testServer(app)
try {
  const negotiated: string = await mcp.protocolVersion()
  assert.ok(accepts.includes(negotiated))

  const tools: AdvertisedTool[] = await mcp.tools()
  assert.deepEqual(tools.map((tool) => tool.name).sort(), ['greet', 'ping', 'pong'])

  const result = await mcp.call('greet', { name: 'Lee' })
  assert.equal(result.content?.[0]?.text, 'Hello, Lee!')
} finally {
  await mcp.close()
  await handler.close()
}

console.log('ts-consumer ok')
