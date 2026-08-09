// T02/T03: the greet contract driven through the official MCP Client.
//
// Nothing here calls a handler directly. Every assertion is protocol-observed.

import { afterAll, describe, expect, it } from 'vitest'

import { EXPECTED_TEXT, TOOL_NAME } from '../src/greet-contract.ts'
import {
  LEGACY,
  MODERN,
  assertEquivalent,
  compareAdvertisedSchemas,
  driveGreetContract,
  schemaDivergences
} from '../src/drive-contract.ts'
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

const eras = [MODERN, LEGACY]

describe.each(implementations)('$label over Streamable HTTP', ({ label, fetch }) => {
  describe.each(eras)('$name era', (era) => {
    it('negotiates the era it was configured for', async () => {
      const observed = await driveGreetContract(label, fetch, era)
      expect(observed.protocolVersion).toBe(era.expectedProtocolVersion)
    })

    it('discovers the greet tool', async () => {
      const observed = await driveGreetContract(label, fetch, era)
      expect(observed.toolNames).toEqual([TOOL_NAME])
      expect(observed.inputSchema).toMatchObject({ type: 'object', required: ['name'] })
    })

    it('invokes the greet tool', async () => {
      const observed = await driveGreetContract(label, fetch, era)
      expect(observed.text).toBe(EXPECTED_TEXT)
    })
  })

  it('serves a fresh server instance per connection', async () => {
    const first = await driveGreetContract(label, fetch)
    const second = await driveGreetContract(label, fetch)
    expect(second.text).toBe(first.text)
    expect(second.toolNames).toEqual(first.toolNames)
  })
})

describe('era configuration', () => {
  it('fails loudly when the negotiated era is not the requested one', async () => {
    // The trap this harness exists to prevent: asking for modern, getting 2025,
    // and passing every downstream assertion anyway.
    const impossible = { ...MODERN, expectedProtocolVersion: '2099-01-01' }
    await expect(
      driveGreetContract('official-sdk', implementations[0].fetch, impossible)
    ).rejects.toThrow(/negotiated 2026-07-28, not 2099-01-01/)
  })
})

describe('framework parity', () => {
  it.each(eras)('official-sdk and fastmcp are equivalent in the $name era', async (era) => {
    const raw = await driveGreetContract('official-sdk', implementations[0].fetch, era)
    const fast = await driveGreetContract('fastmcp', implementations[1].fetch, era)
    expect(() => assertEquivalent(raw, fast)).not.toThrow()
  })

  it('records what each implementation advertises for the same validator', async () => {
    const raw = await driveGreetContract('official-sdk', implementations[0].fetch)
    const fast = await driveGreetContract('fastmcp', implementations[1].fetch)

    const compared = compareAdvertisedSchemas(raw, fast)
    expect(compared.map((d) => d.key)).toEqual([
      '$schema',
      'additionalProperties',
      'properties',
      'required',
      'type'
    ])

    // FastMCP closes the advertised object schema; the raw SDK leaves it open.
    // Pinned as comparison data. If either framework changes, this test tells
    // us the parity table needs regenerating.
    expect(schemaDivergences(raw, fast)).toEqual([
      {
        key: 'additionalProperties',
        values: { 'official-sdk': undefined, fastmcp: false },
        agreed: false
      }
    ])
  })
})
