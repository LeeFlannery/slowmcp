// Frozen contract: a handler serves the snapshot taken when it was created.
//
// `createHttpHandler(app)` captures an immutable snapshot at the call. What a
// running handler serves is therefore fixed at the moment it starts serving,
// rather than depending on when registration happened to run. Registering a
// capability later requires a new handler.

import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const { createServer, text } = await import(join(dist, 'index.js'))
const { createHttpHandler } = await import(join(dist, 'http.js'))
const { testServer } = await import(join(dist, 'testing.js'))
const { protocolPolicy } = await import(join(dist, 'protocol.js'))

const open: Array<{ close: () => Promise<void> }> = []
afterEach(async () => {
  while (open.length > 0) await open.pop()!.close().catch(() => {})
})

/** Discovers tool names through the official client, against a given handler. */
const discover = async (handler: { fetch: (request: Request) => Promise<Response> }) => {
  const transport = new StreamableHTTPClientTransport(new URL('http://slowmcp.test/mcp'), {
    fetch: (url: string | URL, init?: RequestInit) => handler.fetch(new Request(url, init))
  })
  const client = new Client(
    { name: 'snapshot-test', version: '0.0.0' },
    { versionNegotiation: { mode: protocolPolicy.negotiation } }
  )
  try {
    await client.connect(transport)
    const { tools } = await client.listTools()
    return tools.map((tool: { name: string }) => tool.name).sort()
  } finally {
    await client.close().catch(() => {})
  }
}

describe('createHttpHandler snapshot semantics', () => {
  it('serves the snapshot taken at handler creation, not the live registry', async () => {
    // 1. create app
    const app = createServer({ name: 'snapshot', version: '1.0.0' })

    // 2. register tool A
    app.tool({ name: 'a', handler: () => text('a') })

    // 3. create handler
    const first = createHttpHandler(app)
    open.push(first)

    // 4. register tool B
    app.tool({ name: 'b', handler: () => text('b') })

    // 5. connect client to the existing handler
    const served = await discover(first)

    // 6. A exists
    expect(served).toContain('a')

    // 7. B does not
    expect(served).not.toContain('b')
    expect(served).toEqual(['a'])

    // 8. create a new handler
    const second = createHttpHandler(app)
    open.push(second)

    // 9. both A and B exist
    expect(await discover(second)).toEqual(['a', 'b'])
  })

  it('keeps an existing handler stable across repeated connections', async () => {
    const app = createServer({ name: 'snapshot', version: '1.0.0' })
    app.tool({ name: 'a', handler: () => text('a') })

    const handler = createHttpHandler(app)
    open.push(handler)

    expect(await discover(handler)).toEqual(['a'])
    app.tool({ name: 'b', handler: () => text('b') })
    expect(await discover(handler)).toEqual(['a'])
  })

  it('applies to testServer, which snapshots at construction not at connect', async () => {
    // testServer builds its handler eagerly, so it inherits the same
    // semantics. Connecting is lazy; snapshotting is not, and the gap between
    // the two is where this would surprise someone.
    const app = createServer({ name: 'snapshot', version: '1.0.0' })
    app.tool({ name: 'a', handler: () => text('a') })

    const mcp = testServer(app)
    app.tool({ name: 'b', handler: () => text('b') })

    try {
      expect((await mcp.tools()).map((tool: { name: string }) => tool.name)).toEqual(['a'])
    } finally {
      await mcp.close()
    }

    const later = testServer(app)
    try {
      expect((await later.tools()).map((tool: { name: string }) => tool.name)).toEqual(['a', 'b'])
    } finally {
      await later.close()
    }
  })

  it('exposes the same guarantee through app.snapshot()', () => {
    const app = createServer({ name: 'snapshot', version: '1.0.0' })
    app.tool({ name: 'a', handler: () => text('a') })

    const snapshot = app.snapshot()
    app.tool({ name: 'b', handler: () => text('b') })

    expect(snapshot.tools.map((tool: { name: string }) => tool.name)).toEqual(['a'])
    expect(app.snapshot().tools.map((tool: { name: string }) => tool.name)).toEqual(['a', 'b'])
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(snapshot.tools)).toBe(true)
  })
})
