# SlowMCP

**Blazingly adequate.**

A modern framework for building, testing, and shipping MCP servers.

Written in CoffeeScript.

FastMCP already exists.

## Quickstart

```js
import { createServer, text } from 'slowmcp'
import * as z from 'zod'

export const app = createServer({ name: 'hello-tool', version: '1.0.0' })

app.tool({
  name: 'greet',
  description: 'Greet someone by name.',
  input: z.object({ name: z.string().min(1) }),
  handler: ({ name }) => text(`Hello, ${name}!`)
})
```

Test it through a real MCP client:

```js
import { testServer } from 'slowmcp'
import app from './server.mjs'

const mcp = testServer(app)

await mcp.protocolVersion()          // '2026-07-28', asserted, not assumed
await mcp.tools()                    // [{ name: 'greet', ... }]
await mcp.call('greet', { name: 'Lee' })

await mcp.close()
```

`testServer` is a real official MCP `Client` over the official Streamable HTTP
transport. It states the protocol negotiation it wants, checks what actually
got negotiated, and throws if the connection falls outside SlowMCP's declared
policy. That check exists because the obvious way to write this harness by hand
silently connects one protocol generation behind, and passes.

Serve it:

```js
import { createHttpHandler } from 'slowmcp'
export default createHttpHandler(app)
```

## Ship it

```sh
slowmcp check
```

```text
SLOWMCP CHECK

PASS package
PASS protocol
PASS tools
PASS invocation
PASS types
PASS coffeescript-containment

6/6 checks passed.

Blazingly adequate.
```

It packs the package, installs the tarball into a clean project, and verifies
it from the outside: protocol negotiation, discovery, invocation, the shipped
TypeScript declarations, and the absence of CoffeeScript.

## Status

Vertical slice. Tools, Streamable HTTP, and the test harness work end to end
from the packed artifact. Resources, prompts, stdio, and the full CLI are not
built yet.

See [`ARCHITECTURE.md`](ARCHITECTURE.md), and
[`docs/bootstrap-2026-08.md`](docs/bootstrap-2026-08.md) for what the bootstrap
phase turned up.

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
