// SlowMCP's protocol compatibility policy, and the bug it exists to prevent.
//
// Bootstrap found that the official client negotiates 2025-11-25 by default
// against a fully modern server, and that every capability assertion still
// passes. These tests pin both halves: the default really is the old revision,
// and SlowMCP really does refuse it.

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import * as z from 'zod'

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const { createServer, text, SlowMcpError } = await import(join(dist, 'index.js'))
const { createHttpHandler } = await import(join(dist, 'http.js'))
const { testServer } = await import(join(dist, 'testing.js'))
const { protocolPolicy, satisfiesProtocolPolicy, assertProtocolPolicy } = await import(
  join(dist, 'protocol.js')
)

/** The revision observed during bootstrap when the SDK default is relied on. */
const SDK_DEFAULT_REVISION = '2025-11-25'

const greeter = () => {
  const app = createServer({ name: 'greeter', version: '1.0.0' })
  app.tool({
    name: 'greet',
    input: z.object({ name: z.string() }),
    handler: ({ name }: { name: string }) => text(`Hello, ${name}!`)
  })
  return app
}

const openHandlers: Array<{ close: () => Promise<void> }> = []
afterEach(async () => {
  while (openHandlers.length > 0) await openHandlers.pop()!.close().catch(() => {})
})

describe('protocolPolicy', () => {
  it('is a SlowMCP-owned literal, not derived from SDK constants', () => {
    expect(protocolPolicy.accepts).toEqual(['2026-07-28'])
    expect(protocolPolicy.preferred).toBe('2026-07-28')
    expect(protocolPolicy.negotiation).toBe('auto')
  })

  it('is frozen, so a dependency cannot widen it at runtime', () => {
    expect(Object.isFrozen(protocolPolicy)).toBe(true)
    expect(Object.isFrozen(protocolPolicy.accepts)).toBe(true)
  })

  it('does not accept the revision the SDK default would produce', () => {
    expect(protocolPolicy.accepts).not.toContain(SDK_DEFAULT_REVISION)
    expect(satisfiesProtocolPolicy(SDK_DEFAULT_REVISION)).toBe(false)
    expect(satisfiesProtocolPolicy(undefined)).toBe(false)
    expect(satisfiesProtocolPolicy('2026-07-28')).toBe(true)
  })

  it('throws with an actionable message outside the policy', () => {
    expect(() => assertProtocolPolicy(SDK_DEFAULT_REVISION, 'testServer')).toThrow(SlowMcpError)
    expect(() => assertProtocolPolicy(SDK_DEFAULT_REVISION, 'testServer')).toThrow(
      /testServer negotiated MCP protocol 2025-11-25.*outside SlowMCP's compatibility policy/s
    )
    expect(assertProtocolPolicy('2026-07-28')).toBe('2026-07-28')
  })
})

describe('testServer negotiation', () => {
  it('negotiates the modern revision and exposes it', async () => {
    const mcp = testServer(greeter())
    try {
      expect(await mcp.protocolVersion()).toBe('2026-07-28')
    } finally {
      await mcp.close()
    }
  })
})

describe('regression: relying on the SDK default', () => {
  it('negotiates the older revision against the very same SlowMCP handler', async () => {
    const handler = createHttpHandler(greeter())
    openHandlers.push(handler)

    const transport = new StreamableHTTPClientTransport(new URL('http://slowmcp.test/mcp'), {
      fetch: (input: RequestInfo, init: RequestInit) => handler.fetch(new Request(input, init))
    })

    // Constructed the obvious way: no versionNegotiation option at all.
    const client = new Client({ name: 'default-client', version: '0.0.0' })

    try {
      await client.connect(transport)

      // 1. The default really does land on the old era.
      expect(transport.protocolVersion).toBe(SDK_DEFAULT_REVISION)

      // 2. Every capability assertion still passes, which is why this is
      //    dangerous rather than merely wrong.
      const { tools } = await client.listTools()
      expect(tools.map((tool: { name: string }) => tool.name)).toEqual(['greet'])
      const result = await client.callTool({ name: 'greet', arguments: { name: 'Lee' } })
      expect((result.content as Array<{ text: string }>)[0].text).toBe('Hello, Lee!')

      // 3. SlowMCP's policy is what catches it.
      expect(satisfiesProtocolPolicy(transport.protocolVersion)).toBe(false)
      expect(() => assertProtocolPolicy(transport.protocolVersion, 'testServer')).toThrow(
        SlowMcpError
      )
    } finally {
      await client.close().catch(() => {})
    }
  })
})
