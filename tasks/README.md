# Phase 2 tasks

Six agents, two waves. Wave 1 builds the capability and transport surface.
Wave 2 builds everything that can only be written once that surface exists and
is integrated.

Phase 1 is complete and `pnpm phase2:ready` is green on `main`. The
contract-to-check mapping in `ARCHITECTURE.md` §11 names what enforces what.
Read it before assuming a contract is unguarded.

## Waves

### Wave 1

| Task | Owner | Starts |
|---|---|---|
| [T20](T20-capabilities.md) | capabilities | immediately |
| [T21](T21-transports.md) | transports | immediately |
| [T22](T22-testing-evals.md) | testing and evals | immediately, in three stages, gated on T20 and T21 |

T20 and T21 are independent of each other. T22's first stage depends on
neither, its second on T20's published contracts, its third on T21's.

### Wave 1 integration

**Sequential, never parallel.** The integration owner merges in this order:

1. T20 capabilities
2. T21 transports
3. T22 testing and evals

`pnpm phase2:ready` runs after **each** merge, not only at the end. A gate that
fails belongs to the branch that just landed.

After all three are integrated, the integration owner performs **one complete
public-API review** before any Wave 2 task begins: every export, every
declaration, every subpath, against `ARCHITECTURE.md` §5 and the "deliberately
small" rule. Wave 2 designs against the reviewed surface, not against branch
output.

### Wave 2

**Do not begin until Wave 1 is integrated into `main`, `pnpm phase2:ready`
passes, and the public-API review is complete.**

| Task | Owner | Depends on |
|---|---|---|
| [T30](T30-cli.md) | CLI | T20, T21, T22 |
| [T31](T31-reference-apps.md) | reference applications | T20, T21, T22 |
| [T32](T32-docs.md) | documentation | T20, T21, T22, T30, T31 |

T30 and T31 are independent of each other. T32 is last: it documents the CLI
T30 ships and publishes the measurements T31 generates.

## Shared surfaces

**Integration-owned.** An agent that needs one changed reports the required
change and waits. No agent edits them on its branch.

| Surface | Why it is shared |
|---|---|
| `packages/slowmcp/src/protocol/compatibility.coffee`, `types/protocol.d.ts` | Changing it changes what SlowMCP claims to support. It must be a visible, deliberate diff, never a side effect of a transport or capability change. |
| `packages/slowmcp/package.json` `exports`, `files`, `bin` | A new public subpath must land with its declaration, its fixture coverage, and its export-map entry in one step. Uncoordinated edits ship an unexercised subpath. |
| root `package.json` scripts, `pnpm-workspace.yaml`, `vitest.config.ts` | Workspace-wide. |
| readiness and check ordering: `scripts/phase2-ready.mjs` gate list, `scripts/slowmcp-check.mjs` `ORDER` | Stable snapshot surface. T22 is the only agent that may edit these, on integration approval. Every other agent requests a check through T22. |
| the public `SlowMcpServer` type in `types/index.d.ts`, where a change affects more than one agent | T20 owns the file, but a shape change that T21, T22, T30, or T31 must follow is an integration decision. |
| `CLAUDE.md`, `ARCHITECTURE.md`, `README.md` | Integration reconciles these once per wave. |

## Global invariants

Every task preserves all of these. They are not negotiable by any agent.

1. **SlowMCP runtime implementation remains CoffeeScript.** All source under
   `packages/slowmcp/src/` stays `.coffee`. No agent rewrites implementation in
   TypeScript or JavaScript, for any reason, including "simpler".
2. **Implementation tests are CoffeeScript** where the implementation itself is
   under test. See each task's testing-language policy.
3. **TypeScript remains required** where TypeScript consumption is the subject
   under test: declarations, inference, negative fixtures, package type
   resolution, external TypeScript consumers.
4. **Consumer projects never require CoffeeScript.** `coffeescript` stays a
   development dependency and never enters `dependencies`,
   `peerDependencies`, or `optionalDependencies`.
5. **Protocol behavior is delegated to the official MCP SDK.** No wire format,
   no negotiation logic, no codec.
6. **Public protocol behavior is tested through the official MCP Client**,
   never by calling internal handlers directly.
7. **No test may be weakened to make a branch green.** A failing gate is a
   finding. Report it; do not edit the assertion.
8. **Every new enforcement mechanism must be deliberately broken once** to
   prove it can fail, with the observed failure recorded in the report.
9. **Public APIs stay deliberately small.** Every public generic becomes part
   of the type contract. Convenience is not a justification.
10. **Do not chase FastMCP feature parity.** FastMCP having something is not a
    reason for SlowMCP to have it.

## Frozen interfaces

Phase 1 output, proven and pinned. Changing one is an integration decision.

- **The registry sequence**: validate, reject duplicate, append in insertion
  order, freeze. Every capability kind reuses `DefinitionCollection`.
- **Snapshot semantics**: `createHttpHandler(app)` and `testServer(app)` serve
  the snapshot taken when they were created. Later registration cannot alter a
  handler that is already serving.
- **Fresh instance per exchange** for HTTP: `buildMcpServer` is called per
  request from the frozen snapshot.
- **Root export purity**: `slowmcp` exports only the authoring API and never
  re-exports another subpath.
- **Protocol policy is asserted before caller assertions run**, and the policy
  literal is SlowMCP-owned, never derived from SDK constants.
- **Result helpers do not coerce.** `text(42)` throws. Raw MCP result objects
  stay valid everywhere a helper is accepted.

## Working rules

- Branch per task, named for it: `t20-capabilities`, `t30-cli`.
- Stay inside owned paths. Touching another agent's paths is a report, not a
  commit.
- Restore every deliberate break before finishing. The tree must be clean.
- Each task ends with the exact report the integration owner expects. Send
  that, not a narrative.
