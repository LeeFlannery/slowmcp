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

const slowmcp = await import(distEntry)

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
  )

describe('compiled CoffeeScript artifact', () => {
  it('exports exactly the declared public surface', () => {
    expect(Object.keys(slowmcp).sort()).toEqual([
      'SlowMcpError',
      'assertProtocolPolicy',
      'createHttpHandler',
      'createServer',
      'protocolPolicy',
      'satisfiesProtocolPolicy',
      'testServer',
      'text',
      'version'
    ])
  })

  it('keeps declarations and runtime exports in agreement', () => {
    const declarations = readFileSync(join(packageDir, 'types', 'index.d.ts'), 'utf8')
    const declared = new Set(
      [
        ...declarations.matchAll(
          /^export declare (?:const|function|class|let|var)\s+([A-Za-z_$][\w$]*)/gm
        )
      ].map((match) => match[1])
    )

    expect([...declared].sort()).toEqual(Object.keys(slowmcp).sort())
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
