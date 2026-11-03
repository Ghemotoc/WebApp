/**
 * The sign-up's scrambled IP address, signed so the database can trust it (bundle ADMIN-2, part
 * f2; Robert's brief of 2 Nov 2026, section 6: "When a new sign-up shares a scrambled IP with an
 * account banned in the last 30 days, flag it for moderator review. Never block it
 * automatically: schools share IPs.").
 *
 * What it does: scrambles the visitor's IP address (server/scrambled-ip.ts, with
 * IP_SCRAMBLE_SECRET) twice, under this month's key and under last month's, because the key
 * changes every month and the window is 30 days: a sign-up on 2 December must still match an
 * account banned on 20 November. Both scrambled values go into one token signed with
 * SIGNUP_CONTEXT_SECRET, the secret the sign-up's country token already uses, so the sign-up
 * trigger can check it with the copy in Supabase Vault. A token lasts 10 minutes.
 * Never stored, never logged: the IP address itself (CLAUDE.md rule 12; Q48).
 * Who calls it: functions/api/signup-context.ts on Cloudflare Pages and
 * server/pages-functions-plugin.ts locally; the token goes out with the country in
 * server/signup-context.ts's answer.
 */
import { scrambleIp, visitorIp } from './scrambled-ip';
import { hmacHex } from './signup-context';

/** The IP token format's version, first in every token. */
const ipTokenVersion = 'ip1';

/** What the token needs: both secrets and the moment. */
export interface SignupIpOptions {
  /** IP_SCRAMBLE_SECRET; without it no IP is kept at all. */
  scrambleSecret?: string;
  /** SIGNUP_CONTEXT_SECRET; without it the database couldn't check the token, so none is made. */
  signingSecret?: string;
  /** The current time (passed in so tests are exact). */
  now: Date;
}

/**
 * A moment in the month before the given one, for last month's key.
 *
 * @param moment - now
 * @returns the 15th of the previous month, in UTC
 */
export function lastMonth(moment: Date): Date {
  return new Date(Date.UTC(moment.getUTCFullYear(), moment.getUTCMonth() - 1, 15));
}

/**
 * Makes the signed token for the visitor's scrambled IP address.
 *
 * @param request - the incoming request (Cloudflare's CF-Connecting-IP header)
 * @param options - the two secrets and the moment
 * @returns "ip1.<this month's value>.<month>.<last month's value>.<month>.<seconds>.<signature>",
 *   or null when there is no address or either secret is missing
 * Errors: none thrown; nothing is logged.
 */
export async function makeSignupIpToken(
  request: Request,
  options: SignupIpOptions,
): Promise<string | null> {
  // Step 1: no signing secret, no token (the database couldn't trust it anyway).
  const signingSecret = options.signingSecret ?? '';
  if (signingSecret === '') return null;
  // Step 2: the address under this month's key and last month's; nothing without both.
  const address = visitorIp(request);
  const thisMonth = await scrambleIp(address, options.scrambleSecret, options.now);
  const previous = await scrambleIp(address, options.scrambleSecret, lastMonth(options.now));
  if (thisMonth === null || previous === null) return null;
  // Step 3: sign it, with the time, like the country token.
  const issuedAt = String(Math.floor(options.now.getTime() / 1000));
  const signedPart = [
    ipTokenVersion,
    thisMonth.value,
    thisMonth.period,
    previous.value,
    previous.period,
    issuedAt,
  ].join('.');
  return `${signedPart}.${await hmacHex(signedPart, signingSecret)}`;
}
