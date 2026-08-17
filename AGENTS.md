# AGENTS.md

SlowMCP: an MCP server framework implemented in CoffeeScript on top of the
official MCP TypeScript SDK. **Blazingly adequate.**

Read `CLAUDE.md` first for invariants, brand, and the test language policy.
Read `ARCHITECTURE.md` for design; `BOOTSTRAP_FINDINGS.md` and
`BASELINE_FINDINGS.md` win on specifics where they disagree with it.

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
pnpm eval:export-surface
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
- **Test language is load-bearing.** Implementation tests are `.coffee` and
  import `../src/*.coffee` (compiled on the fly by the `slowmcp:coffee`
  vitest plugin, they test source not `dist`). `artifact.test.ts` and the
  fixtures test `dist/` and the packed tarball. See `CLAUDE.md` "Test language
  policy" before adding a test; the wrong layer breaks what the test proves.
- **Protocol policy is one file.** `src/protocol/compatibility.coffee` (re-exported
  via `src/protocol.coffee`) is the single place SlowMCP states what protocol it
  speaks. Never derive "modern" from `LATEST_PROTOCOL_VERSION` or
  `SUPPORTED_PROTOCOL_VERSIONS`; both omit `2026-07-28`. The official client
  defaults to `versionNegotiation: 'legacy'` and silently lands on `2025-11-25`.
  State the era, assert the revision actually negotiated.
- **HTTP/stdio verified through the official `Client`, never internal handlers.**
  Do not shortcut by calling handlers directly in tests.
- **Subpaths are a release contract.** Adding one means: an `exports` entry with
  a `types` condition, a `types/<name>.d.ts`, and coverage in
  `scripts/verify-export-surface.mjs` (bidirectional: runtime vs declared) AND
  the packed consumer fixture. The root does not re-export subpaths.

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

## Hard rules (see CLAUDE.md for the full set)

- `src/**/*.coffee` stays CoffeeScript. Never migrate, translate, or propose
  TypeScript as simplification. Simplify CoffeeScript as CoffeeScript.
- SlowMCP wraps the official SDK. Never implement protocol wire behavior,
  version negotiation, or a custom codec.
- Consumers must never require CoffeeScript at runtime.
- Do not weaken a test to make a task pass. Do not publish packages.
- Public API changes require updated `.d.ts` contracts and docs.