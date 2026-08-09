/**
 * SlowMCP public type contract.
 *
 * CoffeeScript emits no declarations, so this file is a handwritten public
 * specification rather than a build artifact. It is verified from outside the
 * package: contract fixtures compile against the packed tarball, and
 * `scripts/verify-export-surface.mjs` compares the names declared here against
 * the names the built module actually exports.
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
// Transports
// ---------------------------------------------------------------------------

/**
 * The official SDK's HTTP handler. SlowMCP returns it unwrapped; the shape is
 * declared structurally so the public surface stays free of SDK type imports.
 */
export interface McpHttpHandlerLike {
  fetch: (request: Request, options?: unknown) => Promise<Response>
  close: () => Promise<void>
  [key: string]: unknown
}

/** Serves an app over Streamable HTTP, one fresh server instance per exchange. */
export declare function createHttpHandler(
  app: SlowMcpServer,
  options?: Record<string, unknown>
): McpHttpHandlerLike

// ---------------------------------------------------------------------------
// Protocol compatibility
// ---------------------------------------------------------------------------

/**
 * SlowMCP's declared protocol compatibility. Owned by SlowMCP and never
 * derived from SDK version constants, which omit the modern revision.
 */
export interface ProtocolPolicy {
  /** Negotiation mode requested of the official client. */
  readonly negotiation: 'auto' | 'legacy'
  /** Revisions a connection may have negotiated and still be accepted. */
  readonly accepts: readonly string[]
  /** The revision SlowMCP is built and tested against. */
  readonly preferred: string
}

export declare const protocolPolicy: ProtocolPolicy

export declare function satisfiesProtocolPolicy(negotiated: string | undefined): boolean

/** Returns the revision, or throws `SlowMcpError` if it violates the policy. */
export declare function assertProtocolPolicy(
  negotiated: string | undefined,
  context?: string
): string

// ---------------------------------------------------------------------------
// Testing
// ---------------------------------------------------------------------------

/** A tool as advertised over the protocol. */
export interface AdvertisedTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
  [key: string]: unknown
}

export interface CallResult {
  content?: Array<{ type: string; text?: string; [key: string]: unknown }>
  isError?: boolean
  [key: string]: unknown
}

/**
 * Application test harness backed by a real official MCP Client.
 *
 * Connecting is lazy and asserts SlowMCP's protocol policy before any caller
 * assertion runs, so a session that negotiated an unacceptable revision throws
 * instead of quietly passing.
 */
export interface TestServer {
  /** The official MCP `Client`, for assertions the sugar does not cover. */
  client(): Promise<unknown>
  /** The protocol revision actually negotiated. */
  protocolVersion(): Promise<string>
  tools(): Promise<AdvertisedTool[]>
  call(name: string, args?: Record<string, unknown>): Promise<CallResult>
  close(): Promise<void>
}

export interface TestServerOptions {
  /** Client identity sent during initialization. */
  client?: { name: string; version: string }
}

export declare function testServer(app: SlowMcpServer, options?: TestServerOptions): TestServer

// ---------------------------------------------------------------------------
// Errors and metadata
// ---------------------------------------------------------------------------

export declare class SlowMcpError extends Error {
  readonly name: 'SlowMcpError'
  readonly code: string
  constructor(message: string, code?: string)
}

export declare const version: string
