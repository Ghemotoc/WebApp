/**
 * useTrackRoutePattern: keeps lib/currentRoute.ts up to date with the page on screen
 * (story S1-E1-05).
 *
 * Who calls it: AppLayout (src/app/shell/AppLayout.tsx), which wraps every page.
 * What it calls: React Router's location and params, then lib/routePattern.ts. Only the pattern
 * is kept ("/join/:code"), never the address itself, so an error report can't carry a code.
 */
import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router';

import { setCurrentRoutePattern } from '../lib/currentRoute';
import { routePattern } from '../lib/routePattern';

/**
 * Records the route pattern whenever the page changes.
 *
 * @returns the current route pattern, for callers that want it too
 */
export function useTrackRoutePattern(): string {
  const { pathname } = useLocation();
  const parameters = useParams();
  const pattern = routePattern(pathname, parameters);

  useEffect(() => {
    setCurrentRoutePattern(pattern);
  }, [pattern]);

  return pattern;
}
