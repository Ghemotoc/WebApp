/**
 * Cloudflare Pages Function for every address under /s/: shared stories and chapters
 * (story S1-E4-04; decided 16 Oct 2026, Q36).
 *
 * Cloudflare runs every file under functions/ next to the built site; [[path]] matches /s/ and
 * everything below it. The logic lives in server/link-preview.ts, shared with local development
 * and the tests: it takes the app's index.html, asks get_link_preview() what a visitor who isn't
 * logged in may see, and writes the Open Graph tags, the story page's JSON-LD and, for chapters,
 * noindex into the page. The app then starts in the browser as on any other address.
 * Settings: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, the same public values the app is built
 * with (Cloudflare → Workers & Pages → the Pages project → Settings → Variables and Secrets; Pages
 * gives them to Functions as well as to the build). Without them the page goes out without tags.
 */
import { fetchLinkPreview, handleSharedLink } from '../../server/link-preview';

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
 * Answers GET /s/….
 *
 * @param context - Cloudflare's request context
 * @returns the app's page with the link preview for that story or chapter
 */
export const onRequestGet = (context: PagesContext): Promise<Response> =>
  handleSharedLink(context.request, {
    // The app's index.html, the page every address of the single-page app starts from.
    fetchIndexHtml: () => context.env.ASSETS.fetch(new Request(new URL('/', context.request.url))),
    findPreview: (address) =>
      fetchLinkPreview(
        {
          supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
          anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
        },
        address,
      ),
  });
