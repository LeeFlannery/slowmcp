# T31: reference applications

**Wave 2. Do not start until Wave 1 is integrated into `main`, `pnpm
phase2:ready` passes, and the public-API review is complete.**

## Goal

Four executable, self-verifying reference applications that exercise the
integrated public API and fail CI when SlowMCP breaks, plus reproducible
comparison measurements against the official SDK and FastMCP.

## Why this work exists

References here are product proofs, not decorative demos. `examples/hello-tool`
is already run twice by the readiness gate, once through workspace resolution
and once inside the packed consumer, and it has caught real breakage.

`framework-parity` carries the heaviest load. It is the answer to "FastMCP
already does this," and the source of every comparison number SlowMCP
publishes. The README currently prints three measured rows and states plainly
that no performance numbers have been taken. This task makes that table real,
and it must stay honest whichever way the numbers fall.

## Prerequisites

- Wave 1 merged to `main`, `pnpm phase2:ready` green, public-API review done.
- Branch `t31-reference-apps` from `main`.
- The reviewed public API surface, in writing, including which transports
  actually shipped. Build against what exists, never against what was planned.

## Read first

- `CLAUDE.md`, in full, especially the benchmark and brand rules.
- `tasks/README.md`, global invariants and frozen interfaces.
- `ARCHITECTURE.md` §12 in full. Note the divergence rule: where
  implementations differ observably but stay behaviorally equivalent, the
  harness records what each emitted and publishes the row. **Do not normalize
  differences away.** T03 already found one, in `BASELINE_FINDINGS.md`: given
  the identical Zod validator, FastMCP advertises `additionalProperties: false`
  and the raw SDK omits the key.
- `BASELINE_FINDINGS.md` and `VERTICAL_SLICE_FINDINGS.md`, for how
  measurements are recorded and reproduced.
- `examples/hello-tool/server.mjs` and `verify.mjs`, the pattern to follow.
- `spikes/src/`, which already contains raw-SDK and FastMCP greet servers and a
  shared contract driver.
- Wave 1 reports from T20, T21, T22.

## Owned paths

```text
examples/**
scripts/run-reference-apps.mjs                  new
```

## Forbidden paths

```text
packages/slowmcp/**                             all of it
fixtures/**                                     T22
spikes/**                                       read only
docs/**                                         T32
scripts/*                                       except run-reference-apps.mjs
```

If a reference cannot be written with the public API, that is a framework
finding. File it against the owning agent. Do not patch the framework.

## Frozen interfaces

- **Public API only**, exactly as an external consumer imports it. No
  workspace-internal paths, no `dist/` reach-through.
- **Every reference self-verifies through the official MCP Client** and exits
  non-zero on mismatch. A reference that only starts a server proves nothing.
- **Never fabricate a measurement.** Numbers come from a command anyone can
  rerun. Publish results when SlowMCP loses. Do not sabotage a competitor's
  implementation to win a row, and do not tune SlowMCP's into a shape no user
  would write.
- **Fixtures attack, examples teach.** These are examples and must be readable.
- Deterministic: no clocks, no randomness, no network, no run-to-run ordering
  variation. Order IDs are deterministic by requirement.

## Requirements

### `hello-tool`

Preserve the existing smallest quickstart. It is the README quickstart and is
run by two separate gates. Change it only if a Wave 1 API change forces it, and
report if so.

### `coffee-shop`

Committed deterministic fixture data. Both HTTP and stdio where the integrated
public API supports them.

- Tools: `list_drinks`, `place_order`, `get_order`.
- Resources: `coffee://menu`, and a store metadata resource.
- Prompt: `recommend-drink`.
- Deterministic order IDs, so the verifying client asserts exact values.
- **Deliberate failures, all four**: unavailable drink, invalid size, unknown
  drink, invalid quantity. Each asserted at the protocol level with its
  observable error, not merely described in a comment.
- Self-verifying official Client covering every capability and every failure
  path, over both transports.

### `framework-parity`

One shared dataset, one equivalent observable contract, three implementations:
official MCP SDK, FastMCP, SlowMCP. **One official MCP Client drives all
three.**

Collect reproducibly:

- significant framework wiring lines;
- dependencies and installed footprint;
- discovered capabilities;
- advertised schema differences;
- observable results;
- startup measurements **where deterministic enough to be useful**. If they are
  not, say so and publish nothing rather than publishing noise.

Emit machine-readable results that T32 consumes directly. **T32 must never
retype a number.** Define the method for every timing figure and state what is
not measured. If SlowMCP loses every normal benchmark, publish that result.

