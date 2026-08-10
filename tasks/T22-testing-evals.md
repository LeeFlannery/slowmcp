# T22: testing and evals

Wave 1. Three stages. Stage 1 starts immediately, stage 2 unblocks on T20,
stage 3 on T21.

## Goal

The public testing surface covers every capability and transport Wave 1 adds,
the packed artifact is still proven from outside the package, and the readiness
gate grows to match, with each new check watched failing before it is trusted.

## Why this work exists

Testing is a product feature here, not tooling. The first thing SlowMCP's
harness caught was a real protocol bug, and that is the argument the project
rests on. If resources, prompts, stdio, and Node HTTP ship without the harness
reaching them, SlowMCP grows features faster than it grows the thing that
justifies it.

You also own the only surface that answers "is Phase 1 still true?" Other
agents request checks; you integrate them, so ordering stays stable and no
agent adds a check that passes vacuously.

**You are expected to try to break the package.** A finding from you is worth
more than a feature from anyone else.

## Prerequisites

- `pnpm phase2:ready` green on `main`.
- Branch `t22-testing-evals` from `main`.
- Stage 1: nothing.
- Stage 2: T20 has published `app.resource()` and `app.prompt()` signatures and
  the second schema library is agreed.
- Stage 3: T21 has published `serveStdio` and `serveNode` signatures.

## Read first

- `CLAUDE.md`, in full, including the test language policy.
- `tasks/README.md`, global invariants and frozen interfaces.
- `ARCHITECTURE.md` §5 testing API, §7 the three contracts, §10 all layers, §11
  including the contract-to-check mapping and the two stated limits.
- `packages/slowmcp/src/testing/test-server.coffee` and
  `packages/slowmcp/types/testing.d.ts`. The declaration documents lazy
  connection, method-not-property, and snapshot-at-construction. Those are
  contracts, not notes.
- `fixtures/packed-consumer/probe.mjs`, `fixtures/workspace-consumer/`,
  `scripts/slowmcp-check.mjs`, `scripts/phase2-ready.mjs`,
  `scripts/verify-export-surface.mjs`.
- `VERTICAL_SLICE_FINDINGS.md` §6, the table of guards watched failing. You
  extend it.
- `vitest.config.ts`, specifically the `slowmcp:coffee` plugin, since you are
  the agent most likely to need it changed.

## Owned paths

```text
packages/slowmcp/src/testing/**
packages/slowmcp/src/testing.coffee
packages/slowmcp/types/testing.d.ts
packages/slowmcp/test/testing/**                new
fixtures/**
evals/**                                        new, if justified
scripts/verify-*.mjs
VERTICAL_SLICE_FINDINGS.md                      section 6 only
```

You own section 6 of `VERTICAL_SLICE_FINDINGS.md` because you add the rows.
Leave the measurement sections alone; integration restates those.

`packages/slowmcp/package.json` **`devDependencies` only**, if the second
Standard Schema library is not already there from T20. Coordinate so it is
added once. Every other field is integration-owned.

Plus, **on integration approval only**, the shared ordering surfaces:

```text
scripts/phase2-ready.mjs                        gate list
scripts/slowmcp-check.mjs                       ORDER and check wiring
```

You are the only agent permitted to edit those two.

## Forbidden paths

```text
packages/slowmcp/src/{definitions,server,results,errors}/**   T20
packages/slowmcp/src/transports/**              T21
packages/slowmcp/src/protocol/**                integration
packages/slowmcp/types/{index,http,stdio,node,protocol}.d.ts
examples/**                                     T31
docs/**                                         T32
packages/slowmcp/package.json                   integration, except devDependencies
package.json (root), pnpm-workspace.yaml        integration
vitest.config.ts                                integration
packages/slowmcp/test/slice.test.coffee                shared, see below
packages/slowmcp/test/snapshot-semantics.test.coffee   shared, see below
```

**Both shared test files are integration-owned.** `slice.test.coffee`'s
`testServer` block covers your harness but sits in a file that also covers the
registry; `snapshot-semantics.test.coffee` covers all three agents' code. Put
new harness coverage in `packages/slowmcp/test/testing/`. If your changes break
either shared file, report the exact edit rather than applying it.

`vitest.config.ts` is integration-owned even though you are the agent most
likely to need the `slowmcp:coffee` plugin changed. Report the change; do not
apply it.

