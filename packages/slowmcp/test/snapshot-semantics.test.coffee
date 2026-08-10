# Frozen contract: a handler serves the snapshot taken when it was created.
#
# `createHttpHandler(app)` captures an immutable snapshot at the call. What a
# running handler serves is therefore fixed at the moment it starts serving,
# rather than depending on when registration happened to run. Registering a
# capability later requires a new handler.
#
# Implementation test: this loads CoffeeScript source, not dist. The compiled
# artifact is covered by artifact.test.ts, the workspace-consumer fixture, and
# `pnpm slowmcp:check`.

import { afterEach, describe, expect, it } from 'vitest'

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

import { createServer, text } from '../src/index.coffee'
import { createHttpHandler } from '../src/http.coffee'
import { testServer } from '../src/testing.coffee'
import { protocolPolicy } from '../src/protocol.coffee'

open = []

afterEach ->
  while open.length > 0
    await open.pop().close().catch -> undefined
  undefined

# Discovers tool names through the official client, against a given handler.
discover = (handler) ->
  redirect = (url, init) -> handler.fetch new Request(url, init)
  transport = new StreamableHTTPClientTransport new URL('http://slowmcp.test/mcp'), { fetch: redirect }
  client = new Client { name: 'snapshot-test', version: '0.0.0' },
    versionNegotiation: { mode: protocolPolicy.negotiation }

  try
    await client.connect transport
    { tools } = await client.listTools()
    (tool.name for tool in tools).sort()
  finally
    await client.close().catch -> undefined

toolNames = (definitions) -> definition.name for definition in definitions

describe 'createHttpHandler snapshot semantics', ->
  it 'serves the snapshot taken at handler creation, not the live registry', ->
    # 1. create app
    app = createServer { name: 'snapshot', version: '1.0.0' }

    # 2. register tool A
    app.tool { name: 'a', handler: -> text 'a' }

    # 3. create handler
    first = createHttpHandler app
    open.push first

    # 4. register tool B
    app.tool { name: 'b', handler: -> text 'b' }

    # 5. connect client to the existing handler
    served = await discover first

    # 6. A exists
    expect(served).toContain 'a'

    # 7. B does not
    expect(served).not.toContain 'b'
    expect(served).toEqual ['a']

    # 8. create a new handler
    second = createHttpHandler app
    open.push second

    # 9. both A and B exist
    expect(await discover second).toEqual ['a', 'b']

  it 'keeps an existing handler stable across repeated connections', ->
    app = createServer { name: 'snapshot', version: '1.0.0' }
    app.tool { name: 'a', handler: -> text 'a' }

    handler = createHttpHandler app
    open.push handler

    expect(await discover handler).toEqual ['a']
    app.tool { name: 'b', handler: -> text 'b' }
    expect(await discover handler).toEqual ['a']

  it 'applies to testServer, which snapshots at construction not at connect', ->
    # testServer builds its handler eagerly, so it inherits the same
    # semantics. Connecting is lazy; snapshotting is not, and the gap between
    # the two is where this would surprise someone.
    app = createServer { name: 'snapshot', version: '1.0.0' }
    app.tool { name: 'a', handler: -> text 'a' }

    mcp = testServer app
    app.tool { name: 'b', handler: -> text 'b' }

    try
      expect(toolNames await mcp.tools()).toEqual ['a']
    finally
      await mcp.close()

    later = testServer app
    try
      expect(toolNames await later.tools()).toEqual ['a', 'b']
    finally
      await later.close()

  it 'exposes the same guarantee through app.snapshot()', ->
    app = createServer { name: 'snapshot', version: '1.0.0' }
    app.tool { name: 'a', handler: -> text 'a' }

    snapshot = app.snapshot()
    app.tool { name: 'b', handler: -> text 'b' }

    expect(toolNames snapshot.tools).toEqual ['a']
    expect(toolNames app.snapshot().tools).toEqual ['a', 'b']
    expect(Object.isFrozen snapshot).toBe true
    expect(Object.isFrozen snapshot.tools).toBe true
