# T25: Agent F, documentation

**Wave 2. Do not start until Wave 1 is merged to `main` and `pnpm phase2:ready`
is green on `main`.** Pages depending on T23 and T24 finish last.

## Goal

A documentation site built from the public API that actually exists, that
answers "what does SlowMCP add on top of the official SDK?" above the fold,
with every number generated rather than typed.

## Why this task exists

The premise gets people to the repository. The docs decide whether they stay,
and the honest answer to "why not just use the SDK" is a specific protocol bug
the harness caught on day one, not a list of adjectives. That story is already
written in the README and `docs/bootstrap-2026-08.md`; the site has to carry it
without diluting it.

The site is also where the project is most likely to start lying. Aspirational
exports, benchmark numbers nobody measured, and features borrowed from
FastMCP's docs are the three specific failure modes. All three are forbidden
here.

## Read first

- `CLAUDE.md`, in full, especially Brand.
- `README.md`, the current voice and structure. The site expands it; it does
  not contradict it.
- `ARCHITECTURE.md` §2 competitive baseline, §13 documentation site, §11
  enforced-today mapping.
- `docs/bootstrap-2026-08.md`, `VERTICAL_SLICE_FINDINGS.md`,
  `BASELINE_FINDINGS.md`.
- `.local/BRAND_AND_COMEDY.md` and `.local/README_COPY_SPEC.md` if available to
  you. The comparison tables and the roadmap line are specified there verbatim.
- Wave 1 and Wave 2 reports from every other agent. Especially T24's parity
  output and T23's command signatures.
- `tasks/README.md`.

## Owned paths

```text
docs/**
.github/workflows/pages.yml
```

Do not modify `docs/bootstrap-2026-08.md` beyond what is needed to host it on
the site. It is a record of what happened.

## Forbidden paths

```text
packages/slowmcp/**
examples/**                              T24
fixtures/**                              T22
scripts/**
README.md                                integration
ARCHITECTURE.md                          integration
```

## Frozen interfaces you must respect

- **Never document an export that does not exist.** Every code sample compiles
  or runs against the packed artifact. If a sample cannot be executed, it is
  sourced from a file that is.
- **Never type a benchmark number.** Every measured figure comes from T24's
  generated output. A number you cannot regenerate cannot ship.
- **Canonical tagline, verbatim: `Blazingly adequate.`** Not "blazingly fast,"
  not "surprisingly fast." The mediocrity is the point.
- **Roadmap item, verbatim: `TypeScript support: never.`** Do not soften to
  "not planned." Do not add a parenthetical about declarations; that
  clarification belongs in the compatibility page, separately and accurately.
- **Do not add caveats explaining that models can in fact write CoffeeScript.**
  The premise is meant to be challenged. Closing that loop in advance kills the
  engagement.
- **Do not trash FastMCP.** The approved framing is that FastMCP is excellent
  and unfortunately fast. Never imply affiliation with Prefect, never imply the
  FastMCP name is ours, never claim deficiency to make the joke work.
- 95% credible developer tool, 5% joke. Jokes attach to real behavior.
- No em dashes. First person singular where the voice is personal.

## Requirements

1. **Astro + Starlight**, static output, deployed to GitHub Pages via Actions.
2. **Homepage** that answers what SlowMCP adds on top of the official SDK,
   above the fold, with the tagline verbatim.
3. **Quickstart**, executable, matching the README and the `hello-tool`
   reference.
4. **Why not just the official SDK**, built on the protocol negotiation
   finding, with the regression test named.
5. **Why not FastMCP**, the competitive baseline page, including both tables:
   the generated measurements from T24, and the clearly unserious comparison
   table specified in the brand copy. They sit near each other; the contrast is
   the point.
6. **Capabilities**: tools, resources, prompts, from T20's real API.
7. **Transports**: HTTP, stdio, Node, from T21's real API, including safe
   defaults and shutdown behavior.
