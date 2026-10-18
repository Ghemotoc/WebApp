/**
 * Reads and saves the signed-in person's username and pen name (story S1-E2-04).
 *
 * Who calls it: the hooks in src/features/account/hooks/.
 * What it calls next: Supabase.
 * - Reading: profiles through the profiles_select_own policy (a person reads only their own row),
 *   and the public settings handle_change_days and pen_name_change_days.
 * - Checking and saving: check_handle(), set_my_handle() and set_my_pen_name()
 *   (supabase/migrations/…_s1_e2_04_handles.sql). They answer with an outcome ('ok' or why not);
 *   only a broken connection or a signed-out session is an error.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { toHandleOutcome, type HandleOutcome, type PenNameOutcome } from '../lib/nameRules';

/** The signed-in person's names and when they last changed. */
export interface MyNames {
  handle: string | null;
  penName: string | null;
  handleChangedAt: string | null;
  penNameChangedAt: string | null;
}

/** The days between changes, from settings. */
export interface NameChangeDays {
  handle: number;
  penName: number;
}

/** The waiting time when the settings can't be read: the decided 30 days (Q11). */
const defaultChangeDays = 30;

/**
 * Reads the signed-in person's names.
 *
 * @param client - the shared Supabase client
 * @returns the names, or null when the person has no profile (signed out)
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchMyNames(client: AppSupabaseClient): Promise<MyNames | null> {
  const { data, error } = await client
    .from('profiles')
    .select('handle, pen_name, handle_changed_at, pen_name_changed_at')
    .maybeSingle();
  if (error !== null) throw new Error(`Could not read your names: ${error.message}`);
  if (data === null) return null;
  // Missing values read as null, so every screen can rely on one shape.
  return {
    handle: data.handle ?? null,
    penName: data.pen_name ?? null,
    handleChangedAt: data.handle_changed_at ?? null,
    penNameChangedAt: data.pen_name_changed_at ?? null,
  };
}

/**
 * Reads how many days a name must wait between changes.
 *
 * @param client - the shared Supabase client
 * @returns the days for each name; 30 for any setting that is missing
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchNameChangeDays(client: AppSupabaseClient): Promise<NameChangeDays> {
  const { data, error } = await client
    .from('settings')
    .select('key, value')
    .in('key', ['handle_change_days', 'pen_name_change_days']);
  if (error !== null) throw new Error(`Could not read the name settings: ${error.message}`);
  // Each value is a JSON number; anything else falls back to the decided 30 days.
  const daysFor = (key: string) => {
    const value = data.find((setting) => setting.key === key)?.value;
    return typeof value === 'number' ? value : defaultChangeDays;
  };
  return { handle: daysFor('handle_change_days'), penName: daysFor('pen_name_change_days') };
}

/**
 * Asks whether a username is allowed for the signed-in person.
 *
 * @param client - the shared Supabase client
 * @param candidate - the username as typed
 * @returns 'ok' or why not
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function checkHandle(
  client: AppSupabaseClient,
  candidate: string,
): Promise<HandleOutcome> {
  const { data, error } = await client.rpc('check_handle', { candidate });
  if (error !== null) throw new Error(`Could not check the username: ${error.message}`);
  return toHandleOutcome(data);
}

/**
 * Saves the signed-in person's username.
 *
 * @param client - the shared Supabase client
 * @param newHandle - the username as typed
 * @returns 'ok' or why not (including 'too_soon' within 30 days of the last change)
 * Errors: throws when the database can't be reached or the person is signed out.
 */
export async function saveHandle(
  client: AppSupabaseClient,
  newHandle: string,
): Promise<HandleOutcome> {
  const { data, error } = await client.rpc('set_my_handle', { new_handle: newHandle });
  if (error !== null) throw new Error(`Could not save the username: ${error.message}`);
  return toHandleOutcome(data);
}

/**
 * Saves (or, with an empty value, removes) the signed-in person's pen name.
 *
 * @param client - the shared Supabase client
 * @param newPenName - the pen name as typed
 * @returns 'ok' or why not
 * Errors: throws when the database can't be reached, the person is signed out, or the answer is
 *   unexpected.
 */
export async function savePenName(
  client: AppSupabaseClient,
  newPenName: string,
): Promise<PenNameOutcome> {
  const { data, error } = await client.rpc('set_my_pen_name', { new_pen_name: newPenName });
  if (error !== null) throw new Error(`Could not save the pen name: ${error.message}`);
  // The pen name outcomes are a subset of the username ones, so the same guard applies.
  const outcome = toHandleOutcome(data);
  if (
    outcome === 'too_short' ||
    outcome === 'spaces' ||
    outcome === 'taken' ||
    outcome === 'reserved'
  ) {
    throw new Error(`Unexpected answer from the pen name check: ${outcome}`);
  }
  return outcome;
}
