import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import coffeescript from 'coffeescript'
import { defineConfig } from 'vitest/config'

// SlowMCP's own implementation tests are CoffeeScript, because they test
// CoffeeScript. See CLAUDE.md, "Test language policy".
//
// Two hooks are needed, and no more:
//
//   resolveId  CoffeeScript source imports its siblings with `.js`, because
//              that is correct for the compiled output. When the importer is
//              itself `.coffee`, redirect to the `.coffee` sibling so a test
//              loads source rather than requiring a build.
//   transform  compile `.coffee` to ESM, with a real source map so failures
//              point at CoffeeScript lines.
//
// This affects tests only. The published package is still built by
// scripts/build-coffee.mjs, and `coffeescript` stays a development dependency.
const coffee = {
  name: 'slowmcp:coffee',
  enforce: 'pre' as const,

  resolveId(source: string, importer?: string) {
    if (!importer?.endsWith('.coffee')) return null
    if (!source.startsWith('.') || !source.endsWith('.js')) return null

    const sibling = resolve(dirname(importer), source.replace(/\.js$/, '.coffee'))
    return existsSync(sibling) ? sibling : null
  },

  transform(code: string, id: string) {
    if (!id.endsWith('.coffee')) return null

    const { js, v3SourceMap } = coffeescript.compile(code, {
      bare: true,
      filename: id,
      sourceMap: true
    })

    return { code: js, map: JSON.parse(v3SourceMap) }
  }
}

export default defineConfig({
  plugins: [coffee],
  test: {
    include: [
      'packages/*/test/**/*.test.ts',
      'packages/*/test/**/*.test.coffee',
      'fixtures/workspace-consumer/test/**/*.test.ts',
      'spikes/test/**/*.test.ts'
    ],
    // Refuses to run at all when dist/ no longer matches the CoffeeScript.
    globalSetup: ['./scripts/vitest-global-setup.mjs'],
    // Protocol round trips are cheap in-process but not instant.
    testTimeout: 20_000
  }
})
