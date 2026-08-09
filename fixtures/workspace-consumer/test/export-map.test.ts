// Resolution context: a linked workspace dependency.
//
// The package's own test suite loads `dist/*.js` by file path, which never
// invokes Node's export-map resolution. This fixture imports `slowmcp` and its
// subpaths as a dependant would, so a broken or mistyped `exports` target fails
// here rather than surviving until the packed check.
//
// Subpaths are enumerated from the export map. What each one exports is
// asserted from an independently maintained list.

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

import { EXPECTED_SURFACE } from '../expected-surface.mjs'

const require = createRequire(import.meta.url)
const manifestPath = require.resolve('slowmcp/package.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

/** Every public subpath the package actually advertises. */
const advertised = Object.keys(manifest.exports)
  .filter((subpath) => subpath !== './package.json')
  .map((subpath) => (subpath === '.' ? 'slowmcp' : `slowmcp${subpath.slice(1)}`))
  .sort()

describe('export map, resolved as a dependency', () => {
  it('is reached through the export map, not by walking into the package', () => {
    // Subpath specifiers resolve only because `exports` maps them.
    expect(require.resolve('slowmcp/testing')).toMatch(/dist[/\\]testing\.js$/)

    // And the map is authoritative: internal paths it does not list are
    // unreachable, which is what makes the public surface a real boundary.
    expect(() => require.resolve('slowmcp/dist/testing.js')).toThrow(/is not defined by "exports"/)
    expect(() => require.resolve('slowmcp/src/testing/test-server.coffee')).toThrow()
  })

  it('advertises exactly the subpaths the surface list covers', () => {
    // Enumerated from the map, compared against the independent list. A new
    // subpath fails until someone writes down what it is supposed to export.
    expect(advertised).toEqual(Object.keys(EXPECTED_SURFACE).sort())
  })

  it.each(advertised)('%s is importable by specifier', async (specifier) => {
    await expect(import(specifier)).resolves.toBeDefined()
  })

  it.each(advertised)('%s exports exactly its documented surface', async (specifier) => {
    const loaded = await import(specifier)
    expect(Object.keys(loaded).sort()).toEqual(
      [...EXPECTED_SURFACE[specifier as keyof typeof EXPECTED_SURFACE]].sort()
    )
  })

  it('does not re-export subpath surfaces from the root', async () => {
    const root = await import('slowmcp')
    for (const leaked of ['createHttpHandler', 'testServer', 'protocolPolicy']) {
      expect(root, leaked).not.toHaveProperty(leaked)
    }
  })

  it('works end to end through resolved specifiers only', async () => {
    const { createServer, text } = await import('slowmcp')
    const { testServer } = await import('slowmcp/testing')
    const { protocolPolicy } = await import('slowmcp/protocol')
    const z = await import('zod')

    const app = createServer({ name: 'workspace-consumer', version: '1.0.0' })
    app.tool({
      name: 'greet',
      input: z.object({ name: z.string() }),
      handler: ({ name }: { name: string }) => text(`Hello, ${name}!`)
    })

    const mcp = testServer(app)
    try {
      expect(protocolPolicy.accepts).toContain(await mcp.protocolVersion())
      const result = await mcp.call('greet', { name: 'Lee' })
      expect(result.content?.[0]?.text).toBe('Hello, Lee!')
    } finally {
      await mcp.close()
    }
  })
})
