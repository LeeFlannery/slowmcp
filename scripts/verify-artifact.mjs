// T01 — CoffeeScript artifact proof.
//
// Builds and packs `slowmcp`, installs the tarball into a clean project outside
// the workspace, and proves the whole seam from one end to the other:
//
//   .coffee -> ESM -> source map -> package export -> .d.ts -> external consumer
//
// The consumer never installs CoffeeScript.

import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(import.meta.url), '../..')
const packageDir = join(repoRoot, 'packages', 'slowmcp')
const fixtureDir = join(repoRoot, 'fixtures', 'artifact-consumer')

const KEEP = process.argv.includes('--keep')
const consumerDir = mkdtempSync(join(tmpdir(), 'slowmcp-artifact-'))

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, CI: '1' } })

const capture = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', env: { ...process.env, CI: '1' } })

function step(name, fn) {
  process.stdout.write(`\n── ${name}\n`)
  fn()
}

try {
  step('build', () => run('pnpm', ['--filter', 'slowmcp', 'build'], repoRoot))

  let tarball
  step('pack', () => {
    run('pnpm', ['pack', '--pack-destination', consumerDir], packageDir)
    const found = readdirSync(consumerDir).filter((f) => f.endsWith('.tgz'))
    if (found.length !== 1) throw new Error(`expected exactly one tarball, got ${found}`)
    tarball = join(consumerDir, found[0])
    console.log(`packed ${found[0]}`)
  })

  step('tarball contents', () => {
    const listing = capture('tar', ['-tzf', tarball], consumerDir)
    const entries = listing.split('\n').filter(Boolean)
    const coffee = entries.filter((e) => e.endsWith('.coffee'))
    if (coffee.length > 0) throw new Error(`tarball ships CoffeeScript sources: ${coffee}`)
    console.log(entries.map((e) => `  ${e}`).join('\n'))
  })

  step('scaffold clean consumer', () => {
    cpSync(fixtureDir, consumerDir, { recursive: true })
    writeFileSync(
      join(consumerDir, 'package.json'),
      `${JSON.stringify(
        {
          name: 'slowmcp-artifact-consumer',
          private: true,
          version: '0.0.0',
          type: 'module',
          dependencies: { slowmcp: `file:${tarball}` },
          devDependencies: { '@types/node': '26.2.0', typescript: '7.0.2' }
        },
        null,
        2
      )}\n`
    )
    // A bare npm project outside the workspace: no pnpm workspace linking, no
    // hoisted repo devDependencies, no chance of resolving workspace source.
    writeFileSync(join(consumerDir, '.npmrc'), 'package-lock=false\naudit=false\nfund=false\n')
    console.log(consumerDir)
  })

  step('install tarball', () => run('npm', ['install', '--no-package-lock'], consumerDir))

  step('js consumer', () => run('node', ['--enable-source-maps', 'consumer.mjs'], consumerDir))

  step('ts consumer typecheck', () =>
    run(join(consumerDir, 'node_modules', '.bin', 'tsc'), ['--project', 'tsconfig.json'], consumerDir))

  step('ts consumer run', () =>
    run('node', ['--experimental-strip-types', '--enable-source-maps', 'consumer.ts'], consumerDir))

  console.log('\nPASS artifact')
  console.log('CoffeeScript remains contained.')
} finally {
  if (KEEP) console.log(`\nkept ${consumerDir}`)
  else rmSync(consumerDir, { recursive: true, force: true })
}
