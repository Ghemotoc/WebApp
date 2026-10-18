/**
 * The sign-up context's server side: the visitor's country from the connection, signed so the
 * database can trust it (story S1-E2-10; decided 16 Oct 2026, Q20; 17 Oct 2026, 19:43, Q6a).
 *
 * What it does: Cloudflare puts the country of the visitor's connection on every request
 * (`request.cf.country`, and the `CF-IPCountry` header). This handler reads only that two-letter
 * code and returns it with a token: an HMAC-SHA256 signature over the code and the time, made with
 * the secret SIGNUP_CONTEXT_SECRET. The sign-up form sends the token with the sign-up, and the
 * sign-up trigger checks it with the same secret (kept in Supabase Vault) before storing the code.
 * A token lasts 10 minutes.
 * Never stored, never logged: the IP address (Cloudflare reads it to find the country; we never
 * see it here). Only the country code reaches the database (CLAUDE.md rule 12).
 * Who calls it: functions/api/signup-context.ts on Cloudflare Pages and
 * server/pages-functions-plugin.ts locally (with a fake country, LOCAL_FAKE_COUNTRY).
 */

/** The token format's version, first in every token. */
const tokenVersion = 'v1';

/** Cloudflare's codes that are not countries: XX (unknown) and T1 (Tor). */
const notCountries = new Set(['XX', 'T1']);

/** What the form receives. */
export interface SignupContext {
  /** The two-letter country code (ISO 3166-1 alpha-2), or null when it isn't known. */
  country: string | null;
  /** The signed token for the sign-up, or null when there is no country or no secret. */
  token: string | null;
}

/**
 * Reads the country Cloudflare found for the connection.
 *
 * @param request - the incoming request
 * @param cloudflareCountry - request.cf?.country, when Cloudflare provides it
 * @returns the code in upper case, or null for unknown, Tor or anything that isn't a country code
 */
export function countryOfConnection(request: Request, cloudflareCountry?: string): string | null {
  const code = (cloudflareCountry ?? request.headers.get('CF-IPCountry') ?? '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || notCountries.has(code)) return null;
  return code;
}

/**
 * Signs a text with HMAC-SHA256.
 *
 * @param text - what to sign
 * @param secret - the shared secret
 * @returns the signature in lower-case hexadecimal (the form Postgres's encode(…, 'hex') gives)
 */
export async function hmacHex(text: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(text));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

/**
 * Makes a token for a country at a moment.
 *
 * @param country - the code
 * @param issuedAtSeconds - Unix time in seconds
 * @param secret - the shared secret
 * @returns "v1.<country>.<seconds>.<signature>"
 */
export async function makeSignupToken(
  country: string,
  issuedAtSeconds: number,
  secret: string,
): Promise<string> {
  const signedPart = `${tokenVersion}.${country}.${String(issuedAtSeconds)}`;
  return `${signedPart}.${await hmacHex(signedPart, secret)}`;
}

/**
 * Answers GET /api/signup-context.
 *
 * @param request - the request
 * @param options.cloudflareCountry - request.cf?.country (Cloudflare) or the local fake country
 * @param options.secret - SIGNUP_CONTEXT_SECRET; without it no token is made (the country then
 *   counts as unknown, which the invited test still admits, Q6b)
 * @param options.now - the current time (passed in so tests are exact)
 * @returns 200 with JSON { country, token }, never cached
 * Errors: none thrown; nothing is logged.
 */
export async function handleSignupContext(
  request: Request,
  options: { cloudflareCountry?: string; secret?: string; now: Date },
): Promise<Response> {
  // Step 1: the country, and a token only when there is both a country and a secret.
  const country = countryOfConnection(request, options.cloudflareCountry);
  const secret = options.secret ?? '';
  const issuedAt = Math.floor(options.now.getTime() / 1000);
  const token =
    country === null || secret === '' ? null : await makeSignupToken(country, issuedAt, secret);
  // Step 2: answer; a country is about this visitor right now, so nothing may cache it.
  const body: SignupContext = { country, token };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
