/**
 * Cloudflare Pages Function for every address under /u/: members' profiles (GROWTH-3; Robert,
 * 26 Nov 2026, 15:13 UTC: adult writers' profiles open to search engines).
 *
 * Cloudflare runs every file under functions/ next to the built site; [[path]] matches /u/ and
 * everything below it. The logic lives in server/profile-head.ts, shared with local development
 * and the tests: it takes the app's index.html, asks profile_search_head() what a visitor who
 * isn't logged in may know about the profile, and writes the title, description, canonical link
 * and Open Graph tags into the page, with noindex for under-18s and closed profiles. Other
 * addresses under /u/ (a member's library) go out unchanged. The app then starts in the browser
 * as on any other address.
 * Settings: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, the same public values the app is built
 * with (see functions/s/[[path]].ts). Without them the page goes out without tags.
 */
import { fetchProfileHead, handleProfilePage } from '../../server/profile-head';
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
 * Answers GET /u/….
 *
 * @param context - Cloudflare's request context
 * @returns the app's page with the profile's search and share tags
 */
export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const answer = await handleProfilePage(context.request, {
    // The app's index.html, the page every address of the single-page app starts from.
    fetchIndexHtml: () => context.env.ASSETS.fetch(new Request(new URL('/', context.request.url))),
    findHead: (handle) =>
      fetchProfileHead(
        {
          supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
          anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
        },
        handle,
      ),
  });
  // The security headers (QA-1c): Cloudflare's _headers file doesn't reach a function's answer.
  return withSecurityHeaders(answer, context.env.VITE_SUPABASE_URL ?? '');
};
