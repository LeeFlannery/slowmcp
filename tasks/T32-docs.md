# T32: documentation

**Wave 2, and last. Do not start until Wave 1 is integrated, `pnpm
phase2:ready` passes, the public-API review is complete, and T30 and T31 have
published their outputs.**

## Goal

A MkDocs + Material documentation site, Markdown throughout, built from the
packed public API and the executable references, deployed static to GitHub
Pages by Actions, with every measured number generated rather than typed.

## Why this work exists

The premise gets people to the repository. The docs decide whether they stay,
and the honest answer to "why not just use the SDK" is a specific protocol
finding from bootstrap, not a list of adjectives.

The site is also where the project is most likely to start lying. Aspirational
exports, benchmark numbers nobody measured, and features borrowed from
FastMCP's docs are the three failure modes, and all three are forbidden.

The platform is deliberately boring. Static, searchable, Markdown, easy to
maintain. **The joke comes from the writing, not from novelty UI.** A bespoke
frontend would be the most expensive possible way to undercut that.

## Prerequisites

- Wave 1 integrated, `pnpm phase2:ready` green, public-API review complete.
- T30 has published final command signatures, flags, and exit codes, **and the
  `slowmcp` binary exists in the installed package.**
- T31 has published machine-readable parity results and their file location.
- Branch `t32-docs` from `main`.

## Read first

- `CLAUDE.md`, in full, especially Brand.
- `tasks/README.md`, global invariants.
- `README.md`, the current voice and structure. The site expands it; it does
  not contradict it.
- `ARCHITECTURE.md` §13 documentation site, §2 competitive baseline, §11
  enforced-today mapping.
- `docs/bootstrap-2026-08.md`, `VERTICAL_SLICE_FINDINGS.md`,
  `BASELINE_FINDINGS.md`.
- Wave 1 and Wave 2 reports from every other task.

## Owned paths

```text
mkdocs.yml                                      new
docs/**
docs/requirements.txt                           new
.github/workflows/docs.yml                      new
scripts/docs-check.mjs                          new
```

`docs/bootstrap-2026-08.md` already exists and is linked from `README.md`.
**Leave it in place and do not rewrite it into a guide.** It is a record of
what happened, and it belongs in the nav under `Project` as `Bootstrap
findings`. See requirement 13 for its position.

## Forbidden paths

```text
packages/slowmcp/**
examples/**                                     T31
fixtures/**                                     T22
spikes/**
scripts/*                                       except docs-check.mjs
README.md                                       integration
ARCHITECTURE.md                                 integration
```

## Frozen interfaces

- **MkDocs and Material for MkDocs.** Markdown source, static output, GitHub
  Pages via Actions. **No Astro, no Starlight, no React, no custom
  documentation frontend.** Keep customization minimal; do not build a bespoke
  theme. It should look like a serious open-source developer tool.
- **Never document an export or command that does not exist in the packed
  package.** If a page in the structure below would document an unfinished
  feature, **omit the page** until the feature exists. An omitted page is
  correct; an aspirational page is a defect.
- **Never type a measured number.** Every figure derives from T31's generated
  parity output.
- **Canonical tagline, verbatim: `Blazingly adequate.`**
- **Roadmap item, verbatim: `TypeScript support: never.`** Do not soften or
  rewrite it.
- **Do not add caveats explaining that models can in fact write CoffeeScript.**
- **Do not insult FastMCP or imply affiliation with its maintainers.** The
  approved framing is that FastMCP is excellent and unfortunately fast.
- **Documentation tooling never becomes a SlowMCP runtime dependency.** MkDocs
  and Material are Python docs tooling and must not touch the published npm
  package.
- No em dashes. First person singular where the voice is personal.

## Requirements

### 1. Structure

```text
mkdocs.yml
docs/
├── index.md
├── quickstart.md
├── why-slowmcp.md
├── official-sdk.md
├── fastmcp.md
├── concepts/{index,architecture,protocol-policy,snapshots,coffeescript-containment}.md
├── guides/{tools,resources,prompts,results-errors,http,stdio,node,testing}.md
├── shipping/{index,check,package-contract,compatibility}.md
├── examples/{index,hello-tool,coffee-shop,framework-parity,remote-http}.md
├── reference/{index,api,cli,protocol-compatibility}.md
├── bootstrap-2026-08.md                        already exists, leave in place
├── contributing.md
└── roadmap.md
```

