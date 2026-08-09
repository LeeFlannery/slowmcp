// T02 acceptance: `pnpm spike:mcp`
//
// Proves the modern Streamable HTTP path end to end with the official Client
// against a raw official-SDK server. Exits non-zero on any mismatch.

import { driveGreetContract } from './drive-contract.ts'
import { createGreetHandler } from './raw-sdk-server.ts'

const handler = createGreetHandler()

try {
  const observed = await driveGreetContract('official-sdk', (request) => handler.fetch(request))

  console.log('PASS spike:mcp')
  console.log(`  protocol      ${observed.protocolVersion}`)
  console.log(`  server        ${observed.serverInfo?.name}@${observed.serverInfo?.version}`)
  console.log(`  tools/list    ${observed.toolNames.join(', ')}`)
  console.log(`  tools/call    ${observed.text}`)
} finally {
  await handler.close()
}
