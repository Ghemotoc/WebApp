/**
 * Cloudflare Pages Function at /api/confirm-reminders: asks Supabase Auth to send the one
 * "confirm your email" reminder to each account still unconfirmed 7 days after sign-up
 * (CONFIRM-1; Robert, 27 Nov 2026).
 *
 * The logic lives in server/confirm-reminders.ts, shared with local development and the tests.
 * The database calls this address itself (pg_cron and pg_net, every hour) with the notification
 * emails' worker key, so it needs nothing new on Cloudflare beyond what /api/notification-emails
 * has (Cloudflare → Workers & Pages → the Pages project → Settings → Variables and Secrets):
 * - EMAIL_WORKER_KEY: the same value as the Vault secret email_worker_key;
 * - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY: the database, as the front end reads it.
 * The email itself goes out through the Send Email hook (/api/send-email), as every Auth email.
 */
import { handleConfirmReminders } from '../../server/confirm-reminders';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request;
  env: {
    EMAIL_WORKER_KEY?: string;
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
}

/**
 * Answers POST /api/confirm-reminders.
 *
 * @param context - Cloudflare's request context
 * @returns { sent, failed } as JSON, or an error status (see handleConfirmReminders)
 */
export const onRequestPost = (context: PagesContext): Promise<Response> => {
  const { env } = context;
  return handleConfirmReminders(context.request, {
    supabaseUrl: env.VITE_SUPABASE_URL ?? '',
    anonKey: env.VITE_SUPABASE_ANON_KEY ?? '',
    workerKey: env.EMAIL_WORKER_KEY,
  });
};
