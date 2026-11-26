/**
 * installGlobalErrorHandlers: reports errors that nothing in the app caught (story S1-E1-05).
 *
 * Who calls it: src/main.tsx, once, before the app draws.
 * What it calls next: lib/errorReporter.ts.
 * What it catches: errors thrown outside React's drawing (a click handler, a timer) and promises
 * that failed without a .catch. Errors while a page draws are caught by the router instead and
 * shown on components/ErrorPage.tsx. Errors the app already handles (a failed read shown as a
 * message) are not reported: people already see what happened, and the log stays for surprises.
 * It also listens for Vite's `vite:preloadError` (a file a page needs could not load, usually
 * because the tab runs an older release) and reloads the page once (lib/staleBuild.ts; BUGS
 * thread, 26 Nov 2026).
 */
import { reportError } from './errorReporter';
import { reloadOnceForNewRelease } from './staleBuild';

/** Whether the handlers are already in place, so a second call adds nothing. */
let isInstalled = false;

/**
 * Starts listening for uncaught errors and failed promises.
 *
 * @param target - the window to listen on (tests pass their own)
 */
export function installGlobalErrorHandlers(target: Window = window): void {
  if (isInstalled) return;
  isInstalled = true;

  // An error thrown and not caught anywhere.
  target.addEventListener('error', (event: ErrorEvent) => {
    void reportError(event.error ?? event.message);
  });

  // A file a page needs belongs to an older release: reload once for the new one. When the reload
  // is refused (it already happened a moment ago), the error goes on to the error page as before.
  target.addEventListener('vite:preloadError', (event: Event) => {
    if (reloadOnceForNewRelease()) event.preventDefault();
  });

  // A promise that failed without anyone handling it.
  target.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    void reportError(event.reason);
  });
}
