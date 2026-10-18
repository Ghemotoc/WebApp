/**
 * openDuringMaintenance: the pages that stay open while maintenance mode is on (story S1-E1-05).
 *
 * Who calls it: components/MaintenanceGate.tsx.
 * Why these:
 * - Log in, forgotten and new password, and the email link's landing page: "staff can still sign
 *   in" (acceptance criterion), and staff sign in through the normal log-in until S1-E2-07b.
 * - The Legal centre: the terms, the privacy notice and the contact points must stay reachable
 *   (DSA art. 11 and 12: contact points easily accessible), so it is never closed.
 */

/** Pages open during maintenance, matched exactly. */
const openPaths = new Set(['/sign-in', '/forgot-password', '/reset-password', '/auth/confirm']);

/** Sections open during maintenance, matched by their start. */
const openSections = ['/legal'];

/**
 * Says whether a page stays open while maintenance mode is on.
 *
 * @param pathname - the page's path, for example "/legal/terms"
 * @returns true when everyone may still open it
 */
export function isOpenDuringMaintenance(pathname: string): boolean {
  if (openPaths.has(pathname)) return true;
  return openSections.some((section) => pathname === section || pathname.startsWith(`${section}/`));
}
