# T24: Agent E, reference applications

**Wave 2. Do not start until Wave 1 is merged to `main` and `pnpm phase2:ready`
is green on `main`.**

## Goal

Three executable, self-verifying reference applications that exercise the real
public API and fail CI when SlowMCP breaks, plus reproducible comparison
evidence against the official SDK and FastMCP.

## Why this task exists

References here are product proofs, not demos. `examples/hello-tool` is already
run twice by the readiness gate, once through workspace resolution and once
inside the packed consumer, and it has caught real breakage. These three extend
that from one tool to the whole surface.

`framework-parity` carries a heavier load than the other two. It is the answer
to "FastMCP already does this," and the source of every comparison number
SlowMCP publishes. The README currently prints three measured rows and states
plainly that no performance numbers have been taken. This task is what makes
that table real, and it must stay honest whichever way the numbers fall.

## Read first

- `CLAUDE.md`, in full, especially the benchmark and brand rules.
- `ARCHITECTURE.md` §12 in full. Note §12's divergence rule: where
  implementations differ observably but stay behaviorally equivalent, the
  harness records what each emitted and publishes the row. **Do not normalize
  differences away.** T03 already found one, recorded in
  `BASELINE_FINDINGS.md`: given the identical Zod validator, FastMCP advertises
  `additionalProperties: false` and the raw SDK omits the key.
- `BASELINE_FINDINGS.md` and `VERTICAL_SLICE_FINDINGS.md`, for how measurements
  are recorded and reproduced.
- `examples/hello-tool/server.mjs` and `verify.mjs`, the pattern to follow.
- `spikes/src/`, which already contains raw-SDK and FastMCP greet servers.
- Wave 1 reports from T20, T21, T22.
- `tasks/README.md`.

## Owned paths

```text
examples/**
scripts/run-reference-apps.mjs           new
```

## Forbidden paths

```text
packages/slowmcp/**                      all of it
fixtures/**                              T22
spikes/**                                read only, do not modify
docs/**                                  T25
scripts/*                                except run-reference-apps.mjs
```

If a reference cannot be written with the public API, that is a framework
finding. File it against the owning agent. Do not patch the framework.

## Frozen interfaces you must respect

- **Public API only**, exactly as an external consumer would import it. No
  workspace-internal paths, no `dist/` reach-through.
- **Every reference self-verifies through the official MCP client** and exits
  non-zero on mismatch. A reference that only starts a server proves nothing.
- **Never fabricate a measurement.** Numbers come from a command in this
  repository that anyone can rerun. Publish results when SlowMCP loses. Do not
  sabotage a competitor's implementation to win a row, and do not tune SlowMCP's
  implementation into a shape no user would write.
- **Fixtures attack, examples teach.** These are examples. They must be
  readable. `coffee-shop` is a feature showcase that stays understandable.
- Deterministic. No clocks, no randomness, no network, no ordering that varies
  between runs. Order IDs are deterministic by requirement.

## Requirements

### `coffee-shop`

Deterministic fixture data. Both HTTP and stdio modes.

- Tools: `list_drinks`, `place_order`, `get_order`.
- Resources: `coffee://menu`, and a store metadata resource.
- Prompt: `recommend-drink`.
- Deterministic order IDs, so the verifying client can assert exact values.
- At least one deliberate error path: an order that must fail, with the
  observable protocol-level error asserted rather than described.
- Self-verifying client covering every capability above, over both transports.

### `framework-parity`

Three implementations of one contract:

```text
official-sdk/   official MCP SDK directly
fastmcp/        Prefect FastMCP TypeScript
slowmcp/        SlowMCP
```

- One shared dataset, one shared observable contract, all three driven by the
  same official MCP client.
- Generate, do not hand-write: significant source line counts, bootstrap and
  configuration steps, discovered capabilities, normalized client-observed
  results, **advertised JSON Schema per implementation**, negotiated protocol
  revision, and transport behavior.
- Record divergences as output rows. Matching another framework's choice is not
  a goal.
- Emit machine-readable results that T25 consumes directly. T25 must never
  retype a number.
- If you add timing measurements, define the method, state the variance, and
  state what is not being measured. A number without a method is not publishable
  here.

### `remote-http`

A seeded issue repository over T21's real Node transport.

- Real socket, not an injected `fetch`.
- Explicit application state, with the boundary between application state and
  MCP server instance visible in the code, since fresh instances are built per
  exchange.
- Tools, resources, and prompts.
- Self-verifying official client over a real socket.
- Safe localhost defaults.

### Runner

`scripts/run-reference-apps.mjs` runs every reference, reports per-reference
pass or fail, and exits non-zero on any failure. Deterministic output. No
leaked ports or child processes.

## Non-goals

Do not build: a UI, a database, a deployment, auth, a hosted demo, anything
requiring network access or credentials, or a fourth reference. Do not turn
`coffee-shop` into a coffee pun exercise; `ARCHITECTURE.md` and the brand rules
both reject wall-to-wall puns. Do not change framework code.

## Tests and evals required

- Each reference's self-verifying client is the test. It must fail loudly when
  SlowMCP breaks.
- `coffee-shop` over both HTTP and stdio, same assertions.
- `remote-http` over a real bound socket, port released on exit.
- `framework-parity` produces identical normalized results for all three, with
  divergences recorded rather than reconciled.
- The runner exits non-zero if any reference fails.

## Intentional falsification

Break each once, record the exact failure, restore:

| Break | Must fail with |
|---|---|
| change one `coffee-shop` drink price | the verifying client's exact-value assertion |
| remove the `coffee://menu` resource | the resource discovery assertion |
| make `place_order` return success on the error path | the deliberate-error assertion |
| change one SlowMCP parity implementation's tool name | the parity comparison, on that row |
| bind `remote-http` to a port and never release it | the runner's port-release check |
| hand-edit a generated parity number | the regeneration check, which must detect it |

That last row is the important one. If a hand-edited number can survive a
regeneration, the parity harness is not a source of truth and the comparison
table cannot be published.

## Acceptance commands

```sh
pnpm phase2:ready
pnpm ref:all          # new, via the runner; exact name to be agreed with integration
```

## Definition of done

- All three references run, self-verify, and fail when SlowMCP breaks.
- `coffee-shop` covers tools, resources, prompts, an error path, and both
  transports.
- `framework-parity` generates every published number, including advertised
  JSON Schema per implementation, with divergences recorded.
- `remote-http` runs over a real socket with explicit state.
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

- Adding `ref:all` to the readiness gate goes **through T22**. Send the check
  name and what it proves.
- The new root script name needs integration approval, since root
  `package.json` scripts are shared.
- **T25 depends on your output.** Publish the machine-readable parity results
  and their exact file location to T25 as soon as the format is stable. T25's
  benchmark table is generated from your files and must never contain a typed
  number.
- FastMCP is a devDependency of the parity example only. It must never reach
  the published package's dependencies. Confirm this in your report.
- File framework findings against T20, T21, or T22 by owner. Do not fix them.

## Report back

1. Each reference: what it covers, how it self-verifies, how to run it.
2. `framework-parity`: every generated measurement, its method, and its file
   location for T25.
3. Every observable divergence between the three implementations, published as
   found.
4. Any row where SlowMCP loses, stated plainly.
5. What is measured and what is explicitly not.
6. Falsification results, including whether a hand-edited number survives
   regeneration.
7. Framework findings, with owning agent.
8. Confirmation FastMCP stays out of the published package's dependencies.
