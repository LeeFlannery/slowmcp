# T30: CLI

**Wave 2. Do not start until Wave 1 is integrated into `main`, `pnpm
phase2:ready` passes, and the public-API review is complete.**

## Goal

`slowmcp` is an installed binary with `init`, `dev`, `test`, `check`, `doctor`,
`inspect`, `--help`, and `--version`, built only on the integrated Wave 1
public API, with deterministic output and stable exit codes.

## Why this work exists

`ARCHITECTURE.md` treats the CLI as a product feature, because the shipping
story is the wedge. `slowmcp check` already exists as a repository script that
proves seven contracts from outside the package, and today it cannot leave this
repository. Until it can, SlowMCP asks users to trust a release process they
cannot run.

`init` matters for a reason specific to this project: the generated app must
work with CoffeeScript nowhere near it. Containment is a claim about consumers,
and the scaffolder is where it is easiest to break.

## Prerequisites

- Wave 1 merged to `main`, `pnpm phase2:ready` green, public-API review done.
- Branch `t30-cli` from `main`.
- The reviewed public API surface, in writing. **Do not design against
  aspirational APIs.** If a command needs something the integrated framework
  does not export, that is a stop condition, not a workaround.

## Read first

- `CLAUDE.md`, in full, including Brand and the test language policy.
- `tasks/README.md`, global invariants and frozen interfaces.
- `ARCHITECTURE.md` §14 in full, §9 containment, §15 correctness rules.
- `scripts/slowmcp-check.mjs`. Its report format, `--json`, `--quiet`, and exit
  codes are the model, and `slowmcp check` should reuse this logic rather than
  reimplement it.
- Wave 1 reports from T20, T21, T22, and the reviewed API surface.
- `packages/slowmcp/package.json`, specifically that there is no `bin` yet and
  `files` currently ships `dist` and `types` only.

## Owned paths

```text
packages/slowmcp/src/cli/**
packages/slowmcp/test/cli/**
templates/**
packages/slowmcp/types/cli.d.ts                 only if the CLI has a programmatic API
```

## Forbidden paths

```text
packages/slowmcp/src/{definitions,server,results,errors,transports,testing,protocol}/**
packages/slowmcp/types/*.d.ts                   except cli.d.ts
fixtures/**                                     T22
examples/**                                     T31
docs/**                                         T32
scripts/phase2-ready.mjs                        request through T22
scripts/slowmcp-check.mjs                       request through T22
packages/slowmcp/package.json                   integration, including `bin` and `files`
```

## Frozen interfaces

- **Never write to stdout in a stdio session.** Protocol stdout is sacred.
  Every CLI byte that is not protocol output goes to stderr when a stdio
  transport is live. This is the most likely way this task breaks the product.
- **CoffeeScript containment.** A project created by `slowmcp init` must not
  depend on `coffeescript`, must not contain `.coffee`, and must not require it
  to run or test. Templates are JavaScript or TypeScript.
- **Public APIs only.** The CLI imports from `slowmcp`, `slowmcp/http`,
  `slowmcp/stdio`, `slowmcp/node`, `slowmcp/testing`, and `slowmcp/protocol`
  exactly as a consumer would. It never reaches into `src/` or `dist/`
  internals.
- **`slowmcp test` uses the public harness**, never a private test-only path.
- Deterministic output, stable exit codes, `--quiet` on every command.
- **The CLI is CoffeeScript**, like the rest of `src/`.

## Requirements

1. **Banner and output system.** One presentation layer: `--quiet`, a
   machine-readable mode, stderr for chatter, stdout only for pipeable data.
   Deterministic enough to snapshot.
2. **`init`.** Scaffold a working project: one capability, a starter contract
   test using `slowmcp/testing`, scripts wired, no CoffeeScript. The generated
   project's test must pass immediately after install, proven by a test rather
   than by inspection.
3. **`dev`.** Run an application locally with explicit transport selection.
   Never corrupt stdio stdout.
4. **`test`.** Run the project's MCP contract tests through the public harness.
5. **`check`, the flagship.** Release-readiness, **not a wrapper around the
   unit-test suite.** It reports on the contracts that decide whether a package
   is shippable: protocol, package, types, containment, transports. Stable
   machine-readable status, useful locally and in CI. If it degenerates into
   "runs vitest", the command has failed its purpose.
6. **`doctor`.** Diagnose environment and configuration problems: Node version,
   unresolvable subpaths, a stdio server writing to stdout, protocol policy
   mismatch.
7. **`inspect`.** Launch or connect the official MCP Inspector with minimal
   setup. If a non-interactive smoke is not achievable, document exactly what
   is verifiable and do not fake the rest.
