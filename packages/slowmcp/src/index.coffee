# SlowMCP root export.
#
# The public surface is deliberately small. Every export here is part of the
# type contract and must have a matching declaration in `types/index.d.ts`.

export { createServer } from './server/create-server.js'
export { text } from './results/text.js'
export { createHttpHandler } from './transports/http.js'
export { testServer } from './testing/test-server.js'
export { protocolPolicy, satisfiesProtocolPolicy, assertProtocolPolicy } from './protocol/compatibility.js'
export { SlowMcpError } from './errors/slowmcp-error.js'

export version = '0.1.0-slice.0'
