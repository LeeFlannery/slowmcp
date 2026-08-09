# SlowMCP — Architecture

**Status:** Proposed v0.1 architecture  
**Package working name:** `slowmcp`  
**Runtime:** Node.js, ESM  
**Implementation:** CoffeeScript (`.coffee`)  
**Consumers:** TypeScript and JavaScript  
**Protocol target:** MCP 2026-07-28 via the official TypeScript SDK v2
**Tagline:** **Blazingly adequate.**

## 0. Established by bootstrap

Phase 0 (T00-T03) has run. The facts below were verified against installed
packages rather than assumed, and they outrank anything later in this document
that contradicts them. Detail lives in `BOOTSTRAP_FINDINGS.md`,
`BASELINE_FINDINGS.md`, and `docs/bootstrap-2026-08.md`.

**Proven.**

- CoffeeScript 2.7.0 compiles the required ESM shape. `export` statements pass
  through, the IIFE wrapper is suppressed automatically, no `--bare` is needed,
  and no helper preamble is emitted.
- Source maps embed `sourcesContent`. Stack traces resolve to CoffeeScript line
  and column, and Node prints the real `.coffee` code frame, from a package
  that ships no `.coffee` files. Source-map fidelity and CoffeeScript
  containment are not in tension.
- The official MCP v2 SDK is the `@modelcontextprotocol/server` /
  `@modelcontextprotocol/client` / `@modelcontextprotocol/core` package split.
  `@modelcontextprotocol/sdk` is the v1 line and is not what this document
  targets.
- `createMcpHandler(factory)` builds a fresh server per exchange, so the
  definitions-first model in §3 fits the SDK without adaptation.
- `StreamableHTTPClientTransportOptions.fetch` accepts an in-process handler,
  so the official client transport drives a handler with no socket.
- Package consumption is proven end to end: build, `pnpm pack`, install into a
  clean external project, run JS and TS consumers, no CoffeeScript present or
  resolvable. Every public subpath is enumerated from the packed export map and
  resolved in three independent contexts: by file path in the workspace, as a
  linked workspace dependency, and from the tarball.

**Constraints that follow.**

- Modern protocol behavior must never be inferred from
  `LATEST_PROTOCOL_VERSION` or `SUPPORTED_PROTOCOL_VERSIONS`. Both omit
  2026-07-28, because the modern era is a separate axis reached through the
  discovery probe.
- The application test harness must explicitly select the intended negotiation
  behavior, capture the revision actually negotiated, assert it against
  SlowMCP's own compatibility policy, expose it to tests and diagnostics, and
  fail loudly outside that policy. The client's default is `'legacy'`, and the
  failure mode is silent.
- FastMCP advertises `additionalProperties: false` for the equivalent Zod tool
  where the raw SDK omits the key. This is observable comparison data. Preserve
  it; do not normalize it away, and do not treat matching another framework's
  advertised schema as a goal.

**Still unproven.**

- stdio, in every respect: stdout protocol integrity, process lifecycle,
  signals, packaged path resolution.
- The declared Node floor of `>=20.19.0`, which has been exercised only on 26.x.

**Primary standing risk.**

- TypeScript declaration/runtime drift. CoffeeScript emits no declarations, so
  `types/*.d.ts` is a handwritten public specification that can diverge from
  runtime exports with no build error. External contract fixtures compiled
  against the packed tarball are the only thing holding the two together.

## 1. What SlowMCP actually does

SlowMCP is an opinionated framework for **building, testing, and shipping MCP servers** on top of the official MCP TypeScript SDK.

It is not another MCP implementation and it does not replace the official SDK. The SDK remains the protocol engine underneath SlowMCP.

SlowMCP replaces the repetitive userland work developers otherwise assemble around that SDK:

- server/bootstrap conventions;
- capability organization and registration;
- transport setup;
- protocol-backed test-client plumbing;
- contract tests for discovery and invocation;
- Inspector/dev diagnostics;
- packed-package verification;
- release checks;
- project structure decisions.

A useful analogy is:

```text
Node HTTP primitives  -> Express / Hono
MCP official SDK      -> SlowMCP
```

The official SDK supplies MCP primitives and protocol correctness. SlowMCP supplies an application model and a workflow.

### Product promise

> **SlowMCP is an opinionated framework for building, testing, and shipping MCP servers.**


