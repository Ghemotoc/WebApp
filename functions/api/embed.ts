/**
 * Cloudflare Pages Function at /api/embed: turns a pasted music or video link into a card in the
 * writer's chapter (story S1-E3-10; ADR 0008).
 *
 * The logic lives in server/embeds.ts, shared with local development and the tests; this file
 * hands it what only Cloudflare has, set in Cloudflare → Workers & Pages → the Pages project →
 * Settings → Variables and Secrets:
 * - OEMBED: "real" to ask the services for each title; unset or "stub" uses the stand-in, which
 *   never leaves the server (GO-LIVE in by-hand-for-robert.md). No account or key is needed;
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY: the database, as the front end reads it.
 * The caller's own sign-in token does the saving; there is no service key here.
 */
import { handleEmbed } from '../../server/embeds';
import { oembedLookup } from '../../server/embeds/oembed';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: {
    OEMBED?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
}

/**
 * Answers POST /api/embed.
 *
 * @param context - Cloudflare's request context
 * @returns the card as JSON, or { error } (see handleEmbed)
 */
export const onRequestPost = (context: PagesContext): Promise<Response> =>
  handleEmbed(context.request, {
    supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
    anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
    lookUpOembed: oembedLookup(context.env.OEMBED),
  });
