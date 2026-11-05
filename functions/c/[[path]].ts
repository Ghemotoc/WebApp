/**
 * Cloudflare Pages Function for every address under /c/: shared landing pages (story S1-E11-14
 * criterion 13; bundle CONTESTS-13a2c).
 *
 * Cloudflare runs every file under functions/ next to the built site; [[path]] matches /c/ and
 * everything below it. The logic lives in server/landing-preview.ts, shared with local development
 * and the tests: it takes the app's index.html, asks landing_page() what a visitor sees and writes
 * the Open Graph tags into the page. The app then starts in the browser as on any other address.
 * Settings: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, the same public values the app is built
 * with (the same ones functions/s/[[path]].ts reads). Without them the page goes out without tags.
 */
import { fetchLandingPreview, handleLandingLink } from '../../server/landing-preview';
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
 * Answers GET /c/….
 *
 * @param context - Cloudflare's request context
 * @returns the app's page with the link preview for that landing page
 */
export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const answer = await handleLandingLink(context.request, {
    // The app's index.html, the page every address of the single-page app starts from.
    fetchIndexHtml: () => context.env.ASSETS.fetch(new Request(new URL('/', context.request.url))),
    findPreview: (slug) =>
      fetchLandingPreview(
        {
          supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
          anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
        },
        slug,
      ),
  });
  // The security headers (QA-1c): Cloudflare's _headers file doesn't reach a function's answer.
  return withSecurityHeaders(answer, context.env.VITE_SUPABASE_URL ?? '');
};
