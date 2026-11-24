/**
 * The account's copy of remembered places (design books item 17, "Don't start from zero"), so a
 * signed-in person finds the same place on every device.
 *
 * Who calls it: useRememberedPlace.ts. What it calls: remembered_places (read, own rows only by
 * RLS) and remember_place() (write). Migration: 20270205100434_books17_remembered_places.sql.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import type { RememberedPlaceKind } from './localPlaces';

/**
 * Reads one of the caller's places from the account.
 *
 * @param client - the Supabase client
 * @param kind - what is remembered
 * @param itemKey - the story's address or the hint's name
 * @returns the place, or null when there is none
 * @throws when the database refuses the read
 */
export async function fetchRememberedPlace(
  client: AppSupabaseClient,
  kind: RememberedPlaceKind,
  itemKey: string,
): Promise<Json | null> {
  const { data, error } = await client
    .from('remembered_places')
    .select('place')
    .eq('kind', kind)
    .eq('item_key', itemKey)
    .maybeSingle();
  if (error !== null) throw new Error(`The remembered place was not read: ${error.message}`);
  return data?.place ?? null;
}

/**
 * Keeps one of the caller's places in the account, replacing the one before.
 *
 * @param client - the Supabase client
 * @param kind - what is remembered
 * @param itemKey - the story's address or the hint's name
 * @param place - the place (small JSON, at most 2 KB)
 * @throws when the database refuses the save (signed out, or the place is too big)
 */
export async function saveRememberedPlace(
  client: AppSupabaseClient,
  kind: RememberedPlaceKind,
  itemKey: string,
  place: Json,
): Promise<void> {
  const { error } = await client.rpc('remember_place', {
    place_kind: kind,
    place_key: itemKey,
    place_value: place,
  });
  if (error !== null) throw new Error(`The place was not kept: ${error.message}`);
}
