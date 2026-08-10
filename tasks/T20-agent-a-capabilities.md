# T20: Agent A, capability model

Wave 1. Runs in parallel with T21. T22 stage 2 depends on this task's
published contracts.

## Goal

SlowMCP applications can declare resources and prompts as well as tools, with
result and error helpers sufficient to write them, proven through the official
MCP client and against a second Standard Schema implementation.

## Why this task exists

`DefinitionCollection` was extracted in Phase 1 with exactly one consumer, on
the stated bet that resources and prompts would reuse the sequence rather than
grow parallel code paths. That bet is untested until a second and third
capability kind exist. If the abstraction was wrong, this is where it shows,
and finding that out is worth more than the features.

The second Standard Schema implementation matters for the same reason.
`validateTool` accepts anything advertising `~standard` version 1, which is a
claim about an ecosystem, not about Zod. One library is not evidence.

## Read first

- `CLAUDE.md`, in full. The CoffeeScript invariant is a product requirement.
- `ARCHITECTURE.md` §5 (proposed public API), §6 (result helpers), §7
  (definition registry, `buildMcpServer`, the three contracts).
- `packages/slowmcp/src/server/definition-collection.coffee` and its header
  comment, which states the four-step contract you must preserve.
- `packages/slowmcp/src/definitions/tool.coffee` for the validation house
  style.
- `packages/slowmcp/test/slice.test.ts` and `snapshot-semantics.test.ts`.
- `tasks/README.md`.

## Owned paths

```text
packages/slowmcp/src/definitions/**
packages/slowmcp/src/server/**
packages/slowmcp/src/results/**
packages/slowmcp/src/errors/**
packages/slowmcp/types/index.d.ts
packages/slowmcp/test/definitions/**
packages/slowmcp/test/slice.test.ts
packages/slowmcp/test/snapshot-semantics.test.ts
```

## Forbidden paths

```text
packages/slowmcp/src/transports/**      T21
packages/slowmcp/src/testing/**         T22
packages/slowmcp/src/protocol/**        integration
packages/slowmcp/types/{http,stdio,node,testing,protocol}.d.ts
fixtures/**                             T22
examples/**                             T24
docs/**                                 T25
scripts/**                              integration, request via T22
packages/slowmcp/package.json           integration
```

## Frozen interfaces you must respect

- The `DefinitionCollection` four-step sequence: validate, reject duplicate,
  append in insertion order, freeze. Resources and prompts reuse it. If you
  find a capability kind that genuinely cannot, **stop and report** rather than
  forking the sequence.
- `registry.snapshot()` returns a frozen object. Handlers built from it must be
  unaffected by later registration. This is pinned by
  `snapshot-semantics.test.ts` and by the `snapshot` check in `slowmcp:check`.
- `registry.describe()` never includes handlers. The CLI and tests consume it.
- `app.tool()` returns `app` and stays chainable. New registration methods
  match.
- Root export purity: anything you add to `types/index.d.ts` must be a genuine
  authoring-API export, never a re-export of another subpath.
- `text()` refuses non-strings. New helpers refuse rather than coerce.
- Every error is a `SlowMcpError` with a stable `code`. Existing codes
  (`SLOWMCP_INVALID_METADATA`, `SLOWMCP_INVALID_DEFINITION`,
  `SLOWMCP_DUPLICATE_DEFINITION`, `SLOWMCP_INVALID_RESULT`) keep their meaning.

## Requirements

1. **Resources.** `app.resource({ name, uri, description, mimeType, handler })`
   registered through a `DefinitionCollection`, validated in
   `src/definitions/resource.coffee`, registered onto the official `McpServer`
   in `buildMcpServer`. Discoverable and readable through the official client.
2. **Prompts.** `app.prompt({ name, description, input, handler })`, same
   structure, in `src/definitions/prompt.coffee`. Discoverable and gettable
   through the official client.
3. **Remaining tool work.** Confirm advertised JSON Schema is correct for both
   schema libraries. Confirm a handler that throws produces a protocol-level
   tool error rather than a transport failure, and pin the observed shape.
4. **Result helpers.** `json(value)` and `toolError(message)` in
   `src/results/`, exported from the root. Same no-coercion rule as `text()`.
   Raw result objects stay valid.
5. **Error normalization.** A handler that throws a `SlowMcpError` and one that
   throws an arbitrary `Error` must both produce a defined, tested observable
   result. Decide the policy, state it in `types/index.d.ts`, pin it in tests.
