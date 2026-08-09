// Drives any fetch-shaped MCP endpoint with the official MCP Client and
// asserts the greet contract.
//
// The transport is the official `StreamableHTTPClientTransport`. Only its
// `fetch` is swapped so requests reach the handler in-process instead of a
// socket. Everything above that — negotiation, framing, session semantics — is
// the official implementation.

import assert from 'node:assert/strict'

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

import { EXPECTED_TEXT, SERVER_NAME, TOOL_NAME } from './greet-contract.ts'

export type FetchHandler = (request: Request) => Promise<Response>

export interface ContractObservation {
  label: string
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
  handler: FetchHandler
): Promise<ContractObservation> {
  const transport = new StreamableHTTPClientTransport(ENDPOINT, {
    fetch: (input, init) => handler(new Request(input as RequestInfo, init as RequestInit))
  })

  // `versionNegotiation.mode` defaults to `'legacy'`, which pins the client to
  // the 2025 era. Modern (2026-07-28) serving is only reached via the probing
  // mode, so the spikes ask for it explicitly.
  const client = new Client(
    { name: 'bootstrap-spike-client', version: '0.0.0' },
    { versionNegotiation: { mode: 'auto' } }
  )

  try {
    await client.connect(transport)

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
 * The advertised `inputSchema` is deliberately excluded here and compared by
 * `diffAdvertisedSchemas` instead. It is observable, so it is never dropped —
 * but frameworks legitimately emit different JSON Schema for the same
 * validator, and that difference is a finding to report rather than a failure
 * to assert away.
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

/** Top-level JSON Schema keys where the two advertised schemas differ. */
export function diffAdvertisedSchemas(
  a: ContractObservation,
  b: ContractObservation
): Array<{ key: string; [label: string]: unknown }> {
  const left = (a.inputSchema ?? {}) as Record<string, unknown>
  const right = (b.inputSchema ?? {}) as Record<string, unknown>
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()

  return keys
    .filter((key) => JSON.stringify(left[key]) !== JSON.stringify(right[key]))
    .map((key) => ({ key, [a.label]: left[key], [b.label]: right[key] }))
}
