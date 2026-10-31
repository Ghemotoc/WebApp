/**
 * Cloudflare Pages Function for every /api/age-check/… address: the age check with Yoti (story
 * S1-E2-08, part 08a; ADR 0010).
 *
 * The logic lives in server/age-check.ts, shared with local development and the tests; this file
 * hands it what only Cloudflare has, set in Cloudflare → Workers & Pages → the Pages project →
 * Settings → Variables and Secrets (GO-LIVE in by-hand-for-robert.md):
 * - YOTI: "real" for Yoti's Age Verification API; unset or "stub" uses the stand-in, which never
 *   leaves our server and lets anyone pass, so it must be "real" before minors can join;
 * - YOTI_API_KEY (a secret) and YOTI_SDK_ID: our account at Yoti (criterion 1: never the client);
 * - YOTI_NOTIFICATION_PUBLIC_KEY: Yoti's public key for its signed notifications (PEM);
 * - AGE_CHECK_SECRET (a secret): signs what our server saves; the same value is in Supabase Vault
 *   as age_check_secret;
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY: the database, as the front end reads it.
 * There is no service key here.
 */
import { handleAgeCheck } from '../../../server/age-check';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: {
    YOTI?: string;
    YOTI_API_KEY?: string;
    YOTI_SDK_ID?: string;
    YOTI_NOTIFICATION_PUBLIC_KEY?: string;
    AGE_CHECK_SECRET?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
}

/**
 * Answers GET and POST under /api/age-check/.
 *
 * @param context - Cloudflare's request context
 * @returns what handleAgeCheck() answers
 */
export const onRequest = (context: PagesContext): Promise<Response> =>
  handleAgeCheck(context.request, {
    supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
    anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
    secret: context.env.AGE_CHECK_SECRET,
    settings: {
      mode: context.env.YOTI,
      apiKey: context.env.YOTI_API_KEY,
      sdkId: context.env.YOTI_SDK_ID,
      notificationPublicKey: context.env.YOTI_NOTIFICATION_PUBLIC_KEY,
    },
  });
