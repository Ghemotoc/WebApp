/**
 * The Cloudflare side of the website pages' head tags (story S1-E11-37; bundle SEO-1b): the one
 * piece functions/index.ts, functions/help/[[path]].ts and the per-market functions
 * (server/localised-page-function.ts, LOCALISE-1) share, so they stay the same.
 *
 * Who calls it: those two Pages Functions. What it calls: handleWebsitePage() and
 * fetchWebsiteHead() in server/website-head.ts, with the site's own index.html from ASSETS.
 */
import { fetchWebsiteHead, fetchWebsiteMarkets, handleWebsitePage } from './website-head.ts';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
export interface WebsitePagesContext {
  request: Request & { cf?: { country?: string } };
  env: {
    /** The site's static files (dist/), served by Cloudflare. */
    ASSETS: { fetch: (request: Request) => Promise<Response> };
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
}

/**
 * Builds the answer for a website page address on Cloudflare.
 *
 * @param context - Cloudflare's request context
 * @returns the app's page with its search and share tags (unchanged when there are none)
 */
export function websitePageAnswer(context: WebsitePagesContext): Promise<Response> {
  const settings = {
    supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
    anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
  };
  return handleWebsitePage(context.request, {
    // The app's index.html, the page every address of the single-page app starts from. ASSETS
    // serves only the static files, so asking it for "/" never runs this function again (and
    // "/index.html" would answer with Cloudflare's redirect to "/").
    fetchIndexHtml: () => context.env.ASSETS.fetch(new Request(new URL('/', context.request.url))),
    findHead: (address, place) => fetchWebsiteHead(settings, address, place),
    findMarkets: () => fetchWebsiteMarkets(settings),
    cloudflareCountry: context.request.cf?.country,
  });
}
