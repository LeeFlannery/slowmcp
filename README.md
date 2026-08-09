# SlowMCP

**Blazingly adequate.**

A modern framework for building, testing, and shipping MCP servers.

Written in CoffeeScript.

FastMCP already exists.

## Quickstart

```js
import { createServer, text } from 'slowmcp'
import * as z from 'zod'

export const app = createServer({ name: 'hello-tool', version: '1.0.0' })

app.tool({
  name: 'greet',
  description: 'Greet someone by name.',
  input: z.object({ name: z.string().min(1) }),
  handler: ({ name }) => text(`Hello, ${name}!`)
})
```

Test it through a real MCP client:

```js
import { testServer } from 'slowmcp/testing'
import app from './server.mjs'

const mcp = testServer(app)

await mcp.protocolVersion()          // '2026-07-28', asserted, not assumed
await mcp.tools()                    // [{ name: 'greet', ... }]
await mcp.call('greet', { name: 'Lee' })

await mcp.close()
```

`testServer` is a real official MCP `Client` over the official Streamable HTTP
transport. Connection is lazy, and it asserts SlowMCP's protocol policy before
any of your assertions run.

Serve it:

```js
import { createHttpHandler } from 'slowmcp/http'
export default createHttpHandler(app)
```

## Why this exists

The first thing SlowMCP's test harness caught was that the obvious official
client setup silently negotiated the older protocol.

The first spike passed everything it asserted: right server, right tool, right
result. It was also speaking 2025-11-25 to a server that fully supported
2026-07-28, because the official client's negotiation mode defaults to
`'legacy'`. Nothing errors. Nothing warns. Your tests go green against a
protocol generation you did not mean to test.

Checking for it does not help unless you know the shape of the problem: the SDK
exports `LATEST_PROTOCOL_VERSION` as the *older* revision and leaves 2026-07-28
out of `SUPPORTED_PROTOCOL_VERSIONS` entirely, so the natural assertion passes
too.

So `slowmcp/protocol` states what SlowMCP speaks, `testServer` asserts what was
actually negotiated before you get the connection, and a regression test pins
the whole thing: default client, same handler, lands on the old revision,
passes discovery and invocation, gets caught by the policy.

That is the honest answer to why this exists. The name got your attention. The
harness found a real bug on day one.

Details: [`docs/bootstrap-2026-08.md`](docs/bootstrap-2026-08.md).

## Ship it

```sh
slowmcp check
```

```text
SLOWMCP CHECK

PASS package
PASS protocol
PASS tools
PASS invocation
PASS snapshot
PASS types
PASS coffeescript-containment

7/7 checks passed.

Blazingly adequate.
```

It packs the package, installs the tarball into a clean project, and verifies
it from the outside: every public subpath, protocol negotiation, discovery,
invocation, snapshot semantics, the shipped TypeScript declarations, and the
absence of CoffeeScript.

## Public API

```text
slowmcp            createServer, text, SlowMcpError, version
slowmcp/http       createHttpHandler
slowmcp/testing    testServer
slowmcp/protocol   protocolPolicy, satisfiesProtocolPolicy, assertProtocolPolicy
```

Nine exports. The root is the authoring API and does not re-export the others
for convenience: what you import should say what it does.

## Status

Vertical slice. Tools, Streamable HTTP, and the test harness work end to end
from the packed artifact, and every subpath is proven from the tarball in a
clean external project. Resources, prompts, stdio, and the full CLI are not
built yet.

Measurements in [`VERTICAL_SLICE_FINDINGS.md`](VERTICAL_SLICE_FINDINGS.md).
Design in [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Origin

AI is writing so much code these days. So I wrote SlowMCP in a dead language AI
doesn't know: CoffeeScript. Let's see if THAT cuts down on the AI-generated pull
requests.

## Roadmap

- Tools, resources, and prompts
- stdio and Streamable HTTP
- Protocol-backed test harness
- `slowmcp check`
- Reference implementations
- GitHub Pages documentation
- **TypeScript support: never.**
