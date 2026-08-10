# T23: Agent D, CLI

**Wave 2. Do not start until Wave 1 is merged to `main` and `pnpm phase2:ready`
is green on `main`.**

## Goal

`slowmcp` is a real command with `init`, `dev`, `test`, `check`, `doctor`,
`inspect`, `--help`, and `--version`, built only on public APIs that exist,
with deterministic output and stable exit codes.

## Why this task exists

`ARCHITECTURE.md` treats the CLI as a product feature rather than tooling,
because the shipping story is the wedge. `slowmcp check` already exists as a
repository script that proves seven contracts from outside the package; today
it cannot leave this repository. Until it does, SlowMCP asks users to trust a
release process they cannot run.

`init` matters for a reason specific to this project: the generated app must
work without CoffeeScript anywhere near it. Containment is a claim about
consumers, and the scaffolder is where that claim is easiest to break.

## Read first

- `CLAUDE.md`, in full, including the brand section. 95% useful, 5% joke.
- `ARCHITECTURE.md` §14 in full, §9 containment, §15 correctness rules.
- `.local/BRAND_AND_COMEDY.md` CLI rule section, if available to you.
- `scripts/slowmcp-check.mjs`. Its report format, `--json`, `--quiet`, and
  exit-code behavior are the model for the CLI, and `slowmcp check` should
  reuse this logic rather than reimplement it.
- Wave 1 reports from T20, T21, T22, and the final public API surface.
- `tasks/README.md`.

## Owned paths

```text
packages/slowmcp/src/cli/**
packages/slowmcp/test/cli/**
templates/**
packages/slowmcp/types/cli.d.ts          only if the CLI has a programmatic API
```

## Forbidden paths

```text
packages/slowmcp/src/{definitions,server,results,transports,testing,protocol}/**
packages/slowmcp/types/*.d.ts            except cli.d.ts
fixtures/**                              T22
examples/**                              T24
docs/**                                  T25
scripts/phase2-ready.mjs                 request through T22
scripts/slowmcp-check.mjs                request through T22
packages/slowmcp/package.json            integration, including `bin`
```

## Frozen interfaces you must respect

- **Never write to stdout in a stdio session.** Protocol stdout is sacred.
  Every CLI byte that is not protocol output goes to stderr when a stdio
  transport is live. This is the single most likely way this task breaks the
  product.
- **CoffeeScript containment.** A project created by `slowmcp init` must not
  depend on `coffeescript`, must not contain `.coffee`, and must not require it
  to run or test. Templates are JavaScript or TypeScript.
- **Public APIs only.** The CLI imports from `slowmcp`, `slowmcp/http`,
  `slowmcp/stdio`, `slowmcp/node`, `slowmcp/testing`, and `slowmcp/protocol`
  exactly as a consumer would. It never reaches into `src/` or `dist/`
  internals. If a command needs something not exported, that is a stop
  condition.
- **`slowmcp test` uses the public harness**, never a private test-only path.
- Deterministic output. Stable exit codes. `--quiet` on every command.
- The CLI is CoffeeScript like the rest of `src/`.

## Requirements

1. **Banner and output system.** One presentation layer: `--quiet`, a
   machine-readable mode, stderr for chatter, stdout only for data a caller
   would pipe. Deterministic enough to snapshot.
2. **`init`.** Scaffold a working project: one capability, a starter contract
   test using `slowmcp/testing`, scripts wired, no CoffeeScript. The generated
   project's test must pass immediately after install, and that must be proven
   by a test, not by inspection.
3. **`dev`.** Run an application locally with explicit transport selection.
   Never corrupt stdio stdout.
4. **`test`.** Run the project's MCP contract tests through the public harness.
5. **`check`.** The release-readiness verification, reusing the existing check
   implementation. Stable machine-readable status. Useful locally and in CI.
   This is the command that turns `pnpm slowmcp:check` into a real binary.
6. **`doctor`.** Diagnose environment and configuration problems: Node
   version, missing peer expectations, unresolvable subpaths, a stdio server
   that writes to stdout, protocol policy mismatch.
