# SlowMCP

**Blazingly adequate.**

An opinionated framework for building, testing, and shipping MCP servers on top
of the official MCP TypeScript SDK. Implemented in CoffeeScript.

Read `BOOTSTRAP_FINDINGS.md` and `BASELINE_FINDINGS.md` before changing the
build, the export map, or anything that touches the official SDK. They record
what was verified against the real packages rather than assumed.

## Non-negotiables

- SlowMCP wraps the official MCP TypeScript SDK. Never implement protocol wire
  behavior, version negotiation, or a custom codec.
- Shipped runtime source is CoffeeScript (`.coffee`). Do not rewrite it in
  TypeScript.
- Tests, fixtures, examples, and docs may use TypeScript/JavaScript.
- Consumer projects must never require CoffeeScript at runtime.
- Treat protocol, TypeScript, and packed-package behavior as three separate
  release contracts. All three must be green for a release to be trustworthy.
- HTTP and stdio behavior is verified through the official MCP `Client`, never
  by calling internal handlers directly.
- Reference implementations are executable CI tests, not demos.
- Testing and `slowmcp check` are product features, not secondary tooling.
- SlowMCP must justify itself beyond renaming official SDK methods.
- Prefect FastMCP is a required competitive baseline. Do not clone it
  feature-for-feature; SlowMCP stays deliberately smaller.
- Public API changes require updated type contracts and docs.
- Benchmark numbers come from the parity harness. Never fabricate a FastMCP
  win or a SlowMCP loss, and publish measured results even when SlowMCP loses.
- Do not weaken a test to make a task pass.
- Do not publish packages.

## Brand

- Canonical tagline: **Blazingly adequate.**
- Public roadmap item, verbatim: **TypeScript support: never.**
- 95% credible developer tool, 5% joke. Jokes attach to real behavior.
- Do not add caveats explaining that models can in fact write CoffeeScript.
  The premise is meant to be challenged.

## Layout

```text
packages/slowmcp/   the one published package
spikes/             bootstrap proofs: raw official SDK and FastMCP baselines
fixtures/           hostile, minimal consumers of the packed tarball
scripts/            build and verification entry points
```

## Commands

```sh
pnpm install
pnpm build            # .coffee -> dist/ ESM + source maps, with invariant checks
pnpm test             # vitest: artifact + protocol contract suites
pnpm typecheck        # declaration surface and spike sources
pnpm eval:artifact    # pack, install into a clean external project, verify
pnpm spike:mcp        # raw official-SDK greet server over Streamable HTTP
pnpm spike:baseline   # official SDK vs FastMCP, same official-client assertions
```
