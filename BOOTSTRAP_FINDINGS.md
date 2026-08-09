# SlowMCP: Bootstrap Findings

Phase 0 (T00–T03). Everything below was verified against the installed packages
on **9 August 2026**, not inferred from `ARCHITECTURE.md`. Where the
architecture turned out to be wrong, that is recorded in §7.

## 1. Pinned environment

| Thing | Version | How pinned |
|---|---|---|
| Node.js | 26.5.0 | `engines.node: ">=20.19.0"` (floor, see §7.4) |
| pnpm | 10.23.0 | root `packageManager` |
| CoffeeScript | 2.7.0 | `packages/slowmcp` devDependency, exact |
| TypeScript | 7.0.2 | root devDependency, exact |
| `@types/node` | 26.2.0 | root devDependency, exact |
| Vitest | 4.1.10 | root devDependency, exact |
| `@modelcontextprotocol/server` | 2.0.0 | `spikes` dependency, exact |
| `@modelcontextprotocol/client` | 2.0.0 | `spikes` dependency, exact |
| `@modelcontextprotocol/core` | 2.0.0 | transitive, pinned by both above |
| `@prefecthq/fastmcp-ts` | 1.4.0 | `spikes` dependency, exact |
| Zod | 4.4.3 | `spikes` dependency, exact |

Not yet installed, checked for currency only: `@modelcontextprotocol/inspector`
2.1.0, `valibot` 1.4.2 (the planned second Standard Schema implementation),
`fastmcp` (punkpeye) 4.14.0.

All versions are exact, with no `^` or `~`. The bootstrap phase is about
knowing precisely what was proven.

## 2. Commands

```sh
pnpm install
pnpm build            # .coffee -> dist/ ESM + maps, with invariant assertions
pnpm test             # vitest: 24 tests, artifact + protocol contract
pnpm typecheck        # declaration surface + spike sources
pnpm slowmcp:check    # pack, install externally, verify end to end
pnpm spike:mcp        # T02: raw official SDK over Streamable HTTP, both eras
pnpm spike:baseline   # T03: official SDK vs FastMCP, one client, same assertions
```

`pnpm build` must run before `pnpm test`; the artifact suite imports `dist/`
and fails with an explicit message otherwise.

## 3. CoffeeScript compiler behaviour

Command: `coffee --compile --map --output dist src`.

- **ESM passthrough works.** A `.coffee` file containing `export` statements
  compiles to a bare ES module. CoffeeScript's IIFE wrapper is suppressed
  automatically when import/export syntax is present; `--bare` is not needed
  and is not used.
- **Directory compilation preserves structure.** `src/nested/thing.coffee`
  becomes `dist/nested/thing.js` with a correct relative `sourceRoot`
  (`../../`). No custom file walking is required.
- **No runtime shim is emitted** for the constructs used so far. The output is
  plain modern JS with no `require()` and no CoffeeScript helper preamble.
- **Compile time** is 0.13–0.14s wall clock for the current one-module package,
  measured over three consecutive runs.

`scripts/build-coffee.mjs` is a thin wrapper over the CLI that additionally
asserts, and fails the build on violation:

- every emitted `.js` has a sibling `.js.map` and a `sourceMappingURL` comment;
- no emitted `.js` contains `require(`;
- every map carries non-empty `sourcesContent`;
- every map's `sources` entries end in `.coffee`.

## 4. Source-map behaviour

This was the highest-risk seam and it resolved better than expected.

Emitted map fields:

```json
{ "file": "index.js", "sourceRoot": "../", "sources": ["src/index.coffee"],
  "sourcesContent": ["<full .coffee text>"], "names": [], "mappings": "..." }
```

Verified with `node --enable-source-maps`:

- stack frames resolve to **CoffeeScript line and column**, e.g.
  `at detonate (.../src/index.coffee:17:9)`, which is the exact `throw` site;
- **this still works when no `.coffee` file exists on disk.** Node reads the
  embedded `sourcesContent` rather than the file. An uncaught error prints the
  real CoffeeScript code frame (`throw new Error 'detonated'` with a caret)
  from a tarball that ships no CoffeeScript at all.

Consequence, and it is a good one: **the published package does not need to
ship `.coffee` sources for source maps to be fully useful.** `files` is
`["dist", "types"]` and the tarball contains four entries (`dist/index.js`,
`dist/index.js.map`, `types/index.d.ts`, `package.json`) totalling 1,519 bytes.

Residual wrinkle: the path printed in a consumer's stack trace
(`node_modules/slowmcp/src/index.coffee`) does not exist on their disk. Line
numbers and code frames are correct; only "open this file" fails. Shipping
sources would fix the path at the cost of muddying the containment story. Left
as is, recorded here, and worth a line in the docs.

