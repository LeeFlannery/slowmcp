// Runs inside a clean consumer project that has installed only the packed
// tarball plus its own dependencies. Nothing here may resolve workspace source.
//
// Each named check runs independently and reports its own outcome, so one
// failure does not mask the rest. Results are emitted as a single JSON line
// for the check runner to attribute.

import { createRequire } from 'node:module'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import assert from 'node:assert/strict'

const require = createRequire(import.meta.url)
const results = []

async function check(name, fn) {
  try {
    const detail = await fn()
    results.push({ name, ok: true, detail: detail ?? null })
  } catch (error) {
    results.push({ name, ok: false, detail: error.message })
  }
}

// ---------------------------------------------------------------------------

await check('package', async () => {
  const slowmcp = await import('slowmcp')
  const pkgRoot = dirname(require.resolve('slowmcp/package.json'))
  assert.ok(pkgRoot.includes('node_modules'), `resolved outside node_modules: ${pkgRoot}`)

  const declarations = readFileSync(join(pkgRoot, 'types', 'index.d.ts'), 'utf8')
  const declared = new Set(
    [...declarations.matchAll(/^export declare (?:const|function|class|let|var)\s+([A-Za-z_$][\w$]*)/gm)]
      .map((m) => m[1])
  )
  const runtime = new Set(Object.keys(slowmcp))

  const undeclared = [...runtime].filter((n) => !declared.has(n)).sort()
  const missing = [...declared].filter((n) => !runtime.has(n)).sort()
  assert.deepEqual(undeclared, [], `exported but undeclared: ${undeclared.join(', ')}`)
  assert.deepEqual(missing, [], `declared but not exported: ${missing.join(', ')}`)

  const map = JSON.parse(readFileSync(join(pkgRoot, 'dist', 'index.js.map'), 'utf8'))
  assert.ok(map.sourcesContent?.[0]?.length > 0, 'source map has no sourcesContent')

  return `${runtime.size} exports, declarations agree`
})

await check('protocol', async () => {
  const { createServer, text, testServer, protocolPolicy } = await import('slowmcp')
  const z = await import('zod')

  const app = createServer({ name: 'probe', version: '1.0.0' })
  app.tool({ name: 'ping', input: z.object({}), handler: () => text('pong') })

  const mcp = testServer(app)
  try {
    const negotiated = await mcp.protocolVersion()
    assert.ok(
      protocolPolicy.accepts.includes(negotiated),
      `negotiated ${negotiated}, policy accepts ${protocolPolicy.accepts.join(', ')}`
    )
    return negotiated
  } finally {
    await mcp.close()
  }
})

await check('tools', async () => {
  const { createServer, text, testServer } = await import('slowmcp')
  const z = await import('zod')

  const app = createServer({ name: 'probe', version: '1.0.0' })
  app.tool({
    name: 'greet',
    description: 'Greet someone by name.',
    input: z.object({ name: z.string().min(1).describe('Who to greet.') }),
    handler: ({ name }) => text(`Hello, ${name}!`)
  })

  const mcp = testServer(app)
  try {
    const tools = await mcp.tools()
    assert.deepEqual(tools.map((t) => t.name), ['greet'])
    assert.equal(tools[0].description, 'Greet someone by name.')
    assert.equal(tools[0].inputSchema.type, 'object')
    assert.deepEqual(tools[0].inputSchema.required, ['name'])
    assert.equal(tools[0].inputSchema.properties.name.description, 'Who to greet.')
    return `1 tool discovered with advertised schema`
  } finally {
    await mcp.close()
  }
})

await check('invocation', async () => {
  const { testServer } = await import('slowmcp')
  const { default: app } = await import('./server.mjs')

  const mcp = testServer(app)
  try {
    const result = await mcp.call('greet', { name: 'Lee' })
    assert.notEqual(result.isError, true, 'call reported an error')
    assert.equal(result.content[0].text, 'Hello, Lee!')

    const { createServer, SlowMcpError } = await import('slowmcp')
    const dup = createServer({ name: 'dup', version: '1.0.0' })
    dup.tool({ name: 'a', handler: () => ({ content: [] }) })
    assert.throws(
      () => dup.tool({ name: 'a', handler: () => ({ content: [] }) }),
      (e) => e instanceof SlowMcpError && e.code === 'SLOWMCP_DUPLICATE_DEFINITION'
    )

    return 'greet({ name: "Lee" }) -> "Hello, Lee!"'
  } finally {
    await mcp.close()
  }
})

await check('coffeescript-containment', async () => {
  const pkgRoot = dirname(require.resolve('slowmcp/package.json'))

  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
    )

  const coffee = walk(pkgRoot).filter((f) => f.endsWith('.coffee'))
  assert.deepEqual(coffee, [], `tarball ships CoffeeScript: ${coffee.join(', ')}`)

  assert.ok(
    !existsSync(join(process.cwd(), 'node_modules', 'coffeescript')),
    'coffeescript is installed in the consumer'
  )
  assert.throws(() => require.resolve('coffeescript'), /Cannot find module/)

  const manifest = require('slowmcp/package.json')
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    assert.ok(!(manifest[field] ?? {}).coffeescript, `coffeescript listed in ${field}`)
  }

  // Errors must still map back to CoffeeScript with no .coffee on disk.
  const { text, SlowMcpError } = await import('slowmcp')
  try {
    text(42)
    assert.fail('text(42) did not throw')
  } catch (error) {
    assert.ok(error instanceof SlowMcpError)
    const frame = error.stack.split('\n')[1]
    assert.match(frame, /\.coffee:\d+:\d+/, `stack did not map to CoffeeScript: ${frame}`)
  }

  return 'no .coffee shipped, compiler absent, maps intact'
})

console.log(`SLOWMCP_PROBE ${JSON.stringify(results)}`)
process.exit(results.every((r) => r.ok) ? 0 : 1)
