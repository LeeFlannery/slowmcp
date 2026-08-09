// Runs once before any suite. A stale build must stop the entire run, not just
// the suites that happen to assert on it.

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { assertBuildFresh } from './assert-build-fresh.mjs'

export default function setup() {
  const repoRoot = resolve(fileURLToPath(import.meta.url), '../..')
  assertBuildFresh(resolve(repoRoot, 'packages/slowmcp'))
}