## 5. Official MCP SDK v2: APIs actually used

The v2 SDK is split into `@modelcontextprotocol/server` and
`@modelcontextprotocol/client` (both 2.0.0), over a shared
`@modelcontextprotocol/core`. `@modelcontextprotocol/sdk` is the v1 line, still
published at 1.30.0, and is **not** what the architecture targets.

Server side, used verbatim:

```ts
new McpServer({ name, version })                       // Implementation, ServerOptions
server.registerTool(name, { description, inputSchema }, handler)
createMcpHandler(factory, options?) -> McpHttpHandler
handler.fetch(request) -> Promise<Response>
handler.close()
```

Confirmed signatures:

- `type McpServerFactory = (ctx: McpRequestContext) => McpServer | Server | Promise<...>`
- `declare function createMcpHandler(factory: McpServerFactory, options?: CreateMcpHandlerOptions): McpHttpHandler`
- `McpHttpHandler` = `{ fetch, close, notify, bus }`
- `registerTool`'s primary overload takes a Standard Schema (`StandardSchemaWithJSON`)
  for `inputSchema`; the raw-Zod-shape form is present but **deprecated**, with
  the declaration telling you to wrap in `z.object({...})`. A Zod v4 object
  passes directly.

Client side, used verbatim:

```ts
new Client({ name, version }, { versionNegotiation: { mode: 'auto' } })
new StreamableHTTPClientTransport(url, { fetch })
client.connect(transport)
client.getServerVersion()
client.listTools()
client.callTool({ name, arguments })
client.close()
```

`StreamableHTTPClientTransportOptions.fetch?: FetchLike` is the seam that makes
in-process protocol testing work: the official transport is used unmodified and
only its `fetch` is redirected at `handler.fetch`. Negotiation, framing,
session semantics, and SSE upgrade are all the official implementation. This
confirms Layer C of the testing strategy is buildable exactly as designed.

`createMcpHandler`'s stateless per-request factory model is real and is the
default: `legacy: 'stateless'` builds a fresh instance per legacy request, and
the modern leg builds per exchange. The "definitions first, build fresh
servers" architecture fits without adaptation.

## 6. Protocol result

`pnpm spike:mcp`:

```text
PASS spike:mcp
  server        greeter@1.0.0
  modern        negotiated 2026-07-28 · tools/list greet · tools/call Hello, Detroit.
  legacy        negotiated 2025-11-25 · tools/list greet · tools/call Hello, Detroit.
```

Discovery and invocation both succeed over Streamable HTTP in both eras, driven
by the official `Client`, with the negotiated revision asserted against the one
requested rather than merely reported. See `BASELINE_FINDINGS.md` for the
FastMCP half.

## 7. Architecture assumptions that proved incorrect

### 7.1 The modern protocol revision is opt-in on the client

This is the most consequential finding of the phase.

`ClientOptions.versionNegotiation.mode` **defaults to `'legacy'`**. A client
constructed the obvious way negotiates **2025-11-25**, not 2026-07-28, against
a server that fully supports the modern era. The first spike run produced
`protocol 2025-11-25` and passed every other assertion. A green test proving
the wrong thing.

Reaching 2026-07-28 requires `{ versionNegotiation: { mode: 'auto' } }` (probe
and upgrade) or `{ mode: { pin: '...' } }`.

Compounding this: `LATEST_PROTOCOL_VERSION` exported by the client is
`'2025-11-25'`, and `SUPPORTED_PROTOCOL_VERSIONS` is
`['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05', '2024-10-07']`.
2026-07-28 does not appear in either. The modern era is a separate axis
(`ProtocolEra`, reached through the `discover` probe), not a member of that
list. Any code that reasons about "modern" by comparing against those constants
will be wrong.

Consequences for SlowMCP, now implemented in the spike harness:

- An era is a stated pair, never a derived one: the negotiation mode we ask
  for, and the protocol revision we require to have actually happened.
  `spikes/src/drive-contract.ts` exports `MODERN` (`auto` / `2026-07-28`) and
  `LEGACY` (`legacy` / `2025-11-25`).
- The harness asserts the negotiated revision **before any other assertion**,
  so a run that lands in the wrong era fails on the era rather than passing
  everything downstream. A test pins this behaviour by requesting an impossible
  revision and requiring the failure.
- `slowmcp/testing` must carry the same rule forward. An implicit default would
  silently downgrade every user's contract tests.
- `slowmcp check` needs distinct `modern-http` and `legacy-http` gates that each
  assert the revision they claim to be testing. The eval table already lists
  both; this finding is why they cannot share a client configuration.
