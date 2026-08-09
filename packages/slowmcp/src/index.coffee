# Bootstrap artifact-proof module.
#
# This is deliberately not the SlowMCP public API. It exists so the build,
# declaration, packaging, and source-map seams can be verified before any
# framework code is written.

export version = '0.0.0-bootstrap.0'

export greet = (name) ->
  unless typeof name is 'string' and name.length > 0
    throw new TypeError 'greet(name) requires a non-empty string'
  "Hello, #{name}."

# Used only by the source-map eval: the thrown stack frame must resolve back
# to this file and this line.
export detonate = ->
  throw new Error 'detonated'
