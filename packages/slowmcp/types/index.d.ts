/**
 * SlowMCP root export: the authoring API.
 *
 * CoffeeScript emits no declarations, so this file is a handwritten public
 * specification rather than a build artifact. It is verified from outside the
 * package: contract fixtures compile against the packed tarball, and
 * `scripts/verify-export-surface.mjs` compares the names declared for every
 * public subpath against the names each built entry actually exports.
 *
 * Keep this surface small. Every export here is a promise.
 */

// ---------------------------------------------------------------------------
// Schema interop
// ---------------------------------------------------------------------------

/**
 * The subset of Standard Schema v1 SlowMCP relies on, declared locally so the
 * public surface does not depend on a schema library or on re-exported SDK
 * types. Zod, Valibot, and any other Standard Schema validator satisfy it.
 */
export interface StandardSchemaLike<Output = unknown> {
  readonly '~standard': {
    readonly version: 1
    readonly vendor: string
    readonly types?: { readonly output: Output } | undefined
  }
}

/**
 * The value a handler receives, inferred from its input schema.
 *
 * Inference reads the spec's type-only `types.output` channel rather than the
 * `validate` return type, which is a union and does not infer cleanly.
 * A tool with no schema yields `unknown`, not `any`, so handlers cannot reach
 * into an input they never declared.
 */
export type InferToolInput<Schema> =
  Schema extends { readonly '~standard': { readonly types?: { readonly output: infer Output } | undefined } }
    ? Output
    : unknown

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export interface TextContentBlock {
  type: 'text'
  text: string
}

/** An ordinary MCP tool result. Raw result objects are always allowed. */
export interface ToolResult {
  content: TextContentBlock[]
  [key: string]: unknown
}

/** Builds a text result. Throws `SlowMcpError` if given a non-string. */
export declare function text(value: string): ToolResult

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

export interface ToolDefinition<Schema extends StandardSchemaLike | undefined = undefined> {
  /** Public tool name. Must be unique within a server. */
  name: string
  description?: string
  /** A Standard Schema validator, for example a Zod object. */
  input?: Schema
  handler: (input: InferToolInput<Schema>) => ToolResult | Promise<ToolResult>
}

/** Handler-free description of a registered tool. */
export interface ToolSummary {
  name: string
  description?: string
}

/** Immutable description of a server, safe to log. */
export interface ServerDescription {
  name: string
  version: string
  tools: ToolSummary[]
}

/** Immutable definition snapshot used to build fresh official servers. */
export interface ServerSnapshot {
  readonly name: string
  readonly version: string
  readonly tools: readonly Readonly<ToolDefinition<never>>[]
}

export interface ServerMetadata {
  name: string
  version: string
}

/**
 * A SlowMCP application: definitions only. It holds no connection and no
 * server instance, so one app can be served over any transport.
 */
export interface SlowMcpServer {
  readonly name: string
  readonly version: string
  /** Registers a tool. Throws `SlowMcpError` on a duplicate name. */
  tool<Schema extends StandardSchemaLike | undefined = undefined>(
    definition: ToolDefinition<Schema>
  ): SlowMcpServer
  snapshot(): ServerSnapshot
  describe(): ServerDescription
}

export declare function createServer(metadata: ServerMetadata): SlowMcpServer

// ---------------------------------------------------------------------------
// Errors and metadata
// ---------------------------------------------------------------------------

export declare class SlowMcpError extends Error {
  readonly name: 'SlowMcpError'
  readonly code: string
  constructor(message: string, code?: string)
}

export declare const version: string
