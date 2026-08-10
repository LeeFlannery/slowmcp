# T20: capabilities

Wave 1. Runs in parallel with T21. T22 stage 2 depends on this task's published
contracts.

## Goal

SlowMCP applications declare resources and prompts alongside tools, with result
and error helpers sufficient to write them, proven through the official MCP
Client and against a second Standard Schema implementation.

## Why this work exists

`DefinitionCollection` was extracted in Phase 1 with exactly one consumer, on
the stated bet that resources and prompts would reuse the sequence rather than
grow parallel code paths. That bet is untested until a second and third
capability kind exist. If the abstraction was wrong, this is where it shows,
and finding that out is worth more than the features.

The second Standard Schema implementation matters for the same reason.
`validateTool` accepts anything advertising `~standard` version 1, which is a
claim about an ecosystem, not about Zod. One library is not evidence, and the
type contract currently proves inference for exactly one.

## Prerequisites

- `pnpm phase2:ready` green on `main`.
- Branch `t20-capabilities` from `main`.
- Nothing else. This task does not wait on T21 or T22.

## Read first

- `CLAUDE.md`, in full, including the test language policy.
- `tasks/README.md`, global invariants and frozen interfaces.
- `ARCHITECTURE.md` §5 (proposed public API), §6 (result helpers), §7
  (definition registry, `buildMcpServer`, the three contracts), §10 agent design
  consequences.
- `packages/slowmcp/src/server/definition-collection.coffee` and its header
  comment, which states the four-step contract you must preserve.
- `packages/slowmcp/src/definitions/tool.coffee` for validation house style.
- `packages/slowmcp/test/slice.test.coffee` for CoffeeScript test house style.
- **The actual v2 SDK**, not the architecture's description of it. The relevant
  signatures are in
  `packages/slowmcp/node_modules/@modelcontextprotocol/server/dist/createMcpHandler-*.d.mts`:
  - `registerResource(name, uri: string, config, readCallback)` and
    `registerResource(name, template: ResourceTemplate, config, readCallback)`.
    Templates are a separate overload with a different callback type.
  - `registerPrompt(name, { title?, description?, argsSchema?, icons?, _meta? }, cb)`
    where `argsSchema` is a `StandardSchemaWithJSON`. Prompt arguments are not
    restricted to plain strings at this layer.
  - `registerTool` supports an `outputSchema`, which is how structured content
    is advertised.

## Owned paths

```text
packages/slowmcp/src/definitions/**
packages/slowmcp/src/server/**
packages/slowmcp/src/results/**
packages/slowmcp/src/errors/**
packages/slowmcp/src/index.coffee
packages/slowmcp/types/index.d.ts
packages/slowmcp/test/slice.test.coffee
packages/slowmcp/test/snapshot-semantics.test.coffee
packages/slowmcp/test/definitions/**          new
```

## Forbidden paths

```text
packages/slowmcp/src/transports/**            T21
packages/slowmcp/src/testing/**               T22
packages/slowmcp/src/protocol/**              integration
packages/slowmcp/types/{http,stdio,node,testing,protocol}.d.ts
fixtures/**                                   T22
examples/**                                   T31
docs/**                                       T32
scripts/**                                    integration, request through T22
packages/slowmcp/package.json                 integration
vitest.config.ts                              integration
```

## Frozen interfaces

- The `DefinitionCollection` sequence: validate, reject duplicate, append in
  insertion order, freeze. Resources and prompts reuse it. **Do not create
  separate, subtly different registries.** If a capability kind genuinely
  cannot use it, stop and report rather than forking.
- `registry.snapshot()` returns a frozen object; handlers built from it are
  unaffected by later registration.
- `registry.describe()` never includes handlers.
- `app.tool()` returns `app`. New registration methods match.
- Root export purity: additions to `types/index.d.ts` are authoring-API exports
  only, never re-exports of another subpath.
- `text()` refuses non-strings. New helpers refuse rather than coerce.
- Every error is a `SlowMcpError` with a stable `code`. Existing codes keep
  their meaning.

## Requirements

1. **Resources.** The smallest coherent resource API consistent with the tool
   API, registered through `DefinitionCollection`, validated in
   `src/definitions/resource.coffee`, registered onto the official `McpServer`
   in `buildMcpServer`. Deterministic registration, immutable snapshots.
   Discoverable and readable through the official Client. **Decide explicitly
   whether v0.1 supports `ResourceTemplate`**; the SDK offers it as a separate
   overload. Not supporting it in v0.1 is an acceptable answer. Silently
   half-supporting it is not.
2. **Prompts.** The smallest coherent prompt API consistent with tools and
   resources, in `src/definitions/prompt.coffee`. Discoverable and gettable
   through the official Client.
3. **Tool completion.** Only capability behavior genuinely required for a
   coherent v0.1. Confirm the advertised JSON Schema is correct for both schema
   libraries. Confirm a handler that throws produces a protocol-level tool
   error rather than a transport failure, and pin the observed shape.
4. **Result and error helpers.** `json(value)` and `toolError(message)` in
   `src/results/`, exported from the root, same no-coercion rule as `text()`.
   Decide and document whether `json()` emits a text block, structured content,
   or both, given `registerTool`'s `outputSchema` support.
5. **Error normalization.** A handler throwing `SlowMcpError` and a handler
   throwing an arbitrary `Error` must both produce a defined, tested observable
   result. State the policy in `types/index.d.ts`, pin it in tests.
