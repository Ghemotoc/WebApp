/**
 * Cloudflare Pages Function at /api/notice: the public report form and the removal-order contact
 * point (story S1-E10-02; Regulation (EU) 2021/784 art. 15).
 *
 * The logic lives in server/notice.ts, shared with local development and the tests; this file
 * hands it what only Cloudflare has, all set by hand in Cloudflare → Workers & Pages → the Pages
 * project → Settings → Variables and Secrets (docs/runbooks/notice-form.md):
 * - NOTICE_SECRET: signs each notice; the same value is in Supabase Vault as public_notice_secret;
 * - BREVO_API_KEY: the acknowledgement emails (shared with Contact us);
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY: the database, as the front end reads it;
 * - VITE_BRAND_SUPPORT_EMAIL and VITE_BRAND_NAME: the inbox and the name (today's values when unset).
 * Abuse: the accessible bot check in server/notice.ts plus a Cloudflare rate-limit rule on this
 * address, set by hand; no IP address is stored (rule 12, Q48).
 */
import { brandDefaults } from '../../src/config/brand';
import { sendWithBrevo } from '../../server/contact';
import { handleNotice } from '../../server/notice';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: {
    NOTICE_SECRET?: string;
    BREVO_API_KEY?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    VITE_BRAND_SUPPORT_EMAIL?: string;
    VITE_BRAND_NAME?: string;
  };
}

/**
 * Answers POST /api/notice.
 *
 * @param context - Cloudflare's request context
 * @returns { reference, receivedAt, acknowledged } as JSON, or an error status (see handleNotice)
 */
export const onRequestPost = (context: PagesContext): Promise<Response> => {
  const apiKey = context.env.BREVO_API_KEY ?? '';
  return handleNotice(context.request, {
    supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
    anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
    secret: context.env.NOTICE_SECRET,
    supportEmail: context.env.VITE_BRAND_SUPPORT_EMAIL ?? brandDefaults.supportEmail,
    productName: context.env.VITE_BRAND_NAME ?? brandDefaults.productName,
    // Without the key the notice is still saved; the answer says the email wasn't sent.
    sendEmail:
      apiKey === ''
        ? () => Promise.reject(new Error('BREVO_API_KEY is not set'))
        : sendWithBrevo(apiKey),
  });
};
