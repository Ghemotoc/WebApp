/**
 * The leaked-password check's server side (story S1-E2-01; ADR 0003; decided 17 Oct 2026, 19:43, Q3).
 *
 * What it does: the sign-up and new-password forms hash the password in the browser (SHA-1) and
 * send only the first 5 characters of that hash here. This handler asks Have I Been Pwned's free
 * range service for every leaked-password hash starting with those 5 characters and hands the
 * list back; the browser checks the rest of its own hash against it (k-anonymity).
 * So: the password never leaves the browser, and Have I Been Pwned never sees the visitor's IP
 * address (it sees only ours). The 5 characters aren't personal data. No third-party script runs
 * on our pages (CLAUDE.md rule 7).
 * Who calls it: functions/api/password-check.ts on Cloudflare Pages (staging and production) and
 * server/pages-functions-plugin.ts in local development and the end-to-end tests.
 * What it calls: https://api.pwnedpasswords.com/range/<prefix>, with padding switched on so the
 * answer's size doesn't hint at the prefix.
 */

/** Fetches the range list for a prefix; swapped for a stand-in in local tests. */
export type FetchPasswordRange = (prefix: string) => Promise<Response>;

/** A 5-character uppercase hexadecimal prefix, nothing else. */
const prefixPattern = /^[0-9A-F]{5}$/;

/**
 * Asks Have I Been Pwned for one range (the real service).
 *
 * @param prefix - 5 hexadecimal characters
 * @returns the service's answer
 */
export const fetchFromHaveIBeenPwned: FetchPasswordRange = (prefix) =>
  fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: { 'Add-Padding': 'true', 'User-Agent': 'password-check (Cloudflare Pages Function)' },
  });

/**
 * Answers one request from the browser.
 *
 * @param request - a POST with JSON { "prefix": "ABCDE" }
 * @param fetchRange - how to reach the range service
 * @returns 200 with the range list as plain text; 400 for anything but a 5-character prefix;
 *   502 when the service can't be reached (the form then lets the password through rather than
 *   blocking sign-up, and says nothing).
 * Errors: none thrown; every failure is an HTTP answer. Nothing is logged (CLAUDE.md rule 12).
 */
export async function handlePasswordCheck(
  request: Request,
  fetchRange: FetchPasswordRange,
): Promise<Response> {
  // Step 1: accept exactly one 5-character prefix, so this can't be used to fetch anything else.
  const body = (await request.json().catch(() => null)) as { prefix?: unknown } | null;
  const prefix = typeof body?.prefix === 'string' ? body.prefix.toUpperCase() : '';
  if (request.method !== 'POST' || !prefixPattern.test(prefix)) {
    return new Response('Send {"prefix": "<5 hexadecimal characters>"}.', { status: 400 });
  }
  // Step 2: ask the range service and pass its list back unchanged.
  try {
    const upstream = await fetchRange(prefix);
    if (!upstream.ok) return new Response('The check is unavailable.', { status: 502 });
    return new Response(await upstream.text(), {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch {
    return new Response('The check is unavailable.', { status: 502 });
  }
}
