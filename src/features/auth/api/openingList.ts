/**
 * "Tell me when you open here": joining the list, confirming the address and leaving it (bundle
 * G5, part a; story S1-E2-10; Robert, 7 Nov 2026, 11:57 UTC).
 *
 * Who calls it: components/OpeningListForm.tsx (join) and components/OpenHerePage.tsx (confirm,
 * remove).
 * What it calls next: our own POST /api/opening-list (server/opening-list.ts: the bot check, the
 * signature and the confirm email), and confirm_opening_list() / leave_opening_list() in the
 * database with the token from the emailed link (…_g5a_opening_list.sql).
 */
import type { OpeningListRequest } from '@/schemas/openingList';
import type { AppSupabaseClient } from '@/lib/supabase';

/** What joining can come to. */
export type JoinOutcome = 'listed' | 'invalid' | 'no_country' | 'already_open' | 'unavailable';

/** What following the emailed link can come to. */
export type LinkOutcome =
  | { kind: 'confirmed'; countryCode: string }
  | { kind: 'removed' }
  | { kind: 'not_found' }
  | { kind: 'unavailable' };

/** The server's error words, mapped to what the form shows. */
const joinFailures: Record<string, JoinOutcome> = {
  invalid: 'invalid',
  no_country: 'no_country',
  already_open: 'already_open',
};

/**
 * Sends the form to our server.
 *
 * @param request - the checked form
 * @returns 'listed' once the address is on the list (and a confirm email went, when one was
 *   due), or what went wrong
 */
export async function joinOpeningList(request: OpeningListRequest): Promise<JoinOutcome> {
  try {
    const response = await fetch('/api/opening-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (response.ok) return 'listed';
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return joinFailures[body?.error ?? ''] ?? 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/**
 * Confirms the address from the emailed link.
 *
 * @param client - the Supabase client (signed out is fine)
 * @param token - the token after "#" in the link
 * @returns the country it waits for, 'not_found' for a link that no longer works, or 'unavailable'
 */
export async function confirmOpeningList(
  client: AppSupabaseClient,
  token: string,
): Promise<LinkOutcome> {
  const { data, error } = await client.rpc('confirm_opening_list', { token });
  if (error !== null) {
    return error.hint === 'not_found' ? { kind: 'not_found' } : { kind: 'unavailable' };
  }
  return { kind: 'confirmed', countryCode: data };
}

/**
 * Takes the address off the list from the emailed link. A link that matches nothing (already
 * removed or deleted after 7 days) counts as removed: the address is off the list either way.
 *
 * @param client - the Supabase client (signed out is fine)
 * @param token - the token after "#" in the link
 * @returns 'removed', or 'unavailable' when the database can't be reached
 */
export async function leaveOpeningList(
  client: AppSupabaseClient,
  token: string,
): Promise<LinkOutcome> {
  const { error } = await client.rpc('leave_opening_list', { token });
  return error === null ? { kind: 'removed' } : { kind: 'unavailable' };
}