### What you get on top of the official SDK

The official SDK remains the protocol engine. SlowMCP adds application-level workflow:

```text
OFFICIAL SDK                     SLOWMCP ADDS
------------                     ------------
MCP protocol primitives          project/application conventions
McpServer                        definition registry + repeatable construction
transports                       one app served over stdio or HTTP
Client                           application-facing test harness
Inspector                        one-command inspect/dev workflow
package APIs                     packed-consumer verification
                                 slowmcp check release contract
```

If a feature merely renames an official SDK method without reducing repeated application work or improving verification, it should probably not exist.

The product has three pillars.

#### 1. Authoring

Give developers one predictable way to organize an MCP server:

```text
my-mcp/
├── tools/
├── resources/
├── prompts/
├── server.ts
└── slowmcp.config.ts
```

SlowMCP should make capability definitions composable and transport-independent. It should remove repeated registration and bootstrap code without hiding the underlying MCP concepts.

#### 2. Testing

Testing is a first-class framework feature.

A developer should be able to test the server through a **real official MCP Client** without manually assembling client transports, lifecycle code, protocol calls, and result normalization for every project.

Desired ergonomics:

```ts
import { testServer } from "slowmcp/testing"
import app from "../src/server"

describe("weather MCP", () => {
  const mcp = testServer(app)

  it("advertises forecast", async () => {
    await expect(mcp.tools()).resolves.toContainTool("forecast")
  })

  it("calls forecast", async () => {
    const result = await mcp.call("forecast", {
      city: "Detroit"
    })

    expect(result).toHaveText(/Detroit/)
  })
})
```

The friendly API is optional sugar. Underneath it must be a real official MCP client exercising real protocol behavior, not mocked handler calls.

The testing package should also expose the raw client for advanced assertions.

#### 4. Shipping

SlowMCP should answer a question the raw SDK does not answer for an application:

> **Is this MCP server actually ready to ship?**

The flagship command is:

```bash
slowmcp check
```

It verifies the built server and package from the outside:

```text
Capabilities
✓ tools discoverable
✓ resources discoverable
✓ prompts discoverable

Protocol
✓ initialize
✓ tools/list
✓ resources/list
✓ prompts/list
✓ representative calls

Transports
✓ stdio
✓ Streamable HTTP

Package
✓ ESM exports
✓ TypeScript declarations
✓ clean tarball install
✓ no CoffeeScript runtime dependency

Ecosystem
✓ Inspector compatibility

Ready to ship.
```

`slowmcp check` is not a prettier test runner. It is a release contract for an MCP application.

### What SlowMCP does not replace

SlowMCP does **not** replace:

- the MCP specification;
- `@modelcontextprotocol/server`;
- official transport/protocol implementations;
- the official MCP Client;
- the MCP Inspector;
- schema libraries such as Zod or Valibot.

Where SlowMCP wraps those pieces, it should remain thin and explicit.

### Project premise

The public premise is intentionally provocative:

> **FastMCP already exists. So we're making Claude Code build SlowMCP in a dead language AI doesn't know: CoffeeScript.**

Do not preemptively explain the joke away. The audience is allowed to disagree, test the claim, post screenshots, and come back to argue. That interaction is part of the project.

The project itself turns the claim into an experiment:

```text
CLAIM
FastMCP was too fast. AI has forgotten CoffeeScript.
      |
      v
EXPERIMENT
Make Claude Code build a production-grade SlowMCP in CoffeeScript.
      |
      v
PROOF
Protocol tests + type contracts + packed consumers + reference apps + evals.
      |
      v
RESULT
We find out in public.
```

Good supporting lines:

- “FastMCP already exists. So we built SlowMCP.”
- “AI made writing code too easy. We fixed that.”
- “I don't think AI remembers CoffeeScript. Let's find out.”
- “A modern MCP framework written in CoffeeScript despite the availability of other options.”
- “This has gone considerably further than the joke required.”
- “CoffeeScript remains contained.”

The README and technical docs should not waste paragraphs litigating whether a model can or cannot produce CoffeeScript. They document what SlowMCP does and how well it works. The provocative claim belongs in the project story, launch copy, video, social posts, and the short README origin story.

