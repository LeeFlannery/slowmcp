// Self-verifying client for the hello-tool reference.
//
// This is a CI artifact, not a demo. It drives the server through SlowMCP's
// public testing API, which is a real official MCP Client underneath, and
// exits non-zero on any mismatch.
//
// Contract: greet({ name: "Lee" }) -> "Hello, Lee!"

import assert from 'node:assert/strict'

import { protocolPolicy } from 'slowmcp/protocol'
import { testServer } from 'slowmcp/testing'

import app from './server.mjs'

const mcp = testServer(app)
const checks = []
const check = (name, fn) => {
  fn()
  checks.push(name)
}

try {
  // 1. Initialization, through the official client.
  const client = await mcp.client()
  check('initialize', () => assert.ok(client, 'no MCP client returned'))

  // 2. Negotiated protocol behaviour, asserted rather than assumed.
  const negotiated = await mcp.protocolVersion()
  check('protocol', () =>
    assert.ok(
      protocolPolicy.accepts.includes(negotiated),
      `negotiated ${negotiated}, outside policy ${protocolPolicy.accepts.join(', ')}`
    )
  )

  // 3. Tool discovery.
  const tools = await mcp.tools()
  check('discovery', () => assert.deepEqual(tools.map((tool) => tool.name), ['greet']))

  // 4. Advertised schema.
  const [greet] = tools
  check('schema', () => {
    assert.equal(greet.description, 'Greet someone by name.')
    assert.equal(greet.inputSchema.type, 'object')
    assert.deepEqual(greet.inputSchema.required, ['name'])
    assert.equal(greet.inputSchema.properties.name.type, 'string')
    assert.equal(greet.inputSchema.properties.name.description, 'Who to greet.')
  })

  // 5. Invocation, and 6. the exact result.
  const result = await mcp.call('greet', { name: 'Lee' })
  check('invocation', () => assert.notEqual(result.isError, true, 'call reported an error'))
  check('result', () => {
    assert.equal(result.content?.length, 1)
    assert.equal(result.content[0].type, 'text')
    assert.equal(result.content[0].text, 'Hello, Lee!')
  })

  console.log(`hello-tool ok (${negotiated})`)
  for (const name of checks) console.log(`  ${name}`)
} finally {
  await mcp.close()
}
