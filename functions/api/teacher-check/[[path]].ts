/**
 * Cloudflare Pages Function for every /api/teacher-check/… address: the Teacher badge's school
 * email link (story S1-E2-11; the signed-link pattern of ADR 0011).
 *
 * The logic lives in server/teacher-check.ts, shared with local development and the tests; this
 * file hands it what only Cloudflare has, set in Cloudflare → Workers & Pages → the Pages project
 * → Settings → Variables and Secrets (GO-LIVE in by-hand-for-robert.md):
 * - TEACHER_CHECK_SECRET (a secret): signs what our server saves; the same value is in Supabase
 *   Vault as teacher_check_secret;
 * - BREVO_API_KEY: the email to the school address;
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY: the database, as the front end reads it;
 * - VITE_BRAND_NAME, VITE_BRAND_COMPANY_NAME and VITE_BRAND_SUPPORT_EMAIL (today's values when unset).
 * There is no service key here.
 */
import { brandDefaults } from '../../../src/config/brand';
import { sendWithBrevo } from '../../../server/contact';
import { overridesFromDatabase } from '../../../server/send-email';
import { handleTeacherCheck } from '../../../server/teacher-check';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: {
    TEACHER_CHECK_SECRET?: string;
    BREVO_API_KEY?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    VITE_BRAND_NAME?: string;
    VITE_BRAND_COMPANY_NAME?: string;
    VITE_BRAND_SUPPORT_EMAIL?: string;
  };
}

/**
 * Answers POST under /api/teacher-check/.
 *
 * @param context - Cloudflare's request context
 * @returns what handleTeacherCheck() answers
 */
export const onRequest = (context: PagesContext): Promise<Response> => {
  const { env } = context;
  const apiKey = env.BREVO_API_KEY ?? '';
  const productName = env.VITE_BRAND_NAME ?? brandDefaults.productName;
  const supabaseUrl = env.VITE_SUPABASE_URL ?? '';
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? '';
  return handleTeacherCheck(context.request, {
    supabaseUrl,
    anonKey,
    secret: env.TEACHER_CHECK_SECRET,
    sender: {
      name: productName,
      email: env.VITE_BRAND_SUPPORT_EMAIL ?? brandDefaults.supportEmail,
    },
    productName,
    companyName: env.VITE_BRAND_COMPANY_NAME ?? brandDefaults.companyName,
    // Without the Brevo key no email leaves, and the page says so.
    sendEmail:
      apiKey === ''
        ? () => Promise.reject(new Error('BREVO_API_KEY is not set'))
        : sendWithBrevo(apiKey),
    readOverrides: overridesFromDatabase(supabaseUrl, anonKey),
  });
};
