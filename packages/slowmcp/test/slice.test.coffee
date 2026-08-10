# Vertical-slice behaviour: registry, results, and the public testing harness.
#
# Protocol assertions here go through the official MCP Client via testServer.
# Nothing calls an internal handler directly.
#
# Implementation test: this loads CoffeeScript source, not dist. The compiled
# artifact is covered by artifact.test.ts, the workspace-consumer fixture, and
# `pnpm slowmcp:check`.

import { describe, expect, it } from 'vitest'
import * as z from 'zod'

import { createServer, text, SlowMcpError } from '../src/index.coffee'
import { testServer } from '../src/testing.coffee'

greeter = ->
  app = createServer { name: 'greeter', version: '1.0.0' }
  app.tool
    name: 'greet'
    description: 'Greet someone by name.'
    input: z.object { name: z.string().min(1).describe('Who to greet.') }
    handler: ({ name }) -> text "Hello, #{name}!"
  app

toolNames = (tools) -> tool.name for tool in tools

describe 'createServer', ->
  it 'requires metadata', ->
    expect(-> createServer()).toThrow SlowMcpError
    expect(-> createServer { name: 'x' }).toThrow /version/
    expect(-> createServer { version: '1.0.0' }).toThrow /name/
    expect(-> createServer { name: '  ', version: '1.0.0' }).toThrow /name/

  it 'exposes metadata and handler-free diagnostics', ->
    app = greeter()
    expect(app.name).toBe 'greeter'
    expect(app.describe()).toEqual
      name: 'greeter'
      version: '1.0.0'
      tools: [{ name: 'greet', description: 'Greet someone by name.' }]

describe 'app.tool', ->
  it 'is chainable', ->
    app = createServer { name: 'x', version: '1.0.0' }
    expect(app.tool { name: 'a', handler: -> text 'a' }).toBe app

  it 'rejects duplicate names before serving', ->
    app = greeter()
    expect(-> app.tool { name: 'greet', handler: -> text 'again' }).toThrow(
      expect.objectContaining { code: 'SLOWMCP_DUPLICATE_DEFINITION' }
    )

  it 'validates the definition shape', ->
    app = createServer { name: 'x', version: '1.0.0' }
    expect(-> app.tool { handler: -> text 'a' }).toThrow /name/
    expect(-> app.tool { name: 'a' }).toThrow /handler/
    expect(-> app.tool { name: 'a', handler: 'nope' }).toThrow /handler/
    expect(-> app.tool { name: 'a', handler: (-> text 'a'), input: { nope: true } })
      .toThrow /Standard Schema/

  it 'preserves insertion order in the snapshot', ->
    app = createServer { name: 'x', version: '1.0.0' }
    for name in ['c', 'a', 'b']
      do (name) -> app.tool { name, handler: -> text name }
    expect(toolNames app.snapshot().tools).toEqual ['c', 'a', 'b']

  it 'returns a snapshot that later registration cannot mutate', ->
    app = greeter()
    snapshot = app.snapshot()
    app.tool { name: 'later', handler: -> text 'later' }
    expect(snapshot.tools).toHaveLength 1
    expect(Object.isFrozen snapshot).toBe true

describe 'text', ->
  it 'builds an ordinary MCP result', ->
    expect(text 'hi').toEqual { content: [{ type: 'text', text: 'hi' }] }

  it 'refuses non-strings rather than guessing', ->
    expect(-> text 42).toThrow SlowMcpError
    expect(-> text { text: 'hi' }).toThrow /requires a string/

describe 'testServer', ->
  it 'rejects anything that is not a SlowMCP app', ->
    expect(-> testServer {}).toThrow /requires a SlowMCP server/
    expect(-> testServer 'greeter').toThrow SlowMcpError

  it 'discovers tools with their advertised schema', ->
    mcp = testServer greeter()
    try
      tools = await mcp.tools()
      expect(toolNames tools).toEqual ['greet']
      expect(tools[0].inputSchema).toMatchObject
        type: 'object'
        required: ['name']
        properties: { name: { type: 'string', description: 'Who to greet.' } }
    finally
      await mcp.close()

  it 'invokes tools and returns the exact result', ->
    mcp = testServer greeter()
    try
      result = await mcp.call 'greet', { name: 'Lee' }
      expect(result.isError).not.toBe true
      expect(result.content[0]).toEqual { type: 'text', text: 'Hello, Lee!' }
    finally
      await mcp.close()

  it 'exposes the official MCP Client for direct assertions', ->
    mcp = testServer greeter()
    try
      client = await mcp.client()
      expect(client.getServerVersion()).toMatchObject { name: 'greeter', version: '1.0.0' }
    finally
      await mcp.close()

  it 'reuses one connection across operations', ->
    mcp = testServer greeter()
    try
      [a, b] = await Promise.all [mcp.client(), mcp.client()]
      expect(a).toBe b
    finally
      await mcp.close()

  it 'is safe to close without connecting, and twice', ->
    mcp = testServer greeter()
    await expect(mcp.close()).resolves.toBeUndefined()
    await expect(mcp.close()).resolves.toBeUndefined()

  it 'refuses to reconnect after close', ->
    mcp = testServer greeter()
    await mcp.close()
    await expect(mcp.tools()).rejects.toThrow /closed/

  it 'serves a fresh server instance per connection', ->
    app = greeter()
    first = testServer app
    second = testServer app
    try
      expect(await first.protocolVersion()).toBe await second.protocolVersion()
      expect((await first.call('greet', { name: 'A' })).content[0].text).toBe 'Hello, A!'
      expect((await second.call('greet', { name: 'B' })).content[0].text).toBe 'Hello, B!'
    finally
      await first.close()
      await second.close()
