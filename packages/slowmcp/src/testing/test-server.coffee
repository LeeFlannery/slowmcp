# The public application test harness.
#
# This is a product feature, not test-only plumbing. It drives the application
# through a real official MCP `Client` over the official Streamable HTTP client
# transport; only the transport's `fetch` is redirected at the in-process
# handler, so negotiation, framing, and session semantics are the SDK's.
#
# The harness never accepts whatever revision the client's defaults happen to
# produce. It states the negotiation it wants, captures what actually happened,
# and refuses to hand back a connection that falls outside SlowMCP's policy.

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

import { assertProtocolPolicy, protocolPolicy } from '../protocol/compatibility.js'
import { createHttpHandler } from '../transports/http.js'
import { SlowMcpError } from '../errors/slowmcp-error.js'

# Never dialled. It exists only to satisfy the transport's URL handling.
TEST_ENDPOINT = new URL 'http://slowmcp.test/mcp'

export testServer = (app, options = {}) ->
  unless app? and typeof app.snapshot is 'function'
    throw new SlowMcpError 'testServer(app) requires a SlowMCP server', 'SLOWMCP_INVALID_APP'

  handler = createHttpHandler app
  clientInfo = options.client ? { name: 'slowmcp-test-client', version: '0.0.0' }

  # Holds the in-flight or settled connection promise, never the resolved value.
  connecting = null
  closed = false

  openSession = ->
    transport = new StreamableHTTPClientTransport TEST_ENDPOINT,
      fetch: (input, init) -> handler.fetch new Request(input, init)

    client = new Client clientInfo, versionNegotiation: { mode: protocolPolicy.negotiation }

    try
      await client.connect transport
      negotiated = transport.protocolVersion
      # Asserted before the caller can run a single assertion of their own.
      assertProtocolPolicy negotiated, 'testServer'
      { client, transport, protocolVersion: negotiated }
    catch error
      await client.close().catch -> undefined
      throw error

  connect = ->
    throw new SlowMcpError 'testServer has been closed', 'SLOWMCP_CLOSED' if closed

    unless connecting?
      # A failed connection is not cached: the next call retries rather than
      # replaying a stale rejection.
      connecting = openSession().catch (error) ->
        connecting = null
        throw error

    connecting

  harness =
    # The official MCP Client, for assertions the sugar does not cover.
    client: -> (await connect()).client

    # The revision actually negotiated. Exposed for tests and diagnostics.
    protocolVersion: -> (await connect()).protocolVersion

    tools: ->
      { client } = await connect()
      { tools } = await client.listTools()
      tools

    call: (name, args = {}) ->
      { client } = await connect()
      await client.callTool { name, arguments: args }

    close: ->
      closed = true
      pending = connecting
      connecting = null

      if pending?
        session = await pending.catch -> null
        await session.client.close().catch(-> undefined) if session?

      await handler.close().catch -> undefined
      undefined

  harness
