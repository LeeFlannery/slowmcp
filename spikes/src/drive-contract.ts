// Drives any fetch-shaped MCP endpoint with the official MCP Client and
// asserts the greet contract.
//
// The transport is the official `StreamableHTTPClientTransport`. Only its
// `fetch` is swapped so requests reach the handler in-process instead of a
// socket. Everything above that (negotiation, framing, session semantics) is
// the official implementation.

import assert from 'node:assert/strict'

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

import { EXPECTED_TEXT, SERVER_NAME, TOOL_NAME } from './greet-contract.ts'

export type FetchHandler = (request: Request) => Promise<Response>

/**
 * A protocol era the harness can be pointed at.
 *
 * Both fields are stated, never derived. `LATEST_PROTOCOL_VERSION` and
 * `SUPPORTED_PROTOCOL_VERSIONS` are deliberately not used to decide what
 * "modern" means: the SDK exports `'2025-11-25'` as latest and omits
 * 2026-07-28 from the supported list entirely, because the modern era is a
 * separate axis reached through the discovery probe. Anything derived from
 * those constants is wrong by construction.
 *
 * `negotiation` is what we ask for. `expectedProtocolVersion` is what we
 * require to have actually happened. Asking is not proof.
 */
export interface Era {
  readonly name: string
  readonly negotiation: 'auto' | 'legacy' | { pin: string }
  readonly expectedProtocolVersion: string
}

/** Probe and upgrade. The 2026 era, which is not the client's default. */
export const MODERN: Era = {
  name: 'modern',
  negotiation: 'auto',
  expectedProtocolVersion: '2026-07-28'
}

/** The client's default posture. Named here so choosing it is visible. */
export const LEGACY: Era = {
  name: 'legacy',
  negotiation: 'legacy',
  expectedProtocolVersion: '2025-11-25'
}

export interface ContractObservation {
  label: string
  era: string
  protocolVersion: string | undefined
  serverInfo: { name: string; version: string } | undefined
  toolNames: string[]
  toolDescription: string | undefined
  inputSchema: unknown
  callResult: unknown
  text: string
}

/** The URL is never dialled; it only satisfies the transport's origin handling. */
const ENDPOINT = new URL('http://mcp.invalid/mcp')

export async function driveGreetContract(
  label: string,
  handler: FetchHandler,
  era: Era = MODERN
): Promise<ContractObservation> {
  const transport = new StreamableHTTPClientTransport(ENDPOINT, {
    fetch: (input, init) => handler(new Request(input as RequestInfo, init as RequestInit))
  })

  const client = new Client(
    { name: 'bootstrap-spike-client', version: '0.0.0' },
    { versionNegotiation: { mode: era.negotiation } }
  )

  try {
    await client.connect(transport)

    // Asserted before anything else. A run that negotiates the wrong era still
    // passes every downstream assertion while proving nothing about the era it
    // claims to cover. That is exactly how the first version of this spike
    // went green against 2025-11-25.
    assert.equal(
      transport.protocolVersion,
      era.expectedProtocolVersion,
      `${label}: asked for the ${era.name} era and negotiated ` +
        `${transport.protocolVersion}, not ${era.expectedProtocolVersion}`
    )

    const serverVersion = client.getServerVersion()
    assert.equal(serverVersion?.name, SERVER_NAME, `${label}: unexpected server name`)

    const listed = await client.listTools()
    const toolNames = listed.tools.map((tool) => tool.name).sort()
    assert.deepEqual(toolNames, [TOOL_NAME], `${label}: unexpected tool listing`)

    const greet = listed.tools.find((tool) => tool.name === TOOL_NAME)
    assert.ok(greet?.inputSchema, `${label}: greet advertises no inputSchema`)

    const result = await client.callTool({ name: TOOL_NAME, arguments: { name: 'Detroit' } })
    const content = result.content as Array<{ type: string; text?: string }>
    assert.equal(content?.[0]?.type, 'text', `${label}: first content block is not text`)
    assert.equal(content[0].text, EXPECTED_TEXT, `${label}: unexpected greeting`)
    assert.notEqual(result.isError, true, `${label}: call reported an error`)

    return {
      label,
      era: era.name,
      protocolVersion: transport.protocolVersion,
      serverInfo: serverVersion as { name: string; version: string } | undefined,
      toolNames,
      toolDescription: greet.description,
      inputSchema: greet.inputSchema,
      callResult: result,
      text: content[0].text!
    }
  } finally {
    await client.close().catch(() => {})
  }
}

/**
 * Asserts two implementations behave identically over MCP: same negotiated
 * protocol, same identity, same discovery, same call result.
 *
 * The advertised `inputSchema` is compared by `compareAdvertisedSchemas`
 * instead. It is observable, so it is never dropped, but frameworks
 * legitimately emit different JSON Schema for the same validator, and that is
 * a measurement the comparison harness exists to collect.
 */
export function assertEquivalent(a: ContractObservation, b: ContractObservation): void {
  const behaviour = (o: ContractObservation) => ({
    protocolVersion: o.protocolVersion,
    serverInfo: o.serverInfo,
    toolNames: o.toolNames,
    toolDescription: o.toolDescription,
    text: o.text
  })

  assert.deepEqual(
    behaviour(a),
    behaviour(b),
    `${a.label} and ${b.label} are not observationally equivalent`
  )
}

/** One advertised JSON Schema key, and what each implementation emitted for it. */
export interface SchemaDatum {
  key: string
  values: Record<string, unknown>
  /** True when every implementation emitted the same thing. */
  agreed: boolean
}

/**
 * Records what each implementation advertises for the same input validator.
 *
 * This is comparison data, not a defect report. Two frameworks emitting
 * different JSON Schema from one Zod object is a real, client-observable
 * difference in how they present the same tool, which is precisely the kind
 * of row the parity harness should publish. It is deliberately not normalized
 * away, and deliberately not framed as something to fix.
 */
export function compareAdvertisedSchemas(...observations: ContractObservation[]): SchemaDatum[] {
  const schemas = observations.map((o) => (o.inputSchema ?? {}) as Record<string, unknown>)
  const keys = [...new Set(schemas.flatMap((s) => Object.keys(s)))].sort()

  return keys.map((key) => {
    const values = Object.fromEntries(
      observations.map((o, i) => [o.label, schemas[i][key]])
    )
    const rendered = Object.values(values).map((v) => JSON.stringify(v))
    return { key, values, agreed: new Set(rendered).size === 1 }
  })
}

/** The subset of `compareAdvertisedSchemas` where implementations disagree. */
export function schemaDivergences(...observations: ContractObservation[]): SchemaDatum[] {
  return compareAdvertisedSchemas(...observations).filter((datum) => !datum.agreed)
}
