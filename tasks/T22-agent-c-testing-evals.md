# T22: Agent C, testing and evals

Wave 1. Three stages. Stage 1 starts immediately, stage 2 unblocks on T20,
stage 3 on T21.

## Goal

The public testing surface covers every capability and transport Wave 1 adds,
the packed artifact is still proven from outside the package, and the readiness
gate grows to match, with each new check watched failing before it is trusted.

## Why this task exists

Testing is a product feature here, not tooling. The first thing SlowMCP's
harness caught was a real protocol bug, and that is the argument the whole
project rests on. If resources, prompts, stdio, and Node HTTP ship without the
harness reaching them, SlowMCP grows features faster than it grows the thing
that justifies it.

You also own the only surface that answers "is Phase 1 still true?" Other
agents request checks. You integrate them, so ordering stays stable and no
agent quietly adds a check that passes vacuously.

**You are expected to try to break the package.** A finding from you is worth
more than a feature from anyone else.

## Read first

- `CLAUDE.md`, in full.
- `ARCHITECTURE.md` §5 testing API, §7 the three contracts, §10 all layers,
  §11 including the contract-to-check mapping and the two stated limits.
- `packages/slowmcp/src/testing/test-server.coffee` and
  `packages/slowmcp/types/testing.d.ts`. The declaration documents lazy
  connection, method-not-property, and snapshot-at-construction. Those are
  contracts, not notes.
- `fixtures/packed-consumer/probe.mjs`, `fixtures/workspace-consumer/`,
  `scripts/slowmcp-check.mjs`, `scripts/phase2-ready.mjs`,
  `scripts/verify-export-surface.mjs`.
- `VERTICAL_SLICE_FINDINGS.md` §6, which records which guards have been watched
  failing. Extend that table.
- `tasks/README.md`.

## Owned paths

```text
packages/slowmcp/src/testing/**
packages/slowmcp/types/testing.d.ts
fixtures/**
evals/**                                 new, if justified
scripts/verify-*.mjs
packages/slowmcp/test/testing/**         new
```

Plus, **on integration approval only**, the shared ordering surfaces:

```text
scripts/phase2-ready.mjs                 gate list
scripts/slowmcp-check.mjs                ORDER list and check wiring
```

You are the only agent permitted to edit those two. Every other agent requests
a check through you.

## Forbidden paths

```text
packages/slowmcp/src/definitions/**      T20
packages/slowmcp/src/server/**           T20
packages/slowmcp/src/results/**          T20
packages/slowmcp/src/transports/**       T21
packages/slowmcp/src/protocol/**         integration
packages/slowmcp/types/{index,http,stdio,node,protocol}.d.ts
examples/**                              T24
docs/**                                  T25
packages/slowmcp/package.json            integration
```

## Frozen interfaces you must respect

- **`testServer` drives the application through a real official `Client`.**
  Never add a shortcut that calls internal handlers directly. The moment the
  harness stops speaking the protocol, it stops being evidence.
- **Protocol policy is asserted before any caller assertion runs.** New
  operations inherit this. Do not add an operation that can return before the
  negotiated revision has been checked.
- **Lazy connection, methods not properties, snapshot at construction.** All
  three are documented in `types/testing.d.ts` and pinned by tests. New
  operations match: every one that needs a connection establishes it, and the
  connect-if-needed table in the declaration stays accurate.
- **`close()` never connects**, and every connecting method throws after close.
- Fixtures are hostile and minimal. They attack; they do not teach. Examples
  teach, and they belong to T24.
- **A check that cannot fail is not a check.** Nothing enters the gate list
  until you have watched it go red.

## Requirements

### Stage 1, no dependencies. Start now.

1. **Fresh-instance eval.** Prove no server-instance state leaks between
   exchanges: two sequential calls, two concurrent calls, and state deliberately
   stashed on the official server instance by one exchange must be invisible to
   the next.
2. **Source-map eval.** A thrown error's stack maps to `.coffee` with correct
   line and column, from the packed tarball, with no `.coffee` on disk. The
   existing containment check asserts the shape matches; assert the position is
   actually right.
3. **Hostile fixture sweep.** Try to break the package: malformed schemas,
   handlers returning wrong shapes, definitions registered mid-flight,
   unicode and very long names, deeply nested schemas, circular result objects,
   concurrent registration. Record every finding. Fix nothing outside your
   paths; file findings against the owning agent.

### Stage 2, unblocks when T20 publishes signatures.

4. **Resource testing.** `resources()` and `read(uri)` on the harness, through
   the official client, with the connect-if-needed contract preserved.
5. **Prompt testing.** `prompts()` and `getPrompt(name, args)`, same rules.
6. **Second-schema contract verification.** With T20's chosen library: a
   packed-tarball type fixture proving handler input inference, positive
   assertions, and `@ts-expect-error` negatives for both libraries. This is the
   type-contract half of T20's requirement 6.
7. **Export surface for new root exports.** Update `EXPECTED_SURFACE` in
   `fixtures/packed-consumer/probe.mjs` and
   `fixtures/workspace-consumer/expected-surface.mjs` from T20's published list.

