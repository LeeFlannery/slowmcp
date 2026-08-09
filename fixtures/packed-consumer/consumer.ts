// TypeScript consumer. Compiles and runs against the installed tarball only.
//
// The point of this file is inference: the handler argument must be derived
// from the Zod schema without any annotation by the consumer.
import assert from 'node:assert/strict'

import { createServer, text, testServer, protocolPolicy } from 'slowmcp'
import type { SlowMcpServer, ToolResult } from 'slowmcp'
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
app.tool({
  name: 'ping',
  handler: (): ToolResult => text('pong')
})

// Registration is chainable.
const chained: SlowMcpServer = app.tool({ name: 'pong', handler: () => text('ping') })
assert.equal(chained.name, 'greeter')

const accepts: readonly string[] = protocolPolicy.accepts
assert.ok(accepts.length > 0)

const mcp = testServer(app)
try {
  const negotiated: string = await mcp.protocolVersion()
  assert.ok(accepts.includes(negotiated))

  const names = (await mcp.tools()).map((tool) => tool.name).sort()
  assert.deepEqual(names, ['greet', 'ping', 'pong'])

  const result = await mcp.call('greet', { name: 'Lee' })
  assert.equal(result.content?.[0]?.text, 'Hello, Lee!')
} finally {
  await mcp.close()
}

console.log('ts-consumer ok')
