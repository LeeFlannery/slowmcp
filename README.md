# SlowMCP

**Blazingly adequate.**

A framework for building, testing, and shipping MCP servers, on top of the
official MCP TypeScript SDK.

Written in CoffeeScript.

FastMCP already exists. It is excellent. Unfortunately, it is fast.

AI is writing so much code these days, so I built this one in a dead language AI
doesn't know: CoffeeScript. Let's see if THAT cuts down on the AI-generated pull
requests.

## Install

SlowMCP is not on npm yet. To run it today:

```sh
git clone https://github.com/LeeFlannery/slowmcp.git
cd slowmcp
pnpm install
pnpm test
```

## Write a tool

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

export default app
```

## Test it against a real client

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
transport. There is no in-process shortcut and no fake handler. Connection is
lazy, and the harness asserts SlowMCP's protocol policy before any of your
assertions run.

## Serve it

```js
import { createHttpHandler } from 'slowmcp/http'
export default createHttpHandler(app)
```

## Versus FastMCP

Measured on 9 August 2026, by commands in this repository. Reproduce the first
two rows with `pnpm spike:baseline`.

| | official SDK | FastMCP | SlowMCP |
|---|---:|---:|---:|
| Lines to author the same greet tool | 25 | 17 | **15** |
| Top-level `node_modules` entries | 12 | 122 | **13** |
| Installed size | 21 MB | 46 MB | **21 MB** |

No cold start, no throughput, no time-to-first-tool, because none have been
measured yet. The parity harness that produces those rows is roadmap work, and
the numbers get published whether or not SlowMCP wins. Method and caveats in
[`VERTICAL_SLICE_FINDINGS.md`](VERTICAL_SLICE_FINDINGS.md).

Categories that actually matter:

| Category | FastMCP | SlowMCP | Winner |
|---|---:|---:|---|
| Name suggests urgency | Yes | Absolutely not | SlowMCP |
| Lines of visible semicolons | Not our concern | **0** | SlowMCP |
| CoffeeScript implementation | Sensibly no | **Unfortunately yes** | SlowMCP |
| Time to appreciate the craft | Insufficient | **Take your time** | SlowMCP |
| CoffeeScript containment | N/A | **PASS** | SlowMCP |
| Blazing | Fast | **Adequate** | Draw |

## Public API

```text
slowmcp            createServer, text, SlowMcpError, version
slowmcp/http       createHttpHandler
slowmcp/testing    testServer
slowmcp/protocol   protocolPolicy, satisfiesProtocolPolicy, assertProtocolPolicy
```

Nine exports across four subpaths. The root is the authoring API and
deliberately does not re-export the others for convenience: what you import
should say what it does.

## Ship it

```sh
pnpm slowmcp:check
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

It packs the package, installs the tarball into a clean project outside the
monorepo, and verifies it from the outside: every public subpath enumerated from
the packed export map, protocol negotiation, discovery, invocation, snapshot
semantics, the shipped TypeScript declarations, and the total absence of
CoffeeScript.

You consume compiled ESM with hand-written `.d.ts` declarations. CoffeeScript
never leaves this repository, and the check is what proves it every time.

## Roadmap

- Tools, resources, and prompts
- stdio and Streamable HTTP
- Protocol-backed test harness
- `slowmcp check` as an installable command
- Reference implementations
- GitHub Pages documentation
- **TypeScript support: never.**

## License

MIT
