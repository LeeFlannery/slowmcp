# T21: transports

Wave 1. Runs in parallel with T20. T22 stage 3 depends on this task.

## Goal

SlowMCP serves over stdio and over a bound Node HTTP socket, both verified
through the official MCP Client in a real process, with defined lifecycle
behavior and protocol-only stdout.

## Why this work exists

Phase 1 shipped one transport and verified it over an injected `fetch`. Every
HTTP round trip in the repository today is a real official Client speaking the
real protocol to a real handler, with no socket bound. That is a legitimate way
to test fast. It is not evidence that SlowMCP survives a network stack, a
process boundary, or a signal.

stdio is the transport most MCP clients actually use, and it carries a failure
mode no HTTP test can find: one stray `console.log` in application code
corrupts the protocol stream.

**This task closes the Phase 1 limitation recorded in `ARCHITECTURE.md` §11.**

## Prerequisites

- `pnpm phase2:ready` green on `main`.
- Branch `t21-transports` from `main`.
- Nothing else. This task does not wait on T20.

## Read first

- `CLAUDE.md`, in full, including the test language policy.
- `tasks/README.md`, global invariants and frozen interfaces.
- `ARCHITECTURE.md` §5 transport APIs, §10 layers D and E, §11 the two stated
  limits, §15 security and correctness rules.
- `packages/slowmcp/src/transports/http.coffee`. Note how little it does: the
  returned object is the SDK's own handler, not a wrapper. Match that restraint.
- `packages/slowmcp/types/http.d.ts` for declaration house style.
- **The actual v2 SDK**, which already provides more than the architecture
  assumes:
  - `@modelcontextprotocol/server/stdio` exports `serveStdio(factory, options)`
    returning a `StdioServerHandle` with `close()`, plus
    `StdioServerTransport`. It takes a **factory** and pins **one instance for
    the connection lifetime**. That is not the per-exchange model HTTP uses.
  - The server package exports `validateHostHeader`,
    `localhostAllowedHostnames`, `hostHeaderValidationResponse`,
    `validateOriginHeader`, `localhostAllowedOrigins`, and
    `originValidationResponse`. **Use these. Do not hand-roll host or origin
    validation.**
  - There is no Node HTTP listener helper. `WebStandardStreamableHTTPServerTransport`
    and `createMcpHandler` are web-standard. Binding a socket and adapting
    Node's `req`/`res` to `Request`/`Response` is genuinely SlowMCP's work.

## Owned paths

```text
packages/slowmcp/src/transports/**
packages/slowmcp/src/http.coffee
packages/slowmcp/src/stdio.coffee               new
packages/slowmcp/src/node.coffee                new
packages/slowmcp/types/http.d.ts
packages/slowmcp/types/stdio.d.ts               new
packages/slowmcp/types/node.d.ts                new
packages/slowmcp/test/transports/**             new
```

## Forbidden paths

```text
packages/slowmcp/src/protocol/**                integration, and see below
packages/slowmcp/src/{definitions,server,results,errors}/**   T20
packages/slowmcp/src/testing/**                 T22
packages/slowmcp/types/{index,testing,protocol}.d.ts
fixtures/**                                     T22
examples/**                                     T31
docs/**                                         T32
packages/slowmcp/package.json                   integration
vitest.config.ts                                integration
```

## Frozen interfaces

- **Protocol behavior is the official SDK's.** No wire format, no negotiation,
  no codec, no framing.
- **Snapshot at creation.** A transport captures `app.snapshot()` when created,
  never at connect.
- **Fresh instance per exchange** for HTTP. Preserve it. stdio pins one
  instance per connection because that is the SDK's model; **document the
  difference rather than unifying it**, and do not silently make HTTP behave
  like stdio to make a test simpler.
- Root export purity: transports live on their own subpaths.
- **The protocol policy is not yours.** If a transport appears to need
  `negotiation` or `accepts` changed, that is a stop condition, not an edit.
  Changing it without approval silently invalidates every protocol claim
  SlowMCP makes.

## Requirements

### stdio

1. `serveStdio(app, options?)` on `slowmcp/stdio`, built on the SDK's stdio
   serving path, returning a handle with a documented `close()`.
2. Prove, in a real child process running a **packed** server:
   - the process launches;
   - the official `StdioClientTransport` connects;
   - discovery works;
   - invocation works;
   - **stdout contains protocol traffic only**;
   - diagnostics go to stderr;
   - clean shutdown works;
   - abnormal child failure is surfaced correctly rather than hanging.
3. **stdout safety.** Application code writing to `process.stdout` must not
   corrupt the stream. Decide the mechanism, implement it, document it, and
   prove it with a test that writes to stdout from inside a tool handler and
   still completes a clean round trip. If the only honest answer is a
   documented warning rather than a guarantee, say so and prove what actually
   happens.

### Node HTTP

4. `serveNode(app, options?)` on `slowmcp/node`, binding a real socket,
   adapting Node request and response objects to the web-standard handler.
5. Safe localhost defaults: loopback host, no wildcard bind without an explicit
   opt-in.
6. Host and origin validation **using the SDK helpers named above**.
7. **A real loopback test that closes the Phase 1 gap**, proving: bind;
   connect; headers; protocol negotiation asserted against `protocolPolicy`;
   tool invocation; shutdown. No injected `fetch` anywhere in it.
8. **Lifecycle.** Defined behavior for close with no connection, close twice,
   close with an in-flight request, and SIGINT. In-flight requests must not be
   dropped silently. Prove the port is released.
