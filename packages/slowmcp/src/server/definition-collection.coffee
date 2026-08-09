# The registry contract, in one place, for one kind of capability.
#
# Every capability kind follows the same four steps:
#
#   1. validate the definition;
#   2. reject a duplicate public name;
#   3. append in deterministic insertion order;
#   4. produce an immutable snapshot.
#
# Tools are the only kind implemented today. Resources and prompts will reuse
# this collection rather than reimplementing the sequence, which is the whole
# reason it is extracted.

import { SlowMcpError } from '../errors/slowmcp-error.js'

export class DefinitionCollection
  # kind:     capability noun used in error messages, for example 'tool'
  # validate: (definition) -> normalized definition, or throws SlowMcpError
  constructor: (@kind, @validate) ->
    @_items = new Map()

  add: (definition = {}) ->
    validated = @validate definition

    if @_items.has validated.name
      throw new SlowMcpError(
        "#{@kind}('#{validated.name}') is already defined",
        'SLOWMCP_DUPLICATE_DEFINITION'
      )

    @_items.set validated.name, Object.freeze validated
    validated

  has: (name) -> @_items.has name

  size: -> @_items.size

  # Insertion order is part of the contract: snapshots must be deterministic.
  values: -> Array.from @_items.values()

  snapshot: -> Object.freeze Array.from @_items.values()
