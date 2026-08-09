// The public surface, restated independently of the package's own declarations
// and independently of the packed-consumer probe.
//
// This list is deliberately NOT derived from anything. Its whole value is being
// a second opinion: the subpaths under test are enumerated from the export map,
// but what each one must export is asserted from here, so a rename that updates
// the sources and the declarations together still fails.
export const EXPECTED_SURFACE = {
  slowmcp: ['SlowMcpError', 'createServer', 'text', 'version'],
  'slowmcp/http': ['createHttpHandler'],
  'slowmcp/testing': ['testServer'],
  'slowmcp/protocol': ['assertProtocolPolicy', 'protocolPolicy', 'satisfiesProtocolPolicy']
}
