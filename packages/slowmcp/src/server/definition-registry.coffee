# Stores server metadata and capability definitions. No MCP wire behavior
# belongs here.
#
# Each capability kind is one `DefinitionCollection`, so resources and prompts
# will be added as sibling collections rather than as new bespoke code paths.

import { DefinitionCollection } from './definition-collection.js'
import { SlowMcpError } from '../errors/slowmcp-error.js'
import { validateTool } from '../definitions/tool.js'

isNonEmptyString = (value) ->
  typeof value is 'string' and value.trim().length > 0

export class DefinitionRegistry
  constructor: (metadata = {}) ->
    unless isNonEmptyString metadata.name
      throw new SlowMcpError 'createServer({ name }) requires a non-empty string', 'SLOWMCP_INVALID_METADATA'
    unless isNonEmptyString metadata.version
      throw new SlowMcpError 'createServer({ version }) requires a non-empty string', 'SLOWMCP_INVALID_METADATA'

    @name = metadata.name
    @version = metadata.version
    @tools = new DefinitionCollection 'tool', validateTool

  addTool: (definition) ->
    @tools.add definition
    this

  # An immutable snapshot. Fresh official server instances are built from this,
  # so later registration cannot alter a handler that is already serving.
  snapshot: ->
    Object.freeze
      name: @name
      version: @version
      tools: @tools.snapshot()

  # Safe diagnostics for tests and the CLI. Never includes handlers.
  describe: ->
    name: @name
    version: @version
    tools: ({ name: tool.name, description: tool.description } for tool in @tools.values())