The two compatibility pages are settled and must not be merged:

| Page | Owns |
|---|---|
| `shipping/compatibility.md` | consumer and platform compatibility: Node versions, module formats, TypeScript consumers and their declarations, package manager and resolution behavior |
| `reference/protocol-compatibility.md` | the MCP protocol revision and policy matrix, and negotiation behavior |

`reference/protocol-compatibility.md` is the reference-grade matrix.
`concepts/protocol-policy.md` explains *why* the policy exists and stays
narrative. Cross-link them; do not duplicate the matrix into concepts.

Conditional on Wave 1 output: `guides/resources.md`, `guides/prompts.md`,
`guides/stdio.md`, `guides/node.md`, `examples/coffee-shop.md`,
`examples/remote-http.md`, and `reference/cli.md` exist **only if** the
corresponding capability, transport, reference, or binary shipped. Omit
otherwise and say so in your report.

### 2. Home, `docs/index.md`

Opens verbatim:

```md
# SlowMCP

**Blazingly adequate.**

A modern framework for building, testing, and shipping MCP servers.

Written in CoffeeScript.

FastMCP already exists.
```

Immediately after, answer **What does SlowMCP actually add?** in terms of real
behavior: small authoring conventions over the official SDK; protocol-backed
testing through the official MCP Client; explicit protocol compatibility
checks; package, type, and runtime verification; `slowmcp check`; CoffeeScript
staying completely contained from consumers. **Do not lead with a generic
feature list.**

### 3. `quickstart.md`

The smallest successful SlowMCP server, sourced from `examples/hello-tool`.
Install, create server, register `greet`, serve, test, `slowmcp check`. The
sample is **extracted from or verified against** the example. **Do not
maintain an independent copy that can drift.**

### 4. `why-slowmcp.md`

Lead with the bootstrap protocol finding: the default official Client
configuration negotiated `2025-11-25` against a server capable of
`2026-07-28`, and SlowMCP's testing layer negotiates per its compatibility
policy and asserts the resulting revision.

Frame it carefully. **SlowMCP does not claim the official SDK is broken.** The
point is that protocol defaults and compatibility details are easy for
application developers to get wrong, and SlowMCP makes those assumptions
explicit and testable.

### 5. `official-sdk.md`, titled "Why not just use the official SDK?"

State plainly that SlowMCP uses the official SDK underneath and does not
implement MCP, replace the SDK, invent a wire protocol, hide the official
Client, or prevent advanced SDK usage. Compare application plumbing for
equivalent examples using generated, reproducible evidence where available.

### 6. `fastmcp.md`, titled "SlowMCP vs FastMCP", two distinct sections

**Real comparison**, generated from the framework-parity reference: wiring
lines, dependency footprint, startup measurement, discovered capabilities,
advertised schema differences, observable protocol behavior, testability,
transports. Never typed by hand. **If FastMCP wins every conventional
benchmark, publish that result.**

**Metrics that matter**, the intentionally unserious table, at minimum:

| Metric | FastMCP | SlowMCP |
|---|---|---|
| Lines of visible semicolons | unspecified | 0 |
| CoffeeScript implementation | no | yes |
| Name suggests urgency | yes | absolutely not |
| Time to appreciate the craft | insufficient | take your time |
| Blazing | fast | adequate |

Keep the joke dry.

### 7. Concepts

- `architecture.md`: the pipeline, definitions → immutable application
  snapshot → official `McpServer` → official transports → official MCP Client.
  Emphasize that definitions and application state are separate from MCP
  server instances.
- `protocol-policy.md`: why SlowMCP owns an explicit policy, how negotiated
  versions are asserted, what `protocolVersion()` means, and why SDK constants
  and defaults are not SlowMCP's compatibility source of truth.
- `snapshots.md`: snapshot timing precisely. Adapters and testing sessions
  operate from immutable snapshots; registration after snapshot creation does
  not mutate an already-created adapter.
- `coffeescript-containment.md`: the joke and the actual package contract, with
  the chain CoffeeScript source → compiled ESM → source maps with
  `sourcesContent` → `.d.ts` → normal JS/TS consumer. State explicitly that
  consumers do not install CoffeeScript and the published package requires no
  `.coffee` at runtime.

### 8. Guides