The comedy rule is **serious engineering, unserious premise**. SlowMCP never pretends CoffeeScript is technically superior. The better the framework works, the funnier the project becomes.

## 2. Competitive baseline: FastMCP already exists

SlowMCP enters an existing category. It must not pretend otherwise.

As of August 9, 2026, the closest direct comparison is **Prefect FastMCP for TypeScript** (`@prefecthq/fastmcp-ts`). It is an official TypeScript counterpart to FastMCP for Python, is built on the v2 official MCP TypeScript SDK, and already provides high-level server authoring, tools/resources/prompts, transports, clients/apps, schema support, and CLI workflows.

There is also the established `fastmcp` TypeScript project by punkpeye, which provides an opinionated server framework with tools/resources/prompts, transports, testing support, Inspector workflows, auth, sessions, and other batteries-included features.

Therefore this is **not** SlowMCP's claim:

> “Nobody has built a framework around the MCP SDK.”

That claim would be false.

### What SlowMCP is trying to add

SlowMCP should stay intentionally smaller than FastMCP and concentrate on three things:

1. **Conventions** — a small predictable application model for tools, resources, prompts, and transports.
2. **Protocol-backed application testing** — a first-class test harness driven by the official MCP Client.
3. **Shipping verification** — `slowmcp check` as a repeatable outside-in release contract for protocol, transports, types, package installation, Inspector compatibility, and CoffeeScript containment.

The joke is not a substitute for the wedge. If the testing and shipping workflow is not meaningfully better than using the official SDK or FastMCP directly, then SlowMCP is a successful comedy project, not a superior framework. The repository should be honest about which one it becomes.

### Do not compete feature-for-feature

SlowMCP v0.1 should **not** chase FastMCP's breadth. In particular, do not add auth frameworks, gateways, extensive middleware systems, sessions, edge-runtime matrices, UI extensions, or every MCP extension merely to achieve checklist parity.

The goal is a small framework with unusually strong verification.

### Competitive proof, not marketing claims

The reference suite must contain the same small MCP application implemented three ways:

```text
examples/framework-parity/
├── official-sdk/
├── fastmcp/
├── slowmcp/
└── verify/
```

One official MCP client drives all three implementations and compares their normalized observable behavior.

The suite may generate evidence such as:

- source line counts;
- dependency counts;
- bootstrap/configuration steps;
- discovered capabilities;
- representative tool/resource/prompt results;
- startup and package-size measurements.

Never hand-write flattering comparison numbers. If a comparison appears in README/docs/video, CI must be able to reproduce it.

### Comparison presentation contract

SlowMCP is allowed to lose every conventional performance benchmark. The project does not need to manufacture a performance win.

The README/docs should present:

1. a **real benchmark table** generated from `framework-parity` CI, with actual numbers and winners;
2. a nearby **clearly unserious comparison table** containing categories such as “Lines of visible semicolons,” “Time to appreciate the craft,” and CoffeeScript containment.

Canonical tagline: **Blazingly adequate.**

If SlowMCP unexpectedly wins a real benchmark, publish the result. Never falsify or choose worse code to preserve the joke.

### Roadmap invariant

The public roadmap must contain the exact item:

> **TypeScript support: never.**

This means the SlowMCP framework implementation is not planned to be rewritten in TypeScript. It does **not** contradict first-class TypeScript consumer declarations and contract tests.

### Why the name works

FastMCP is a real category-defining comparison. **SlowMCP** makes the project premise legible before anyone understands CoffeeScript:

> FastMCP already exists. So we built SlowMCP in CoffeeScript.

The serious engineering stays serious. The name carries the joke.

### Sources for the competitive baseline

- Prefect FastMCP TypeScript: https://github.com/PrefectHQ/fastmcp-ts
- punkpeye FastMCP: https://github.com/punkpeye/fastmcp

## 3. Core architectural idea: definitions first

The central object in SlowMCP is not a long-lived protocol connection. It is a set of **server definitions**.

```text
SlowMCP definitions
       |
       | build()
       v
Official McpServer
       |
       +------> official HTTP handler -----> Streamable HTTP
       |
       +------> official stdio serving ----> stdio
       |
       +------> test harness --------------> official MCP Client
```

The 2026 MCP HTTP model is stateless and the official v2 handler builds fresh server instances from a factory. SlowMCP should fit that model directly.

Benefits:

