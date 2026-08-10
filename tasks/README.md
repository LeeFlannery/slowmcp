# Phase 2 tasks

Six agents, two waves. Wave 1 builds the capability and transport surface.
Wave 2 builds everything that can only be written once that surface exists.

Phase 1 is complete and `pnpm phase2:ready` is green. The contract-to-check
mapping in `ARCHITECTURE.md` §11 names what enforces what; read it before
assuming a contract is unguarded.

## Waves

### Wave 1

| Task | Agent | Starts |
|---|---|---|
| [T20](T20-agent-a-capabilities.md) | A, capabilities | immediately |
| [T21](T21-agent-b-transports.md) | B, transports | immediately |
| [T22](T22-agent-c-testing-evals.md) | C, testing and evals | immediately, in three stages, gated on A and B |

A and B are independent of each other. C's first stage depends on neither, its
second on A's published contracts, its third on B's.

### Wave 2

**Do not begin Wave 2 until Wave 1 is merged to `main` and `pnpm phase2:ready`
is green on `main`.**

| Task | Agent | Depends on |
|---|---|---|
| [T23](T23-agent-d-cli.md) | D, CLI | A, B, C |
| [T24](T24-agent-e-references.md) | E, reference applications | A, B, C |
| [T25](T25-agent-f-docs.md) | F, documentation | A, B, C, and E for generated numbers |

## Shared surfaces

These are **integration-owned**. An agent that needs one changed opens a
request to the integration owner, stating what it needs and why, and waits.
No agent edits them on its branch.

| Surface | Why it is shared |
|---|---|
| `packages/slowmcp/src/protocol/compatibility.coffee`, `types/protocol.d.ts` | Changing it changes what SlowMCP claims to support. It must be a visible, deliberate diff, never a side effect of a transport or capability change. |
| `packages/slowmcp/package.json` `exports` and `files` | Every new public subpath must land with a declaration file, fixture coverage, and export-surface coverage at the same time. Uncoordinated edits ship an unexercised subpath. |
| `scripts/phase2-ready.mjs` gate list, `scripts/slowmcp-check.mjs` `ORDER` | Check ordering is a stable snapshot surface. Agent C is the only agent that may edit these, and only on integration approval. Every other agent *requests* a check rather than adding one. |
| root `package.json` scripts, `pnpm-workspace.yaml`, `vitest.config.ts` | Workspace-wide. Request unless your task explicitly assigns the change. |
| `CLAUDE.md`, `ARCHITECTURE.md` | Integration reconciles these once per wave. |

## Rules that bind every agent

1. **No agent may weaken a test or a contract to make its branch green.** A
   failing gate is a finding. Report it; do not edit the assertion.
2. **No agent may rewrite CoffeeScript implementation code in TypeScript or
   JavaScript.** All runtime source under `packages/slowmcp/src/` stays
   `.coffee`. This is a product requirement. See `CLAUDE.md`.
3. **Every new enforcement mechanism must be deliberately broken once**, and
   the observed failure recorded in the report. A guard nobody has watched fail
   is not evidence. Restore the break before finishing; the tree must be clean.
4. **Protocol behavior is the official SDK's.** Never implement wire format,
   negotiation, or a codec.
5. **Public API changes require the declaration and the docs in the same
   change.** CoffeeScript emits no types, so a `.d.ts` is a hand-maintained
   promise, not a derivative.
6. Stay inside your owned paths. Touching another agent's paths is an
   integration request, not a commit.
7. Work on a branch named for the task, for example `t20-capabilities`.

## Frozen interfaces

Every agent respects these. They are Phase 1 output, proven and pinned by
tests. Changing one is an integration decision with a migration note.

- **The `DefinitionCollection` sequence**: validate, reject duplicate, append
  in insertion order, freeze. Every capability kind reuses it.
- **Snapshot semantics**: `createHttpHandler(app)` and `testServer(app)` serve
  the snapshot taken when they were created. A later registration cannot alter
  a handler that is already serving.
- **Fresh instance per exchange**: `buildMcpServer` is called per request from
  the frozen snapshot. No server instance is reused across connections.
- **Root export purity**: `slowmcp` exports only the authoring API. It never
  re-exports `slowmcp/http`, `slowmcp/testing`, or `slowmcp/protocol`.
- **Protocol policy is asserted before caller assertions run**, and the policy
  literal is SlowMCP-owned, never derived from SDK constants.
- **Result helpers do not coerce.** `text(42)` throws. Raw MCP result objects
  stay valid everywhere a helper is accepted.

## Reporting

Each task file ends with the exact report the agent owes the integration
owner. Send that, not a narrative.
