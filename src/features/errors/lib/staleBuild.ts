/**
 * staleBuild: spots a page that failed because the browser still runs an older release, and
 * reloads it once by itself (BUGS thread, 26 Nov 2026: pages sometimes showed "Something went
 * wrong" with an error code on first open and worked after "Try again").
 *
 * Why it happens: every page's code is a separate file whose name changes with each release
 * (src/app/router.tsx loads them only when someone opens the page). A tab opened before a release
 * still asks for the old file names. Cloudflare Pages no longer has them and answers with the app's
 * index.html instead (public/_redirects), so the browser can't load the page's code. A fresh load
 * fetches the new file list, which is why "Try again" worked.
 *
 * Who calls it: components/ErrorPage.tsx (a page that failed to draw) and
 * lib/installGlobalErrorHandlers.ts (Vite's `vite:preloadError` event, when a file a page needs
 * fails to load).
 * Offline it never reloads: the file failed for want of a connection, and a reload would only show
 * the browser's own offline page.
 * What it calls next: window.location.reload(), at most once in a short window, so a page that
 * really is broken can never reload forever; then the error page shows as before.
 */

/** Where this tab remembers when it last reloaded for a stale release (this tab only). */
export const staleBuildReloadKey = 'staleBuildReloadAt';

/**
 * How long after an automatic reload another one is refused. If the page fails again this soon,
 * the reload didn't help, so the error page shows instead of a loop.
 */
export const staleBuildReloadWindowMs = 30_000;

/**
 * The messages browsers give when a page's code file can't be loaded. Chrome, Edge and Firefox
 * word it differently from Safari; a file answered with index.html gives the MIME type message.
 */
const staleBuildMessages = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'importing a module script failed',
  'is not a valid javascript mime type',
  'unable to preload css',
];

/**
 * Says whether an error means "this page's code file could not be loaded".
 *
 * @param thrown - anything that was thrown
 * @returns true for a failed page-code download, false for any other error
 */
export function isStaleBuildError(thrown: unknown): boolean {
  // Step 1: take the message, whatever shape the error came in.
  let message = '';
  if (thrown instanceof Error) message = thrown.message;
  else if (typeof thrown === 'string') message = thrown;
  // Step 2: compare it, ignoring case, with the browsers' wordings.
  const lowerMessage = message.toLowerCase();
  return staleBuildMessages.some((wording) => lowerMessage.includes(wording));
}

/**
 * Reloads the page once to pick up the newest release, unless this tab already did so a moment
 * ago.
 *
 * @param reloadPage - what reloads the page (tests pass their own)
 * @param storage - where the last reload time is kept (tests pass their own)
 * @param now - the current time in milliseconds (tests pass their own)
 * @param isOnline - whether the browser has a connection (tests pass their own)
 * @returns true when a reload was started, false when it was refused (show the error instead)
 */
export function reloadOnceForNewRelease(
  reloadPage: () => void = () => window.location.reload(),
  storage: Storage | null = readSessionStorage(),
  now: number = Date.now(),
  isOnline: boolean = readOnlineState(),
): boolean {
  // Step 0: offline, a file fails because there is no connection, not because the release is old.
  // A reload then swaps the page, and its offline banner (S1-E1-05), for the browser's own
  // "no internet" page, so leave the page as it is.
  if (!isOnline) return false;
  // Step 1: without somewhere to remember the reload, a loop can't be ruled out, so don't reload.
  if (storage === null) return false;
  // Step 2: refuse if this tab reloaded for the same reason a moment ago.
  const lastReloadAt = Number(safeRead(storage) ?? 0);
  if (now - lastReloadAt < staleBuildReloadWindowMs) return false;
  // Step 3: remember the time, then reload.
  try {
    storage.setItem(staleBuildReloadKey, String(now));
  } catch {
    return false;
  }
  reloadPage();
  return true;
}

/**
 * Says whether the browser thinks it has a connection; true where the browser can't tell.
 *
 * @returns navigator.onLine, or true outside a browser
 */
function readOnlineState(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/**
 * Reads the last reload time, treating a blocked storage as "never".
 *
 * @param storage - the tab's session storage
 * @returns the stored time as text, or null
 */
function safeRead(storage: Storage): string | null {
  try {
    return storage.getItem(staleBuildReloadKey);
  } catch {
    return null;
  }
}

/**
 * Finds the tab's session storage; private windows and blocked site data can refuse it.
 *
 * @returns the storage, or null when the browser refuses it
 */
function readSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
