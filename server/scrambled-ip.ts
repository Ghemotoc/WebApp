/**
 * Scrambles a visitor's IP address before anything of ours stores it (bundle ADMIN-2, part e2b;
 * decided 16 Oct 2026, Q48: "IP addresses are scrambled and kept 30 days").
 *
 * The address is never stored or logged as it is (CLAUDE.md rule 12). It goes through a keyed
 * hash (HMAC-SHA256) whose key changes every month: the month's key is itself the HMAC of the
 * month ("2026-11") with IP_SCRAMBLE_SECRET. So two uploads from one address in the same month
 * match, nothing can be turned back into the address, and only someone holding the secret could
 * check an address the police already have against what we kept (the secret is set by hand in
 * Cloudflare and never in the repository).
 * Who calls it: server/picture-check.ts for every upload (section 4 of Robert's brief: the
 * evidence about a suspected child abuse image keeps it); bundle 12 part f reuses it for sign-ups.
 */
import { hmacHex } from './signup-context';

/** A scrambled address and the month whose key scrambled it. */
export interface ScrambledIp {
  value: string;
  period: string;
}

/**
 * The month a key belongs to, in UTC: "2026-11".
 *
 * @param moment - the time of the request
 * @returns the month label
 */
export function scramblePeriod(moment: Date): string {
  const month = String(moment.getUTCMonth() + 1).padStart(2, '0');
  return `${moment.getUTCFullYear()}-${month}`;
}

/**
 * The visitor's address as Cloudflare passes it (CF-Connecting-IP); locally there is none.
 *
 * @param request - the incoming request
 * @returns the address, or null
 */
export function visitorIp(request: Request): string | null {
  const address = request.headers.get('CF-Connecting-IP')?.trim() ?? '';
  return address === '' ? null : address;
}

/**
 * Scrambles an address with this month's key.
 *
 * @param address - the IP address, or null when there is none
 * @param secret - IP_SCRAMBLE_SECRET, or undefined when it isn't set
 * @param moment - the time of the request (the month picks the key)
 * @returns the scrambled address and its month, or null when there is no address or no secret
 */
export async function scrambleIp(
  address: string | null,
  secret: string | undefined,
  moment: Date,
): Promise<ScrambledIp | null> {
  // Step 1: nothing to scramble, or no key to scramble it with: keep nothing.
  if (address === null || secret === undefined || secret === '') return null;
  // Step 2: this month's key, then the address under it.
  const period = scramblePeriod(moment);
  const monthKey = await hmacHex(period, secret);
  return { value: await hmacHex(address, monthKey), period };
}
