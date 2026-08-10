// The one authoritative answer to "is Phase 1 complete, may Phase 2 begin?"
//
// This composes commands that already exist. It verifies nothing itself, on
// purpose: a readiness gate that reimplements a check can pass while the real
// check is broken. Every line below shells out to the gate that owns the
// contract, and the mapping from contract to owner is in
// .local/CLAUDE_CODE_BUILD_PLAN.md.
//
// `slowmcp:check` rebuilds and repacks rather than trusting this process's
// dist. That duplication is deliberate: it is the only gate that sees the
// package the way an external consumer does.

import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(import.meta.url), '../..')

// In order. `build+test` gates the rest: every later command reads dist/, so
// running them against a failed build reports noise instead of findings.
const GATES = [
  {
    name: 'build+test',
    argv: ['test'],
    covers: 'CoffeeScript build and artifact invariants, 72 unit/integration tests, protocol policy, modern HTTP round trip, snapshot semantics'
  },
  {
    name: 'typecheck',
    argv: ['typecheck'],
    covers: 'declarations, package test project, workspace-consumer fixture, spikes'
  },
  {
    name: 'export-surface',
    argv: ['eval:export-surface'],
    covers: 'runtime exports against declared exports, both directions, every subpath'
  },
  {
    name: 'reference',
    argv: ['ref:hello'],
    covers: 'hello-tool self-verifies through workspace resolution'
  },
  {
    name: 'packed-consumer',
    argv: ['slowmcp:check'],
    covers: 'pack, install into a clean external project, seven outside-in checks including CoffeeScript containment'
  }
]

const results = []

for (const gate of GATES) {
  process.stderr.write(`running ${gate.name}\n`)
  const { status } = spawnSync('pnpm', gate.argv, { cwd: repoRoot, stdio: 'inherit' })
  results.push({ ...gate, ok: status === 0 })
  if (status !== 0 && gate.name === 'build+test') break
}

const ok = results.length === GATES.length && results.every((gate) => gate.ok)

console.log('')
console.log('PHASE 2 READINESS')
console.log('')
for (const gate of GATES) {
  const result = results.find((candidate) => candidate.name === gate.name)
  console.log(`${result ? (result.ok ? 'PASS' : 'FAIL') : 'SKIP'} ${gate.name}`)
  console.log(`     ${result ? gate.covers : 'not run, an earlier gate failed'}`)
}
console.log('')
console.log(
  ok
    ? `${GATES.length}/${GATES.length} gates passed. Phase 1 is complete. Phase 2 may begin.`
    : 'Phase 1 is not complete. Do not start Phase 2.'
)

process.exit(ok ? 0 : 1)
