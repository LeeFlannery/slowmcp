/**
 * `slowmcp/protocol` type contract.
 *
 * Handwritten. Verified from outside the package against the packed tarball.
 */

/**
 * SlowMCP's declared protocol compatibility.
 *
 * Owned by SlowMCP and never derived from SDK version constants. The SDK
 * exports `LATEST_PROTOCOL_VERSION` as an older revision and omits the modern
 * one from `SUPPORTED_PROTOCOL_VERSIONS` entirely, because the modern era is a
 * separate axis reached through the discovery probe. Anything derived from
 * those constants certifies the wrong era while passing.
 */
export interface ProtocolPolicy {
  /** Negotiation mode requested of the official client. */
  readonly negotiation: 'auto' | 'legacy'
  /** Revisions a connection may have negotiated and still be accepted. */
  readonly accepts: readonly string[]
  /** The revision SlowMCP is built and tested against. */
  readonly preferred: string
}

/** Frozen, so a dependency cannot widen SlowMCP's claims at runtime. */
export declare const protocolPolicy: ProtocolPolicy

export declare function satisfiesProtocolPolicy(negotiated: string | undefined): boolean

/** Returns the revision, or throws `SlowMcpError` if it violates the policy. */
export declare function assertProtocolPolicy(
  negotiated: string | undefined,
  context?: string
): string