- correct stateless behavior by default;
- fresh server instances when the official SDK expects them;
- deterministic capability registration;
- duplicate-name checks before serving;
- the same definitions power HTTP, stdio, tests, examples, and docs;
- a straightforward raw-SDK escape hatch.

## 4. Scope

### v0.1 includes

- server metadata;
- tools;
- resources;
- prompts;
- Standard Schema-compatible validation;
- typed handler inputs;
- simple result helpers;
- raw MCP result escape hatch;
- Streamable HTTP;
- stdio;
- Node HTTP convenience serving;
- web-standard HTTP handler creation;
- official SDK extension hook;
- public `slowmcp/testing` application test harness backed by the official MCP Client;
- real-process stdio tests;
- `slowmcp init`, `dev`, `test`, `check`, `doctor`, and `inspect` workflows;
- packed-package consumer tests;
- source maps;
- GitHub Pages docs;
- executable reference implementations.

### v0.1 deliberately does not wrap

- deprecated roots/sampling/logging APIs;
- Tasks extension;
- MCP Apps extension;
- OAuth implementation;
- custom transports;
- persistence/session frameworks;
- MCP client framework functionality.

Advanced official-SDK functionality remains reachable through an escape hatch.

## 5. Proposed public API

Final signatures must be proven by type fixtures before being frozen, but the desired shape is:

```ts
import { createServer, text } from "slowmcp"
import * as z from "zod/v4"

export const app = createServer({
  name: "weather",
  version: "1.0.0"
})

app.tool({
  name: "forecast",
  description: "Get a forecast for a city",
  input: z.object({ city: z.string() }),
  handler: async ({ city }) => text(`${city}: sunny`)
})
```

Resource:

```ts
app.resource({
  name: "menu",
  uri: "coffee://menu",
  description: "Current menu",
  handler: async () => ({
    contents: [{
      uri: "coffee://menu",
      mimeType: "application/json",
      text: JSON.stringify({ drinks: ["coffee", "espresso"] })
    }]
  })
})
```

Prompt:

```ts
app.prompt({
  name: "recommend-drink",
  description: "Recommend a drink",
  input: z.object({ mood: z.string() }),
  handler: async ({ mood }) => ({
    messages: [{
      role: "user",
      content: { type: "text", text: `Recommend a drink for ${mood}.` }
    }]
  })
})
```

### Transport APIs

```ts
import { serveStdio } from "slowmcp/stdio"
await serveStdio(app)
```

```ts
import { createHttpHandler } from "slowmcp/http"
export default createHttpHandler(app)
```

```ts
import { serveNode } from "slowmcp/node"
await serveNode(app, { port: 3000, host: "127.0.0.1" })
```

Transport code must delegate protocol behavior to the official SDK.

### Testing API

SlowMCP should expose a small application-testing layer, not merely a raw client constructor.

```ts
import { testServer } from "slowmcp/testing"

const mcp = testServer(app)

const tools = await mcp.tools()

const result = await mcp.call("forecast", {
  city: "Detroit"
})

await mcp.close()
```

The harness should provide convenience operations for the common contract:

- `tools()`;
- `resources()`;
- `prompts()`;
- `call(name, arguments)`;
- `read(uri)`;
- `getPrompt(name, arguments)`;
- `client` for direct access to the official MCP `Client`;
- `close()`.

Optional matcher helpers may be provided for Vitest/Jest-style assertions, but they must remain a thin presentation layer over normal result objects.

Implementation rule: `testServer()` uses the official MCP `Client` and official client transport. For fast modern-protocol tests, its fetch path can target the official server handler in-process rather than opening a socket.

This is one of SlowMCP's primary product features.


### Official SDK escape hatch

```ts
app.extend((mcpServer) => {
  // register advanced behavior directly with the official SDK
})
```

The callback runs whenever SlowMCP builds a fresh official server instance.

## 6. Result helpers

SlowMCP should remove repetitive response boilerplate without guessing what arbitrary return values mean.

Initial helpers:

```ts
text("hello")
json({ ok: true })
toolError("not found")
```

Rules:

- helpers return ordinary MCP result shapes;
- raw result objects are always allowed;
- no magical coercion of random strings/objects in v0.1.

## 7. Internal architecture

