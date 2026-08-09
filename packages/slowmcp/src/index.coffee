# SlowMCP root export: the authoring API, and nothing else.
#
# Transports, the test harness, and the protocol policy live on their own
# subpaths. They are not re-exported here for convenience: what an application
# imports should say what it does.

export { createServer } from './server/create-server.js'
export { text } from './results/text.js'
export { SlowMcpError } from './errors/slowmcp-error.js'

export version = '0.1.0-slice.1'
