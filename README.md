# SlowMCP

**Blazingly adequate.**

A framework for building, testing, and shipping MCP servers, on top of the
official MCP TypeScript SDK.

Written in CoffeeScript.

FastMCP already exists. It is excellent. Unfortunately, it is fast.

AI is writing so much code these days, so I built this one in a dead language AI
doesn't know: CoffeeScript. Let's see if THAT cuts down on the AI-generated pull
requests.

Then the test harness found a real protocol bug on day one, and the joke got a
lot more expensive.

## Install

SlowMCP is not on npm. To run it today:

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

## Why not just use the official SDK

Because of what that harness caught.

The first spike passed everything it asserted: right server, right tool, right
result. It was also speaking 2025-11-25 to a server that fully supported
2026-07-28, because the official client's negotiation mode defaults to
`'legacy'`. Nothing errors. Nothing warns. Your tests go green against a
protocol generation you did not mean to test.

Defending against it by hand does not work unless you already know the shape of
the problem. The SDK exports `LATEST_PROTOCOL_VERSION` as the *older* revision
and leaves 2026-07-28 out of `SUPPORTED_PROTOCOL_VERSIONS` entirely, so the
obvious assertion passes while you sit on the old one.

So `slowmcp/protocol` is the single place SlowMCP states what it speaks,
`testServer` asserts what was actually negotiated before handing you the
connection, and a regression test pins the whole thing: default client, same
handler, lands on the old revision, passes discovery and invocation, gets caught
by the policy.

That is the wedge. Not renamed SDK methods. Full write-up in
[`docs/bootstrap-2026-08.md`](docs/bootstrap-2026-08.md).

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

## Status

Vertical slice, and honest about it. Tools, Streamable HTTP, and the test
harness work end to end from the packed artifact, verified in a clean external
project. Resources, prompts, stdio, and the CLI are not built yet.

175 significant lines of CoffeeScript ship as a 14 KB tarball, described by 219
lines of hand-written declarations. A framework in a language with no type
emission pays for every public promise by hand, which is why the declarations
are larger than the implementation. That ratio is a real cost and it belongs in
the open rather than in a footnote.

Design in [`ARCHITECTURE.md`](ARCHITECTURE.md).

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
