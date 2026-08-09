// T03 acceptance: `pnpm spike:baseline`
//
// Drives the raw official-SDK server and the FastMCP server with the same
// official MCP Client assertions, across both protocol eras, then reports the
// measurements the comparison harness cares about.
//
// Divergences are recorded, not resolved. Two frameworks presenting the same
// tool differently is a row in the comparison, not a bug in either of them.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  LEGACY,
  MODERN,
  assertEquivalent,
  compareAdvertisedSchemas,
  driveGreetContract
} from './drive-contract.ts'
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

const implementations = [
  { label: 'official-sdk', file: 'raw-sdk-server.ts', fetch: (r: Request) => rawHandler.fetch(r) },
  { label: 'fastmcp', file: 'fastmcp-server.ts', fetch: (r: Request) => fastServer.fetch(r) }
]

try {
  console.log('PASS spike:baseline')

  console.log('\n  protocol eras')
  for (const era of [MODERN, LEGACY]) {
    const observed = await Promise.all(
      implementations.map((impl) => driveGreetContract(impl.label, impl.fetch, era))
    )
    assertEquivalent(observed[0], observed[1])
    const versions = [...new Set(observed.map((o) => o.protocolVersion))]
    console.log(
      `    ${era.name.padEnd(8)} ${versions.join(' / ')}  ` +
        `both implementations equivalent (tools/list, tools/call)`
    )
  }

  const modern = await Promise.all(
    implementations.map((impl) => driveGreetContract(impl.label, impl.fetch, MODERN))
  )

  console.log('\n  authoring size')
  for (const impl of implementations) {
    console.log(
      `    ${impl.label.padEnd(13)} ${significantLines(impl.file)} significant lines (${impl.file})`
    )
  }

  console.log('\n  advertised inputSchema, same Zod validator')
  const labels = implementations.map((i) => i.label)
  const width = Math.max(...labels.map((l) => l.length))
  console.log(`    ${'key'.padEnd(20)} ${labels.map((l) => l.padEnd(width)).join('  ')}`)
  for (const { key, values, agreed } of compareAdvertisedSchemas(...modern)) {
    const cells = labels.map((label) =>
      (values[label] === undefined ? '(absent)' : JSON.stringify(values[label])).padEnd(width)
    )
    console.log(`    ${key.padEnd(20)} ${cells.join('  ')}${agreed ? '' : '   <- differs'}`)
  }
} finally {
  await rawHandler.close()
  await fastServer.close()
}
