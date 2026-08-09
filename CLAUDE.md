# SlowMCP

**Blazingly adequate.**

An opinionated framework for building, testing, and shipping MCP servers on top
of the official MCP TypeScript SDK. Implemented in CoffeeScript.

Read `ARCHITECTURE.md` before changing public API or transport behavior.

Read `BOOTSTRAP_FINDINGS.md` and `BASELINE_FINDINGS.md` alongside it, and let
them win on specifics. `ARCHITECTURE.md` was reconciled against the ecosystem
on 9 August 2026; the findings record what was actually verified against the
installed packages, including the places where the architecture was wrong.

## CRITICAL ARCHITECTURAL INVARIANTS

SlowMCP is intentionally implemented in CoffeeScript.

This is a product requirement, not an implementation accident.

- All SlowMCP runtime implementation source under `packages/slowmcp/src/` MUST
  remain `.coffee`.
- NEVER rewrite, migrate, translate, or replace CoffeeScript implementation code
  with TypeScript or JavaScript.
- NEVER propose TypeScript as a simplification, modernization, cleanup, or
  maintainability improvement.
- TypeScript is for consumer-facing declarations, tests, fixtures, reference
  implementations, and documentation examples only.
- Compiled JavaScript under `dist/` is generated output and must never become
  source of truth.
- CoffeeScript containment is an intentional package boundary: CoffeeScript is
  used to implement SlowMCP but is not required by consumers.
- Any refactor that changes the implementation language violates the
  architecture even if runtime behavior remains equivalent.

When simplifying code, simplify the CoffeeScript as CoffeeScript.

## Simplification rules

When using `/simplify` or performing cleanup:

- Preserve public API behavior.
- Preserve CoffeeScript as the implementation language.
- Prefer deleting unnecessary abstractions over introducing new ones.
- Do not replace handwritten `.d.ts` contracts with a TypeScript implementation.
- Do not collapse the protocol/type/package contract tests into internal tests.
- Do not remove apparently redundant checks when they enforce an external
  contract.
- Do not weaken protocol-version assertions.
- Do not normalize away observable differences between SlowMCP, FastMCP, and the
  official SDK.

## Non-negotiables

- SlowMCP wraps the official MCP TypeScript SDK. Never implement protocol wire
  behavior, version negotiation, or a custom codec.
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
examples/           executable references, each self-verifying
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
pnpm slowmcp:check    # release contract: pack, clean consumer, seven checks
pnpm ref:hello        # examples/hello-tool, self-verifying
pnpm eval:export-surface  # runtime exports vs declared exports, both directions
pnpm spike:mcp        # raw official-SDK greet server over Streamable HTTP
pnpm spike:baseline   # official SDK vs FastMCP, same official-client assertions
```

## Public API

```text
slowmcp            createServer, text, SlowMcpError, version
slowmcp/http       createHttpHandler
slowmcp/testing    testServer
slowmcp/protocol   protocolPolicy, satisfiesProtocolPolicy, assertProtocolPolicy
```

The root is the authoring API. Do not re-export transports, testing, or the
protocol policy from it for convenience. Adding a subpath means adding an
`exports` entry, a `types/<name>.d.ts`, and coverage in the export-surface
guard and the packed consumer.

## Protocol policy

`packages/slowmcp/src/protocol/compatibility.coffee` is the single place
SlowMCP states what protocol it speaks. Changing it changes what SlowMCP
claims to support, and that must be a visible diff. Never derive protocol
expectations from SDK version constants.
