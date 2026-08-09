# Stores server metadata and capability definitions. No MCP wire behavior
# belongs here: this is a validated, ordered, immutable-on-read record that
# `buildMcpServer` turns into an official server instance.

import { SlowMcpError } from '../errors/slowmcp-error.js'

isNonEmptyString = (value) ->
  typeof value is 'string' and value.trim().length > 0

isStandardSchema = (value) ->
  value? and typeof value is 'object' and value['~standard']?.version is 1

export class DefinitionRegistry
  constructor: (metadata = {}) ->
    unless isNonEmptyString metadata.name
      throw new SlowMcpError 'createServer({ name }) requires a non-empty string', 'SLOWMCP_INVALID_METADATA'
    unless isNonEmptyString metadata.version
      throw new SlowMcpError 'createServer({ version }) requires a non-empty string', 'SLOWMCP_INVALID_METADATA'

    @name = metadata.name
    @version = metadata.version
    # Insertion order is part of the contract: snapshots must be deterministic.
    @_tools = new Map()

  addTool: (definition = {}) ->
    { name, description, input, handler } = definition

    unless isNonEmptyString name
      throw new SlowMcpError 'tool({ name }) requires a non-empty string', 'SLOWMCP_INVALID_DEFINITION'
    unless typeof handler is 'function'
      throw new SlowMcpError "tool('#{name}') requires a handler function", 'SLOWMCP_INVALID_DEFINITION'
    if description? and not isNonEmptyString description
      throw new SlowMcpError "tool('#{name}') description must be a non-empty string when provided", 'SLOWMCP_INVALID_DEFINITION'
    if input? and not isStandardSchema input
      throw new SlowMcpError(
        "tool('#{name}') input must be a Standard Schema validator (for example a Zod object)",
        'SLOWMCP_INVALID_DEFINITION'
      )
    if @_tools.has name
      throw new SlowMcpError "tool('#{name}') is already defined", 'SLOWMCP_DUPLICATE_DEFINITION'

    @_tools.set name, Object.freeze { name, description, input, handler }
    this

  # An immutable snapshot. Fresh official server instances are built from this,
  # so later mutation of the registry cannot alter a server already serving.
  snapshot: ->
    Object.freeze
      name: @name
      version: @version
      tools: Object.freeze Array.from @_tools.values()

  # Safe diagnostics for tests and the CLI. Never includes handlers.
  describe: ->
    name: @name
    version: @version
    tools: (({ name, description }) -> { name, description }) tool for tool in Array.from @_tools.values()