8. **Testing guide**, treating `testServer` as a product feature, from T22.
9. **`slowmcp check` and shipping guide**, from T23's real command.
10. **Protocol policy page**: what SlowMCP claims to speak, why it is a
    SlowMCP-owned literal, and what changing it means.
11. **CoffeeScript containment page**: what the gate proves, and what consumers
    actually install.
12. **Reference implementations page**, linking T24's three references as
    runnable proofs.
13. **Compatibility page**, stating plainly that TypeScript and JavaScript
    consumers are first class and receive full declarations, and that the
    roadmap line means the framework implementation will not be rewritten in
    TypeScript. Keep this separate from the roadmap line itself.
14. **API reference**, generated from or checked against the shipped `.d.ts`
    files, never hand-copied.
15. **Roadmap**, containing the verbatim line.

## Non-goals

Do not build: a blog, a changelog generator, versioned docs, i18n, search
infrastructure beyond Starlight's built-in, a marketing landing page separate
from the homepage, or interactive playgrounds. Do not document CLI commands,
capabilities, or transports that do not exist. Do not write a migration guide
from FastMCP.

## Tests and evals required

- **Docs build** in CI, failing the gate on error.
- **Link check**: no broken internal links.
- **Sample verification**: every code sample either executes, or is extracted
  from a file that is executed by another gate. State which for each sample.
- **Export truthfulness**: a check that every symbol documented in the API
  reference exists in the packed artifact's declarations. This is the guard
  against aspirational docs and it is the most valuable test in this task.
- **Number provenance**: every measured figure traces to a T24 generated file.

## Intentional falsification

Break each once, record the exact failure, restore:

| Break | Must fail with |
|---|---|
| document an export that does not exist | the export truthfulness check |
| break an internal link | the link check |
| hand-edit a benchmark number | the number provenance check |
| change the tagline to "blazingly fast" | the brand assertion |
| soften the roadmap line to "not planned" | the brand assertion |
| introduce a syntax error in a documented sample | the sample verification |

The brand assertions are a real test. The tagline and the roadmap line are
product requirements with verbatim text, so assert them like any other
contract.

## Acceptance commands

```sh
pnpm phase2:ready
pnpm docs:build       # new, exact name to be agreed with integration
```

## Definition of done

- Site builds and deploys to Pages.
- Every required page exists and is written from the real API.
- Both comparison tables present, measurements generated from T24.
- Tagline and roadmap line verbatim, asserted by a test.
- Export truthfulness check passes and has been watched failing.
- Compatibility page states the TypeScript consumer position clearly, without
  softening the roadmap line.
- No aspirational exports. No typed numbers.
- Falsification table run, failures recorded.
- `pnpm phase2:ready` green.

## Stop condition

Stop and report without finishing if:

- a required page can only be written by documenting something that does not
  exist;
- T24's parity output is not machine-readable, since a typed number is not an
  acceptable fallback;
- the brand copy conflicts with what the software actually does, which is a
  brand decision for the owner, not a wording problem for you to solve.

## Integration notes

- **You are last in the integration order.** Every other agent's public surface
  must be final before your API reference can be.
- Adding `docs:build` to the readiness gate goes **through T22**. The root
  script name needs integration approval.
- T23 owes you final CLI command signatures, flags, and exit codes. T24 owes
  you the machine-readable parity output and its location. Do not read their
  source to reconstruct either; ask.
- `README.md` is integration-owned. If the site and the README diverge, report
  it rather than editing the README.
- Pages deployment needs repository settings that may be outside your access.
  Hand over exact steps rather than guessing.

## Report back

1. Every page built, and which agent's API it documents.
2. The export truthfulness check: how it works, and the failure you observed.
3. Every number on the site, and the generated file it came from.
4. Any place the brand copy and the software disagreed, unresolved, for the
   owner to decide.
5. Any documented behavior you could not verify against a running example.
6. Falsification results: each break, and the exact failure observed.
7. Deployment steps requiring repository settings you could not apply.
8. Any API that was hard to document, which is usually a sign it is hard to
   use, reported to the owning agent.
