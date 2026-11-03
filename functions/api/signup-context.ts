/**
 * Cloudflare Pages Function at /api/signup-context (story S1-E2-10; decided 17 Oct 2026, 19:43, Q6a).
 *
 * Cloudflare runs every file under functions/ next to the built site. The logic lives in
 * server/signup-context.ts, shared with local development and the tests; this file hands it the
 * country Cloudflare found (request.cf.country) and the secret SIGNUP_CONTEXT_SECRET (set by hand
 * in Cloudflare → Workers & Pages → the Pages project → Settings → Variables and Secrets), and,
 * since bundle ADMIN-2 part f2, the scrambled IP token (server/signup-ip.ts, IP_SCRAMBLE_SECRET).
 */
import { handleSignupContext } from '../../server/signup-context';
import { makeSignupIpToken } from '../../server/signup-ip';

/** What Cloudflare passes to a Pages Function; only these parts are used. */
interface PagesContext {
  request: Request & { cf?: { country?: string } };
  env: { SIGNUP_CONTEXT_SECRET?: string; IP_SCRAMBLE_SECRET?: string };
}

/**
 * Answers GET /api/signup-context.
 *
 * @param context - Cloudflare's request context
 * @returns { country, token } as JSON
 */
export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const now = new Date();
  // The scrambled IP for the returning-user check (bundle ADMIN-2, part f2), never the address.
  const ipToken = await makeSignupIpToken(context.request, {
    scrambleSecret: context.env.IP_SCRAMBLE_SECRET,
    signingSecret: context.env.SIGNUP_CONTEXT_SECRET,
    now,
  });
  return handleSignupContext(context.request, {
    cloudflareCountry: context.request.cf?.country,
    secret: context.env.SIGNUP_CONTEXT_SECRET,
    now,
    ipToken,
  });
};