Each capability guide contains, in order: what the capability is; the smallest
valid example; schema and type behavior; returned values; error behavior; a
testing example; a link to executable reference source. Do not duplicate
official MCP protocol documentation; link to the SDK where it remains the
authoritative protocol layer.

`guides/testing.md` is a **first-class product page**. Document whichever
harness methods actually shipped from `client()`, `protocolVersion()`,
`tools()`, `resources()`, `prompts()`, `call()`, `read()`, `getPrompt()`,
`close()`. Explain that SlowMCP testing drives the official MCP Client and the
real protocol path rather than invoking user handlers directly, and document
snapshot and lazy-connection semantics.

### 9. Shipping

`shipping/check.md` is a primary page. Explain what `slowmcp check` actually
proves, organized around real contracts: Protocol, Capabilities, Types,
Package, Transports, CoffeeScript containment, Reference behavior. **Do not
describe it as merely a test runner.**

`shipping/package-contract.md`: the clean-consumer philosophy, build → `pnpm
pack` → temporary external project → install tarball → verify runtime, types,
exports, containment. Explain why monorepo tests alone are insufficient.

### 10. Reference applications

One page per real executable example, each linking to its source **and its
verification command**.

### 11. `roadmap.md`

Short. Contains verbatim:

**TypeScript support: never.**

Immediately nearby, clarify that TypeScript consumers are first-class and
receive complete declarations, and that this item means SlowMCP itself remains
implemented in CoffeeScript.

### 12. `contributing.md`

Prominently document: runtime implementation is CoffeeScript; implementation
tests are normally CoffeeScript; TypeScript tests stay TypeScript when
TypeScript consumption is under test; no CoffeeScript runtime dependency may
leak to consumers; external contract tests must not be replaced by easier
internal tests; every meaningful guard should have been deliberately falsified
at least once; protocol behavior stays delegated to the official SDK.

### 13. `mkdocs.yml`

Material for MkDocs. At minimum: site name `SlowMCP`, repository link,
navigation, code highlighting, copy buttons, search, sensible light and dark
support, GitHub repository integration. Minimal customization.

Navigation order follows the user journey, with `Project` **last and
low-priority**:

```text
Home
Quickstart
Why SlowMCP
Why not the official SDK
SlowMCP vs FastMCP
Concepts
Guides
Shipping
Examples
Reference
Project
└── Bootstrap findings      docs/bootstrap-2026-08.md
Contributing
Roadmap
```

`Project` exists so `bootstrap-2026-08.md` is reachable and does not trip a
strict build, not to promote it. It is a record, not part of the primary user
journey, and nothing in Quickstart or the guides should route a reader into it.
Linking to it from `why-slowmcp.md` as supporting evidence is correct; making
it a step in learning SlowMCP is not.

### 14. Dependency isolation

Pin documentation tooling in `docs/requirements.txt` or another reproducibly
pinned Python environment. Use `uv` to drive it, matching the project's Python
convention. MkDocs and Material belong to documentation tooling only and must
never affect the published `slowmcp` npm package.

### 15. GitHub Actions, `.github/workflows/docs.yml`

Install docs dependencies from the pinned environment; run documentation
validation; build MkDocs; publish the static artifact to Pages using GitHub's
supported Pages Actions flow. **Do not commit the generated `site/`
directory**; `site/` is already in `.gitignore`.

### 16. Commands

```sh
pnpm docs:check    # validation gate
pnpm docs:build    # final static site
```

Both may invoke Python tooling internally. **The root pnpm workspace remains
the project's command surface.**

## Non-goals

Do not build a blog, changelog generator, versioned docs, i18n, a custom
theme, search beyond Material's built-in, a separate marketing landing page,
interactive playgrounds, or a FastMCP migration guide. Do not document
anything that does not exist. Do not add a JavaScript build step to the docs.

## Testing-language policy

- **Markdown** for all documentation source. Every page is Markdown; that is a
  platform requirement, not a preference.
- **TypeScript and JavaScript** for documentation samples, because samples are
  consumer code. A CoffeeScript sample would teach the opposite of the
  containment claim.
- **JavaScript** for `scripts/docs-check.mjs`, matching the other verification
  scripts.
- **Python** only inside the pinned docs environment, for MkDocs itself.
- **No CoffeeScript in `docs/**`**, with one exception: pages explaining the
  implementation language may quote SlowMCP's own CoffeeScript source, clearly
  marked as implementation rather than consumer code.

## Required tests and evals