7. **`inspect`.** Launch or connect the official MCP Inspector with minimal
   setup. If a non-interactive smoke is not achievable, document exactly what
   is verifiable and do not fake the rest.
8. **`--help` and `--version`.** `--version` must agree with the package
   version, and that agreement must be enforced, matching the existing
   version-sync guard in `scripts/build-coffee.mjs`.
9. **Exit codes.** Documented, stable, distinct for usage error, check
   failure, and internal error.

## Non-goals

Do not build framework functionality inside the CLI. If a command needs
behavior the framework lacks, the framework gets it in a later task, not the
CLI. Do not build: a plugin system, config file formats beyond the minimum,
watch-mode infrastructure beyond what `dev` needs, telemetry, update checks,
interactive prompts that block CI, or a joke on every line.

## Tests and evals required

In `packages/slowmcp/test/cli/`:

- Snapshot the output of every command, in normal, `--quiet`, and
  machine-readable modes.
- Exit codes for success, usage error, and check failure.
- `init` produces a project that installs, runs, and passes its own test, in a
  temporary directory outside the monorepo.
- The generated project contains no `.coffee` and no `coffeescript` dependency.
- `dev` in stdio mode: assert nothing but protocol reaches stdout, while
  chatter still reaches stderr.
- `--version` matches `package.json`.
- `doctor` detects at least: wrong Node version, a stdio server polluting
  stdout, and an unresolvable subpath.

## Intentional falsification

Break each once, record the exact failure, restore:

| Break | Must fail with |
|---|---|
| write one banner line to stdout in stdio mode | the stdout purity test |
| add `coffeescript` to a template's dependencies | the containment test on the generated project |
| bump `package.json` version without the CLI's | the `--version` agreement test |
| return exit 0 from a failing `check` | the exit-code test |
| have `init` generate a project whose test fails | the generated-project test |

## Acceptance commands

```sh
pnpm phase2:ready
```

Plus the CLI's own suite, and a manual run of each command recorded in the
report.

## Definition of done

- All eight commands work against the real post-Wave-1 public API.
- `slowmcp check` produces the same verdict as `pnpm slowmcp:check`, from a
  consumer project rather than this repository.
- `init` output is proven to install, run, pass, and contain no CoffeeScript.
- stdout purity proven under stdio.
- Exit codes documented and tested.
- Falsification table run, failures recorded.
- `pnpm phase2:ready` green. No test weakened.

## Stop condition

Stop and report without finishing if:

- a command requires an API that is not publicly exported (that is a framework
  gap, and the CLI must not route around it);
- `slowmcp check` cannot run from a consumer project without repository-only
  assumptions;
- Inspector cannot be driven non-interactively, in which case report what is
  actually verifiable rather than shipping a command that pretends;
- the `bin` entry requires a packaging change with consequences for
  containment.

## Integration notes

- **`bin` in `packages/slowmcp/package.json` is integration-owned.** Request it
  with the exact entry point and the reasoning. This is a permanent public
  surface change and it affects the packed artifact and its size.
- Adding CLI coverage to `slowmcp:check` or the readiness gate goes **through
  T22**, not directly. Send the check name and what it proves.
- T25 documents these commands. Publish final command signatures, flags, and
  exit codes to T25 as soon as they are stable; do not make T25 read your
  source.
- If `init` templates should appear in the packed tarball, that is a `files`
  change, which is integration-owned and affects tarball size, currently a
  published measurement.

## Report back

1. Every command, its flags, its exit codes, and its output modes.
2. Whether `slowmcp check` fully replaces `pnpm slowmcp:check`, and any gap.
3. What `init` generates, and the proof it installs, runs, and passes clean.
4. stdout purity: mechanism and proof.
5. `inspect`: what is verified automatically and what is not.
6. `doctor`: every condition it detects.
7. Falsification results: each break, and the exact failure observed.
8. Any framework gap you hit and routed around, or refused to route around.
9. Packaging changes requested: `bin`, `files`, tarball size delta.
