// The one contract both bootstrap spikes must satisfy.
//
// Every baseline implementation (raw official SDK, FastMCP, and later SlowMCP)
// exposes exactly this, and is driven by the same official MCP Client
// assertions in `drive-contract.ts`.

import * as z from 'zod'

export const SERVER_NAME = 'greeter'
export const SERVER_VERSION = '1.0.0'

export const TOOL_NAME = 'greet'
export const TOOL_DESCRIPTION = 'Greet someone by name.'

export const greetInput = z.object({
  name: z.string().min(1).describe('Who to greet.')
})

export type GreetInput = z.infer<typeof greetInput>

/** The single piece of behaviour under test. Deterministic by construction. */
export function greetText({ name }: GreetInput): string {
  return `Hello, ${name}.`
}

/** The exact result every implementation must produce for `{ name: 'Detroit' }`. */
export const EXPECTED_TEXT = 'Hello, Detroit.'
