/**
 * Cloudflare Pages Function for every /api/data-request-parent/… address: asking an under-16's
 * parent or guardian to confirm a data request, and sending them the one-time link to the copy
 * (bundle ADMIN-2, part c3; story S1-E11-09 criterion 5).
 *
 * The logic lives in server/data-request-parent.ts, shared with local development and the tests;
 * this file hands it what only Cloudflare has, the same variables as parental consent (set in
 * Cloudflare → Workers & Pages → the Pages project → Settings → Variables and Secrets):
 * - PARENTAL_CONSENT_SECRET (a secret): signs the links; the same value is in Supabase Vault as
 *   parental_consent_secret;
 * - BREVO_API_KEY: the emails to parents;
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY: the database, as the front end reads it;
 * - VITE_BRAND_NAME, VITE_BRAND_COMPANY_NAME and VITE_BRAND_SUPPORT_EMAIL (today's values when unset).
 * There is no service key here.
 */
import { brandDefaults } from '../../../src/config/brand';
import { sendWithBrevo } from '../../../server/contact';
import { handleDataRequestParent } from '../../../server/data-request-parent';
import { overridesFromDatabase } from '../../../server/send-email';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: {
    PARENTAL_CONSENT_SECRET?: string;
    BREVO_API_KEY?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    VITE_BRAND_NAME?: string;
    VITE_BRAND_COMPANY_NAME?: string;
    VITE_BRAND_SUPPORT_EMAIL?: string;
  };
}

/**
 * Answers POST under /api/data-request-parent/.
 *
 * @param context - Cloudflare's request context
 * @returns what handleDataRequestParent() answers
 */
export const onRequest = (context: PagesContext): Promise<Response> => {
  const { env } = context;
  const apiKey = env.BREVO_API_KEY ?? '';
  const productName = env.VITE_BRAND_NAME ?? brandDefaults.productName;
  const supabaseUrl = env.VITE_SUPABASE_URL ?? '';
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? '';
  return handleDataRequestParent(context.request, {
    supabaseUrl,
    anonKey,
    secret: env.PARENTAL_CONSENT_SECRET,
    sender: {
      name: productName,
      email: env.VITE_BRAND_SUPPORT_EMAIL ?? brandDefaults.supportEmail,
    },
    productName,
    companyName: env.VITE_BRAND_COMPANY_NAME ?? brandDefaults.companyName,
    // Without the Brevo key no email leaves, and the staff page says so.
    sendEmail:
      apiKey === ''
        ? () => Promise.reject(new Error('BREVO_API_KEY is not set'))
        : sendWithBrevo(apiKey),
    readOverrides: overridesFromDatabase(supabaseUrl, anonKey),
  });
};
