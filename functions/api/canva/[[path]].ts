/**
 * Cloudflare Pages Function for every /api/canva/… address: "Design it in Canva" (story
 * S1-E3-12; ADR 0009).
 *
 * The logic lives in server/canva.ts, shared with local development and the tests; this file
 * hands it what only Cloudflare has, set in Cloudflare → Workers & Pages → the Pages project →
 * Settings → Variables and Secrets (GO-LIVE in by-hand-for-robert.md):
 * - CANVA: "real" for the Canva Connect API; unset or "stub" uses the stand-in, which never
 *   leaves our server;
 * - CANVA_CLIENT_ID and CANVA_CLIENT_SECRET (a secret): our app in Canva's developer portal;
 * - CANVA_TOKEN_KEY (a secret): 32 random bytes as base64, which encrypt the writers' tokens;
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY: the database, as the front end reads it.
 * The writer's own sign-in token does the saving; there is no service key here.
 */
import { handleCanva } from '../../../server/canva';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: {
    CANVA?: string;
    CANVA_CLIENT_ID?: string;
    CANVA_CLIENT_SECRET?: string;
    CANVA_TOKEN_KEY?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
}

/**
 * Answers GET and POST under /api/canva/.
 *
 * @param context - Cloudflare's request context
 * @returns what handleCanva() answers
 */
export const onRequest = (context: PagesContext): Promise<Response> =>
  handleCanva(context.request, {
    supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
    anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
    tokenSecret: context.env.CANVA_TOKEN_KEY,
    settings: {
      mode: context.env.CANVA,
      clientId: context.env.CANVA_CLIENT_ID,
      clientSecret: context.env.CANVA_CLIENT_SECRET,
    },
  });
