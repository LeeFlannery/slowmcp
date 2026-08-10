# T21: Agent B, transports

Wave 1. Runs in parallel with T20. T22 stage 3 depends on this task.

## Goal

SlowMCP serves over stdio and over a real Node HTTP socket, both verified
through the official MCP client in a real process, with defined shutdown
behavior and no chatter on protocol stdout.

## Why this task exists

Phase 1 shipped exactly one transport and verified it over an injected `fetch`.
Every HTTP round trip in the repository today is a real official client
speaking the real protocol to a real handler, with no socket bound. That is a
legitimate way to test fast, and it is not evidence that SlowMCP survives a
network stack, a process boundary, or a signal.

stdio is the transport most MCP clients actually use, and it is the one with a
failure mode no HTTP test can find: a single stray `console.log` in application
code corrupts the protocol stream. SlowMCP cannot claim stdio support until it
has proven what happens when someone writes to stdout.

**This task closes the Phase 1 limitation recorded in `ARCHITECTURE.md` §11.**

## Read first

- `CLAUDE.md`, in full.
- `ARCHITECTURE.md` §5 transport APIs, §10 layers D and E, §11 (the two limits
  named under "Enforced today"), §15 security and correctness rules.
- `packages/slowmcp/src/transports/http.coffee`. Note how little it does: the
  returned object is the SDK's own handler, not a wrapper. Match that
  restraint.
- `packages/slowmcp/src/server/build-mcp-server.coffee`.
- `packages/slowmcp/types/http.d.ts` for declaration house style.
- `tasks/README.md`.

## Owned paths

```text
packages/slowmcp/src/transports/**
packages/slowmcp/types/http.d.ts
packages/slowmcp/types/stdio.d.ts        new
packages/slowmcp/types/node.d.ts         new
packages/slowmcp/test/transports/**      new
```

## Forbidden paths

```text
packages/slowmcp/src/protocol/**         integration, and see below
packages/slowmcp/src/definitions/**      T20
packages/slowmcp/src/server/**           T20
packages/slowmcp/src/results/**          T20
packages/slowmcp/src/testing/**          T22
packages/slowmcp/types/{index,testing,protocol}.d.ts
fixtures/**                              T22
examples/**                              T24
docs/**                                  T25
packages/slowmcp/package.json            integration
```

## Frozen interfaces you must respect

- **Protocol behavior is the official SDK's.** No wire format, no negotiation
  logic, no codec, no framing. Use the SDK's server transport entry points.
- **Fresh instance per exchange.** `createHttpHandler` builds a new official
  server per request from the frozen snapshot. Preserve that model for HTTP.
  For stdio, one process is one long-lived session; state that difference
  explicitly in the declaration rather than pretending they match.
- **Snapshot at creation.** A transport takes `app.snapshot()` when it is
  created, never at connect. Pinned by `snapshot-semantics.test.ts`.
- Root export purity. Transports live on their own subpaths and are never
  re-exported from `slowmcp`.
- **The protocol policy is not yours.** `protocolPolicy.negotiation` is what
  clients are told to request and `accepts` is what a session must have
  landed on. If a transport appears to need either changed, that is a stop
  condition, not an edit. Changing it without integration approval is the one
  thing on this task that silently invalidates every protocol claim SlowMCP
  makes.

## Requirements

1. **stdio.** `serveStdio(app, options?)` on `slowmcp/stdio`, using the
   official SDK stdio server transport. Returns a handle with a documented
   shutdown method.
2. **stdout safety.** Application code writing to `process.stdout` must not
   corrupt the protocol stream. Decide the mechanism (redirect application
   writes to stderr, or fail loudly), implement it, document it, and prove it
   with a test that writes to stdout from inside a tool handler and still
   completes a clean round trip. If you conclude the only honest answer is a
   documented warning rather than a guarantee, say so and prove what actually
   happens.
3. **Real-process stdio verification.** Spawn an actual child process running a
   SlowMCP stdio server. Drive it with the official `Client` over the official
   stdio client transport. Assert negotiation against `protocolPolicy`,
   discovery, invocation, and a clean exit.
4. **Node HTTP.** `serveNode(app, options?)` on `slowmcp/node`, binding a real
   socket. Defaults must be safe: loopback host, no wildcard bind without an
   explicit opt-in.
5. **Host and origin validation.** Implement the checks `ARCHITECTURE.md` §15
   requires, and prove a rejected origin is rejected.
6. **Real-socket verification.** Bind an ephemeral port, drive it with the
   official `Client` over the official Streamable HTTP client transport with no
   injected `fetch`, and assert the same contract the in-process tests assert.
   This is the specific evidence that closes the Phase 1 limitation.
