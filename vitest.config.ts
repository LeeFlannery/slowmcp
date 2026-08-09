import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.ts', 'spikes/test/**/*.test.ts'],
    // Protocol round trips are cheap in-process but not instant.
    testTimeout: 20_000
  }
})
