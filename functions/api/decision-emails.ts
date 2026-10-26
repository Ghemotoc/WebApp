/**
 * Cloudflare Pages Function at /api/decision-emails: sends the decision emails to people who used
 * the public report form, when a moderator decides a case (story S1-E10-04; DSA art. 16(5)).
 *
 * The logic lives in server/decision-emails.ts, shared with local development and the tests. The
 * request carries the moderator's own sign-in token, so no service key is needed. This file hands
 * it what only Cloudflare has, set by hand in Cloudflare → Workers & Pages → the Pages project →
 * Settings → Variables and Secrets (the same values as /api/notice):
 * - BREVO_API_KEY: the emails;
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY: the database, as the front end reads it;
 * - VITE_BRAND_SUPPORT_EMAIL and VITE_BRAND_NAME: the inbox and the name (today's values when unset).
 */
import { brandDefaults } from '../../src/config/brand';
import { sendWithBrevo } from '../../server/contact';
import { handleDecisionEmails } from '../../server/decision-emails';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: {
    BREVO_API_KEY?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    VITE_BRAND_SUPPORT_EMAIL?: string;
    VITE_BRAND_NAME?: string;
  };
}

/**
 * Answers POST /api/decision-emails.
 *
 * @param context - Cloudflare's request context
 * @returns { sent, failed } as JSON, or an error status (see handleDecisionEmails)
 */
export const onRequestPost = (context: PagesContext): Promise<Response> => {
  const apiKey = context.env.BREVO_API_KEY ?? '';
  return handleDecisionEmails(context.request, {
    supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
    anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
    supportEmail: context.env.VITE_BRAND_SUPPORT_EMAIL ?? brandDefaults.supportEmail,
    productName: context.env.VITE_BRAND_NAME ?? brandDefaults.productName,
    // Without the key nothing is sent and nothing is marked: the emails stay due.
    sendEmail:
      apiKey === ''
        ? () => Promise.reject(new Error('BREVO_API_KEY is not set'))
        : sendWithBrevo(apiKey),
  });
};
