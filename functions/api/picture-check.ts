/**
 * Cloudflare Pages Function at /api/picture-check: checks an uploaded picture before anyone else
 * sees it (story S1-E10-05; CLAUDE.md rule 19).
 *
 * The logic lives in server/picture-check.ts, shared with local development and the tests; this
 * file hands it what only Cloudflare has, all set by hand in Cloudflare → Workers & Pages → the
 * Pages project → Settings → Variables and Secrets (GO-LIVE list in by-hand-for-robert.md):
 * - PICTURE_CHECK: "real" to use the services; unset or "stub" uses the stand-in;
 * - PICTURE_CHECK_SECRET: signs each verdict; the same value is in Supabase Vault as
 *   picture_check_secret;
 * - ARACHNID_SHIELD_USERNAME and ARACHNID_SHIELD_PASSWORD: the check on every picture;
 * - PICTURE_CHECK_SIGHTENGINE, SIGHTENGINE_API_USER and SIGHTENGINE_API_SECRET: not set, because
 *   Sightengine isn't used (Robert, 2 Nov 2026, 08:19); "on" with the two keys would add it;
 * - IP_SCRAMBLE_SECRET: scrambles the uploader's IP address with a monthly key before it is kept
 *   (server/scrambled-ip.ts; ADMIN-2e2b); unset, no IP address is kept at all;
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY: the database, as the front end reads it.
 * The caller's own sign-in token does the reading and saving; there is no service key here.
 */
import { handlePictureCheck } from '../../server/picture-check';
import { pictureChecker } from '../../server/picture-check/index';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: {
    PICTURE_CHECK?: string;
    PICTURE_CHECK_SECRET?: string;
    PICTURE_CHECK_SIGHTENGINE?: string;
    SIGHTENGINE_API_USER?: string;
    SIGHTENGINE_API_SECRET?: string;
    ARACHNID_SHIELD_USERNAME?: string;
    ARACHNID_SHIELD_PASSWORD?: string;
    IP_SCRAMBLE_SECRET?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
}

/**
 * Answers POST /api/picture-check.
 *
 * @param context - Cloudflare's request context
 * @returns { status } as JSON, or an error status (see handlePictureCheck)
 */
export const onRequestPost = (context: PagesContext): Promise<Response> =>
  handlePictureCheck(context.request, {
    supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
    anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
    secret: context.env.PICTURE_CHECK_SECRET,
    ipSecret: context.env.IP_SCRAMBLE_SECRET,
    checkPicture: pictureChecker({
      mode: context.env.PICTURE_CHECK,
      sightengineMode: context.env.PICTURE_CHECK_SIGHTENGINE,
      sightengine: {
        apiUser: context.env.SIGHTENGINE_API_USER ?? '',
        apiSecret: context.env.SIGHTENGINE_API_SECRET ?? '',
      },
      arachnid: {
        username: context.env.ARACHNID_SHIELD_USERNAME ?? '',
        password: context.env.ARACHNID_SHIELD_PASSWORD ?? '',
      },
    }),
  });
