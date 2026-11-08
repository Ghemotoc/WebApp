/**
 * Cloudflare Pages Function at /api/opening-list: "Tell me when you open here" on the "not open
 * in your country yet" page (bundle G5, part a; story S1-E2-10).
 *
 * The logic lives in server/opening-list.ts, shared with local development and the tests; this
 * file hands it what only Cloudflare has, all already set by hand for other forms (Cloudflare →
 * Workers & Pages → the Pages project → Settings → Variables and Secrets):
 * - NOTICE_SECRET: signs each request (purpose "opening_list"); the same value is in Supabase
 *   Vault as public_notice_secret;
 * - BREVO_API_KEY: the confirm email;
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY: the database, as the front end reads it;
 * - VITE_BRAND_NAME, VITE_BRAND_COMPANY_NAME and VITE_BRAND_SUPPORT_EMAIL (today's values when unset).
 * The country comes from request.cf.country. Abuse: the bot check in server/opening-list.ts, one
 * email per address and country every 10 minutes (join_opening_list()) and the Cloudflare
 * rate-limit rule on /api/*, set by hand; no IP address is stored (rule 12, Q48).
 */
import { brandDefaults } from '../../src/config/brand';
import { sendWithBrevo } from '../../server/contact';
import { handleOpeningList } from '../../server/opening-list';
import { overridesFromDatabase } from '../../server/send-email';
import { countryOfConnection } from '../../server/signup-context';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request & { cf?: { country?: string } };
  env: {
    NOTICE_SECRET?: string;
    BREVO_API_KEY?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    VITE_BRAND_NAME?: string;
    VITE_BRAND_COMPANY_NAME?: string;
    VITE_BRAND_SUPPORT_EMAIL?: string;
  };
}

/**
 * Answers POST /api/opening-list.
 *
 * @param context - Cloudflare's request context
 * @returns { listed: true } as JSON, or an error status (see handleOpeningList)
 */
export const onRequestPost = (context: PagesContext): Promise<Response> => {
  const { env, request } = context;
  const apiKey = env.BREVO_API_KEY ?? '';
  const productName = env.VITE_BRAND_NAME ?? brandDefaults.productName;
  const supabaseUrl = env.VITE_SUPABASE_URL ?? '';
  const anonKey = env.VITE_SUPABASE_ANON_KEY ?? '';
  return handleOpeningList(request, {
    supabaseUrl,
    anonKey,
    secret: env.NOTICE_SECRET,
    connectionCountry: countryOfConnection(request, request.cf?.country),
    sender: {
      name: productName,
      email: env.VITE_BRAND_SUPPORT_EMAIL ?? brandDefaults.supportEmail,
    },
    productName,
    companyName: env.VITE_BRAND_COMPANY_NAME ?? brandDefaults.companyName,
    // Without the Brevo key the address is still saved; the answer says the email didn't go.
    sendEmail:
      apiKey === ''
        ? () => Promise.reject(new Error('BREVO_API_KEY is not set'))
        : sendWithBrevo(apiKey),
    readOverrides: overridesFromDatabase(supabaseUrl, anonKey),
  });
};
