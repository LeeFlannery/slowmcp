// Compiles packages/slowmcp/src/**/*.coffee to dist/ as ESM with source maps,
// then asserts the artifact invariants the package contract depends on.
//
// Run from the package directory (pnpm --filter slowmcp build).

import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { createRequire } from 'node:module'

// Resolve from the invoking package, not from this script's location, so the
// compiler comes from the package that declares it as a devDependency.
const require = createRequire(resolve(process.cwd(), 'package.json'))
const coffeeBin = require.resolve('coffeescript/bin/coffee')

const SRC = 'src'
const DIST = 'dist'

rmSync(DIST, { recursive: true, force: true })

execFileSync(process.execPath, [coffeeBin, '--compile', '--map', '--output', DIST, SRC], {
  stdio: 'inherit'
})

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const files = walk(DIST)
const jsFiles = files.filter((f) => f.endsWith('.js'))
const problems = []

if (jsFiles.length === 0) problems.push('no .js emitted into dist/')

for (const js of jsFiles) {
  const body = readFileSync(js, 'utf8')
  const mapPath = `${js}.map`

  if (!files.includes(mapPath)) {
    problems.push(`${js}: missing ${relative(DIST, mapPath)}`)
    continue
  }
  if (!body.includes(`//# sourceMappingURL=`)) {
    problems.push(`${js}: no sourceMappingURL comment`)
  }
  if (/\brequire\(/.test(body)) {
    problems.push(`${js}: contains require() — output must be ESM`)
  }

  const map = JSON.parse(readFileSync(mapPath, 'utf8'))
  if (!Array.isArray(map.sourcesContent) || map.sourcesContent.some((s) => !s)) {
    problems.push(`${mapPath}: sourcesContent missing — maps would need shipped .coffee files`)
  }
  if (!map.sources?.every((s) => s.endsWith('.coffee'))) {
    problems.push(`${mapPath}: sources do not point at .coffee`)
  }
}

if (problems.length > 0) {
  console.error('build invariants failed:')
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}

console.log(`built ${jsFiles.length} module(s) to ${DIST}/ with source maps`)