9. **Declarations.** `types/stdio.d.ts` and `types/node.d.ts` at the
   documentation depth of `types/testing.d.ts`, including the stdio
   one-instance-per-connection model and the shutdown contract.

## Non-goals

Do not build WebSocket or SSE-only transports, auth or bearer-token handling
(the SDK has it; SlowMCP is not wrapping it in v0.1), TLS, clustering, process
supervision, a dev-server watcher (T30), or a transport-selection abstraction
over the three functions. Do not reimplement what `createMcpHandler` or
`serveStdio` already do. **If your `serveStdio` is a pure rename of the SDK's,
report that**: `CLAUDE.md` requires SlowMCP to justify itself beyond renaming
official SDK methods.

## Testing-language policy

- **CoffeeScript** for transport implementation tests: lifecycle, shutdown
  matrix, snapshot semantics, fresh-instance behavior, safe defaults, and the
  stdout-safety unit. These are implementation tests. Import `../src/*.coffee`,
  following `packages/slowmcp/test/snapshot-semantics.test.coffee`.
- **JavaScript or TypeScript** is correct for the child process fixture that
  the stdio test spawns, because it stands in for an ordinary consumer server
  and must run from the packed package with no CoffeeScript present. Do not
  write that fixture in CoffeeScript.
- The CoffeeScript test drives the JavaScript child. That split is the point:
  the test is implementation, the child is a consumer.

## Required tests and evals

In `packages/slowmcp/test/transports/`, CoffeeScript unless noted:

- Real-process stdio round trip against a packed server, official Client,
  asserted protocol revision. Child fixture in JavaScript.
- stdout purity: only protocol frames on stdout, diagnostics on stderr.
- stdout pollution: a tool handler writes to stdout, round trip still succeeds.
- Abnormal child exit surfaced as an error, not a hang. Bound by a timeout.
- Real-socket Node HTTP round trip on an ephemeral port, no injected `fetch`.
- Host and origin rejection.
- Lifecycle matrix: no connection, twice, in-flight, SIGINT, port released.
- Snapshot semantics for both new transports.
- Fresh instance per exchange still holds for Node HTTP.

Tests that spawn processes or bind sockets must be deterministic and leak
neither. A leaked port or orphaned child is a defect in this task.

## Falsification requirements

Break each once, record the exact failure, restore:

| Break | Must fail with |
|---|---|
| `console.log('hi')` inside a stdio tool handler | the stdout-safety test if you implemented a guarantee; otherwise exactly the documented behavior |
| bind `0.0.0.0` by default | the safe-default test |
| skip the policy assertion on the stdio session | the stdio negotiation test |
| reuse one server instance across two HTTP exchanges | the fresh-instance test |
| resolve `close()` before in-flight work settles | the in-flight lifecycle test |
| make the child exit non-zero at startup | the abnormal-failure test, within its timeout, not by hanging |
| ship `slowmcp/stdio` without a `types` condition | `pnpm eval:export-surface`, `export map incomplete` |

## Acceptance commands

```sh
pnpm phase2:ready
```

The new subpaths only reach `slowmcp:check` once integration lands the export
map entries and T22 lands fixture coverage. Run before and after that
coordination and report both.

## Definition of done

- stdio and Node HTTP work through the official Client in a real process and
  over a real socket.
- The Phase 1 injected-`fetch` limitation is closed, with the test named.
- stdout safety implemented, documented, proven.
- Lifecycle matrix complete, no leaked ports or processes.
- `types/stdio.d.ts` and `types/node.d.ts` written and agreeing with runtime.
- Host and origin validation uses the SDK helpers.
- Falsification table run, failures recorded.
- `pnpm phase2:ready` green. No test weakened. Protocol policy untouched.

## Stop condition

Stop and report without finishing if:

- the SDK's stdio path requires a protocol policy change;
- stdout safety cannot be guaranteed without intercepting application code in a
  way that violates §15;
- the SDK's stdio one-instance model conflicts irreconcilably with snapshot
  semantics;
- graceful shutdown requires holding a server instance across HTTP exchanges;
- you conclude `serveStdio` adds nothing over the SDK's own.

## Integration notes

- **You need two new public subpaths.** `slowmcp/stdio` and `slowmcp/node`
  require `exports` entries in `packages/slowmcp/package.json`, which is
  integration-owned. Request them with exact export names and declaration
  paths. Until they land, your subpaths are invisible to `slowmcp:check` and
  the export-surface guard.
- **T22 stage 3 is blocked on you.** Publish `serveStdio` and `serveNode`
  signatures as soon as they are stable. T31's `remote-http` reference needs
  `serveNode` in Wave 2.
- Send T22 export names for fixture coverage. Do not edit `fixtures/**`.
- You do not depend on T20. Needing resources or prompts means you have left
  your scope.
- You are merged **second** in Wave 1 integration, after T20.

## Report back

1. `serveStdio` and `serveNode` final signatures, options, and handles.
2. The exact test that closes the injected-`fetch` limitation, by file and test
   name.
3. stdout safety: mechanism, what is guaranteed, what is not.
4. Safe defaults: host, port, origin policy, and what opting out looks like.
5. Lifecycle behavior for each case in the matrix.
6. How abnormal child failure is surfaced, and the bound on detection.
7. New public subpaths and export names for the integration request.
8. Falsification results: each break and the exact failure observed.
9. Every place the SDK's stdio and HTTP models differ observably, stated
   plainly rather than normalized away.
10. Whether `serveStdio` justifies itself beyond renaming the SDK's.