7. **Shutdown and lifecycle.** Defined behavior for: close with no connection,
   close twice, close with an in-flight request, and SIGINT. In-flight requests
   must not be silently dropped. Prove the port is released.
8. **Declarations.** `types/stdio.d.ts` and `types/node.d.ts`, matching the
   documentation depth of `types/testing.d.ts`, including the stdio session
   model and the shutdown contract.

## Non-goals

Do not build: WebSocket or SSE-only transports, auth, TLS, clustering,
process supervision, a dev-server watcher (that is T23), reverse-proxy
guidance, or a custom HTTP framework integration. Do not reimplement anything
`createMcpHandler` already does. Do not add a transport-selection abstraction
over the three transports; three named functions is the API.

## Tests and evals required

In `packages/slowmcp/test/transports/`:

- Real-process stdio round trip, official client, asserted protocol revision.
- stdout pollution test: a tool handler writes to stdout, round trip still
  succeeds, protocol stream uncorrupted.
- Real-socket Node HTTP round trip on an ephemeral port, no injected `fetch`.
- Origin and host rejection.
- Shutdown matrix: no connection, twice, in-flight request, SIGINT, port
  released after close.
- Snapshot semantics for both new transports, matching existing tool coverage.
- Fresh instance per exchange still holds for Node HTTP.

Tests that spawn processes or bind sockets must be deterministic and must not
leak either. A leaked port or orphaned child is a defect in this task.

## Intentional falsification

Break each once, record the exact failure, restore:

| Break | Must fail with |
|---|---|
| `console.log('hi')` inside a stdio tool handler | the stdout-safety test, if you implemented a guarantee; otherwise the documented observable behavior, exactly as documented |
| bind `0.0.0.0` by default | the safe-default test |
| skip `assertProtocolPolicy` on the stdio session | the stdio negotiation test |
| return the same server instance across two HTTP exchanges | the fresh-instance test |
| resolve `close()` before in-flight work settles | the in-flight shutdown test |
| ship `slowmcp/stdio` without a `types` condition | `pnpm eval:export-surface` reports `export map incomplete` |

## Acceptance commands

```sh
pnpm phase2:ready
```

Must be green. Note that the new subpaths only reach `slowmcp:check` once
integration lands the export map entries and T22 lands fixture coverage, so
run this before and after that coordination and report both.

## Definition of done

- stdio and Node HTTP both work through the official client in a real process
  and over a real socket.
- The Phase 1 injected-`fetch` limitation is closed, with the test named.
- stdout safety behavior is implemented, documented, and proven.
- Shutdown matrix complete, no leaked ports or processes.
- `types/stdio.d.ts` and `types/node.d.ts` written and agreeing with runtime.
- Falsification table run, failures recorded.
- `pnpm phase2:ready` green. No test weakened. Protocol policy untouched.

## Stop condition

Stop and report without finishing if:

- the official SDK's stdio transport requires a protocol policy change;
- stdout safety cannot be guaranteed without intercepting application code in a
  way that violates §15;
- the SDK's Node serving entry point does not support the fresh-instance model,
  because that is a conflict between two frozen contracts;
- graceful shutdown requires holding a server instance across exchanges.

## Integration notes

- **You need two new public subpaths.** `slowmcp/stdio` and `slowmcp/node`
  require `exports` entries in `packages/slowmcp/package.json`, which is
  integration-owned. Request them with the exact export names and declaration
  paths once stable. Until they land, your subpaths are invisible to
  `slowmcp:check` and to the export-surface guard.
- **T22 stage 3 is blocked on you.** Publish `serveStdio` and `serveNode`
  signatures to T22 as soon as they are stable. T22 needs them for stdio
  testing support and the real-socket eval, and T24's `remote-http` reference
  needs `serveNode` in Wave 2.
- Send T22 the export names for fixture surface coverage. Do not edit
  `fixtures/**`.
- You do not depend on T20. If you find yourself needing resources or prompts,
  you have left your scope.

## Report back

1. `serveStdio` and `serveNode` final signatures, including options and the
   shutdown handle.
2. The exact test that closes the injected-`fetch` limitation, by file and
   test name.
3. stdout safety: mechanism chosen, what is guaranteed, what is not.
4. Safe defaults: host, port, origin policy, and what an opt-out looks like.
5. Shutdown behavior for each case in the matrix.
6. New public subpaths and export names, for the integration export-map
   request.
7. Falsification results: each break, and the exact failure observed.
8. Any place the SDK's stdio and HTTP models differ in a way consumers will
   notice, stated plainly rather than normalized away.
