import { DefinitionRegistry } from './definition-registry.js'

# The application object. Definitions first: this holds no protocol connection
# and no server instance, so the same app can be served over any transport and
# rebuilt fresh per request.
export createServer = (metadata) ->
  registry = new DefinitionRegistry metadata

  app =
    name: registry.name
    version: registry.version

    tool: (definition) ->
      registry.addTool definition
      app

    # Immutable definition snapshot, used to build fresh official servers.
    snapshot: -> registry.snapshot()

    # Handler-free diagnostics for tests and the CLI.
    describe: -> registry.describe()

  app
