// TypeScript consumer. Compiles and runs against the installed tarball only.
import assert from 'node:assert/strict'

import { greet, version, detonate } from 'slowmcp'

const message: string = greet('Detroit')
const packageVersion: string = version

assert.equal(message, 'Hello, Detroit.')
assert.equal(typeof packageVersion, 'string')

// `detonate` is declared to return `never`, so this branch is unreachable.
function alwaysThrows(): string {
  detonate()
}

assert.throws(alwaysThrows, /detonated/)

console.log('ts-consumer ok')
