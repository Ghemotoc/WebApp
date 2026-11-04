/**
 * Cloudflare Pages Function for /api/picture-preview/<story>/<chapter>/<block>: the picture a
 * shared picture link shows in chat previews (bundle IDEAS-2, part f; idea IDEA-20261101-12).
 *
 * The logic lives in server/picture-preview.ts, shared with local development and the tests: it
 * asks get_shared_picture() whether the picture may be shared and reads it as a visitor.
 * Settings: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, the same public values the app is built
 * with. There is no service key here (CLAUDE.md rule 2).
 */
import { handlePicturePreview } from '../../../server/picture-preview';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
}

/**
 * Answers GET /api/picture-preview/….
 *
 * @param context - Cloudflare's request context
 * @returns the picture, or 404 when none may be shown
 */
export const onRequestGet = (context: PagesContext): Promise<Response> =>
  handlePicturePreview(context.request, {
    supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
    anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
  });
