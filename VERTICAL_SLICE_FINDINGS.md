# SlowMCP: Vertical Slice Findings

Phase 1 plus the API-boundary phase. Tools only, four public subpaths,
Streamable HTTP only. Everything below is a measurement produced by a command
in this repository, not a claim.

Measured on **9 August 2026**. Reproduce with the commands quoted beside each
table.

## 1. The finding that justifies the project

Before any of the numbers, the thing worth keeping:

> **The first thing SlowMCP's test harness caught was that the obvious official
> client setup silently negotiated the older protocol.**

The first spike passed every assertion it had. Server name matched, one tool
discovered, tool call returned the right string. It was also negotiating
2025-11-25 against a server that fully supported 2026-07-28, because
`ClientOptions.versionNegotiation.mode` defaults to `'legacy'`. Nothing errors
and nothing warns. You get a working session one protocol generation behind
what you believe you are testing.

The obvious defensive check does not help either: the SDK exports
`LATEST_PROTOCOL_VERSION` as `'2025-11-25'` and omits 2026-07-28 from
`SUPPORTED_PROTOCOL_VERSIONS` entirely, so asserting "we got the latest
supported version" passes while you sit on the old one.

This is why `slowmcp/protocol` exists, why `testServer()` asserts the
negotiated revision before any caller assertion runs, and why a regression test
connects a default-constructed official `Client` to a SlowMCP handler and pins
all three facts: the default lands on 2025-11-25, discovery and invocation
still pass, and the policy is what catches it.

The joke got the project into the room. The harness found something real on day
one. Full narrative in [`docs/bootstrap-2026-08.md`](docs/bootstrap-2026-08.md).

## 2. Implementation size

`grep -vE '^\s*($|#|//)' | wc -l` over each file. Non-blank, non-comment.

| | files | significant lines |
|---|---:|---:|
| SlowMCP implementation (`src/**/*.coffee`) | 14 | 175 |
| SlowMCP declarations (`types/*.d.ts`) | 4 | 219 |

**Declaration-to-implementation ratio: 1.25.**

The declarations are larger than the implementation they describe. That is the
cost of writing a framework in a language with no type emission: every public
promise is hand-maintained and externally verified rather than derived. It is a
real tax and it belongs in the comparison table rather than in a footnote.

## 3. Authoring size, same greet contract

Same tool, same Zod validator, same observable MCP behaviour.

| implementation | file | significant lines |
|---|---|---:|
| official SDK | `spikes/src/raw-sdk-server.ts` | 25 |
| FastMCP | `spikes/src/fastmcp-server.ts` | 17 |
| SlowMCP | `examples/hello-tool/server.mjs` | 15 |

Reproduce the first two with `pnpm spike:baseline`.

SlowMCP is currently the shortest of the three. This is not a claim of
superiority: the gap is small, all three are short, and authoring ergonomics are
table stakes rather than the wedge. Published because it was measured.

## 4. Packed artifact

`pnpm slowmcp:check --json` reports these under `artifact`.

| | value |
|---|---:|
| Tarball size | 14,419 bytes |
| Entries | 33 |
| Public subpaths | 4 |
| Public value exports | 9 |
| CoffeeScript files shipped | 0 |

Contents are 14 `.js`, 14 `.js.map`, `package.json`, and 4 `.d.ts`.

## 5. Installed footprint (informational)

`npm i` of the tarball alone into an empty project.

| | value |
|---|---:|
| Top-level `node_modules` entries | 13 |
| Total packages | 24 |
| Installed size | 21 MB |

Nearly all of that is `@modelcontextprotocol/server` and
`@modelcontextprotocol/client` and their transitive dependencies. SlowMCP's own
contribution is the 14 KB tarball.

`@modelcontextprotocol/client` is a hard runtime dependency because
`slowmcp/testing` ships in the same package, so a production server that never
runs a test still installs the client. **This is recorded, not optimized.** No
package splitting, bundling, or optional-peer trickery has been applied. The
decision belongs to measured data later, and the baseline is here.

For context, from `BASELINE_FINDINGS.md`, measured the same way:

| | top-level | installed |
|---|---:|---:|
| official SDK (server + client + zod) | 12 | 21 MB |
| FastMCP (+ client + zod) | 122 | 46 MB |

## 6. Verification coverage

| gate | count |
|---|---:|
| Tests (`pnpm test`) | 72 |
| `slowmcp check` named checks | 7 |
| Public subpaths proven from the tarball | 4, enumerated from the packed export map |
| Independent resolution contexts | 3 (workspace path, workspace link, packed tarball) |
| Negative type fixtures (`@ts-expect-error`) | 20 |

Every guard has been confirmed to fail when deliberately broken, which is the
only evidence that a guard is worth having:

| guard | broken by | fails with |
|---|---|---|
| negative type fixtures | an unnecessary `@ts-expect-error` | TS2578 |
| export surface | an extra runtime export | `exported but undeclared` |
| export map completeness | a subpath with no `types` condition | `export map incomplete` |
| version sync | editing `package.json` version alone | build failure |

## 7. What these numbers are for

They feed the generated comparison page later. Until that page exists and CI
produces its rows, nothing here should be quoted as a benchmark result. There
are no performance measurements in this document because none were taken: no
cold start, no throughput, no time-to-first-tool.