```text
packages/slowmcp/
  src/
    index.coffee
    server/
      definition-registry.coffee
      server-definition.coffee
      build-mcp-server.coffee
    definitions/
      tool.coffee
      resource.coffee
      prompt.coffee
    results/
      text.coffee
      json.coffee
      error.coffee
    transports/
      http.coffee
      stdio.coffee
      node.coffee
    testing/
      connect-test-client.coffee
    cli/
      index.coffee
      commands/
        init.coffee
        doctor.coffee
        inspect.coffee
        eval.coffee
      presentation/
        banner.coffee
        chatter.coffee
    errors/
      slowmcp-error.coffee
      duplicate-definition-error.coffee
  types/
    index.d.ts
    http.d.ts
    stdio.d.ts
    node.d.ts
    testing.d.ts
```

### Definition registry

Responsibilities:

- store server metadata;
- store tool/resource/prompt definitions;
- reject duplicate public names;
- preserve deterministic insertion order;
- validate definition shape;
- create immutable snapshots for server construction;
- expose safe diagnostics to tests/CLI.

No MCP wire behavior belongs here.

### `buildMcpServer()`

For a definition snapshot:

1. create an official `McpServer`;
2. register SlowMCP tools/resources/prompts;
3. apply `extend()` callbacks;
4. return the official instance.

This is the core adapter and deserves heavy contract testing.

### The three contracts

Because the runtime implementation is CoffeeScript, SlowMCP must treat three external contracts as first-class product artifacts. A release is not trustworthy unless all three are green.

#### 1. Protocol contract

SlowMCP behavior must be exercised through the **official MCP Client**, not only by calling internal handlers directly. The protocol contract proves that SlowMCP produces observable MCP behavior equivalent to the official SDK path it wraps.

Required proof includes:

- modern Streamable HTTP round trips;
- real-process stdio round trips;
- framework-parity reference behavior;
- fresh-instance/stateless behavior;
- Inspector compatibility.

#### 2. Type contract

CoffeeScript does not statically verify the TypeScript API we promise consumers. Therefore the `.d.ts` surface is effectively a public specification and must be tested from outside the package.

Required proof includes:

- fresh TypeScript consumer fixtures;
- handler input inference from Zod;
- a second Standard Schema implementation;
- positive type assertions;
- negative `@ts-expect-error` fixtures for invalid API use;
- every public subpath imported from the packed artifact, not workspace source.

The public API should stay intentionally small because every public generic becomes part of this contract.

#### 4. Package contract

The package consumers install must be ordinary modern JavaScript with declarations. The repository's CoffeeScript choice must not leak into application setup or runtime.

Required proof includes:

- `pnpm pack`;
- clean temporary consumer projects;
- ESM import of every public subpath;
- no runtime dependency on `coffeescript`;
- no `.coffee` source required to execute;
- source-map behavior verified separately;
- Node lifecycle behavior proven outside the monorepo.

These three contracts outrank internal unit-test count. A framework with 500 passing internal tests but a broken packed type surface is broken.

## 8. Repository architecture

Start with one published package and subpath exports. Do not prematurely split the framework into many packages.

```text
slowmcp/
├── CLAUDE.md
├── README.md
├── README_COPY_SPEC.md
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── package.json
├── pnpm-workspace.yaml
├── packages/
│   └── slowmcp/
├── examples/
│   ├── hello-tool/
│   ├── coffee-shop/
│   ├── framework-parity/
│   └── remote-http/
├── fixtures/
│   ├── consumer-js/
│   ├── consumer-ts/
│   ├── consumer-zod/
│   ├── consumer-valibot/
│   └── no-coffeescript/
├── evals/
│   ├── manifest.yaml
│   └── runners/
├── docs/
├── scripts/
└── .github/workflows/
```

Package subpaths:

```text
slowmcp
slowmcp/http
slowmcp/stdio
slowmcp/node
slowmcp/testing
```

## 9. CoffeeScript containment contract

This is both an engineering invariant and the running joke.

The published package must provide normal JS/TS consumption with no CoffeeScript runtime requirement.

Hard containment gate:

- build and `pnpm pack`;
- install the tarball into a clean temp project;
- assert no runtime dependency on `coffeescript`;
- assert public imports work;
- run JS and TS consumers;
- verify no `.coffee` file is required to execute;
- verify source maps behave as designed.

