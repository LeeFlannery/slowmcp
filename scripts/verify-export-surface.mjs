// Compares the names the built module actually exports against the value-level
// names declared in types/index.d.ts, in both directions.
//
// CoffeeScript emits no declarations, so nothing else stops the two from
// drifting. This is the cheap automated half; the contract fixtures compiled
// against the packed tarball are the thorough half.
//
// Usage: node scripts/verify-export-surface.mjs <path-to-package-root>

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'

const packageRoot = resolve(process.argv[2] ?? 'packages/slowmcp')
const entry = join(packageRoot, 'dist', 'index.js')
const declarations = join(packageRoot, 'types', 'index.d.ts')

const runtime = new Set(Object.keys(await import(pathToFileURL(entry).href)))

// Value-level declarations only. Types and interfaces have no runtime
// counterpart and are excluded by construction.
const source = readFileSync(declarations, 'utf8')
const declared = new Set(
  [...source.matchAll(/^export declare (?:const|function|class|let|var)\s+([A-Za-z_$][\w$]*)/gm)].map(
    (match) => match[1]
  )
)

const undeclared = [...runtime].filter((name) => !declared.has(name)).sort()
const unimplemented = [...declared].filter((name) => !runtime.has(name)).sort()

if (undeclared.length > 0 || unimplemented.length > 0) {
  console.error('export surface mismatch:')
  for (const name of undeclared) console.error(`  - ${name}: exported at runtime, not declared`)
  for (const name of unimplemented) console.error(`  - ${name}: declared, missing at runtime`)
  process.exit(1)
}

console.log(`export surface ok: ${declared.size} value exports agree`)
for (const name of [...declared].sort()) console.log(`  ${name}`)
