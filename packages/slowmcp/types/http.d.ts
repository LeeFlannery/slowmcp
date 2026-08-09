/**
 * `slowmcp/http` type contract.
 *
 * Handwritten. Verified from outside the package against the packed tarball.
 */

import type { SlowMcpServer } from './index.js'

/**
 * The official SDK's HTTP handler. SlowMCP returns it unwrapped; the shape is
 * declared structurally so the public surface stays free of SDK type imports.
 */
export interface McpHttpHandlerLike {
  fetch: (request: Request, options?: unknown) => Promise<Response>
  close: () => Promise<void>
  [key: string]: unknown
}

/**
 * Serves an app over Streamable HTTP, building a fresh official server instance
 * per exchange.
 *
 * **Snapshot semantics, frozen.** The handler is constructed from an immutable
 * snapshot taken at this call. Capabilities registered on `app` afterwards do
 * not appear in the returned handler; call `createHttpHandler` again to serve
 * them. This makes what a running handler serves fixed at the moment it starts
 * serving, rather than dependent on registration timing.
 */
export declare function createHttpHandler(
  app: SlowMcpServer,
  options?: Record<string, unknown>
): McpHttpHandlerLike