Containment is a package-contract gate, not merely a packaging smoke test.

Release output may say:

```text
PASS coffeescript-containment
CoffeeScript remains contained.
```

## 10. Testing strategy

SlowMCP has two testing responsibilities:

1. test SlowMCP itself;
2. provide a better testing workflow to applications built with SlowMCP.

The public `slowmcp/testing` package is therefore part of the product surface, not an internal convenience.

### Layer A — unit tests

Test framework logic without transport:

- registration;
- duplicates;
- order;
- helpers;
- normalization;
- errors;
- CLI formatting.

### Layer B — adapter contract tests

Build official `McpServer` instances from SlowMCP definitions and verify registration and handler behavior.

### Layer C — in-process modern HTTP integration

Use the official MCP `Client` and official Streamable HTTP client transport. Wire requests directly to the official `createMcpHandler(...).fetch` path where possible. Verified working in T02: `StreamableHTTPClientTransportOptions.fetch` accepts an in-process handler, so the official transport is used unmodified.

This is the primary fast integration harness.

**Protocol era is stated, then asserted.** The official client's `versionNegotiation.mode` defaults to `'legacy'`, so a client constructed the obvious way negotiates 2025-11-25 against a fully modern server and passes every other assertion. Every harness must therefore declare two things (the negotiation mode it asks for, and the protocol revision it requires to have actually happened) and assert the second before any capability assertion. See `BOOTSTRAP_FINDINGS.md` §7.1.

Never derive "modern" from `LATEST_PROTOCOL_VERSION` or `SUPPORTED_PROTOCOL_VERSIONS`. The SDK exports `'2025-11-25'` as latest and omits 2026-07-28 from the supported list, because the modern era is a separate axis reached through the discovery probe.

### Layer D — real-process stdio

Spawn a packed reference server with the official `StdioClientTransport`.

This catches:

- stdout protocol corruption;
- process lifecycle issues;
- packaging/path problems;
- CLI accidental output;
- exit/signal problems.

### Layer E — real HTTP socket

Use a real loopback Node HTTP server for selected lifecycle/security tests:

- port binding;
- host/origin validation;
- shutdown;
- actual headers;
- network integration.

### Layer F — packed consumer tests

Never trust workspace resolution.

For every release candidate:

1. `pnpm pack`;
2. create clean temp consumers;
3. install only the tarball plus consumer dependencies;
4. run JS consumer;
5. compile/run TS consumer;
6. prove Zod inference;
7. prove a second Standard Schema implementation;
8. prove CoffeeScript is absent.

### Layer G — Inspector smoke

Run a stable non-interactive MCP Inspector smoke against a packed reference server where supported.

### Layer H — executable reference applications

Every reference is a self-verifying server/client pair. The client connects using the official MCP client, exercises public behavior, asserts results, and exits non-zero on mismatch.

### Layer I — documentation tests

- docs site builds;
- quickstart compiles/runs;
- linked examples exist;
- public API snippets typecheck or are sourced from tested files;
- docs do not claim exports absent from the packed tarball.

## 11. Evals

Tests answer: "is this code correct?"

Evals answer: "does SlowMCP still satisfy its product claims?"

### Hard release evals

| Eval | Claim |
|---|---|
| `package-install` | packed artifact installs |
| `js-consumer` | normal JS consumer runs |
| `ts-consumer` | TS consumer compiles/runs |
| `schema-zod` | Zod inference works |
| `schema-alt` | another Standard Schema library works |
| `modern-http` | 2026 HTTP round trip |
| `legacy-http` | SDK compatibility posture remains true |
| `stdio-process` | real child-process round trip |
| `node-http` | real loopback HTTP server |
| `framework-parity` | official SDK / FastMCP / SlowMCP normalized behavior matches |
| `fresh-instance` | no hidden server-instance state leaks |
| `escape-hatch` | official SDK extension works |
| `source-map` | mapped errors resolve correctly |
| `containment` | CoffeeScript not required by consumer |
| `inspector` | Inspector smoke succeeds |
| `quickstart` | documented quickstart runs |
| `reference-apps` | all reference clients self-verify |
| `slowmcp-check` | the public release-readiness command passes against a built reference app |
| `docs-build` | Pages artifact builds |

### Informational evals

Track without gating v0.1:

