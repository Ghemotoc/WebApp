/**
 * Comparing secrets without leaking them through timing (independent QA check, 5 Nov 2026,
 * finding X3; OWASP ASVS 6.2.x).
 *
 * Who calls it: server/send-email.ts (the Auth hook signature) and server/support-emails.ts (the
 * inbound key). What it calls next: nothing.
 * Why: `a === b` stops at the first character that differs, so how long it takes hints at how
 * much of a guess was right. This walks the whole text every time.
 */

/**
 * Whether two texts are equal, comparing every character so the time taken says nothing about
 * where they differ.
 *
 * @param given - what the caller sent
 * @param expected - what it should be
 * @returns true when they match exactly
 */
export function sameText(given: string, expected: string): boolean {
  // A different length can't match; the length of a signature or key is not a secret.
  if (given.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= given.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}
