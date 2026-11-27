/**
 * Cloudflare Pages Function for every address under /spaces/ (GROWTH-4; Robert, 26 Nov 2026,
 * 19:48 UTC: "Private spaces and classes are not indexable and uncrawlable. But fully public
 * spaces can be crawlable and indexable").
 *
 * Cloudflare runs every file under functions/ next to the built site; [[path]] matches /spaces/ and
 * everything below it. The logic lives in server/space-head.ts, shared with local development and
 * the tests: for a space's page or one of its threads it asks space_search_head() whether the
 * space is fully public, and adds noindex when it isn't. Every other address (the staff forums,
 * the lists) goes out unchanged. The app then starts in the browser as on any other address.
 * Settings: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, the same public values the app is built
 * with (see functions/s/[[path]].ts). Without them a space's page goes out as noindex.
 */
import { fetchSpaceSearchable, handleSpacePage } from '../../server/space-head';
import { withSecurityHeaders } from '../../server/security-headers';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: {
    /** The site's static files (dist/), served by Cloudflare. */
    ASSETS: { fetch: (request: Request) => Promise<Response> };
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
}

/**
 * Answers GET /spaces/….
 *
 * @param context - Cloudflare's request context
 * @returns the app's page, with noindex for a space that isn't fully public
 */
export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const answer = await handleSpacePage(context.request, {
    // The app's index.html, the page every address of the single-page app starts from.
    fetchIndexHtml: () => context.env.ASSETS.fetch(new Request(new URL('/', context.request.url))),
    isSearchable: (spaceSlug) =>
      fetchSpaceSearchable(
        {
          supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
          anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
        },
        spaceSlug,
      ),
  });
  // The security headers (QA-1c): Cloudflare's _headers file doesn't reach a function's answer.
  return withSecurityHeaders(answer, context.env.VITE_SUPABASE_URL ?? '');
};
