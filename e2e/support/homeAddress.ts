/**
 * The home page's address, for journeys that end on it (LOCALISE-1).
 *
 * Who calls it: any spec that checks "the person landed on the home page".
 * What it calls next: nothing; it only holds the patterns.
 *
 * Why it exists: since LOCALISE-1 (Robert, 11 Nov 2026, 19:27 UTC) every website page lives at
 * /<country>/<language>/..., so "/" forwards to the visitor's own place ("/ro/en"). A journey can
 * be seen on either address, depending on whether the forward has happened yet, so both count as
 * the home page.
 */

/** The end of a home page address: "/" before the forward, "/ro/en" (or "/se/sv") after it. */
export const homeAddressPattern = /\/$|\/[a-z]{2}\/[a-z]{2}$/;

/**
 * The whole home page address on this website and no other: used where a journey must prove it
 * stayed on our own site (the log-in page never follows `next` to another website).
 */
export const ownHomeAddressPattern = /^http:\/\/[^/]+\/([a-z]{2}\/[a-z]{2})?$/;
