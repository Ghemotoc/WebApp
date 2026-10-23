/**
 * routePattern: turns the address of the current page into its route pattern, so an error report
 * says which page broke without the codes or names inside the address (story S1-E1-05).
 *
 * Who calls it: hooks/useTrackRoutePattern.ts (on every page change) and
 * components/ErrorPage.tsx. For example "/join/AB12CD" becomes "/join/:code" and an unknown
 * "/my-old-story-title" becomes "/:unknown".
 * What it calls: nothing. The query string and the hash are never part of a pathname, and the
 * database strips them again (public.scrub_route_path) in case a report arrives some other way.
 */

/** React Router's name for the part of an address that matched a catch-all route ("*"). */
const catchAllParameter = '*';

/**
 * Replaces each matched value in the address with the name of its route parameter.
 *
 * @param pathname - the page's path, for example "/join/AB12CD" (never with ? or #)
 * @param parameters - React Router's params for that page, for example { code: 'AB12CD' }
 * @returns the route pattern, for example "/join/:code"
 */
export function routePattern(
  pathname: string,
  parameters: Readonly<Record<string, string | undefined>>,
): string {
  const segments = pathname.split('/');

  // Step 1: a catch-all route (the "page not found" route) can match any number of segments, so
  // everything it matched becomes one ":unknown".
  const caughtPath = parameters[catchAllParameter];
  if (caughtPath !== undefined && caughtPath !== '') {
    const caughtSegmentCount = caughtPath.split('/').length;
    segments.splice(segments.length - caughtSegmentCount, caughtSegmentCount, ':unknown');
  }

  // Step 2: every named parameter replaces the segment that holds its value.
  for (const [name, value] of Object.entries(parameters)) {
    if (name === catchAllParameter || value === undefined || value === '') continue;
    replaceSegment(segments, value, `:${name}`);
  }
  return segments.join('/') || '/';
}

/**
 * Swaps the first segment equal to the value (or to its encoded form) for the placeholder.
 *
 * @param segments - the address split on "/", changed in place
 * @param value - the parameter's decoded value
 * @param placeholder - for example ":code"
 */
function replaceSegment(segments: string[], value: string, placeholder: string): void {
  const index = segments.findIndex(
    (segment) => segment === value || segment === encodeURIComponent(value),
  );
  if (index !== -1) segments[index] = placeholder;
}