- **Never derive "modern" from `LATEST_PROTOCOL_VERSION` or
  `SUPPORTED_PROTOCOL_VERSIONS`.** Nothing in the repository references either
  constant, and nothing should.

### 7.2 `slowmcp` is not `@modelcontextprotocol/sdk`

The architecture names `@modelcontextprotocol/server` in one place and refers
to "the official TypeScript SDK v2" elsewhere. Concretely: v2 is the two-package
split above, `@modelcontextprotocol/sdk@1.30.0` is the previous line, and the
`spikes` package depends on the split packages. Nothing depends on
`@modelcontextprotocol/sdk`.

### 7.3 Source maps do not require shipping `.coffee`

The architecture treats "source maps behave correctly" and "no `.coffee` file is
required to execute" as two constraints in tension. They are not: embedded
`sourcesContent` satisfies both. See §4.

### 7.4 Node floor

`@modelcontextprotocol/server` and `client` both work on Node 26.5.0. The
declared floor of `>=20.19.0` is chosen for ESM/`exports` maturity and has
**not** been tested on the floor itself. Treat it as unverified until CI runs a
matrix. Note that the spikes run with `--experimental-strip-types`, which is a
spike-only convenience and imposes no constraint on the shipped package.

### 7.5 `pnpm pack` works on a private package

`packages/slowmcp` is `"private": true` as a hard guard against accidental
publish, and `pnpm pack` still produces a tarball. The package contract and the
no-publish rule do not conflict.

## 8. Contract findings so far

**Protocol contract.** Green for the modern HTTP path against the raw SDK, with
the negotiation caveat in §7.1. Not yet exercised: stdio, real sockets,
resources, prompts, Inspector.

**Type contract.** The handwritten `types/index.d.ts` is checked three ways:
`tsc` over the declaration file itself, a positive TS consumer compiled against
the **installed tarball** under `moduleResolution: nodenext`, and a negative
fixture whose five `@ts-expect-error` directives must all fire. The negative
fixture was itself verified by adding a directive that should not error and
confirming `tsc` fails with TS2578. The fixture catches silent widening, which
is the failure mode that matters for a handwritten declaration surface.

**Package contract.** Green. `pnpm pack` → install into a fresh npm project in
the OS temp directory (outside the workspace, no pnpm linking, no hoisted repo
devDependencies) → JS consumer and TS consumer both run. The consumer asserts:
resolution comes from `node_modules`; the installed package contains zero
`.coffee` files; `coffeescript` is absent from the consumer tree and
unresolvable; the shipped map has `sourcesContent`; and a thrown error's stack
maps back to `index.coffee` with correct line and column.

## 9. Unresolved risks

1. **Declaration drift.** CoffeeScript emits no declarations, so `types/*.d.ts`
   is handwritten and can diverge from runtime exports without any build error.
   Today's guard is weak (the artifact suite checks the declaration file
   mentions each exported name). Before the public API grows, the packed
   consumer needs a generated check that every runtime export has a declaration
   and every declared export exists at runtime.
2. **Subpath exports are unproven.** Only the root export has been packed and
   consumed. `slowmcp/http`, `/stdio`, `/node`, `/testing` each add an
   `exports` entry with its own `types` condition and its own resolution risk
   under `nodenext`. Prove all of them from the tarball at T13, not later.
3. **Protocol-era regressions.** §7.1 means a future SDK release could change
   default negotiation and silently alter what the test harness exercises. The
   negotiated revision must be asserted, and the assertion must be visible in
   `slowmcp check` output.
4. **Node floor untested.** §7.4.
5. **Protocol-era drift in the harness itself.** The era assertion is only as
   good as the literals in `MODERN` and `LEGACY`. When the ecosystem moves,
   those constants must be updated deliberately, and the update should be
   visible in a diff rather than absorbed by a helpful default.
6. **Stdio is entirely unproven.** No spike covers stdout protocol integrity,
   process lifecycle, or signals. It is the transport most likely to be broken
   by CLI chatter, and CoffeeScript's compile step adds a path-resolution
   surface that stdio spawning will exercise.
7. **No `git` repository.** The workspace exists but is not under version
   control, so there is no rollback point. Worth doing before Phase 1.
8. **TypeScript 7.0.2 is the native compiler.** It works for both the
   declaration project and the consumer fixture, but SlowMCP's declaration
   surface will grow generics (Standard Schema inference), which is where a new
   compiler implementation is most likely to differ from `tsc` 5.x. Keep a
   second-compiler check in mind if inference behaves oddly.
