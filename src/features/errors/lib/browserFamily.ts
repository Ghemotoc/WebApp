/**
 * browserFamily: which kind of browser this is, without its version or the rest of the user agent
 * (story S1-E1-05; GDPR art. 5(1)(c): the full user agent helps fingerprint a person, the family
 * alone doesn't).
 *
 * Who calls it: lib/buildErrorReport.ts.
 * What it calls: nothing. The database accepts the same list of families and stores "other" for
 * anything else (public.report_client_error).
 */

/** The families the error log knows. */
export type BrowserFamily =
  'chrome' | 'edge' | 'firefox' | 'safari' | 'opera' | 'samsung_internet' | 'other';

/**
 * The checks, in order. Order matters: Edge, Opera and Samsung Internet also say "Chrome" in their
 * user agent, and Chrome also says "Safari", so the more specific names come first.
 */
const familyChecks: { family: BrowserFamily; marker: RegExp }[] = [
  { family: 'edge', marker: /Edg(e|A|iOS)?\// },
  { family: 'opera', marker: /OPR\/|Opera/ },
  { family: 'samsung_internet', marker: /SamsungBrowser\// },
  { family: 'firefox', marker: /Firefox\/|FxiOS\// },
  { family: 'chrome', marker: /Chrome\/|CriOS\/|Chromium\// },
  { family: 'safari', marker: /Safari\// },
];

/**
 * Names the browser family from a user agent string.
 *
 * @param userAgent - navigator.userAgent
 * @returns the family, or "other" when none matches
 */
export function browserFamily(userAgent: string): BrowserFamily {
  const match = familyChecks.find((check) => check.marker.test(userAgent));
  return match?.family ?? 'other';
}
