import { createServer, text } from 'slowmcp'
import * as z from 'zod'

export const app = createServer({
  name: 'hello-tool',
  version: '1.0.0'
})

app.tool({
  name: 'greet',
  description: 'Greet someone by name.',
  input: z.object({
    name: z.string().min(1).describe('Who to greet.')
  }),
  handler: ({ name }) => text(`Hello, ${name}!`)
})

export default app
