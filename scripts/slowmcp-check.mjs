// A first `slowmcp check`.
//
// This proves the command concept for the vertical slice: it verifies the built
// package from the outside, in a clean consumer project that has installed only
// the packed tarball. It is not the final CLI and is not shipped as a bin yet.
//
// Output is deterministic and machine-checkable. Exit code is 0 only when every
// check passes.

import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(import.meta.url), '../..')
const packageDir = join(repoRoot, 'packages', 'slowmcp')
const fixtureDir = join(repoRoot, 'fixtures', 'packed-consumer')
const exampleDir = join(repoRoot, 'examples', 'hello-tool')

const QUIET = process.argv.includes('--quiet')
const KEEP = process.argv.includes('--keep')
const JSON_OUT = process.argv.includes('--json')

// The check names, in report order. Fixed so snapshots stay stable.
const ORDER = ['package', 'protocol', 'tools', 'invocation', 'types', 'coffeescript-containment']

const consumerDir = mkdtempSync(join(tmpdir(), 'slowmcp-check-'))
const results = new Map(ORDER.map((name) => [name, { ok: false, detail: 'not run' }]))
const record = (name, ok, detail) => results.set(name, { ok, detail })

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: 'pipe', env: { ...process.env, CI: '1' } })

const verbose = (message) => {
  if (!QUIET && !JSON_OUT) process.stderr.write(`${message}\n`)
}

let tarballBytes = 0
let tarballEntries = []

try {
  verbose('building')
  run('pnpm', ['--filter', 'slowmcp', 'build'], repoRoot)

  verbose('packing')
  run('pnpm', ['pack', '--pack-destination', consumerDir], packageDir)
  const tarball = join(consumerDir, readdirSync(consumerDir).find((f) => f.endsWith('.tgz')))
  tarballBytes = statSync(tarball).size
  tarballEntries = run('tar', ['-tzf', tarball], consumerDir).split('\n').filter(Boolean).sort()

  verbose('installing into a clean consumer')
  cpSync(fixtureDir, consumerDir, { recursive: true })
  cpSync(join(exampleDir, 'server.mjs'), join(consumerDir, 'server.mjs'))
  cpSync(join(exampleDir, 'verify.mjs'), join(consumerDir, 'verify.mjs'))
  writeFileSync(
    join(consumerDir, 'package.json'),
    `${JSON.stringify(
      {
        name: 'slowmcp-check-consumer',
        private: true,
        version: '0.0.0',
        type: 'module',
        dependencies: { slowmcp: `file:${tarball}`, zod: '4.4.3' },
        devDependencies: { '@types/node': '26.2.0', typescript: '7.0.2' }
      },
      null,
      2
    )}\n`
  )
  writeFileSync(join(consumerDir, '.npmrc'), 'package-lock=false\naudit=false\nfund=false\n')
  run('npm', ['install', '--no-package-lock'], consumerDir)

  // --- runtime checks, reported individually by the probe -------------------
  let probeOutput = ''
  try {
    probeOutput = run('node', ['--enable-source-maps', 'probe.mjs'], consumerDir)
  } catch (error) {
    probeOutput = error.stdout ?? ''
  }
  const line = probeOutput.split('\n').find((l) => l.startsWith('SLOWMCP_PROBE '))
  if (line) {
    for (const { name, ok, detail } of JSON.parse(line.slice('SLOWMCP_PROBE '.length))) {
      record(name, ok, detail)
    }
  } else {
    for (const name of ORDER) if (name !== 'types') record(name, false, 'probe produced no result')
  }

  // --- the reference example, driven through the public testing API ---------
  if (results.get('invocation').ok) {
    try {
      const output = run('node', ['verify.mjs'], consumerDir).trim().split('\n')[0]
      record('invocation', true, `${results.get('invocation').detail}; ${output}`)
    } catch (error) {
      record('invocation', false, `hello-tool failed: ${(error.stderr ?? error.message).trim().split('\n').pop()}`)
    }
  }

  // --- type contract --------------------------------------------------------
  try {
    run(join(consumerDir, 'node_modules', '.bin', 'tsc'), ['--project', 'tsconfig.json'], consumerDir)
    run('node', ['--experimental-strip-types', 'consumer.ts'], consumerDir)
    record('types', true, 'packed declarations compile, inference and negative fixtures hold')
  } catch (error) {
    const output = (error.stdout || error.stderr || error.message).trim().split('\n')
    record('types', false, output[0])
  }
} catch (error) {
  const detail = (error.stderr || error.message).trim().split('\n').pop()
  for (const [name, value] of results) if (value.detail === 'not run') record(name, false, detail)
} finally {
  if (KEEP) verbose(`kept ${consumerDir}`)
  else rmSync(consumerDir, { recursive: true, force: true })
}

// --- report -----------------------------------------------------------------

const passed = ORDER.filter((name) => results.get(name).ok).length
const ok = passed === ORDER.length

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        ok,
        passed,
        total: ORDER.length,
        checks: ORDER.map((name) => ({ name, ...results.get(name) })),
        artifact: { bytes: tarballBytes, entries: tarballEntries }
      },
      null,
      2
    )
  )
} else {
  console.log('SLOWMCP CHECK')
  console.log('')
  for (const name of ORDER) {
    const { ok: passing, detail } = results.get(name)
    console.log(`${passing ? 'PASS' : 'FAIL'} ${name}`)
    if (!QUIET && detail) console.log(`     ${detail}`)
  }
  console.log('')
  console.log(`${passed}/${ORDER.length} checks passed.`)
  console.log('')
  console.log(ok ? 'Blazingly adequate.' : 'Not ready to ship.')
}

process.exit(ok ? 0 : 1)
