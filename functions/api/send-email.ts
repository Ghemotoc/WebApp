/**
 * Cloudflare Pages Function at /api/send-email: the Supabase Auth Send Email hook (story
 * S1-E11-19).
 *
 * The logic lives in server/send-email.ts, shared with the tests; this file hands it the secrets
 * and settings, all set by hand in Cloudflare (GO-LIVE list in the pull request):
 * SEND_EMAIL_HOOK_SECRET (from Supabase › Authentication › Hooks), BREVO_API_KEY, and the public
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for the overrides read. Brand values come from the
 * same VITE_BRAND_* variables as the front end (names are settings, not code).
 */
import { brandDefaults } from '../../src/config/brand';
import { sendWithBrevo } from '../../server/contact';
import { handleSendEmailHook, overridesFromDatabase } from '../../server/send-email';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: {
    SEND_EMAIL_HOOK_SECRET?: string;
    BREVO_API_KEY?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    VITE_BRAND_NAME?: string;
    VITE_BRAND_COMPANY_NAME?: string;
    VITE_BRAND_SUPPORT_EMAIL?: string;
  };
}

/**
 * Answers POST /api/send-email.
 *
 * @param context - Cloudflare's request context
 * @returns what handleSendEmailHook answers; 503 while the hook isn't set up
 */
export const onRequestPost = (context: PagesContext): Promise<Response> => {
  const { env } = context;
  const hookSecret = env.SEND_EMAIL_HOOK_SECRET ?? '';
  const apiKey = env.BREVO_API_KEY ?? '';
  // Without its secrets the hook can't run; Auth then shows its "couldn't send" message.
  if (hookSecret === '' || apiKey === '') {
    return Promise.resolve(
      Response.json(
        { error: { http_code: 503, message: 'Email sending is not set up yet.' } },
        { status: 503 },
      ),
    );
  }
  const productName = env.VITE_BRAND_NAME ?? brandDefaults.productName;
  return handleSendEmailHook(context.request, {
    hookSecret,
    sender: {
      name: productName,
      email: env.VITE_BRAND_SUPPORT_EMAIL ?? brandDefaults.supportEmail,
    },
    productName,
    companyName: env.VITE_BRAND_COMPANY_NAME ?? brandDefaults.companyName,
    sendEmail: sendWithBrevo(apiKey),
    readOverrides: overridesFromDatabase(
      env.VITE_SUPABASE_URL ?? '',
      env.VITE_SUPABASE_ANON_KEY ?? '',
    ),
  });
};