### `remote-http`

A deterministic issue tracker over T21's bound Node HTTP transport.

- Bound socket, no injected `fetch`.
- An explicit application repository, separate from MCP wiring.
- Fresh MCP server instances per exchange, with **application state persisting
  across them**. The boundary between the two must be visible in the code,
  because that distinction is the thing this reference exists to teach.
- Tools, resources, and prompts.
- Self-verifying official Client over the real socket.
- Safe localhost defaults.

### Runner

`scripts/run-reference-apps.mjs` runs every reference, reports per-reference
pass or fail, exits non-zero on any failure, leaks no ports or child processes.

## Non-goals

Do not build a UI, a database, a deployment, auth, a hosted demo, anything
needing network access or credentials, or a fifth reference. Do not turn
`coffee-shop` into a pun exercise. Do not change framework code.

## Testing-language policy

- **JavaScript or TypeScript**, throughout. Every file in `examples/**`
  represents an ordinary SlowMCP consumer, and consumers never have
  CoffeeScript. Writing a reference in CoffeeScript would contradict the
  containment claim these references exist to demonstrate.
- **Do not convert `spikes/` to CoffeeScript.** The official SDK and FastMCP
  baselines are competitor and upstream code and stay as they are.
- The verifying clients are TypeScript or JavaScript for the same reason.
- This is the one task where CoffeeScript is wrong everywhere.

## Required tests and evals

- Each reference's self-verifying client is the test, and must fail loudly when
  SlowMCP breaks.
- `coffee-shop` over both transports, same assertions, all four failure paths.
- `remote-http` over a bound socket, port released on exit, state persisting
  across fresh instances.
- `framework-parity` produces identical normalized results for all three, with
  divergences recorded rather than reconciled.
- The runner exits non-zero if any reference fails.

## Falsification requirements

Break each once, record the exact failure, restore:

| Break | Must fail with |
|---|---|
| change one `coffee-shop` drink price | the verifying client's exact-value assertion |
| remove the `coffee://menu` resource | the resource discovery assertion |
| make `place_order` succeed on the unavailable-drink path | that failure-path assertion |
| reset application state between exchanges in `remote-http` | the state-persistence assertion |
| change one SlowMCP parity implementation's tool name | the parity comparison, on that row |
| leave a `remote-http` port bound after exit | the runner's port-release check |
| hand-edit a generated parity number | the regeneration check, which must detect it |

That last row is the important one. If a hand-edited number survives
regeneration, the parity harness is not a source of truth and the comparison
table cannot be published.

## Acceptance commands

```sh
pnpm phase2:ready
pnpm ref:all        # new, via the runner; exact name agreed with integration
```

## Definition of done

- All four references run, self-verify, and fail when SlowMCP breaks.
- `coffee-shop` covers tools, resources, prompts, all four failure paths, and
  both transports.
- `framework-parity` generates every published number, including advertised
  schema per implementation, with divergences recorded and method stated.
- `remote-http` runs over a bound socket with state persisting across fresh
  instances.
- The runner is deterministic and leaks nothing.
- Falsification table run, including the hand-edited-number case.
- `pnpm phase2:ready` green. No framework code changed.

## Stop condition

Stop and report without finishing if:

- a reference cannot be written with the public API, which is a framework
  finding and outranks finishing the reference;
- FastMCP's current version cannot express the shared contract, in which case
  record what it cannot do rather than weakening the contract for all three;
- a measurement cannot be made reproducible, in which case do not publish it;
- SlowMCP loses a row badly enough that you are tempted to change the method.
  Report the number.

## Integration notes

- Adding `ref:all` to the readiness gate goes **through T22**. The root script
  name needs integration approval.
- **T32 depends on your output.** Publish the machine-readable parity results
  and their exact file location as soon as the format is stable.
- FastMCP is a devDependency of the parity example only. It must never reach
  the published package's dependencies. Confirm this in your report.
- File framework findings against T20, T21, or T22 by owner. Do not fix them.
- T30 and T31 are independent.

## Report back

1. Each reference: what it covers, how it self-verifies, how to run it.
2. `framework-parity`: every generated measurement, its method, and its file
   location for T32.
3. Every observable divergence between the three implementations.
4. Any row where SlowMCP loses, stated plainly.
5. What is measured and what is explicitly not, especially for startup.
6. Falsification results, including whether a hand-edited number survives
   regeneration.
7. Framework findings, with owning agent.
8. Confirmation FastMCP stays out of the published package's dependencies.
9. Whether `hello-tool` needed changes, and why.
