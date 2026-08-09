// Compares, for every public subpath, the names the built entry actually
// exports against the value-level names its declaration file promises. Both
// directions, no exceptions.
//
// CoffeeScript emits no declarations, so nothing else stops the two from
// drifting. This is the cheap automated half; the contract fixtures compiled
// against the packed tarball are the thorough half.
//
// Usage: node scripts/verify-export-surface.mjs [package-root]

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'

const packageRoot = resolve(process.argv[2] ?? 'packages/slowmcp')
const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))

/** Value-level declarations only; types and interfaces have no runtime twin. */
const declaredNames = (file) => {
  const source = readFileSync(join(packageRoot, file), 'utf8')
  return new Set(
    [
      ...source.matchAll(/^export declare (?:const|function|class|let|var)\s+([A-Za-z_$][\w$]*)/gm)
    ].map((match) => match[1])
  )
}

// `./package.json` is a raw file passthrough with no surface of its own; every
// other entry is a public subpath and must be fully declared. An entry missing
// `types` or a runtime target is a failure, never a skip: silently passing over
// it is exactly how an undeclared subpath would ship.
const subpaths = Object.entries(manifest.exports)
  .filter(([subpath]) => subpath !== './package.json')
  .map(([subpath, target]) => ({
    specifier: subpath === '.' ? manifest.name : `${manifest.name}${subpath.slice(1)}`,
    runtime: typeof target === 'object' ? (target.import ?? target.default) : undefined,
    types: typeof target === 'object' ? target.types : undefined
  }))

const problems = []

if (subpaths.length === 0) {
  problems.push('no public subpaths found in the export map')
}

for (const { specifier, runtime, types } of subpaths) {
  if (!types) problems.push(`${specifier}: export map entry has no \`types\` condition`)
  if (!runtime) problems.push(`${specifier}: export map entry has no import/default target`)
}

if (problems.length > 0) {
  console.error('export map incomplete:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

const report = []

for (const { specifier, runtime, types } of subpaths) {
  const exported = new Set(
    Object.keys(await import(pathToFileURL(join(packageRoot, runtime)).href))
  )
  const declared = declaredNames(types)

  for (const name of [...exported].filter((n) => !declared.has(n)).sort()) {
    problems.push(`${specifier}: ${name} exported at runtime, not declared in ${types}`)
  }
  for (const name of [...declared].filter((n) => !exported.has(n)).sort()) {
    problems.push(`${specifier}: ${name} declared in ${types}, missing at runtime`)
  }

  report.push({ specifier, names: [...declared].sort() })
}

if (problems.length > 0) {
  console.error('export surface mismatch:')
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

const total = report.reduce((sum, entry) => sum + entry.names.length, 0)
console.log(`export surface ok: ${subpaths.length} subpaths, ${total} value exports agree`)
for (const { specifier, names } of report) {
  console.log(`  ${specifier}`)
  for (const name of names) console.log(`    ${name}`)
}
