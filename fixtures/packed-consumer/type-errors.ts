// Negative type fixtures. Every `@ts-expect-error` must actually error, or the
// declaration surface has silently widened. `tsc` reports TS2578 for any
// directive that turns out to be unnecessary, so this file fails loudly in
// both directions.
import { createServer, text } from 'slowmcp'
import { testServer } from 'slowmcp/testing'
import * as z from 'zod'

const app = createServer({ name: 'greeter', version: '1.0.0' })

// --- authoring API ----------------------------------------------------------

// @ts-expect-error createServer requires a version
createServer({ name: 'greeter' })

// @ts-expect-error createServer requires metadata
createServer()

// @ts-expect-error a tool needs a handler
app.tool({ name: 'greet' })

// @ts-expect-error a tool needs a name
app.tool({ handler: () => text('hi') })

app.tool({
  name: 'greet',
  input: z.object({ name: z.string() }),
  handler: (input) => {
    // @ts-expect-error `age` is not in the schema
    void input.age
    // @ts-expect-error `name` is a string, not a number
    const wrong: number = input.name
    void wrong
    return text('ok')
  }
})

app.tool({
  name: 'boolean-input',
  input: z.object({ loud: z.boolean() }),
  // @ts-expect-error the handler destructures a field the schema does not have
  handler: ({ volume }) => text(String(volume))
})

// @ts-expect-error text() takes a string
text(42)

// @ts-expect-error a handler must return a tool result, not a bare string
app.tool({ name: 'bare', handler: () => 'not a result' })

// --- subpath boundaries -----------------------------------------------------

// @ts-expect-error createHttpHandler lives on slowmcp/http, not the root
export { createHttpHandler } from 'slowmcp'

// @ts-expect-error testServer lives on slowmcp/testing, not the root
export { testServer as rootTestServer } from 'slowmcp'

// @ts-expect-error protocolPolicy lives on slowmcp/protocol, not the root
export { protocolPolicy } from 'slowmcp'

// @ts-expect-error createServer is the root export, not a slowmcp/http export
export { createServer as httpCreateServer } from 'slowmcp/http'

// @ts-expect-error there is no slowmcp/stdio subpath yet
export { serveStdio } from 'slowmcp/stdio'

// @ts-expect-error the package exports no resource API yet
export { resource } from 'slowmcp'

// --- testing harness --------------------------------------------------------

// @ts-expect-error testServer needs an app, not a string
testServer('greeter')

const mcp = testServer(app)

// @ts-expect-error call() arguments must be an object
mcp.call('greet', 'Lee')

// @ts-expect-error client() is a method, not a property, because connection is lazy
void mcp.client.getServerVersion

// @ts-expect-error protocolVersion() is a method, not a property
const version: string = mcp.protocolVersion
void version
