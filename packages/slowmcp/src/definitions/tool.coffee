# Validation for one capability kind. The registry contract itself lives in
# `DefinitionCollection`; this file only decides what a valid tool looks like.

import { SlowMcpError } from '../errors/slowmcp-error.js'

isNonEmptyString = (value) ->
  typeof value is 'string' and value.trim().length > 0

isStandardSchema = (value) ->
  value? and typeof value is 'object' and value['~standard']?.version is 1

export validateTool = (definition = {}) ->
  { name, description, input, handler } = definition

  unless isNonEmptyString name
    throw new SlowMcpError 'tool({ name }) requires a non-empty string', 'SLOWMCP_INVALID_DEFINITION'
  unless typeof handler is 'function'
    throw new SlowMcpError "tool('#{name}') requires a handler function", 'SLOWMCP_INVALID_DEFINITION'
  if description? and not isNonEmptyString description
    throw new SlowMcpError(
      "tool('#{name}') description must be a non-empty string when provided",
      'SLOWMCP_INVALID_DEFINITION'
    )
  if input? and not isStandardSchema input
    throw new SlowMcpError(
      "tool('#{name}') input must be a Standard Schema validator (for example a Zod object)",
      'SLOWMCP_INVALID_DEFINITION'
    )

  { name, description, input, handler }
