# SlowMCP: Competitive Baseline Findings

T03. The same `greet` contract implemented twice, directly on the official MCP
SDK and with Prefect FastMCP TypeScript, driven by one official MCP `Client`
with identical assertions.

Measured on **9 August 2026** against `@modelcontextprotocol/server@2.0.0`,
`@modelcontextprotocol/client@2.0.0`, and `@prefecthq/fastmcp-ts@1.4.0`.

Reproduce with `pnpm spike:baseline`. Every number below comes from that
command or from the commands quoted beside it. Nothing here is estimated.

## 1. Result

```text
PASS spike:baseline

  protocol eras
    modern   2026-07-28  both implementations equivalent (tools/list, tools/call)
    legacy   2025-11-25  both implementations equivalent (tools/list, tools/call)

  authoring size
    official-sdk  25 significant lines (raw-sdk-server.ts)
    fastmcp       17 significant lines (fastmcp-server.ts)

  advertised inputSchema, same Zod validator
    key                  official-sdk  fastmcp
    $schema              draft/2020-12  draft/2020-12
    additionalProperties (absent)      false          <- differs
    properties           {name: …}      {name: …}
    required             ["name"]      ["name"]
    type                 "object"      "object"
```

In both eras, both implementations advertise one tool named `greet` with the
same description and return `Hello, Detroit.` for `{ name: "Detroit" }`. They
are behaviourally equivalent over the protocol.

## 2. API shape

### Official SDK

```ts
const server = new McpServer({ name, version })

server.registerTool(
  'greet',
  { description, inputSchema: greetInput },
  async (args) => ({ content: [{ type: 'text', text: greetText(args) }] })
)

const handler = createMcpHandler(() => createGreetServer())
await handler.fetch(request)
```

Three concepts to hold: the server, the per-request factory, and the handler.
The result must be constructed by hand as a `content` array.

### FastMCP

```ts
const server = new FastMCP({ name, version })

server.tool({ name, description, input: greetInput }, (args) => greetText(args))

await server.fetch(request)
```

One object. `input` takes any Standard Schema and infers the handler argument
type. A returned string is coerced into a text content block. The server is
itself the fetch handler; there is no separate factory or handler step.

## 3. Measured size

Significant lines = non-blank, non-comment, counted by the spike itself.

| | official SDK | FastMCP |
|---|---:|---:|
| Significant lines for the `greet` server | 25 | 17 |
| Concepts to introduce | server, factory, handler | server |
| Manual result construction | yes | no |

Installed footprint, measured with `npm i` into an empty project
(`@modelcontextprotocol/client` + `zod` held constant in both):

| | official SDK | FastMCP |
|---|---:|---:|
| Top-level `node_modules` entries | 12 | 122 |
| Installed size | 21 MB | 46 MB |

FastMCP's extra weight is the cost of what it includes: Express, an OAuth
stack, a CLI (`citty`, `@clack/prompts`, `listr2`, `cli-table3`), a file
watcher, and YAML. That is a coherent trade for a batteries-included framework,
not a defect.

## 4. Observable divergence, as data

Given the identical Zod validator, the two frameworks advertise different JSON
Schema. FastMCP emits `additionalProperties: false`; the raw SDK omits the key.
Every other advertised key agrees.

This is a **measurement, not a defect**. Both schemas are valid, both describe
the same accepted input, and the difference is exactly the kind of row a
comparison harness exists to publish: two frameworks presenting the same tool
differently to the same client.

How it is handled:

- `assertEquivalent` covers negotiated revision, server identity, tool listing,
  description, and call result. Behaviour must match.
- `compareAdvertisedSchemas` returns every advertised key with what each
  implementation emitted and whether they agreed. It normalizes nothing.
- `spikes/test/protocol.test.ts` pins the current divergence, so a change in
  either framework fails a test and the comparison gets regenerated instead of
  quietly going stale.

Nothing here needs fixing, and SlowMCP should not treat matching either
framework's choice as a goal. When SlowMCP becomes the third row in this table,
whatever it emits becomes another data point.

## 5. What FastMCP already does well

Observed in its declaration surface, not from its docs:

- one-call tool registration with Standard Schema input inference;
- automatic result coercion from plain return values;
- a web-standard `fetch` face on the server object, plus `run()` and
  `connect(transport)` for other transports;
- resources and prompts through the same registration idiom;
- middleware (`use`), server composition (`mount`, `addProvider`), and
  transforms (`renameTool`, `redescribeTool`, namespacing, filtering);
- auth as a first-class option: bearer verifiers, JWT, introspection, a full
  OAuth 2.1 server, and an OAuth proxy;
- MCP Apps / UI components (`Table`, `Grid`, `Rx`, `ForEach`, …);
- OpenAPI server generation and proxying (`createOpenAPIServer`, `createProxy`);
- built-in middleware for caching, rate limiting, size limits, cancellation,
  logging, and error normalization.

## 6. What SlowMCP must not chase

Directly from the list above, this is the do-not-build set for v0.1:

- auth of any kind: no bearer verifiers, no JWT, no OAuth server, no proxy;
- gateways, proxying, and OpenAPI generation;
- a middleware system;
- server composition, mounting, and tool transforms;
- MCP Apps / UI components;
- sessions and persistence;
- edge-runtime matrices.

Adding any of these to reach parity would make SlowMCP a worse FastMCP.

## 7. Where the wedge actually is

FastMCP already wins authoring ergonomics. Eight lines is eight lines, and
SlowMCP is not going to beat `server.tool(...)` by a margin anyone cares about.
Authoring conventions are table stakes, not the pitch.

What neither baseline gives you, and what the bootstrap phase made concrete:

1. **Protocol-backed application testing that is hard to get wrong.** Wiring
   the official `Client` at a `fetch` handler in-process is ~30 lines and one
   non-obvious option. The first version written here passed every assertion
   while negotiating the *wrong protocol revision* (see
   `BOOTSTRAP_FINDINGS.md` §7.1). A `testServer(app)` that pins and asserts the
   negotiated revision is worth more than any authoring sugar.

2. **A release contract.** Nothing in either baseline answers "is this server
   shippable?". Packed-tarball imports, declaration/runtime agreement, both
   transports, both protocol eras, Inspector compatibility. `slowmcp check` is
   the differentiated product.

3. **Honest verification as a habit.** Both findings documents exist because
   the spikes were built to fail loudly. That is the thing to keep.

If the testing and shipping workflow does not end up meaningfully better than
using the official SDK or FastMCP directly, this repository should say so.

## 8. Not yet baselined

- punkpeye `fastmcp` 4.14.0, the other established TypeScript framework;
- stdio for either baseline;
- resources and prompts;
- cold start, throughput, and time-to-first-tool, which belong to the
  `framework-parity` harness in Phase 2 rather than to a bootstrap spike.

No performance numbers are published here because none were measured.
