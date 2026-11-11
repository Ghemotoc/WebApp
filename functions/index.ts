/**
 * Cloudflare Pages Function for the home page at "/" (story S1-E11-37; bundle SEO-1b).
 *
 * Cloudflare runs every file under functions/ next to the built site; index.ts matches "/" only.
 * The logic lives in server/website-head.ts, shared with local development and the tests: it
 * takes the app's index.html, asks website_content() for the live home page of the visitor's
 * market and writes the search and share tags into the page. The app then starts in the browser
 * as on any other address.
 * Settings: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, the same public values the app is built
 * with (as functions/s/[[path]].ts). Without them the page goes out without tags.
 */
import { withSecurityHeaders } from '../server/security-headers';
import { websitePageAnswer, type WebsitePagesContext } from '../server/website-head-function';

/**
 * Answers GET /.
 *
 * @param context - Cloudflare's request context
 * @returns the app's page with the home page's search and share tags
 */
export const onRequestGet = async (context: WebsitePagesContext): Promise<Response> => {
  // The security headers (QA-1c): Cloudflare's _headers file doesn't reach a function's answer.
  return withSecurityHeaders(await websitePageAnswer(context), context.env.VITE_SUPABASE_URL ?? '');
};
