/**
 * The Cloudflare Pages Function behind every website address that starts with a country and
 * language, such as "/se/sv/help/reporting" (bundle LOCALISE-1; Robert, 11 Nov 2026).
 *
 * Why one file per market: Cloudflare only runs a function for the addresses its file name
 * matches. A file named for the country ("functions/se/[[path]].ts") matches "/se/…" and nothing
 * else, so the rest of the site (the app's pages and files) never passes through a function. Each
 * of those files only re-exports onRequestGet from here. Adding a market means adding its file;
 * until then its pages still open in the app, only without their search and share tags
 * (docs/code-tour.md, "Website addresses").
 * What it does: a landing page ("/se/sv/c/<name>") gets its link preview, the home page and a
 * help page get their search and share tags, and any other address under the country goes out as
 * the app's page, unchanged.
 * Who calls it: functions/<country>/[[path]].ts. What it calls: server/landing-preview.ts and
 * server/website-head-function.ts.
 */
import { fetchLandingPreview, handleLandingLink, parseLandingAddress } from './landing-preview.ts';
import { withSecurityHeaders } from './security-headers.ts';
import { parseWebsiteAddress } from './website-head.ts';
import { websitePageAnswer, type WebsitePagesContext } from './website-head-function.ts';

/**
 * Builds the answer for one address under a country.
 *
 * @param context - Cloudflare's request context
 * @returns the app's page, with tags where the address is a website page
 */
async function localisedAnswer(context: WebsitePagesContext): Promise<Response> {
  const { pathname } = new URL(context.request.url);
  // The app's index.html, the page every address of the single-page app starts from.
  const fetchIndexHtml = () =>
    context.env.ASSETS.fetch(new Request(new URL('/', context.request.url)));
  // Step 1: a landing page has a link preview of its own (S1-E11-14).
  if (parseLandingAddress(pathname) !== null) {
    const settings = {
      supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
      anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
    };
    return handleLandingLink(context.request, {
      fetchIndexHtml,
      findPreview: (slug) => fetchLandingPreview(settings, slug),
    });
  }
  // Step 2: the home page and help pages get their search and share tags (S1-E11-37).
  if (parseWebsiteAddress(pathname) !== null) return websitePageAnswer(context);
  // Step 3: anything else (the help centre, an unknown address) is the app's page as it is.
  return fetchIndexHtml();
}

/**
 * Answers GET /<country>/….
 *
 * @param context - Cloudflare's request context
 * @returns the answer with the security headers
 */
export const onRequestGet = async (context: WebsitePagesContext): Promise<Response> => {
  // The security headers (QA-1c): Cloudflare's _headers file doesn't reach a function's answer.
  return withSecurityHeaders(await localisedAnswer(context), context.env.VITE_SUPABASE_URL ?? '');
};