### Stage 3, unblocks when T21 publishes signatures.

8. **stdio testing support.** Decide whether the public harness gains a stdio
   mode or whether stdio stays a real-process test only. Justify it: a harness
   mode that does not spawn a process proves less than the T21 test already
   does. If it adds nothing, say so and do not build it.
9. **Real-socket Node HTTP eval.** Using T21's `serveNode`, an eval distinct
   from T21's unit coverage: bind, drive with the official client, assert the
   contract, release the port. This is the gate-level evidence that the
   injected-`fetch` limitation is closed.
10. **Package and export checks for the new subpaths.** `slowmcp/stdio` and
    `slowmcp/node` enumerated from the packed export map, declarations agreeing
    with runtime, resolving from the tarball in a clean consumer.

### Throughout

11. **Readiness integration.** Fold the new checks into `slowmcp:check` and
    `phase2-ready.mjs`. Keep `ORDER` stable and deterministic; append rather
    than reorder, so existing snapshots stay valid. Report the new ordering to
    integration before merging.
12. **Report format.** If the check output grows past what a person can scan,
    propose a format. Do not redesign it unilaterally; `--json` consumers and
    snapshot stability come first.

## Non-goals

Do not build: a custom assertion library, snapshot testing infrastructure, a
mocking layer, coverage gates, performance benchmarks (T24 owns the parity
harness), a test runner, or matcher helpers unless a reference implementation
demonstrates they are needed. `ARCHITECTURE.md` §5 permits matchers as a thin
layer over ordinary result objects and nothing more. Do not fix defects in
another agent's paths; report them.

## Tests and evals required

Everything in Requirements, plus:

- Every new harness operation: connect-if-needed behavior, behavior after
  `close()`, and behavior when the negotiated revision is outside policy.
- The declaration's connect-if-needed table updated and proven accurate.
- Negative type fixtures for every new public signature.
- Concurrency: two harnesses against one app, and one harness used
  concurrently.

## Intentional falsification

Every check you add to the gate list must be watched failing. Extend the table
in `VERTICAL_SLICE_FINDINGS.md` §6 with one row per new check: the guard, how
you broke it, and the exact failure. A row you did not run is a lie.

At minimum:

| Break | Must fail with |
|---|---|
| harness operation that returns before policy assertion | the policy test for that operation |
| a resource declared in `testing.d.ts` but absent at runtime | `pnpm eval:export-surface`, `declared but not exported` |
| new subpath added to the export map with no fixture coverage | the `package` check, from the packed export map |
| an operation used after `close()` | `SLOWMCP_CLOSED` |
| state stashed on a server instance | the fresh-instance eval |
| a deliberately wrong line number in the source-map assertion | the source-map eval |

## Acceptance commands

```sh
pnpm phase2:ready
```

Green, including every check you added, with the new gate list reported to
integration.

## Definition of done

- The public harness covers tools, resources, and prompts through the official
  client.
- Fresh-instance and source-map evals exist and have been watched failing.
- New subpaths are proven from the packed tarball in a clean consumer.
- The real-socket eval exists and the Phase 1 limitation is closed at gate
  level, with `ARCHITECTURE.md` §11's stated limits updated by integration.
- Every new check appears in `VERTICAL_SLICE_FINDINGS.md` §6 with its observed
  failure.
- Hostile sweep findings filed against owning agents.
- `pnpm phase2:ready` green. No test weakened.

## Stop condition

Stop and report without finishing if:

- a hostile finding requires a public API change (that is T20's or T21's
  decision, and possibly integration's);
- the harness cannot assert policy before a new operation returns;
- adding a check requires reordering `ORDER` rather than appending;
- you find a Phase 1 contract that is not actually enforced, which is a finding
  that outranks the rest of this task.

## Integration notes

- You own fixture surface lists but not the export map. New subpaths need
  `packages/slowmcp/package.json` `exports` entries from integration, and your
  fixture coverage must land in the same integration step. A subpath that
  reaches the export map before your coverage ships is an unexercised public
  API.
- Agree the second Standard Schema library with T20 before it becomes a
  devDependency. You write the type fixtures; you get a say.
- Coordinate stage 2 and 3 starts with T20 and T21 directly. Signatures
  unblock you; completeness does not.
- Report the final gate list and `ORDER` to integration before merging. Other
  agents will request checks in Wave 2 and need to know the shape.

## Report back

1. New public harness operations, exact signatures, and their connect-if-needed
   behavior.
2. Final `slowmcp:check` `ORDER` and `phase2-ready` gate list.
3. Every new check, how you broke it, and the exact failure, as the rows added
   to `VERTICAL_SLICE_FINDINGS.md` §6.
4. Hostile sweep: every finding, its owning agent, and its severity.
5. Whether stdio gained a harness mode, and the justification either way.
6. The test that closes the injected-`fetch` limitation at gate level.
7. Second-schema type-contract results, including divergences visible to
   TypeScript consumers.
8. Any Phase 1 contract you found unenforced.
9. Test and check counts before and after.
