# T32: documentation

**Wave 2, and last. Do not start until Wave 1 is integrated, `pnpm
phase2:ready` passes, the public-API review is complete, and T30 and T31 have
published their outputs.**

## Goal

A documentation site built from the packed public API and the executable
references, answering "what does SlowMCP add on top of the official SDK?" above
the fold, with every measured number generated rather than typed.

## Why this work exists

The premise gets people to the repository. The docs decide whether they stay,
and the honest answer to "why not just use the SDK" is a specific protocol bug
the harness caught on day one, not a list of adjectives.

The site is also where the project is most likely to start lying. Aspirational
exports, benchmark numbers nobody measured, and features borrowed from
FastMCP's docs are the three failure modes, and all three are forbidden.

## Prerequisites

- Wave 1 integrated, `pnpm phase2:ready` green, public-API review complete.
- T30 has published final command signatures, flags, and exit codes, and the
  `slowmcp` binary exists in the installed package.
- T31 has published machine-readable parity results and their file location.
- Branch `t32-docs` from `main`.

## Read first

- `CLAUDE.md`, in full, especially Brand.
- `tasks/README.md`, global invariants.
- `README.md`, the current voice and structure. The site expands it; it does
  not contradict it.
- `ARCHITECTURE.md` §2 competitive baseline, §13 documentation site, §11
  enforced-today mapping.
- `docs/bootstrap-2026-08.md`, `VERTICAL_SLICE_FINDINGS.md`,
  `BASELINE_FINDINGS.md`.
- Wave 1 and Wave 2 reports from every other task.

## Owned paths

```text
docs/**
.github/workflows/pages.yml
```

Do not modify `docs/bootstrap-2026-08.md` beyond what hosting it requires. It
is a record of what happened.

## Forbidden paths

```text
packages/slowmcp/**
examples/**                                     T31
fixtures/**                                     T22
scripts/**
README.md                                       integration
ARCHITECTURE.md                                 integration
```

## Frozen interfaces

- **Never document an export or command that does not exist in the packed
  package.** Every code sample compiles or runs against the packed artifact, or
  is sourced from a file that another gate executes.
- **Never type a measured number.** Every figure comes from T31's generated
  output. A number you cannot regenerate cannot ship.
- **Canonical tagline, verbatim: `Blazingly adequate.`** Not "blazingly fast,"
  not "surprisingly fast." The mediocrity is the point.
- **Roadmap item, verbatim: `TypeScript support: never.`** Do not soften it to
  "not planned."
- **Do not add caveats explaining that models can in fact write CoffeeScript.**
  The premise is meant to be challenged.
- **Do not trash FastMCP.** The approved framing is that FastMCP is excellent
  and unfortunately fast. Never imply affiliation with Prefect, never imply the
  FastMCP name is ours, never claim deficiency to make the joke work.
- 95% credible developer tool, 5% joke, attached to real behavior.
- No em dashes. First person singular where the voice is personal.

## Requirements

1. **Astro + Starlight**, static output, GitHub Pages via Actions, if still
   appropriate when you start. If it is not, report before substituting.
2. Pages, all of them, from the real integrated API:
   Home, Quickstart, What SlowMCP Does, Why Not Just the Official SDK?,
   comparison with FastMCP, tools, resources, prompts, result and error
   behavior, Streamable HTTP, stdio, Node, testing, protocol compatibility
   policy, `slowmcp check`, CoffeeScript containment, reference
   implementations, compatibility, contributing, roadmap.
3. **Home** answers what SlowMCP adds on top of the official SDK above the
   fold, with the tagline verbatim.
4. **Why Not Just the Official SDK?** is built on the protocol negotiation
   finding, naming the regression test.
5. **The FastMCP comparison has two layers, near each other**, because the
   contrast is the bit:
   - real, reproducible engineering measurements, generated from T31;
   - a clearly unserious table including at least: Lines of visible semicolons
     (0), Time to appreciate the craft, CoffeeScript implementation, Name
     suggests urgency.

   **Do not fake normal benchmark results** to make the serious table flatter.
6. **`slowmcp check`** documented as the shipping command, only after T30's
   binary exists.
