// T02/T03 — the greet contract driven through the official MCP Client.
//
// Nothing here calls a handler directly. Every assertion is protocol-observed.

import { afterAll, describe, expect, it } from 'vitest'

import { EXPECTED_TEXT, TOOL_NAME } from '../src/greet-contract.ts'
import { assertEquivalent, diffAdvertisedSchemas, driveGreetContract } from '../src/drive-contract.ts'
import { createGreetHandler } from '../src/raw-sdk-server.ts'
import { createGreetServer as createFastMcpServer } from '../src/fastmcp-server.ts'

const rawHandler = createGreetHandler()
const fastServer = createFastMcpServer()

afterAll(async () => {
  await rawHandler.close()
  await fastServer.close()
})

const implementations = [
  { label: 'official-sdk', fetch: (request: Request) => rawHandler.fetch(request) },
  { label: 'fastmcp', fetch: (request: Request) => fastServer.fetch(request) }
]

describe.each(implementations)('$label over Streamable HTTP', ({ label, fetch }) => {
  it('negotiates the modern protocol revision', async () => {
    const observed = await driveGreetContract(label, fetch)
    expect(observed.protocolVersion).toBe('2026-07-28')
  })

  it('discovers the greet tool', async () => {
    const observed = await driveGreetContract(label, fetch)
    expect(observed.toolNames).toEqual([TOOL_NAME])
    expect(observed.inputSchema).toMatchObject({ type: 'object', required: ['name'] })
  })

  it('invokes the greet tool', async () => {
    const observed = await driveGreetContract(label, fetch)
    expect(observed.text).toBe(EXPECTED_TEXT)
  })

  it('serves a fresh server instance per connection', async () => {
    const first = await driveGreetContract(label, fetch)
    const second = await driveGreetContract(label, fetch)
    expect(second.text).toBe(first.text)
    expect(second.toolNames).toEqual(first.toolNames)
  })
})

describe('framework parity', () => {
  it('official-sdk and fastmcp are behaviourally equivalent', async () => {
    const raw = await driveGreetContract('official-sdk', implementations[0].fetch)
    const fast = await driveGreetContract('fastmcp', implementations[1].fetch)
    expect(() => assertEquivalent(raw, fast)).not.toThrow()
  })

  it('records the advertised schema divergence rather than hiding it', async () => {
    const raw = await driveGreetContract('official-sdk', implementations[0].fetch)
    const fast = await driveGreetContract('fastmcp', implementations[1].fetch)

    // FastMCP closes the advertised object schema; the raw SDK leaves it open.
    // If this stops being true, the baseline findings need updating.
    expect(diffAdvertisedSchemas(raw, fast)).toEqual([
      { key: 'additionalProperties', 'official-sdk': undefined, fastmcp: false }
    ])
  })
})
