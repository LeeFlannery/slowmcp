# The single place SlowMCP states what protocol it speaks.
#
# This is deliberately a SlowMCP-owned literal and not derived from the SDK.
# `LATEST_PROTOCOL_VERSION` is '2025-11-25' and `SUPPORTED_PROTOCOL_VERSIONS`
# omits 2026-07-28 entirely, because the modern era is a separate axis reached
# through the discovery probe. Anything derived from those constants certifies
# the wrong era while passing.
#
# Changing this object changes what SlowMCP claims to support. That should be a
# visible diff, never a side effect of an upstream default moving.

import { SlowMcpError } from '../errors/slowmcp-error.js'

export protocolPolicy = Object.freeze
  # What the official client is told to do.
  negotiation: 'auto'
  # What the connection must actually have negotiated to be acceptable.
  accepts: Object.freeze ['2026-07-28']
  # The revision SlowMCP is built and tested against.
  preferred: '2026-07-28'

export satisfiesProtocolPolicy = (negotiated) ->
  negotiated in protocolPolicy.accepts

export assertProtocolPolicy = (negotiated, context = 'connection') ->
  return negotiated if satisfiesProtocolPolicy negotiated

  accepted = protocolPolicy.accepts.join ', '
  throw new SlowMcpError(
    "#{context} negotiated MCP protocol #{negotiated ? '(none)'}, " +
      "which is outside SlowMCP's compatibility policy (accepts: #{accepted}). " +
      'This usually means the client negotiated an older revision by default.',
    'SLOWMCP_PROTOCOL_POLICY'
  )
