// Refuses to let a test run start against compiled output that no longer
// matches the CoffeeScript on disk.
//
// Every test suite imports from `dist/`. Without this, editing a `.coffee` and
// running the tests reports green while exercising the previous build, which is
// the most dangerous kind of passing test: it describes code that is gone.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Content hash of every CoffeeScript source, with paths relative to the package
 * directory. Must stay identical to the hash `scripts/build-coffee.mjs` writes.
 */
export const hashSources = (packageDir) => {
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory()
        ? walk(join(dir, entry.name))
        : entry.name.endsWith('.coffee')
          ? [join(dir, entry.name)]
          : []
    )

  const hash = createHash('sha256')
  for (const file of walk(join(packageDir, 'src')).sort()) {
    hash.update(file.slice(packageDir.length + 1))
    hash.update(readFileSync(file))
  }
  return hash.digest('hex')
}

export const assertBuildFresh = (packageDir) => {
  const manifestPath = join(packageDir, '.build-manifest.json')

  if (!existsSync(join(packageDir, 'dist'))) {
    throw new Error(`${join(packageDir, 'dist')} is missing. Run \`pnpm build\` before the tests.`)
  }
  if (!existsSync(manifestPath)) {
    throw new Error(
      `${manifestPath} is missing. Run \`pnpm build\` so the tests can prove they are ` +
        'exercising the current sources.'
    )
  }

  const recorded = JSON.parse(readFileSync(manifestPath, 'utf8')).sourceHash
  const actual = hashSources(packageDir)

  if (recorded !== actual) {
    throw new Error(
      'dist/ is stale: the CoffeeScript sources have changed since the last build, so the tests ' +
        'would pass or fail against code that is no longer on disk. Run `pnpm build`.'
    )
  }
}