8. **`--help` and `--version`.** `--version` must agree with the package
   version, enforced, matching the version-sync guard in
   `scripts/build-coffee.mjs`.
9. **Exit codes.** Documented, stable, distinct for usage error, check failure,
   and internal error.
10. **The binary must actually exist.** The installed package exposes
    `slowmcp` via `bin` before any documentation claims these commands work.
    Prove it from an installed tarball, not from the workspace.

## Non-goals

Do not build framework functionality inside the CLI. If a command needs
behavior the framework lacks, the framework gets it in a later task. Do not
build a plugin system, config formats beyond the minimum, watch infrastructure
beyond what `dev` needs, telemetry, update checks, interactive prompts that
block CI, or a joke on every line. 95% useful, 5% joke, attached to real
behavior.

## Testing-language policy

- **CoffeeScript** for CLI implementation tests: argument parsing, exit codes,
  output modes, the presentation layer, and stdout routing. The CLI is
  CoffeeScript and these test it.
- **JavaScript or TypeScript** for the generated-project fixtures that `init`
  produces and the tests that run them. Those stand in for consumer projects
  and must contain no CoffeeScript by definition. Writing them in CoffeeScript
  would invert the containment claim.
- Snapshot files are data, not code, and carry no language policy.

## Required tests and evals

In `packages/slowmcp/test/cli/`:

- Snapshot every command's output in normal, `--quiet`, and machine-readable
  modes.
- Exit codes for success, usage error, and check failure.
- `init` produces a project that installs, runs, and passes its own test, in a
  temporary directory outside the monorepo.
- The generated project contains no `.coffee` and no `coffeescript` dependency.
- `dev` in stdio mode: nothing but protocol on stdout, chatter still on stderr.
- `--version` matches `package.json`.
- `doctor` detects at least: wrong Node version, a stdio server polluting
  stdout, an unresolvable subpath.
- **The `slowmcp` binary resolves and runs from an installed tarball**, not
  from the workspace.

## Falsification requirements

Break each once, record the exact failure, restore:

| Break | Must fail with |
|---|---|
| write one banner line to stdout in stdio mode | the stdout purity test |
| add `coffeescript` to a template's dependencies | the containment test on the generated project |
| bump `package.json` version without the CLI's | the `--version` agreement test |
| return exit 0 from a failing `check` | the exit-code test |
| have `init` generate a project whose test fails | the generated-project test |
| remove the `bin` entry | the installed-binary test, before any doc claims it works |
| reduce `check` to running vitest | your own review, and it must be rejected |

## Acceptance commands

```sh
pnpm phase2:ready
```

Plus the CLI suite, and a recorded manual run of each command.

## Definition of done

- All eight commands work against the reviewed post-Wave-1 API.
- `slowmcp check` reports release-readiness and produces the same verdict as
  `pnpm slowmcp:check`, run from a consumer project.
- The `slowmcp` binary is exposed by the installed package and proven from a
  tarball.
- `init` output installs, runs, passes, and contains no CoffeeScript.
- stdout purity proven under stdio.
- Exit codes documented and tested.
- Falsification table run, failures recorded.
- `pnpm phase2:ready` green. No test weakened.

## Stop condition

Stop and report without finishing if:

- a command requires an API that is not publicly exported;
- `slowmcp check` cannot run from a consumer project without repository-only
  assumptions;
- Inspector cannot be driven non-interactively;
- the `bin` or `files` change has consequences for containment or tarball size
  that need a decision.

## Integration notes

- **`bin` and `files` in `packages/slowmcp/package.json` are
  integration-owned.** Request them with the exact entry point and reasoning.
  This is a permanent public surface change affecting the packed artifact and
  its published size measurement.
- Adding CLI coverage to `slowmcp:check` or the readiness gate goes **through
  T22**.
- **T32 depends on you.** Publish final command signatures, flags, and exit
  codes to T32 as soon as they are stable. T32 must not read your source to
  reconstruct them, and must not document a command before its binary exists.
- T30 and T31 are independent. Do not coordinate with T31 except through
  integration.

## Report back

1. Every command, its flags, exit codes, and output modes.
2. What `slowmcp check` verifies, and the evidence it is not merely the test
   suite.
3. Proof the `slowmcp` binary resolves from an installed tarball.
4. What `init` generates, and the proof it installs, runs, and passes clean.
5. stdout purity: mechanism and proof.
6. `inspect`: what is verified automatically and what is not.
7. `doctor`: every condition it detects.
8. Falsification results: each break and the exact failure observed.
9. Any framework gap you hit, and whether you refused to route around it.
10. Packaging changes requested: `bin`, `files`, tarball size delta.