7. **Compatibility** states plainly that TypeScript consumers are first class
   and receive full declarations, and that the roadmap line means the SlowMCP
   implementation itself will not be rewritten in TypeScript. Place this
   clarification **near** the roadmap line without softening the line.
8. **Contributing** covers the CoffeeScript invariant and the test-language
   policy, since those are the two rules a new contributor will otherwise
   break first.
9. **API reference** generated from or checked against the shipped `.d.ts`
   files, never hand-copied.

## Non-goals

Do not build a blog, changelog generator, versioned docs, i18n, search beyond
Starlight's built-in, a separate marketing landing page, interactive
playgrounds, or a FastMCP migration guide. Do not document anything that does
not exist.

## Testing-language policy

- **TypeScript and JavaScript** for documentation samples, because samples are
  consumer code. A CoffeeScript sample would teach the opposite of the
  containment claim.
- **JavaScript or TypeScript** for the doc verification scripts you own.
- **No CoffeeScript in `docs/**`**, with one exception: a page explaining the
  implementation language may quote SlowMCP's own CoffeeScript source, clearly
  marked as implementation rather than consumer code.

## Required tests and evals

- **Docs build** in CI, failing on error.
- **Link check**: no broken internal links.
- **Sample verification**: every sample either executes or is extracted from a
  file another gate executes. State which, per sample.
- **Export truthfulness**: every symbol and command documented exists in the
  packed artifact's declarations or its `bin`. This is the guard against
  aspirational docs and the most valuable test in this task.
- **Number provenance**: every measured figure traces to a T31 generated file.

## Falsification requirements

Break each once, record the exact failure, restore:

| Break | Must fail with |
|---|---|
| document an export that does not exist | the export truthfulness check |
| document a CLI command with no `bin` entry | the export truthfulness check |
| break an internal link | the link check |
| hand-edit a benchmark number | the number provenance check |
| change the tagline to "blazingly fast" | the brand assertion |
| soften the roadmap line to "not planned" | the brand assertion |
| introduce a syntax error in a documented sample | sample verification |

The brand assertions are real tests. The tagline and the roadmap line are
product requirements with verbatim text, so assert them like any other
contract.

## Acceptance commands

```sh
pnpm phase2:ready
pnpm docs:build     # new, exact name agreed with integration
```

## Definition of done

- Site builds and deploys to Pages.
- Every required page exists, written from the real integrated API.
- Both comparison layers present, serious measurements generated from T31.
- Tagline and roadmap line verbatim, asserted by a test.
- Compatibility clarification present and adjacent to the roadmap line, with
  the line unsoftened.
- Export truthfulness check passes and has been watched failing.
- No aspirational exports or commands. No typed numbers.
- Falsification table run, failures recorded.
- `pnpm phase2:ready` green.

## Stop condition

Stop and report without finishing if:

- a required page can only be written by documenting something that does not
  exist;
- T31's parity output is not machine-readable, since a typed number is not an
  acceptable fallback;
- T30's binary does not exist in the installed package;
- Astro or Starlight is no longer appropriate;
- brand copy conflicts with what the software actually does, which is the
  owner's decision, not a wording problem for you.

## Integration notes

- **You are last.** Every other public surface must be final before your API
  reference can be.
- Adding `docs:build` to the readiness gate goes **through T22**.
- T30 owes you command signatures, flags, and exit codes. T31 owes you the
  machine-readable parity output and its location. Do not read their source to
  reconstruct either; ask.
- `README.md` is integration-owned. If the site and README diverge, report it.
- Pages deployment needs repository settings possibly outside your access. Hand
  over exact steps rather than guessing.

## Report back

1. Every page built, and which task's API it documents.
2. The export truthfulness check: how it works, and the failure you observed.
3. Every number on the site, and the generated file it came from.
4. Any place brand copy and software disagreed, unresolved, for the owner.
5. Any documented behavior you could not verify against a running example.
6. Falsification results: each break and the exact failure observed.
7. Deployment steps requiring repository settings you could not apply.
8. Any API that was hard to document, which usually means it is hard to use,
   reported to the owning task.
