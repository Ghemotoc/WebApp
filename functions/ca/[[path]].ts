/**
 * Cloudflare Pages Function for every address under /ca/: the website pages of this market, such
 * as "/ca/en/help" (bundle LOCALISE-1).
 *
 * The file's name is what makes Cloudflare run it for this country's addresses only; the work is
 * in server/localised-page-function.ts, shared by every market's file.
 */
export { onRequestGet } from '../../server/localised-page-function';
