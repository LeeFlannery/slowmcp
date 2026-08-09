// The compiled artifact, exercised from inside the workspace.
//
// The authoritative proof runs against the packed tarball in a clean external
// project (`pnpm slowmcp:check`). This suite catches regressions faster.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const distDir = join(packageDir, 'dist')
const distEntry = join(distDir, 'index.js')

if (!existsSync(distEntry)) {
  throw new Error('dist/index.js is missing, run `pnpm build` before `pnpm test`')
}

const entries = {
  slowmcp: 'index.js',
  'slowmcp/http': 'http.js',
  'slowmcp/testing': 'testing.js',
  'slowmcp/protocol': 'protocol.js'
}
const declarationFiles = {
  slowmcp: 'index.d.ts',
  'slowmcp/http': 'http.d.ts',
  'slowmcp/testing': 'testing.d.ts',
  'slowmcp/protocol': 'protocol.d.ts'
}
const expectedExports = {
  slowmcp: ['SlowMcpError', 'createServer', 'text', 'version'],
  'slowmcp/http': ['createHttpHandler'],
  'slowmcp/testing': ['testServer'],
  'slowmcp/protocol': ['assertProtocolPolicy', 'protocolPolicy', 'satisfiesProtocolPolicy']
}

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
  )

describe('compiled CoffeeScript artifact', () => {
  it.each(Object.keys(entries))('%s exports exactly its public surface', async (specifier) => {
    const loaded = await import(join(distDir, entries[specifier as keyof typeof entries]))
    expect(Object.keys(loaded).sort()).toEqual(expectedExports[specifier as keyof typeof entries])
  })

  it.each(Object.keys(entries))('%s declarations agree with runtime', async (specifier) => {
    const loaded = await import(join(distDir, entries[specifier as keyof typeof entries]))
    const file = declarationFiles[specifier as keyof typeof declarationFiles]
    const declarations = readFileSync(join(packageDir, 'types', file), 'utf8')
    const declared = new Set(
      [
        ...declarations.matchAll(
          /^export declare (?:const|function|class|let|var)\s+([A-Za-z_$][\w$]*)/gm
        )
      ].map((match) => match[1])
    )

    expect([...declared].sort()).toEqual(Object.keys(loaded).sort())
  })

  it('does not re-export subpath surfaces from the root', async () => {
    const root = await import(distEntry)
    for (const leaked of ['createHttpHandler', 'testServer', 'protocolPolicy']) {
      expect(root, leaked).not.toHaveProperty(leaked)
    }
  })

  it('declares an export map entry for every public subpath', () => {
    const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))
    const mapped = Object.keys(manifest.exports)
      .filter((key) => key !== './package.json')
      .map((key) => (key === '.' ? 'slowmcp' : `slowmcp${key.slice(1)}`))
    expect(mapped.sort()).toEqual(Object.keys(entries).sort())
  })

  it('emits ESM across every module, not CommonJS', () => {
    const modules = walk(distDir).filter((file) => file.endsWith('.js'))
    expect(modules.length).toBeGreaterThan(1)

    for (const file of modules) {
      const body = readFileSync(file, 'utf8')
      expect(body, file).not.toMatch(/\brequire\(/)
      expect(body, file).toMatch(/\/\/# sourceMappingURL=/)
    }
  })

  it('ships self-contained source maps for every module', () => {
    for (const file of walk(distDir).filter((f) => f.endsWith('.js.map'))) {
      const map = JSON.parse(readFileSync(file, 'utf8'))
      expect(map.sources.every((source: string) => source.endsWith('.coffee')), file).toBe(true)
      expect(map.sourcesContent?.[0]?.length, file).toBeGreaterThan(0)
    }
  })
})
