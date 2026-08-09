// T01 — the compiled artifact, exercised from inside the workspace.
//
// The authoritative proof runs against the packed tarball in a clean external
// project (`pnpm eval:artifact`). This suite catches regressions faster.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const distEntry = join(packageDir, 'dist', 'index.js')

if (!existsSync(distEntry)) {
  throw new Error('dist/index.js is missing — run `pnpm build` before `pnpm test`')
}

const { greet, version, detonate } = await import(distEntry)

describe('compiled CoffeeScript artifact', () => {
  it('exports the declared runtime surface', () => {
    expect(typeof greet).toBe('function')
    expect(typeof detonate).toBe('function')
    expect(typeof version).toBe('string')
  })

  it('behaves deterministically', () => {
    expect(greet('Detroit')).toBe('Hello, Detroit.')
  })

  it('rejects invalid input', () => {
    expect(() => greet('')).toThrow(TypeError)
    expect(() => greet(42)).toThrow(TypeError)
  })

  it('emits ESM, not CommonJS', () => {
    const body = readFileSync(distEntry, 'utf8')
    expect(body).toMatch(/^export /m)
    expect(body).not.toMatch(/\brequire\(/)
  })

  it('ships a self-contained source map', () => {
    const map = JSON.parse(readFileSync(`${distEntry}.map`, 'utf8'))
    expect(map.sources.every((s: string) => s.endsWith('.coffee'))).toBe(true)
    expect(map.sourcesContent?.[0]).toContain('export detonate')
  })

  it('keeps the declaration surface in sync with the runtime exports', () => {
    const declarations = readFileSync(join(packageDir, 'types', 'index.d.ts'), 'utf8')
    for (const name of ['version', 'greet', 'detonate']) {
      expect(declarations).toContain(name)
    }
  })
})
