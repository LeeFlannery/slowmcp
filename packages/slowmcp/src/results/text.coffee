import { SlowMcpError } from '../errors/slowmcp-error.js'

# Returns an ordinary MCP result. Raw result objects remain valid everywhere a
# helper is accepted; this exists to remove boilerplate, not to become the only
# way to produce a result.
export text = (value) ->
  unless typeof value is 'string'
    throw new SlowMcpError 'text(value) requires a string', 'SLOWMCP_INVALID_RESULT'

  content: [{ type: 'text', text: value }]
