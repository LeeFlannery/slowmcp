export class SlowMcpError extends Error
  constructor: (message, code = 'SLOWMCP_ERROR') ->
    super message
    @name = 'SlowMcpError'
    @code = code
