/**
 * The writer's Canva connection in our database, read and written as the writer (story
 * S1-E3-12; ADR 0009).
 *
 * Every call uses the writer's own sign-in token and the anon key, never a service key
 * (CLAUDE.md rule 2): canva_connections_select_own lets the writer read their own row, and
 * save_canva_connection() and disconnect_canva() do the writing. The tokens are encrypted before
 * they get here and decrypted only when used (tokens.ts).
 * Who calls it: server/canva.ts.
 */
import type { CanvaFailure } from '../../src/schemas/canva';

import { decryptToken, encryptToken } from './tokens';
import type { CanvaService, CanvaTokens } from './types';

/** Where the database is and who is asking. */
export interface DatabaseAccess {
  supabaseUrl: string;
  anonKey: string;
  /** The writer's sign-in token. */
  token: string;
}

/** An access token refreshed this close to expiry, so it never runs out mid-request. */
const refreshMarginMilliseconds = 60 * 1000;

/**
 * The headers for a call as the writer.
 *
 * @returns the headers
 */
function headersFor(access: DatabaseAccess): Record<string, string> {
  return {
    apikey: access.anonKey,
    Authorization: `Bearer ${access.token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Whether Canva covers are on (the canva_covers flag, which anyone may read).
 *
 * @returns true when on; false when off or unreadable
 */
export async function isCanvaOn(access: DatabaseAccess): Promise<boolean> {
  const response = await fetch(
    `${access.supabaseUrl}/rest/v1/feature_flags?key=eq.canva_covers&select=is_enabled`,
    { headers: headersFor(access) },
  ).catch(() => null);
  if (response === null || !response.ok) return false;
  const rows = (await response.json().catch(() => [])) as { is_enabled?: boolean }[];
  return rows[0]?.is_enabled === true;
}

/**
 * Reads and decrypts the writer's tokens.
 *
 * @param key - the token key
 * @returns the tokens; null when there is no connection or it can't be decrypted
 */
export async function readTokens(
  access: DatabaseAccess,
  key: CryptoKey,
): Promise<CanvaTokens | null> {
  const response = await fetch(
    `${access.supabaseUrl}/rest/v1/canva_connections?select=access_token_ciphertext,refresh_token_ciphertext,access_expires_at`,
    { headers: headersFor(access) },
  ).catch(() => null);
  if (response === null || !response.ok) return null;
  const rows = (await response.json().catch(() => [])) as {
    access_token_ciphertext: string;
    refresh_token_ciphertext: string;
    access_expires_at: string;
  }[];
  const row = rows[0];
  if (row === undefined) return null;
  const accessToken = await decryptToken(key, row.access_token_ciphertext);
  const refreshToken = await decryptToken(key, row.refresh_token_ciphertext);
  if (accessToken === null || refreshToken === null) return null;
  return { accessToken, refreshToken, expiresAt: new Date(row.access_expires_at) };
}

/**
 * Encrypts and saves the writer's tokens through save_canva_connection().
 *
 * @returns null when saved, otherwise why not
 */
export async function saveTokens(
  access: DatabaseAccess,
  key: CryptoKey,
  tokens: CanvaTokens,
): Promise<CanvaFailure | null> {
  const response = await fetch(`${access.supabaseUrl}/rest/v1/rpc/save_canva_connection`, {
    method: 'POST',
    headers: headersFor(access),
    body: JSON.stringify({
      access_ciphertext: await encryptToken(key, tokens.accessToken),
      refresh_ciphertext: await encryptToken(key, tokens.refreshToken),
      access_expires: tokens.expiresAt.toISOString(),
    }),
  }).catch(() => null);
  if (response === null) return 'unreachable';
  if (response.ok) return null;
  const refusal = (await response.json().catch(() => ({}))) as { code?: string };
  if (refusal.code === '0A000') return 'switched_off';
  if (refusal.code === '42501') return 'account';
  return 'unreachable';
}

/**
 * Removes the writer's connection through disconnect_canva().
 *
 * @returns true when removed (or there was none); false when the database refused or was away
 */
export async function removeConnection(access: DatabaseAccess): Promise<boolean> {
  const response = await fetch(`${access.supabaseUrl}/rest/v1/rpc/disconnect_canva`, {
    method: 'POST',
    headers: headersFor(access),
    body: '{}',
  }).catch(() => null);
  return response?.ok === true;
}

/**
 * An access token that works now: the stored one, or a refreshed one (saved straight away).
 *
 * @param canva - the service, for the refresh
 * @returns the token; null when there is no connection or Canva no longer accepts it
 */
export async function usableAccessToken(
  access: DatabaseAccess,
  key: CryptoKey,
  canva: CanvaService,
): Promise<string | null> {
  const tokens = await readTokens(access, key);
  if (tokens === null) return null;
  // Step 1: still good for more than a minute: use it.
  if (tokens.expiresAt.getTime() - Date.now() > refreshMarginMilliseconds) {
    return tokens.accessToken;
  }
  // Step 2: refresh, and keep the new pair (Canva's refresh tokens are single use).
  const refreshed = await canva.refresh(tokens.refreshToken);
  if (refreshed === null) return null;
  const failure = await saveTokens(access, key, refreshed);
  return failure === null ? refreshed.accessToken : null;
}
