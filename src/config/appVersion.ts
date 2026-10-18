/**
 * appVersion: which build of the app is running (story S1-E1-05).
 *
 * Who reads it: the error reporter (src/features/errors/lib/buildErrorReport.ts), so an error in
 * the log can be matched to the code that caused it.
 * Where the value comes from: vite.config.ts sets VITE_APP_VERSION at build time to the first
 * seven characters of the commit Cloudflare Pages built (CF_PAGES_COMMIT_SHA), or to "local" for a
 * build on a developer's machine.
 */

/** The build's version: a short commit ID on Cloudflare, "local" elsewhere. */
export const appVersion: string = import.meta.env.VITE_APP_VERSION ?? 'local';
