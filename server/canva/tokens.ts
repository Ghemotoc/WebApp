/**
 * Encrypts and decrypts the writer's Canva tokens (story S1-E3-12; ADR 0009).
 *
 * Canva's tokens let anyone holding them act in the writer's Canva account, so neither the
 * database nor the browser ever sees them in plain text. Our server encrypts each token with
 * AES-GCM and the key CANVA_TOKEN_KEY (32 random bytes, base64, kept only in Cloudflare's
 * secrets) before saving it, and decrypts it only for the one call it needs.
 * A ciphertext reads "v1.<iv>.<ciphertext>", both parts base64url; "v1" leaves room for a new key.
 * Who calls it: server/canva.ts.
 */

/**
 * Bytes as base64url, with no padding.
 *
 * @returns the text
 */
export function toBase64Url(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/**
 * base64 or base64url text as bytes.
 *
 * @returns the bytes
 * Errors: throws on text that isn't base64.
 */
export function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  const standard = text.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(standard + '='.repeat((4 - (standard.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/**
 * Turns the secret into an AES-GCM key.
 *
 * @param secret - CANVA_TOKEN_KEY: 32 bytes as base64
 * @returns the key, or null when the secret is missing or the wrong size
 */
export async function tokenKeyFrom(secret: string | undefined): Promise<CryptoKey | null> {
  if (secret === undefined || secret === '') return null;
  const bytes = (() => {
    try {
      return fromBase64(secret);
    } catch {
      return null;
    }
  })();
  if (bytes === null || bytes.length !== 32) return null;
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/**
 * Encrypts one token.
 *
 * @param key - from tokenKeyFrom()
 * @param token - the token in plain text
 * @returns "v1.<iv>.<ciphertext>"
 */
export async function encryptToken(key: CryptoKey, token: string): Promise<string> {
  // A fresh 12-byte IV every time, as AES-GCM needs.
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(token),
  );
  return `v1.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(sealed))}`;
}

/**
 * Decrypts one token.
 *
 * @param key - from tokenKeyFrom()
 * @param ciphertext - what encryptToken() made
 * @returns the token, or null when it isn't ours (another key, changed or cut text)
 */
export async function decryptToken(key: CryptoKey, ciphertext: string): Promise<string | null> {
  const [version, iv, sealed] = ciphertext.split('.');
  if (version !== 'v1' || iv === undefined || sealed === undefined) return null;
  try {
    const opened = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromBase64(iv) },
      key,
      fromBase64(sealed),
    );
    return new TextDecoder().decode(opened);
  } catch {
    // AES-GCM refuses anything changed: treat it as no connection, never as an error to show.
    return null;
  }
}