## Frozen interfaces

- **`testServer` drives the application through a real official `Client`.**
  Never add a shortcut that calls internal handlers directly. **Do not replace
  external contract tests with internal mocks.** The moment the harness stops
  speaking the protocol, it stops being evidence.
- **Protocol policy is asserted before any caller assertion runs.** New
  operations inherit this. No operation may return before the negotiated
  revision has been checked.
- **Lazy connection, methods not properties, snapshot at construction.** All
  three are documented and pinned. New operations match, and the
  connect-if-needed table in the declaration stays accurate.
- **`close()` never connects**, and every connecting method throws after close.
- Fixtures are hostile and minimal. Examples teach; fixtures attack. Examples
  are T31's.
- **A check that cannot fail is not a check.** Nothing enters the gate list
  until you have watched it go red.

## Requirements

### Stage 1, no dependencies

1. **Fresh-instance eval.** Prove no server-instance state leaks between
   exchanges: two sequential calls, two concurrent calls, and state deliberately
   stashed on an instance by one exchange invisible to the next.
2. **Source-map eval.** A thrown error's stack maps to `.coffee` with correct
   line and column, from the packed tarball, with no `.coffee` on disk. The
   containment check asserts the shape matches; assert the position is right.
3. **Hostile fixture sweep.** Try to break the package: malformed schemas,
   handlers returning wrong shapes, definitions registered mid-flight, unicode
   and very long names, deeply nested schemas, circular result objects,
   concurrent registration. Record every finding. Fix nothing outside your
   paths; file findings against the owning agent.

### Stage 2, unblocks on T20

4. **Resource testing**: `resources()` and `read(uri)`, through the official
   Client, connect-if-needed contract preserved.
5. **Prompt testing**: `prompts()` and `getPrompt(name, args)`, same rules.
6. **Second Standard Schema inference.** T20 proves runtime validation; you
   prove inference, in a packed-tarball type fixture, with positive assertions
   and `@ts-expect-error` negatives for **both** libraries.
7. **Export surface for new root exports**, from T20's published list, in
   `fixtures/packed-consumer/probe.mjs` and
   `fixtures/workspace-consumer/expected-surface.mjs`.

### Stage 3, unblocks on T21

8. **stdio process eval.** Using T21's transport, **from the packed tarball**,
   at gate level: a child process running an installed consumer server,
   official Client, discovery, invocation, stdout purity, clean shutdown. T21
   proves the transport against the workspace build; you prove it survives
   packing. **Do not reimplement transport logic**, and do not duplicate T21's
   unit coverage. Decide separately whether the public harness gains a stdio
   mode; if a harness mode that does not spawn a process proves less than T21's
   test already does, say so and do not build it.
9. **Bound Node HTTP eval.** Using `serveNode`: bind, drive with the official
   Client, assert the contract, release the port. This is the gate-level
   evidence that the injected-`fetch` limitation is closed.
10. **Package and export checks for the new subpaths**, enumerated from the
    packed export map, declarations agreeing with runtime, resolving from the
    tarball in a clean consumer.

### Throughout

11. **The full harness surface**, only where an actual capability API requires
    it: `tools`, `resources`, `prompts`, `call`, `read`, `getPrompt`, `client`,
    `protocolVersion`, `close`. Do not add operations no capability needs.
12. **Readiness integration.** Fold new checks into `slowmcp:check` and
    `phase2-ready.mjs`. Keep `ORDER` deterministic; **append rather than
    reorder**, so existing snapshots stay valid. Report the new ordering to
    integration before merging.
13. **Coverage for the standing contracts**, extended to Wave 1's surface:
    CoffeeScript containment, protocol policy, declaration/runtime agreement.

## Non-goals

Do not build a custom assertion library, snapshot-testing infrastructure, a
mocking layer, coverage gates, performance benchmarks (T31 owns the parity
harness), a second test framework, or matcher helpers unless a reference
implementation demonstrates they are needed. Do not fix defects in another
agent's paths; report them.

## Testing-language policy

You are the agent this policy most affects. Apply it deliberately.

- **CoffeeScript** for harness implementation tests: lazy connection, reuse,
  close semantics, refusal after close, policy assertion ordering, and
  input validation. These test SlowMCP's own code.
