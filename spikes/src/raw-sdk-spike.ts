// T02 acceptance: `pnpm spike:mcp`
//
// Proves both protocol eras end to end with the official Client against a raw
// official-SDK server. Each run states the era it wants and the harness fails
// unless that era is what actually got negotiated.

import { LEGACY, MODERN, driveGreetContract } from './drive-contract.ts'
import { createGreetHandler } from './raw-sdk-server.ts'

const handler = createGreetHandler()

try {
  const modern = await driveGreetContract('official-sdk', (r) => handler.fetch(r), MODERN)
  const legacy = await driveGreetContract('official-sdk', (r) => handler.fetch(r), LEGACY)

  console.log('PASS spike:mcp')
  console.log(`  server        ${modern.serverInfo?.name}@${modern.serverInfo?.version}`)
  for (const observed of [modern, legacy]) {
    console.log(
      `  ${observed.era.padEnd(13)} negotiated ${observed.protocolVersion} · ` +
        `tools/list ${observed.toolNames.join(', ')} · tools/call ${observed.text}`
    )
  }
} finally {
  await handler.close()
}
