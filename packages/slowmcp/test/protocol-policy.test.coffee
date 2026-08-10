# SlowMCP's protocol compatibility policy, and the bug it exists to prevent.
#
# Bootstrap found that the official client negotiates 2025-11-25 by default
# against a fully modern server, and that every capability assertion still
# passes. These tests pin both halves: the default really is the old revision,
# and SlowMCP really does refuse it.
#
# Implementation test: this loads CoffeeScript source, not dist. The compiled
# artifact is covered by artifact.test.ts, the workspace-consumer fixture, and
# `pnpm slowmcp:check`.

import { afterEach, describe, expect, it } from 'vitest'
import * as z from 'zod'

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

import { createServer, text, SlowMcpError } from '../src/index.coffee'
import { createHttpHandler } from '../src/http.coffee'
import { testServer } from '../src/testing.coffee'
import { protocolPolicy, satisfiesProtocolPolicy, assertProtocolPolicy } from '../src/protocol.coffee'

# The revision observed during bootstrap when the SDK default is relied on.
SDK_DEFAULT_REVISION = '2025-11-25'

greeter = ->
  app = createServer { name: 'greeter', version: '1.0.0' }
  app.tool
    name: 'greet'
    input: z.object { name: z.string() }
    handler: ({ name }) -> text "Hello, #{name}!"
  app

toolNames = (tools) -> tool.name for tool in tools

openHandlers = []

afterEach ->
  while openHandlers.length > 0
    await openHandlers.pop().close().catch -> undefined
  undefined

describe 'protocolPolicy', ->
  it 'is a SlowMCP-owned literal, not derived from SDK constants', ->
    expect(protocolPolicy.accepts).toEqual ['2026-07-28']
    expect(protocolPolicy.preferred).toBe '2026-07-28'
    expect(protocolPolicy.negotiation).toBe 'auto'

  it 'is frozen, so a dependency cannot widen it at runtime', ->
    expect(Object.isFrozen protocolPolicy).toBe true
    expect(Object.isFrozen protocolPolicy.accepts).toBe true

  it 'does not accept the revision the SDK default would produce', ->
    expect(protocolPolicy.accepts).not.toContain SDK_DEFAULT_REVISION
    expect(satisfiesProtocolPolicy SDK_DEFAULT_REVISION).toBe false
    expect(satisfiesProtocolPolicy undefined).toBe false
    expect(satisfiesProtocolPolicy '2026-07-28').toBe true

  it 'throws with an actionable message outside the policy', ->
    expect(-> assertProtocolPolicy(SDK_DEFAULT_REVISION, 'testServer')).toThrow SlowMcpError
    expect(-> assertProtocolPolicy(SDK_DEFAULT_REVISION, 'testServer'))
      .toThrow /testServer negotiated MCP protocol 2025-11-25.*outside SlowMCP's compatibility policy/s
    expect(assertProtocolPolicy '2026-07-28').toBe '2026-07-28'

describe 'testServer negotiation', ->
  it 'negotiates the modern revision and exposes it', ->
    mcp = testServer greeter()
    try
      expect(await mcp.protocolVersion()).toBe '2026-07-28'
    finally
      await mcp.close()

  # Without this, nothing proves testServer is wired to the policy at all.
  # Deleting the assertProtocolPolicy call from test-server.coffee leaves every
  # other test in the repository green, because negotiation genuinely succeeds
  # and no other test ever presents a session that violates the policy.
  #
  # `protocolVersion` is a configurable prototype getter on the official
  # transport, so a real connection can be made to report an unacceptable
  # revision without stubbing SlowMCP itself.
  describe 'when the session negotiated an unacceptable revision', ->
    descriptor = Object.getOwnPropertyDescriptor(
      StreamableHTTPClientTransport.prototype
      'protocolVersion'
    )

    forceRevision = (revision) ->
      Object.defineProperty StreamableHTTPClientTransport.prototype, 'protocolVersion',
        configurable: true
        get: -> revision

    afterEach ->
      Object.defineProperty StreamableHTTPClientTransport.prototype, 'protocolVersion', descriptor

    it 'refuses the connection instead of handing it back', ->
      forceRevision SDK_DEFAULT_REVISION
      mcp = testServer greeter()
      try
        await expect(mcp.protocolVersion()).rejects.toThrow SlowMcpError
        await expect(mcp.protocolVersion()).rejects
          .toThrow /testServer negotiated MCP protocol 2025-11-25/
      finally
        await mcp.close()

    it 'refuses every operation, not just the version accessor', ->
      forceRevision SDK_DEFAULT_REVISION
      mcp = testServer greeter()
      try
        await expect(mcp.tools()).rejects.toThrow /compatibility policy/
        await expect(mcp.call 'greet', { name: 'Lee' }).rejects.toThrow /compatibility policy/
        await expect(mcp.client()).rejects.toThrow /compatibility policy/
      finally
        await mcp.close()

    it 'refuses an unknown future revision too, not just the known-bad one', ->
      forceRevision '2099-01-01'
      mcp = testServer greeter()
      try
        await expect(mcp.tools()).rejects.toThrow /negotiated MCP protocol 2099-01-01/
      finally
        await mcp.close()

describe 'regression: relying on the SDK default', ->
  it 'negotiates the older revision against the very same SlowMCP handler', ->
    handler = createHttpHandler greeter()
    openHandlers.push handler

    redirect = (url, init) -> handler.fetch new Request(url, init)
    transport = new StreamableHTTPClientTransport new URL('http://slowmcp.test/mcp'), { fetch: redirect }

    # Constructed the obvious way: no versionNegotiation option at all.
    client = new Client { name: 'default-client', version: '0.0.0' }

    try
      await client.connect transport

      # 1. The default really does land on the old era.
      expect(transport.protocolVersion).toBe SDK_DEFAULT_REVISION

      # 2. Every capability assertion still passes, which is why this is
      #    dangerous rather than merely wrong.
      { tools } = await client.listTools()
      expect(toolNames tools).toEqual ['greet']
      result = await client.callTool { name: 'greet', arguments: { name: 'Lee' } }
      expect(result.content[0].text).toBe 'Hello, Lee!'

      # 3. SlowMCP's policy is what catches it.
      expect(satisfiesProtocolPolicy transport.protocolVersion).toBe false
      expect(-> assertProtocolPolicy(transport.protocolVersion, 'testServer')).toThrow SlowMcpError
    finally
      await client.close().catch -> undefined
