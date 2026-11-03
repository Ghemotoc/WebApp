/**
 * Cloudflare Pages Function at /api/support-inbound: Brevo's inbound parsing posts each email to
 * the support inbox here, and it becomes part of a support ticket (story S1-E11-13, part 13a;
 * bundle ADMIN-2h2).
 *
 * The logic lives in server/support-emails.ts, shared with local development and the tests. Set by
 * hand (docs/runbooks/contact-form.md, section 4), in Cloudflare → Workers & Pages → the Pages
 * project → Settings → Variables and Secrets:
 * - SUPPORT_INBOUND_KEY: a long random value; the webhook address in Brevo ends in ?key=<it>;
 * - SUPPORT_TICKET_SECRET: the same value as the Vault secret support_ticket_secret (part h1);
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY: the database, as the front end reads it.
 */
import { handleSupportInbound } from '../../server/support-emails';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: {
    SUPPORT_INBOUND_KEY?: string;
    SUPPORT_TICKET_SECRET?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
}

/**
 * Answers POST /api/support-inbound.
 *
 * @param context - Cloudflare's request context
 * @returns { received, skipped } as JSON, or an error status (see handleSupportInbound)
 */
export const onRequestPost = (context: PagesContext): Promise<Response> =>
  handleSupportInbound(context.request, {
    supabaseUrl: context.env.VITE_SUPABASE_URL ?? '',
    anonKey: context.env.VITE_SUPABASE_ANON_KEY ?? '',
    inboundKey: context.env.SUPPORT_INBOUND_KEY,
    ticketSecret: context.env.SUPPORT_TICKET_SECRET,
  });