- packed size;
- cold start;
- registration time;
- HTTP overhead vs raw SDK;
- stdio startup overhead;
- declaration compile time.

## 12. Reference implementations

Reference implementations are product proofs, not demo fluff.

### `hello-tool`

Smallest possible SlowMCP server.

- one typed tool;
- stdio;
- self-verifying client;
- no external services.

This is the README quickstart.

### `coffee-shop`

Feature showcase that stays understandable.

Capabilities:

- `list_drinks` tool;
- `place_order` tool with structured typed input;
- `coffee://menu` resource;
- `recommend-drink` prompt;
- deliberate tool error path;
- HTTP and stdio modes.

This proves tools/resources/prompts, validation, results, errors, both transports, and docs examples.

### `framework-parity`

The credibility example.

Three servers expose equivalent behavior:

```text
official-sdk/  -> official MCP SDK directly
fastmcp/       -> Prefect FastMCP TypeScript
slowmcp/       -> SlowMCP
```

One official client drives all three and compares normalized results.

This proves SlowMCP is an application framework around the official SDK, not protocol magic.

The comparison should publish real, generated evidence such as:

- source line counts;
- bootstrap/configuration steps;
- equivalent discovered capabilities;
- normalized client-observed results;
- advertised JSON Schema per implementation;
- negotiated protocol revision per era;
- transport behavior.

Do not publish flattering numbers unless CI can reproduce them.

**Divergence is output, not failure.** Where implementations differ observably but remain behaviorally equivalent, the harness records what each one emitted and publishes the row. T03 already found one: given the identical Zod validator, FastMCP advertises `additionalProperties: false` and the raw SDK omits the key. Neither is wrong. The harness must not normalize such differences away, and matching another framework's choice is not a goal.

### `remote-http`

Shows a realistic stateless remote deployment with:

- web-standard handler;
- Node adapter runner;
- explicit application state where needed;
- modern HTTP client;
- safe localhost behavior in local mode.

### Fixtures are not examples

Fixtures are intentionally minimal and hostile. Examples teach; fixtures attack.

## 13. Documentation site

Use **Astro + Starlight** and deploy static output through GitHub Actions to GitHub Pages.

Suggested information architecture:

```text
Home
├── Quickstart
├── What SlowMCP Does
│   ├── What It Replaces
│   └── Why Not Just Use the SDK?
├── Concepts
│   ├── Definition Registry
│   ├── Stateless MCP
│   └── CoffeeScript Containment
├── Build Servers
│   ├── Tools
│   ├── Resources
│   ├── Prompts
│   └── Results & Errors
├── Serve
│   ├── stdio
│   ├── Streamable HTTP
│   └── Node.js
├── Test
│   ├── testServer()
│   ├── Contract Tests
│   └── Reference Harness
├── Ship
│   ├── slowmcp check
│   ├── Package Contract
│   └── CI / Release Gates
├── CLI
├── Reference Implementations
├── API Reference
├── Compatibility
└── Contributing
```

Docs rules:

- every Quickstart is executable in CI;
- every example page links to executable source;
- README stays short;
- deep concepts live on the docs site;
- jokes are sparse;
- docs never invent APIs;
- eventually surface a `CoffeeScript containment: passing` badge from CI/release data;
- use **Blazingly adequate.** as the canonical tagline;
- include the measured FastMCP comparison and the adjacent unserious comparison table;
- include **TypeScript support: never.** exactly in the roadmap.

## 14. CLI

v0.1 commands:

```text
slowmcp init
slowmcp dev
slowmcp test
slowmcp check
slowmcp doctor
slowmcp inspect
slowmcp --version
slowmcp --help
```

### Command responsibilities

`slowmcp init`

- scaffold the recommended project structure;
- create one working capability;
- create a starter contract test;
- configure scripts without requiring CoffeeScript in the generated app.

`slowmcp dev`

- run the application in a useful local development mode;
- make transport selection explicit;
- never corrupt stdio protocol stdout.

`slowmcp test`

- run the project's MCP contract tests;
- use the public testing harness rather than a private test-only path.

`slowmcp check`

- run the release-readiness verification;
- exercise protocol, transport, package, type, Inspector, and containment gates;
- produce stable machine-readable exit status;
- be useful in local development and CI.

`slowmcp doctor`

