/**
 * `slowmcp/testing` type contract.
 *
 * Handwritten. Verified from outside the package against the packed tarball.
 */

import type { SlowMcpServer } from './index.js'

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
 * Application test harness backed by a real official MCP Client over the
 * official Streamable HTTP client transport.
 *
 * **Connection is lazy, and every accessor is a method.** `client()` and
 * `protocolVersion()` are deliberately not properties: the connection does not
 * exist until something needs it, so a property would have to either connect
 * eagerly or return a value that is sometimes absent.
 *
 * **Which methods connect implicitly:**
 *
 * | Method | Connects if not already connected |
 * |---|---|
 * | `client()` | yes |
 * | `protocolVersion()` | yes |
 * | `tools()` | yes |
 * | `call()` | yes |
 * | `close()` | no |
 *
 * The first call establishes the connection and every later call reuses it.
 * A failed connection is not cached; the next call retries.
 *
 * **Protocol policy is asserted, not assumed.** On connect, the harness
 * requests the negotiation mode in `protocolPolicy`, reads the revision that
 * was actually negotiated, and throws `SlowMcpError` if it falls outside the
 * policy. This happens before any caller assertion runs, so a session that
 * silently landed on an older revision fails on the revision rather than
 * passing every capability check.
 *
 * After `close()`, any method that would connect throws `SlowMcpError`.
 */
export interface TestServer {
  /** The official MCP `Client`, for assertions the sugar does not cover. */
  client(): Promise<unknown>
  /** The protocol revision actually negotiated. */
  protocolVersion(): Promise<string>
  tools(): Promise<AdvertisedTool[]>
  call(name: string, args?: Record<string, unknown>): Promise<CallResult>
  /** Closes the client and the underlying handler. Safe to call repeatedly. */
  close(): Promise<void>
}

export interface TestServerOptions {
  /** Client identity sent during initialization. */
  client?: { name: string; version: string }
}

export declare function testServer(app: SlowMcpServer, options?: TestServerOptions): TestServer