6. **Second Standard Schema implementation.** Add one to the package
   devDependencies and prove the full path: validation accepts it, the
   advertised JSON Schema is correct, handler input arrives validated. Record
   observable differences between the two libraries rather than normalizing
   them away, in the style of the FastMCP `additionalProperties` finding in
   `ARCHITECTURE.md` §12.
7. **`extend()` escape hatch**, only if `ARCHITECTURE.md` §5 still justifies it
   once resources and prompts exist. If the capability model covers the cases
   it was meant to cover, **report that and do not build it.** An unused escape
   hatch is a permanent public commitment.
8. Update `types/index.d.ts` for everything above, including handler input
   inference from both schema libraries.

## Non-goals

Do not build: auth, middleware, server composition or mounting, sessions,
sampling, elicitation, roots, completion, notifications, subscriptions,
progress, transports, CLI, or anything justified mainly by FastMCP having it.
Do not add convenience re-exports to the root. Do not widen the public API
because it is internally convenient; `ARCHITECTURE.md` §10 rejects that
explicitly.

## Tests and evals required

In `packages/slowmcp/test/`:

- Unit: validation accept/reject for resources and prompts, including every
  rejection message and code.
- Unit: duplicate rejection per kind, and that a tool and a resource may share
  a name without colliding (or that they may not, if that is the decision).
- Unit: insertion order preserved in snapshots for all three kinds.
- Unit: `describe()` excludes handlers for all three kinds.
- Unit: `json()` and `toolError()` output shapes, and their refusals.
- Integration, through the official client via `testServer`: discover and read
  a resource; discover and get a prompt; call a tool whose handler throws.
- Integration: snapshot semantics hold for resources and prompts, matching the
  existing tool coverage.
- Integration: the same capability defined with Zod and with the second library
  advertises schemas that are each correct, with any divergence recorded.

## Intentional falsification

Break each of these once, record the exact failure, restore:

| Break | Must fail with |
|---|---|
| register two resources with the same name | `SLOWMCP_DUPLICATE_DEFINITION` from the collection, not from the SDK |
| register a resource after building a handler | the existing handler still serves the old set |
| return a raw string from a prompt handler | a defined error, not a malformed protocol response |
| pass a non-Standard-Schema object as prompt `input` | `SLOWMCP_INVALID_DEFINITION` |
| add an export to `index.coffee` without declaring it in `types/index.d.ts` | `pnpm eval:export-surface` reports `exported but undeclared` |
| reorder two registrations | the snapshot order test fails |

## Acceptance commands

```sh
pnpm phase2:ready
```

Must be green with no gate weakened. Report the test count before and after.

## Definition of done

- Resources and prompts work end to end through the official client.
- Both reuse `DefinitionCollection` unchanged, or the reason they cannot is
  reported and agreed before any fork.
- A second Standard Schema library is proven, with divergences published.
- `types/index.d.ts` describes every new export, and export-surface agrees.
- The falsification table above has been run, with observed failures recorded.
- `pnpm phase2:ready` green. No test weakened. No `.coffee` file replaced by
  `.ts` or `.js`.

## Stop condition

Stop and report without finishing if:

- a capability kind cannot use `DefinitionCollection` without changing its
  contract;
- prompt arguments cannot carry the schema shape `ARCHITECTURE.md` §5 sketches
  (see the open question below), because that changes the public API;
- error normalization requires a protocol-level decision;
- you conclude `extend()` should not be built.

Do not resolve any of these by guessing. They change the public API.

## Integration notes

- **You will need a public export surface change.** New root exports must be
  added to `fixtures/packed-consumer/probe.mjs` `EXPECTED_SURFACE` and
  `fixtures/workspace-consumer/expected-surface.mjs`, both owned by T22. Send
  T22 the exact list of new export names as soon as it is stable, before you
  finish. Do not edit those files.
- **T22 stage 2 is blocked on you.** As soon as `app.resource()` and
  `app.prompt()` signatures are stable, publish them to T22 even if the
  implementation is not finished. Signatures unblock; completeness does not.
- Your second-schema choice becomes a package devDependency and a type fixture
  in T22. Agree the library with T22 before adding it.
- Do not touch the protocol policy. If a capability appears to need a protocol
  revision change, that is a stop condition.

## Report back

1. New public exports, exact names, and the subpath each belongs to.
2. `app.resource()` and `app.prompt()` final signatures.
3. Whether `DefinitionCollection` survived unchanged. If not, what changed and
   why.
4. Second Standard Schema library chosen, and every observable divergence from
   Zod, with the advertised schema for each.
5. Error normalization policy, as implemented.
6. `extend()`: built, or not built and why.
7. Falsification results: each break, and the exact failure observed.
8. Test count before and after.
9. Open questions you resolved yourself, and the assumption you made.
