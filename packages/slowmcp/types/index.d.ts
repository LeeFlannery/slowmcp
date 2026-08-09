/**
 * Handwritten declarations for the compiled CoffeeScript artifact.
 *
 * CoffeeScript does not emit declarations, so this file is a public
 * specification that must be verified from outside the package.
 */

/** The package version, exported for diagnostics. */
export declare const version: string;

/** Returns a deterministic greeting. Throws `TypeError` on invalid input. */
export declare function greet(name: string): string;

/** Always throws. Exists so source-map behaviour can be verified. */
export declare function detonate(): never;
