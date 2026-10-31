/**
 * Cloudflare Pages Function at /api/unsubscribe: the one-click unsubscribe that mail apps send
 * from an email's List-Unsubscribe header (story S1-E7-02; RFC 8058).
 *
 * The logic lives in server/notification-emails.ts. It needs only the public database settings,
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY; the key in the link is what proves whose emails stop.
 */
import { handleUnsubscribe } from '../../server/notification-emails';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: { VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string };
}

/**
 * Answers POST /api/unsubscribe?key=….
 *
 * @param context - Cloudflare's request context
 * @returns what handleUnsubscribe answers
 */
export const onRequestPost = (context: PagesContext): Promise<Response> =>
  handleUnsubscribe(context.request, {
    supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
    anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
  });
