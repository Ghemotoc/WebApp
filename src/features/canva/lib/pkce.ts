/**
 * PKCE for connecting Canva (story S1-E3-12; ADR 0009; RFC 7636).
 *
 * Before sending the writer to Canva's consent page, the tab makes a random secret (the
 * verifier) and sends only its SHA-256 (the challenge). When Canva sends the tab back with a
 * code, only the tab that holds the verifier can swap that code for tokens. The state is a second
 * random text that must come back unchanged, so a link someone else made can't connect their
 * Canva account to this writer.
 * Who calls it: lib/canvaTrip.ts.
 */

/**
 * Bytes as base64url, with no padding.
 *
 * @returns the text
 */
function toBase64Url(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/**
 * A random 43-character text (32 random bytes), used for the verifier and the state.
 *
 * @returns the text
 */
export function randomPkceText(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

/**
 * The challenge for a verifier: its SHA-256, base64url (the "S256" method).
 *
 * @param verifier - from randomPkceText()
 * @returns the challenge
 */
export async function codeChallengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return toBase64Url(new Uint8Array(digest));
}
