# SlowMCP

**Blazingly adequate.**

A modern framework for building, testing, and shipping MCP servers.

Written in CoffeeScript.

FastMCP already exists.

## Status

Bootstrap phase. The framework does not exist yet.

What exists is the proof that it can: a CoffeeScript build that produces clean
ESM with working source maps and TypeScript declarations, a packed-tarball
consumer that installs without CoffeeScript, and two baseline `greet` servers —
one on the official MCP SDK, one on FastMCP — driven by the same official MCP
Client assertions.

See `BOOTSTRAP_FINDINGS.md` and `BASELINE_FINDINGS.md`.

## Origin

AI is writing so much code these days. So I wrote SlowMCP in a dead language AI
doesn't know: CoffeeScript. Let's see if THAT cuts down on the AI-generated pull
requests.

## Roadmap

- Tools, resources, and prompts
- stdio and Streamable HTTP
- Protocol-backed test harness
- `slowmcp check`
- Reference implementations
- GitHub Pages documentation
- **TypeScript support: never.**
