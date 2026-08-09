// Compiles packages/slowmcp/src/**/*.coffee to dist/ as ESM with source maps,
// then asserts the artifact invariants the package contract depends on.
//
// Run from the package directory (pnpm --filter slowmcp build).

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

// Resolve from the invoking package, not from this script's location, so the
// compiler comes from the package that declares it as a devDependency.
const require = createRequire(resolve(process.cwd(), 'package.json'))
const coffeeBin = require.resolve('coffeescript/bin/coffee')

const SRC = 'src'
const DIST = 'dist'
const BUILD_MANIFEST = '.build-manifest.json'

/** Content hash of every CoffeeScript source, order-independent. */
const hashSources = (root = SRC) => {
  const walkSources = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? walkSources(join(dir, entry.name))
        : entry.name.endsWith('.coffee')
          ? [join(dir, entry.name)]
          : []
    )

  const hash = createHash('sha256')
  for (const file of walkSources(root).sort()) {
    hash.update(file)
    hash.update(readFileSync(file))
  }
  return hash.digest('hex')
}

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

// The `version` export is hand-written in index.coffee and can silently drift
// from the manifest, which every other guard misses: they compare export
// *names*, never values.
const manifestVersion = JSON.parse(readFileSync('package.json', 'utf8')).version
const declaredVersion = (await import(`${pathToFileURL(resolve(DIST, 'index.js')).href}?v=${Date.now()}`))
  .version

const files = walk(DIST)
const jsFiles = files.filter((f) => f.endsWith('.js'))
const problems = []

if (jsFiles.length === 0) problems.push('no .js emitted into dist/')

if (declaredVersion !== manifestVersion) {
  problems.push(
    `version export is '${declaredVersion}' but package.json is '${manifestVersion}' ` +
      '(update src/index.coffee)'
  )
}

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
    problems.push(`${js}: contains require(), output must be ESM`)
  }

  const map = JSON.parse(readFileSync(mapPath, 'utf8'))
  if (!Array.isArray(map.sourcesContent) || map.sourcesContent.some((s) => !s)) {
    problems.push(`${mapPath}: sourcesContent missing, maps would need shipped .coffee files`)
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

// Record what this build was made from. The test run refuses to start when the
// sources on disk no longer hash to this, so no suite can report green against
// output built from different code.
writeFileSync(
  BUILD_MANIFEST,
  `${JSON.stringify({ sourceHash: hashSources(), modules: jsFiles.length }, null, 2)}\n`
)

console.log(`built ${jsFiles.length} module(s) to ${DIST}/ with source maps`)
