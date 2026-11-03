/**
 * Cloudflare Pages Function at /api/contact (story S1-E14-04; decided 23 Oct 2026, Q10a and Q10b).
 *
 * Cloudflare runs every file under functions/ next to the built site. The logic lives in
 * server/contact.ts, shared with local development and the tests; this file hands it Brevo's API
 * key (BREVO_API_KEY, set by hand in Cloudflare → Workers & Pages → the Pages project → Settings →
 * Variables and Secrets) and the brand values (VITE_BRAND_SUPPORT_EMAIL and VITE_BRAND_NAME,
 * the same variables the front end reads; today's values when unset, as src/config/brand.ts does).
 * Since S1-E11-13 (bundle ADMIN-2h1) it also saves each message as a support ticket: that needs
 * SUPPORT_TICKET_SECRET (set by hand; the same value is in Supabase Vault as
 * support_ticket_secret) and VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Without the secret the
 * form still works with the old reference.
 * Abuse: a honeypot field here and a Cloudflare rate-limit rule on this address, set by hand
 * (docs/runbooks/contact-form.md).
 */
import { brandDefaults } from '../../src/config/brand';
import { handleContact, sendWithBrevo } from '../../server/contact';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: {
    BREVO_API_KEY?: string;
    SUPPORT_TICKET_SECRET?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    VITE_BRAND_SUPPORT_EMAIL?: string;
    VITE_BRAND_NAME?: string;
  };
}

/**
 * Answers POST /api/contact.
 *
 * @param context - Cloudflare's request context
 * @returns { reference } as JSON, or an error status (see handleContact)
 */
export const onRequestPost = (context: PagesContext): Promise<Response> => {
  const apiKey = context.env.BREVO_API_KEY ?? '';
  return handleContact(context.request, {
    supportEmail: context.env.VITE_BRAND_SUPPORT_EMAIL ?? brandDefaults.supportEmail,
    productName: context.env.VITE_BRAND_NAME ?? brandDefaults.productName,
    tickets: {
      supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
      anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
      secret: context.env.SUPPORT_TICKET_SECRET,
    },
    // Without the key nothing can be sent: the form then says so (502), and the by-hand step is
    // still to do.
    sendEmail:
      apiKey === ''
        ? () => Promise.reject(new Error('BREVO_API_KEY is not set'))
        : sendWithBrevo(apiKey),
  });
};