`pnpm docs:check` covers:

- MkDocs builds, `--strict` where practical so warnings fail;
- broken internal links, where practical;
- **documented public exports exist** in the packed artifact's declarations;
- **documented CLI commands exist** in the installed package's `bin`;
- **required canonical copy exists**: the verbatim home opening, the tagline,
  and the roadmap line;
- **benchmark and comparison values have generated provenance**, traced to a
  T31 output file;
- samples compile or run, or originate from a verified example.

`pnpm docs:build` produces the final static site.

## Falsification requirements

Break each once, record the exact failure, restore:

| Break | Must fail with |
|---|---|
| document an export that does not exist | the export truthfulness check |
| document a CLI command with no `bin` entry | the CLI truthfulness check |
| break an internal link | the link check |
| hand-edit a benchmark number | the provenance check |
| change the tagline to "blazingly fast" | the canonical copy check |
| soften the roadmap line to "not planned" | the canonical copy check |
| alter the verbatim home opening | the canonical copy check |
| introduce a syntax error in a documented sample | sample verification |
| add `mkdocs-material` to the npm package's dependencies | the containment check in `slowmcp:check` |

The canonical copy checks are real tests. The tagline, the home opening, and
the roadmap line are product requirements with verbatim text, so assert them
like any other contract.

## Acceptance commands

```sh
pnpm docs:check
pnpm docs:build
pnpm phase2:ready
```

All three green. The readiness and release gates must still pass unchanged.

## Definition of done

- Every page is Markdown; Material for MkDocs builds successfully.
- The Pages deployment workflow exists and uses GitHub's supported flow.
- Docs are built from the real public API; no page documents an unshipped
  feature.
- Examples are executable or verified; no independent copy of example code.
- Generated measurements are not copied by hand.
- `Blazingly adequate.` preserved verbatim.
- `TypeScript support: never.` preserved verbatim, with the TypeScript-consumer
  clarification adjacent and the line unsoftened.
- `pnpm docs:check` and `pnpm docs:build` pass.
- `pnpm phase2:ready` still passes.
- **No documentation dependency leaks into the npm package.**
- `site/` is not committed.
- Falsification table run, failures recorded.

## Stop condition

Stop and report without finishing if:

- a required page can only be written by documenting something that does not
  exist, and omitting it would leave the nav incoherent;
- T31's parity output is not machine-readable, since a typed number is not an
  acceptable fallback;
- T30's binary does not exist in the installed package, which blocks
  `reference/cli.md` and the `slowmcp check` page's command claims;
- Pages deployment requires repository settings you cannot apply;
- brand copy conflicts with what the software actually does, which is the
  owner's decision.

## Integration notes

- **You are last.** Every other public surface must be final before your API
  reference can be.
- `docs:check` and `docs:build` are new root scripts and need integration
  approval. Adding either to the readiness gate goes **through T22**.
- Adding Python tooling to the repository is a workspace decision: report the
  chosen environment mechanism before wiring CI.
- T30 owes you command signatures, flags, and exit codes. T31 owes you the
  machine-readable parity output and its location. Do not read their source to
  reconstruct either; ask.
- `README.md` and `ARCHITECTURE.md` are integration-owned. If the site and
  either diverge, report it.
- Both open questions from the first draft of this task are **resolved and not
  open for reinterpretation**: `bootstrap-2026-08.md` stays where it is, in the
  nav under `Project`; the compatibility split is
  `shipping/compatibility.md` for consumer and platform, and
  `reference/protocol-compatibility.md` for the protocol revision matrix.

## Report back

1. Every page built, which task's API it documents, and **every page omitted
   because its feature did not ship**.
2. The final nav, confirming `Project` sits last and that no primary-journey
   page routes a reader into `Bootstrap findings`.
3. What landed on `shipping/compatibility.md` versus
   `reference/protocol-compatibility.md`, and confirmation the protocol matrix
   is not duplicated into `concepts/protocol-policy.md`.
4. The export and CLI truthfulness checks: how they work, and the failures you
   observed.
5. Every number on the site, and the generated file it came from.
6. The pinned docs environment, and proof it does not touch the npm package.
7. Falsification results: each break and the exact failure observed.
8. Deployment steps requiring repository settings you could not apply.
9. Any place brand copy and software disagreed, unresolved, for the owner.
10. Any API that was hard to document, which usually means it is hard to use,
    reported to the owning task.
