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
- TypeScript is for consumer-facing declarations, type-contract fixtures,
  external consumer and reference implementations, and documentation examples
  only. For tests, see the test language policy below.
- Compiled JavaScript under `dist/` is generated output and must never become
  source of truth.
- CoffeeScript containment is an intentional package boundary: CoffeeScript is
  used to implement SlowMCP but is not required by consumers.
- Any refactor that changes the implementation language violates the
  architecture even if runtime behavior remains equivalent.

When simplifying code, simplify the CoffeeScript as CoffeeScript.

### Test language policy

SlowMCP's own implementation tests should be written in CoffeeScript.

TypeScript is reserved for tests where TypeScript consumption is itself under
test, including declarations, inference, negative type fixtures, package type
resolution, and external TypeScript consumer behavior.

External protocol, parity, and reference tests may use TypeScript or JavaScript
when they intentionally represent ordinary consumers.

Do not convert TypeScript contract tests to CoffeeScript merely for
consistency.

The shorthand:

> CoffeeScript tests prove SlowMCP works.
> TypeScript tests prove users don't have to care that SlowMCP is CoffeeScript.

The classifying question: if the test would mean exactly the same thing when
SlowMCP had no TypeScript declarations, it is an implementation test and
belongs in CoffeeScript.

| Layer | Language |
|---|---|
| implementation | CoffeeScript |
| implementation tests | CoffeeScript |
| declarations | `.d.ts` |
| type-contract fixtures | TypeScript |
| external consumer, protocol, parity, references | JavaScript or TypeScript |

CoffeeScript implementation tests import `../src/*.coffee` and are compiled on
the fly by the `slowmcp:coffee` plugin in `vitest.config.ts`. They test source,
not `dist`. The compiled artifact stays covered by `artifact.test.ts`, the
workspace-consumer fixture, and `pnpm slowmcp:check`. `coffeescript` remains a
development dependency and never reaches the published package.

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

## Commands

```sh
pnpm install
pnpm build              # .coffee -> dist/ ESM + source maps + invariant checks
pnpm test               # builds, then vitest (refuses if dist is stale)
pnpm test:only          # vitest without rebuilding (still refuses if dist is stale)
pnpm typecheck          # declarations + package tests + fixtures + spikes
pnpm slowmcp:check      # release contract: pack, clean consumer, 7 checks
pnpm phase2:ready       # the one readiness gate (test -> typecheck -> export-surface -> ref:hello -> slowmcp:check)
pnpm ref:hello          # examples/hello-tool self-verifies
pnpm eval:export-surface  # runtime exports vs declared exports, both directions
pnpm spike:mcp          # raw official-SDK greet over Streamable HTTP
pnpm spike:baseline     # official SDK vs FastMCP, one client, same assertions
```

Run a single test file: `pnpm test:only -- packages/slowmcp/test/slice.test.coffee`.
By name: `pnpm test:only -- -t "pattern"`. Filters pass through to vitest.

## Traps that bite agents

- **Stale dist guard.** Vitest `globalSetup` (`scripts/vitest-global-setup.mjs`)
  hashes `src/**/*.coffee` and refuses to start if `dist/` no longer matches.
  After editing any `.coffee`, run `pnpm build` before `pnpm test` or
  `pnpm test:only`. The error names this. `pnpm test` already builds first;
  `pnpm test:only` does not.
- **No `slowmcp` binary exists.** `pnpm slowmcp:check` is a node script
  (`scripts/slowmcp-check.mjs`), not a published CLI. Don't try `npx slowmcp`.
- **`packages/slowmcp` is `private: true` on purpose** as a publish guard.
  `pnpm pack` still works. Do not remove the flag.
- **Version sync.** `version` is hand-written at `src/index.coffee:11` and
  `scripts/build-coffee.mjs` fails the build if it drifts from `package.json`.
  Bump both together; every other guard compares export names, not values.
- **Test language is load-bearing.** See the test language policy above before
  adding a test; the wrong layer breaks what the test proves.
- **Protocol policy is one file.** `src/protocol/compatibility.coffee` (re-exported
  via `src/protocol.coffee`) is the single place SlowMCP states what protocol it
  speaks. Changing it changes what SlowMCP claims to support, and that must be a
  visible diff. Never derive "modern" from `LATEST_PROTOCOL_VERSION` or
  `SUPPORTED_PROTOCOL_VERSIONS`; both omit `2026-07-28`. The official client
  defaults to `versionNegotiation: 'legacy'` and silently lands on `2025-11-25`.
  State the era, assert the revision actually negotiated.
- **Subpaths are a release contract.** Adding one means: an `exports` entry with
  a `types` condition, a `types/<name>.d.ts`, and coverage in
  `scripts/verify-export-surface.mjs` (bidirectional: runtime vs declared) AND
  the packed consumer fixture. The root does not re-export subpaths.

## Public API

```text
slowmcp            createServer, text, SlowMcpError, version
slowmcp/http       createHttpHandler
slowmcp/testing    testServer
slowmcp/protocol   protocolPolicy, satisfiesProtocolPolicy, assertProtocolPolicy
```

The root is the authoring API. Do not re-export transports, testing, or the
protocol policy from it for convenience.

## Layout

```text
packages/slowmcp/   the one published package (src/, test/, types/, dist/)
examples/           self-verifying references (hello-tool today)
spikes/             bootstrap proofs: raw SDK + FastMCP baselines
fixtures/           hostile consumers: packed-consumer, workspace-consumer
scripts/            build, check, and verification entry points
```

Spikes use `node --experimental-strip-types` (spike-only convenience, not a
package constraint). No `.github/workflows` exists yet; `pnpm phase2:ready` is
the current readiness gate. The declared Node floor `>=20.19.0` is only
exercised on 26.x.
