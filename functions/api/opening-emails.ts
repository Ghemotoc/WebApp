/**
 * Cloudflare Pages Function at /api/opening-emails: sends the "we're open in your country" emails
 * that are due (bundle G5, part a; story S1-E2-10).
 *
 * The logic lives in server/opening-list.ts, shared with local development and the tests. The
 * database calls this address itself (pg_cron and pg_net, every 5 minutes) with the notification
 * emails' worker key, so it needs nothing new on Cloudflare beyond what /api/notification-emails
 * has (Cloudflare → Workers & Pages → the Pages project → Settings → Variables and Secrets):
 * - EMAIL_WORKER_KEY: the same value as the Vault secret email_worker_key;
 * - BREVO_API_KEY: the emails;
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY: the database, as the front end reads it;
 * - VITE_BRAND_NAME, VITE_BRAND_COMPANY_NAME and VITE_BRAND_SUPPORT_EMAIL (today's values when unset).
 */
import { brandDefaults } from '../../src/config/brand';
import { sendWithBrevo } from '../../server/contact';
import { handleOpeningEmails } from '../../server/opening-list';
import { overridesFromDatabase } from '../../server/send-email';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: {
    EMAIL_WORKER_KEY?: string;
    BREVO_API_KEY?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    VITE_BRAND_NAME?: string;
    VITE_BRAND_COMPANY_NAME?: string;
    VITE_BRAND_SUPPORT_EMAIL?: string;
  };
}

/**
 * Answers POST /api/opening-emails.
 *
 * @param context - Cloudflare's request context
 * @returns { sent, failed } as JSON, or an error status (see handleOpeningEmails)
 */
export const onRequestPost = (context: PagesContext): Promise<Response> => {
  const { env } = context;
  const apiKey = env.BREVO_API_KEY ?? '';
  const productName = env.VITE_BRAND_NAME ?? brandDefaults.productName;
  const supabaseUrl = env.VITE_SUPABASE_URL ?? '';
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? '';
  return handleOpeningEmails(context.request, {
    supabaseUrl,
    anonKey,
    workerKey: env.EMAIL_WORKER_KEY,
    sender: {
      name: productName,
      email: env.VITE_BRAND_SUPPORT_EMAIL ?? brandDefaults.supportEmail,
    },
    productName,
    companyName: env.VITE_BRAND_COMPANY_NAME ?? brandDefaults.companyName,
    // Without the Brevo key nothing is sent and nothing is marked: the emails stay due.
    sendEmail:
      apiKey === ''
        ? () => Promise.reject(new Error('BREVO_API_KEY is not set'))
        : sendWithBrevo(apiKey),
    readOverrides: overridesFromDatabase(supabaseUrl, anonKey),
  });
};
