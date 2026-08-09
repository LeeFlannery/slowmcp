import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'packages/*/test/**/*.test.ts',
      'fixtures/workspace-consumer/test/**/*.test.ts',
      'spikes/test/**/*.test.ts'
    ],
    // Refuses to run at all when dist/ no longer matches the CoffeeScript.
    globalSetup: ['./scripts/vitest-global-setup.mjs'],
    // Protocol round trips are cheap in-process but not instant.
    testTimeout: 20_000
  }
})
