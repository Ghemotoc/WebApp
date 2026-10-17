/**
 * Hashes an email the way the database does, so the log-in pause never sends the email itself
 * (story S1-E2-05).
 *
 * Who calls it: api/signIn.ts, before asking sign_in_pause_until() or record_sign_in_failure().
 * The database's hash_email() makes the same hash (SHA-256 in hex of the email in lower case
 * without outer spaces) for clear_my_sign_in_failures(), so both must stay in step.
 */

/**
 * Hashes an email.
 *
 * @param email - as typed
 * @returns 64 lower-case hexadecimal characters
 * Errors: throws when the browser has no Web Crypto (every supported browser has it).
 */
export async function hashEmail(email: string): Promise<string> {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