- diagnose environment/configuration problems.

`slowmcp inspect`

- launch or connect the official MCP Inspector with minimal setup.

### CLI rules

- 95% useful, 5% joke;
- deterministic output for snapshots;
- `--quiet` supported;
- stable exit codes;
- machine-readable mode should be considered for CI;
- never write chatter to stdio protocol stdout.

The recurring joke is allowed when tied to real checks:

```text
PASS coffeescript-containment
CoffeeScript remains contained.
```

## 15. Security and correctness rules

- delegate protocol parsing/encoding to official SDK;
- no custom wire codec;
- no custom version negotiation;
- configure the intended negotiation mode explicitly and assert the revision actually negotiated;
- never infer the modern revision from SDK version constants;
- no hidden session emulation;
- bind local Node convenience server to loopback by default;
- apply host/origin validation to local HTTP serving;
- never pollute stdio stdout;
- make official SDK extension explicit;
- validate duplicate public capability names before serving;
- keep runtime dependencies small.

## 16. CI

Required PR jobs:

The three contracts should be visible in CI as named groups: `protocol-contract`, `type-contract`, and `package-contract`. They may fan out into narrower jobs, but all three must be required checks.

```text
build
unit
protocol-contract
type-contract
package-contract
integration-modern-http
integration-stdio
integration-node-http
pack-consumers
reference-apps
framework-parity
slowmcp-check
containment
docs-build
```

Release candidate adds:

```text
inspector-smoke
source-map-eval
package-size-report
performance-report
```

## 17. Definition of done for v0.1

SlowMCP is release-candidate ready when:

1. a clean TypeScript app can install the packed package;
2. README quickstart creates a working MCP server;
3. the recommended project structure is scaffoldable with `slowmcp init`;
4. a developer can write MCP contract tests with `slowmcp/testing` without manually assembling an MCP client;
5. one definition set works over stdio and modern HTTP;
6. the official MCP Client can list/call/read/get every exposed capability;
7. `slowmcp check` verifies protocol, transports, package, types, Inspector compatibility, and containment;
8. the framework-parity reference passes and demonstrates equivalent client-observed behavior;
9. all reference implementations self-verify;
10. consumers do not need CoffeeScript;
11. source maps behave correctly;
12. GitHub Pages docs build/deploy successfully;
13. all hard evals pass;
14. CLI is useful and only occasionally embarrassing.

The release should be able to answer, with executable evidence:

> Why would I use this instead of calling the official SDK directly?

The expected answer is:

> Because SlowMCP gives you conventions, protocol-backed tests, and a repeatable shipping check while leaving the official SDK underneath.


## 18. Sources and versioning

This architecture was last reconciled against the public ecosystem on **August 9, 2026**. Implementation agents must re-check dependency versions and public APIs during T00/T03 rather than treating version numbers or competitor surfaces in this document as permanent.

T00–T03 have now run. Where this document and the findings disagree, **the findings win**: they record what was verified against installed packages rather than what was expected.

- `BOOTSTRAP_FINDINGS.md`: pinned versions, CoffeeScript and source-map behavior, the official SDK APIs actually used, and four assumptions in this document that proved incorrect.
- `BASELINE_FINDINGS.md`: the measured FastMCP comparison and the do-not-build set.
- `docs/bootstrap-2026-08.md`: the narrative phase report.

Corrections already folded into this document: the v2 SDK is the `@modelcontextprotocol/server` / `client` / `core` split rather than `@modelcontextprotocol/sdk`; protocol-era negotiation is opt-in and must be asserted (§10, §15); source maps do not require shipping `.coffee`; the `framework-parity` layout in §12 now matches §2.

Primary baselines:

- Official MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- MCP specification/release information: https://modelcontextprotocol.io/
- Prefect FastMCP TypeScript: https://github.com/PrefectHQ/fastmcp-ts
- punkpeye FastMCP: https://github.com/punkpeye/fastmcp
- CoffeeScript: https://coffeescript.org/
- Astro GitHub Pages guide: https://docs.astro.build/en/guides/deploy/github/
- Starlight docs: https://starlight.astro.build/

The competitive baseline is evidence, not an enemy list. If FastMCP or the official SDK gains a feature that erases SlowMCP's proposed wedge, update the architecture instead of pretending otherwise.
