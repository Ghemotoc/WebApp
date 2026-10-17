/**
 * Cloudflare Pages Function at /api/signup-context (story S1-E2-10; decided 17 Oct 2026, 19:43, Q6a).
 *
 * Cloudflare runs every file under functions/ next to the built site. The logic lives in
 * server/signup-context.ts, shared with local development and the tests; this file hands it the
 * country Cloudflare found (request.cf.country) and the secret SIGNUP_CONTEXT_SECRET (set by hand
 * in Cloudflare → Workers & Pages → the Pages project → Settings → Variables and Secrets).
 */
import { handleSignupContext } from '../../server/signup-context';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request & { cf?: { country?: string } };
  env: { SIGNUP_CONTEXT_SECRET?: string };
}

/**
 * Answers GET /api/signup-context.
 *
 * @param context - Cloudflare's request context
 * @returns { country, token } as JSON
 */
export const onRequestGet = (context: PagesContext): Promise<Response> =>
  handleSignupContext(context.request, {
    cloudflareCountry: context.request.cf?.country,
    secret: context.env.SIGNUP_CONTEXT_SECRET,
    now: new Date(),
  });
