# Bootstrap phase report, August 2026

The premise of SlowMCP is that FastMCP already exists and is good, so I am
building the slow one, in CoffeeScript, to see how far a joke can be pushed
before it turns into a real framework.

Phase 0 was supposed to be the boring part. Prove CoffeeScript can produce a
publishable artifact, prove the official MCP SDK does what the architecture
assumes, prove FastMCP is a fair baseline, then start building.

It did not stay boring for long.

## The official client can quietly negotiate an older protocol revision

The first spike was about thirty lines: build a `greet` tool on the official
MCP SDK, serve it over Streamable HTTP, drive it with the official MCP
`Client`, assert discovery and invocation.

It passed on the first run. Server name matched. One tool discovered, named
`greet`, with an input schema. Tool call returned `Hello, Detroit.` Green.

I had printed the negotiated protocol version out of habit, mostly so the
output would look like something. It said:

```text
protocol      2025-11-25
```

The architecture targets 2026-07-28. The server supported it. The client
supported it. Every assertion I had written passed anyway, because none of them
were about the protocol revision. They were about the tool.

The cause is a documented default rather than a bug. On the official client,
`ClientOptions.versionNegotiation.mode` defaults to `'legacy'`. Reaching the
2026 era requires asking:

```ts
new Client(info, { versionNegotiation: { mode: 'auto' } })
```

Which is fine, and conservative, and correct for a library that cannot know
what your server supports. The interesting part is the shape of the failure.
Nothing errors. Nothing warns. You get a working MCP session, one protocol
generation behind what you believe you are testing, and a suite of green tests
attesting to behavior you never exercised.

Two details make it worse than a normal footgun.

The first is that the obvious defensive move does not work. If you reach for
the SDK's own constants to check what you got, you find:

```text
LATEST_PROTOCOL_VERSION      '2025-11-25'
SUPPORTED_PROTOCOL_VERSIONS  ['2025-11-25', '2025-06-18', '2025-03-26',
                              '2024-11-05', '2024-10-07']
```

2026-07-28 is in neither. The modern era is a separate axis, reached through a
discovery probe, not a newer member of that list. So a reasonable-looking
assertion like "the negotiated version is the latest supported version" passes
happily while you sit on 2025-11-25. Anything derived from those constants is
wrong by construction.

The second is who this hits. Not people writing protocol implementations, who
think about revisions constantly. It hits people writing *application* tests
against their own MCP server, which is the exact workflow SlowMCP is supposed
to be good at.

## What I changed

The harness now states an era rather than accepting one. An era is a pair: the
negotiation mode requested, and the protocol revision required to have actually
happened.

```ts
export const MODERN = { name: 'modern', negotiation: 'auto',   expectedProtocolVersion: '2026-07-28' }
export const LEGACY = { name: 'legacy', negotiation: 'legacy', expectedProtocolVersion: '2025-11-25' }
```

Both literals are stated, never derived. The negotiated revision is asserted
before any capability assertion, so a run that lands in the wrong era fails on
the era instead of passing everything downstream. A test proves the assertion
fires, by asking for a revision that cannot happen and requiring the failure.

Both spikes now run both eras. Both baselines pass both.

```text
PASS spike:mcp
  server        greeter@1.0.0
  modern        negotiated 2026-07-28 · tools/list greet · tools/call Hello, Detroit.
  legacy        negotiated 2025-11-25 · tools/list greet · tools/call Hello, Detroit.
```

## Why this matters more than the joke

Before this, the honest answer to "why would I use SlowMCP instead of the
official SDK or FastMCP?" was a shrug and a tagline. FastMCP writes the same
`greet` server in 17 significant lines to the raw SDK's 25, and no amount of
CoffeeScript is going to beat that on ergonomics.

But the thing that went wrong in Phase 0 is not an ergonomics problem. It is a
verification problem, and it is one that neither baseline solves for you,
because neither one is in the business of telling you what your test harness
actually exercised. Wiring the official client at an in-process handler takes
about thirty lines and one non-obvious option, and I got it wrong on the first
attempt, in the specific way that leaves the tests green.

So the wedge is not "nicer than FastMCP." It is:

- a test harness that pins and asserts what it negotiated, because I have now
  personally shipped the bug it prevents;
- `slowmcp check` as a release contract that answers whether a server is
  shippable, across both eras, both transports, the packed tarball, and the
  declaration surface.

That is a smaller claim than "better framework" and a more defensible one.

## The other three findings, briefly

**CoffeeScript is not the risk.** It compiles to clean ESM with no wrapper and
no helper preamble, in about 0.13 seconds. The published tarball is four files
and 1,519 bytes.

**Source maps came out better than the architecture assumed.** The emitted maps
carry `sourcesContent`, so a consumer's stack trace resolves to CoffeeScript
line and column, and Node prints the real CoffeeScript code frame, from a
package that ships no CoffeeScript at all. "Source maps work" and "no `.coffee`
required" were expected to be in tension. They are not.

**FastMCP is good, and the comparison is more interesting than a winner.**
Given the identical Zod validator, FastMCP advertises
`additionalProperties: false` on the tool's input schema and the raw SDK omits
the key. Same validator, same accepted input, different thing shown to the
client. Neither is wrong. That is a row in a comparison table, not a defect,
and the harness records it rather than normalizing it away.

## Where this leaves things

Phase 0 is green. Nothing of SlowMCP itself exists yet: no `createServer`, no
registry, no CLI. That is deliberate. The vertical slice is next, and it stays
narrow on purpose. Root export, HTTP, one tool.

The framework was always going to be a joke that works. It is turning out that
the parts worth taking seriously are the parts nobody demos.

## Reproduce it

```sh
pnpm install
pnpm build
pnpm test            # 24 tests
pnpm slowmcp:check   # pack, install into a clean external project, verify
pnpm spike:mcp       # raw official SDK, both eras
pnpm spike:baseline  # official SDK against FastMCP, one client, same assertions
```

Full detail in [`BOOTSTRAP_FINDINGS.md`](../BOOTSTRAP_FINDINGS.md) and
[`BASELINE_FINDINGS.md`](../BASELINE_FINDINGS.md). Versions pinned exactly;
every number above comes from a command in this repository.
