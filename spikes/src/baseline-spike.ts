// T03 acceptance: `pnpm spike:baseline`
//
// Drives the raw official-SDK server and the FastMCP server with the same
// official MCP Client assertions, then asserts they are observationally
// equivalent over the protocol and reports reproducible size measurements.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { assertEquivalent, diffAdvertisedSchemas, driveGreetContract } from './drive-contract.ts'
import { createGreetHandler } from './raw-sdk-server.ts'
import { createGreetServer as createFastMcpServer } from './fastmcp-server.ts'

const here = dirname(fileURLToPath(import.meta.url))

/** Non-blank, non-comment lines: the only line count worth publishing. */
function significantLines(file: string): number {
  return readFileSync(join(here, file), 'utf8')
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      return trimmed.length > 0 && !trimmed.startsWith('//')
    }).length
}

const rawHandler = createGreetHandler()
const fastServer = createFastMcpServer()

try {
  const raw = await driveGreetContract('official-sdk', (request) => rawHandler.fetch(request))
  const fast = await driveGreetContract('fastmcp', (request) => fastServer.fetch(request))

  assertEquivalent(raw, fast)

  const measurements = [
    { impl: 'official-sdk', file: 'raw-sdk-server.ts' },
    { impl: 'fastmcp', file: 'fastmcp-server.ts' }
  ].map(({ impl, file }) => ({ impl, file, lines: significantLines(file) }))

  console.log('PASS spike:baseline')
  console.log(`  protocol      ${raw.protocolVersion} (both)`)
  console.log(`  equivalence   tools/list and tools/call match`)
  for (const m of measurements) {
    console.log(`  ${m.impl.padEnd(13)} ${m.lines} significant lines (${m.file})`)
  }

  const schemaDiff = diffAdvertisedSchemas(raw, fast)
  if (schemaDiff.length === 0) {
    console.log('  inputSchema   identical')
  } else {
    console.log('  inputSchema   differs on advertised keys:')
    for (const { key, ...sides } of schemaDiff) {
      const rendered = Object.entries(sides)
        .map(([impl, value]) => `${impl}=${value === undefined ? '(absent)' : JSON.stringify(value)}`)
        .join('  ')
      console.log(`                ${key}: ${rendered}`)
    }
  }
} finally {
  await rawHandler.close()
  await fastServer.close()
}
