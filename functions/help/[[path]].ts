/**
 * Cloudflare Pages Function for every address under /help (story S1-E11-37; bundle SEO-1b).
 *
 * [[path]] matches /help and everything below it. A help page at /help/<address> gets its search
 * and share tags from server/website-head.ts (the live page of the visitor's market, or noindex
 * for an unknown address); the help centre itself at /help goes out as it is.
 * Settings: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, as functions/index.ts.
 */
import { withSecurityHeaders } from '../../server/security-headers';
import { websitePageAnswer, type WebsitePagesContext } from '../../server/website-head-function';

/**
 * Answers GET /help….
 *
 * @param context - Cloudflare's request context
 * @returns the app's page, with the help page's search and share tags where there is one
 */
export const onRequestGet = async (context: WebsitePagesContext): Promise<Response> => {
  // The security headers (QA-1c): Cloudflare's _headers file doesn't reach a function's answer.
  return withSecurityHeaders(await websitePageAnswer(context), context.env.VITE_SUPABASE_URL ?? '');
};