- **TypeScript** for everything in `fixtures/packed-consumer`: inference,
  positive type assertions, `@ts-expect-error` negatives, NodeNext resolution,
  and packed-consumer compilation. TypeScript is the subject there, and
  converting any of it is an explicit non-goal.
- **TypeScript** for `fixtures/workspace-consumer/test/export-map.test.ts`. It
  proves resolution as a dependant.
- **JavaScript** for `fixtures/packed-consumer/probe.mjs` and any new probe: it
  runs inside a clean consumer where no build tooling exists.
- If you add a `.coffee` test, it imports `../src/*.coffee` and tests source.
  If you are testing the artifact or the declarations, it is not a `.coffee`
  test.

## Required tests and evals

Everything in Requirements, plus:

- Every new harness operation: connect-if-needed behavior, behavior after
  `close()`, behavior when the negotiated revision is outside policy.
- The declaration's connect-if-needed table updated and proven accurate.
- Negative type fixtures for every new public signature.
- Concurrency: two harnesses against one app, and one harness used
  concurrently.

## Falsification requirements

Every check you add to the gate list must be watched failing. Extend the table
in `VERTICAL_SLICE_FINDINGS.md` §6 with one row per new check: the guard, how
you broke it, the exact failure. A row you did not run is a lie.

At minimum:

| Break | Must fail with |
|---|---|
| a harness operation returning before the policy assertion | that operation's policy test |
| a name declared in `testing.d.ts` but absent at runtime | `pnpm eval:export-surface`, `declared but not exported` |
| a new subpath in the export map with no fixture coverage | the `package` check, from the packed export map |
| an operation used after `close()` | `SLOWMCP_CLOSED` |
| state stashed on a server instance | the fresh-instance eval |
| a deliberately wrong line number in the source-map assertion | the source-map eval |
| replacing a protocol round trip with a direct handler call | your own review, and it must be rejected |

## Acceptance commands

```sh
pnpm phase2:ready
```

Green, including every check you added, with the new gate list reported to
integration.

## Definition of done

- The harness covers tools, resources, and prompts through the official Client.
- Fresh-instance and source-map evals exist and have been watched failing.
- New subpaths proven from the packed tarball in a clean consumer.
- stdio process and bound Node HTTP evals exist at gate level, and the Phase 1
  limitation is closed, with `ARCHITECTURE.md` §11's stated limits updated by
  integration.
- Second-schema inference proven in TypeScript fixtures for both libraries.
- Every new check appears in `VERTICAL_SLICE_FINDINGS.md` §6 with its observed
  failure.
- Hostile sweep findings filed against owning agents.
- `pnpm phase2:ready` green. No test weakened, no external contract test
  replaced by a mock.

## Stop condition

Stop and report without finishing if:

- a hostile finding requires a public API change;
- the harness cannot assert policy before a new operation returns;
- adding a check requires reordering `ORDER` rather than appending;
- the `slowmcp:coffee` plugin needs changes that affect how other agents' tests
  compile;
- **you find a Phase 1 contract that is not actually enforced.** That finding
  outranks the rest of this task.

## Integration notes

- You own fixture surface lists but not the export map. New subpaths need
  `exports` entries from integration, and your coverage must land in the same
  step. A subpath reaching the export map before your coverage ships is an
  unexercised public API.
- Agree the second schema library with T20 before it becomes a devDependency.
  You write the inference fixtures, so you get a say.
- Coordinate stage 2 and 3 starts with T20 and T21 directly.
- Report the final gate list and `ORDER` to integration before merging. T30,
  T31, and T32 will request checks in Wave 2 and need to know the shape.
- You are merged **third** in Wave 1 integration, after T20 and T21.

## Report back

1. New harness operations, exact signatures, connect-if-needed behavior.
2. Final `slowmcp:check` `ORDER` and `phase2-ready` gate list.
3. Every new check, how you broke it, the exact failure, as the rows added to
   `VERTICAL_SLICE_FINDINGS.md` §6.
4. Hostile sweep: every finding, owning agent, severity.
5. Whether stdio gained a harness mode, and the justification either way.
6. The gate-level tests closing the injected-`fetch` limitation.
7. Second-schema inference results, including divergences visible to TypeScript
   consumers.
8. Any Phase 1 contract you found unenforced.
9. Test and check counts before and after.
10. Any change needed to `vitest.config.ts` or the CoffeeScript test plugin.
