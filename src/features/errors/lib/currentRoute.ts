/**
 * currentRoute: remembers the route pattern of the page on screen, for error reports that happen
 * outside React (story S1-E1-05).
 *
 * Who writes it: hooks/useTrackRoutePattern.ts, on every page change.
 * Who reads it: lib/buildErrorReport.ts, when a global error or a failed promise is reported.
 * Before the first page has drawn it answers "/", never the raw address, which could hold a code.
 */

/** The pattern of the page on screen. */
let currentRoutePattern = '/';

/**
 * Records the page now on screen.
 *
 * @param pattern - the route pattern from lib/routePattern.ts, for example "/join/:code"
 */
export function setCurrentRoutePattern(pattern: string): void {
  currentRoutePattern = pattern;
}

/**
 * Says which page is on screen.
 *
 * @returns the route pattern, "/" before the first page has drawn
 */
export function getCurrentRoutePattern(): string {
  return currentRoutePattern;
}
