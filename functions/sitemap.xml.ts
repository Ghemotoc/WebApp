/**
 * Cloudflare Pages Function for /sitemap.xml (story S1-E11-38; bundle SEO-1c).
 *
 * The logic lives in server/sitemap.ts, shared with local development and the tests. Both files
 * are built on request from the request's own address, so the site's domain is never written into
 * the repository (CLAUDE.md: names and domains are settings).
 * Settings: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, the same public values the app is built
 * with (as functions/s/[[path]].ts).
 */
import { fetchSitemapEntries, handleSitemapFiles } from '../server/sitemap';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: { VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string };
}

/**
 * Answers GET /sitemap.xml.
 *
 * @param context - Cloudflare's request context
 * @returns the file
 */
export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const settings = {
    supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
    anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
  };
  const answer = await handleSitemapFiles(context.request, {
    findEntries: () => fetchSitemapEntries(settings),
  });
  // This function only runs for its own address, so there is always an answer.
  return answer ?? new Response('', { status: 404 });
};
