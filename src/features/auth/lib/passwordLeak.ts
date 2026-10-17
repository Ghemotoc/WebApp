/**
 * Checks whether a password appears in known data breaches, without sending it anywhere
 * (story S1-E2-01: "checked against known breached passwords"; ADR 0003; decided 17 Oct 2026, 19:43, Q3).
 *
 * How (k-anonymity): the browser hashes the password with SHA-1, sends only the first 5 characters
 * of the hash to our own /api/password-check (server/password-check.ts), gets back every leaked
 * hash that starts with them, and compares the rest of its hash here. The password and its full
 * hash never leave this browser.
 * Who calls it: SignUpForm (S1-E2-01) and the new-password form (S1-E2-05).
 * If the check can't be reached it answers "unknown" and the form lets the password through: the
 * check protects the person, it isn't a gate (NIST SP 800-63B treats it as a check where available).
 */

/** What the check found. */
export type PasswordLeakResult = 'leaked' | 'not_leaked' | 'unknown';

/**
 * The SHA-1 of a text, as uppercase hexadecimal.
 *
 * @param text - the password
 * @returns 40 hexadecimal characters
 */
async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Says whether a range list holds this hash's rest with a count above zero (padding rows say 0).
 *
 * @param rangeList - lines of "SUFFIX:COUNT"
 * @param suffix - the last 35 characters of the hash
 * @returns true when the password has leaked
 */
export function rangeListContains(rangeList: string, suffix: string): boolean {
  return rangeList.split(/\r?\n/).some((line) => {
    const [lineSuffix, count] = line.trim().split(':');
    return lineSuffix === suffix && Number(count) > 0;
  });
}

/**
 * Checks one password.
 *
 * @param password - what the person typed (never sent anywhere)
 * @returns 'leaked', 'not_leaked', or 'unknown' when the check couldn't be reached
 */
export async function checkPasswordLeak(password: string): Promise<PasswordLeakResult> {
  try {
    // Step 1: hash in the browser and keep the full hash here.
    const hash = await sha1Hex(password);
    // Step 2: ask for every leaked hash that starts with the same 5 characters.
    const response = await fetch('/api/password-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: hash.slice(0, 5) }),
    });
    if (!response.ok) return 'unknown';
    // Step 3: compare the rest of the hash locally.
    return rangeListContains(await response.text(), hash.slice(5)) ? 'leaked' : 'not_leaked';
  } catch {
    return 'unknown';
  }
}
