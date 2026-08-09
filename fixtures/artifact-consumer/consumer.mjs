// Plain JavaScript ESM consumer. Runs against the installed tarball only.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { greet, version, detonate } from 'slowmcp'

assert.equal(greet('Detroit'), 'Hello, Detroit.')
assert.equal(typeof version, 'string')
assert.throws(() => greet(''), TypeError)

// The package must resolve from node_modules, not from workspace source.
const require = createRequire(import.meta.url)
const pkgJson = require.resolve('slowmcp/package.json')
const pkgRoot = dirname(pkgJson)
assert.ok(pkgRoot.includes('node_modules'), `expected node_modules resolution, got ${pkgRoot}`)

// Containment: no .coffee file may exist in the installed package, and the
// coffeescript compiler must not be installed anywhere in the tree.
function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const shipped = walk(pkgRoot)
const coffeeFiles = shipped.filter((f) => f.endsWith('.coffee'))
assert.deepEqual(coffeeFiles, [], `packed artifact ships CoffeeScript sources: ${coffeeFiles}`)

const nodeModules = join(process.cwd(), 'node_modules')
assert.ok(!existsSync(join(nodeModules, 'coffeescript')), 'coffeescript was installed by the consumer')
assert.throws(() => require.resolve('coffeescript'), /Cannot find module/)

// Source maps must be shipped and self-contained.
const mapPath = join(pkgRoot, 'dist', 'index.js.map')
assert.ok(existsSync(mapPath), 'dist/index.js.map missing from tarball')
const map = JSON.parse(readFileSync(mapPath, 'utf8'))
assert.ok(Array.isArray(map.sourcesContent) && map.sourcesContent[0].includes('export detonate'))

// Errors must map back to CoffeeScript line numbers with no .coffee on disk.
try {
  detonate()
  assert.fail('detonate() did not throw')
} catch (error) {
  const frame = error.stack.split('\n')[1]
  assert.match(frame, /index\.coffee:\d+:\d+/, `stack did not map to CoffeeScript: ${frame}`)
}

console.log('js-consumer ok')
