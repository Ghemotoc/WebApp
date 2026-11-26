/**
 * useStaleBuildReload: reloads a page that failed because its code file belongs to an older
 * release (BUGS thread, 26 Nov 2026; see lib/staleBuild.ts for why it happens).
 *
 * Who calls it: components/ErrorPage.tsx.
 * What it calls next: lib/staleBuild.ts, which reloads at most once in a short window.
 */
import { useState } from 'react';

import { isStaleBuildError, reloadOnceForNewRelease } from '../lib/staleBuild';

/**
 * Decides once, when the error page first draws, whether to reload for a newer release.
 *
 * @param thrown - what the page threw
 * @returns true while the page is reloading (draw nothing), false to show the error page
 */
export function useStaleBuildReload(thrown: unknown): boolean {
  // Decided in the first draw, so the error page never flashes before the reload. React may draw
  // twice in development; the second try is refused by the reload window and changes nothing.
  const [isReloading] = useState(() => isStaleBuildError(thrown) && reloadOnceForNewRelease());
  return isReloading;
}