6. **Second Standard Schema implementation.** Close the Phase 1 gap. Prefer
   **Valibot** unless current ecosystem or API facts make another library
   clearly more appropriate; if you choose otherwise, justify it with facts
   from the installed package, not reputation. **Prove inference and runtime
   validation independently**: runtime validation is yours, inference is
   T22's type fixtures. Record observable differences from Zod rather than
   normalizing them away, in the style of the FastMCP `additionalProperties`
   finding in `BASELINE_FINDINGS.md`.
7. **Escape hatch.** Implement `app.extend()` **only if the architecture still
   justifies it after inspecting the actual v2 SDK.** If resources, prompts,
   and tools cover the cases it was meant to cover, report that and do not
   build it; an unused escape hatch is a permanent public commitment. If you do
   build it, it must not bypass SlowMCP's invariants by accident: callbacks are
   captured in the frozen snapshot, not read live, and a callback that
   registers a duplicate name must fail the same way `app.tool()` would.
8. Update `types/index.d.ts` for everything above.

## Non-goals

Do not build middleware, auth, composition or mounting, dependency injection,
plugin systems, sessions, sampling, elicitation, roots, completion,
notifications, subscriptions, progress, or convenience layers. Do not add
anything because FastMCP has it. Do not add convenience re-exports to the root.
Do not widen the public API because it is internally convenient.

## Testing-language policy

- **CoffeeScript** for everything in this task's test scope. Registry
  behavior, validation, duplicate rejection, ordering, snapshot semantics,
  result helpers, error normalization, and runtime schema validation are all
  implementation tests: they would mean the same thing if SlowMCP had no
  declarations. Import `../src/*.coffee`, following
  `packages/slowmcp/test/slice.test.coffee`.
- **TypeScript is T22's**, not yours. Inference for the second schema library
  is a type-contract fixture and belongs in `fixtures/packed-consumer`. Do not
  write it here, and do not prove inference by writing a `.ts` test in your
  paths.
- Prefer straightforward CoffeeScript. Do not use clever syntax because it
  exists.

## Required tests and evals

In `packages/slowmcp/test/`, CoffeeScript:

- Validation accept and reject for resources and prompts, including every
  rejection message and code.
- Duplicate rejection per kind, and an explicit decision test for whether a
  tool and a resource may share a name.
- Insertion order preserved in snapshots for all three kinds.
- `describe()` excludes handlers for all three kinds.
- `json()` and `toolError()` output shapes and their refusals.
- Through the official Client via `testServer`: discover and read a resource,
  discover and get a prompt, call a tool whose handler throws.
- Snapshot semantics for resources and prompts, matching existing tool
  coverage.
- The same capability defined with Zod and with the second library, each
  advertising a correct schema, with divergence recorded.
- If `extend()` ships: callbacks captured in the snapshot, and a callback
  registering a duplicate failing correctly.

## Falsification requirements

Break each once, record the exact failure, restore:

| Break | Must fail with |
|---|---|
| register two resources with the same name | `SLOWMCP_DUPLICATE_DEFINITION` from the collection, not from the SDK |
| register a resource after building a handler | the existing handler still serves the old set |
| return a raw string from a prompt handler | a defined error, not a malformed protocol response |
| pass a non-Standard-Schema object as prompt `input` | `SLOWMCP_INVALID_DEFINITION` |
| add an export to `index.coffee` without declaring it | `pnpm eval:export-surface`, `exported but undeclared` |
| reorder two registrations | the snapshot order test |
| swap the second schema library's validator for Zod's | the runtime validation test for that library, proving it is genuinely exercised |

That last row matters most. A second schema library that is registered but
never actually validates anything is the failure mode this requirement exists
to catch.

## Acceptance commands

```sh
pnpm phase2:ready
```

Green, no gate weakened. Report the test count before and after.

## Definition of done

- Resources and prompts work end to end through the official Client.
- Both reuse `DefinitionCollection` unchanged, or the reason they cannot is
  reported and agreed before any fork.
- A second Standard Schema library validates at runtime, proven independently
  of inference, with divergences published.
- `types/index.d.ts` describes every new export; export-surface agrees.
- The `ResourceTemplate` decision is explicit and documented.
- The `extend()` decision is explicit: built with invariants preserved, or not
  built with a stated reason.
- Falsification table run, observed failures recorded.
- `pnpm phase2:ready` green. No test weakened. No `.coffee` replaced by `.ts`
  or `.js`.

## Stop condition

Stop and report without finishing if:

- a capability kind cannot use `DefinitionCollection` without changing its
  contract;
- error normalization requires a protocol-level decision;
- resource identity forces a change to how the collection keys entries;
- a public API change would be needed that T22, T30, or T31 must follow.

Do not resolve any of these by guessing.

## Integration notes

- **New root exports require fixture surface updates in T22's paths.** Send T22
  the exact list of new export names as soon as it is stable, before you
  finish. Do not edit `fixtures/**`.
- **T22 stage 2 is blocked on you.** Publish `app.resource()` and
  `app.prompt()` signatures as soon as they are stable, even if the
  implementation is unfinished. Signatures unblock; completeness does not.
- Agree the second schema library with T22 before adding the devDependency;
  T22 writes its inference fixtures.
- Do not touch the protocol policy. Needing it changed is a stop condition.
- You are merged **first** in Wave 1 integration.

## Report back

1. New public exports, exact names, and their subpath.
2. `app.resource()` and `app.prompt()` final signatures.
3. Whether `DefinitionCollection` survived unchanged; if not, what changed.
4. The `ResourceTemplate` decision and its reasoning.
5. Second schema library chosen, why, and every observable divergence from Zod
   including the advertised schema for each.
6. Error normalization policy as implemented.
7. `extend()`: built with what invariant protections, or not built and why.
8. Falsification results: each break and the exact failure observed.
9. Test count before and after.
10. Shared-surface changes required, and any assumption you had to make.
