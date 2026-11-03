/**
 * Who on the team opened uploaded pictures' original files this week, for the people alerted
 * (bundle ADMIN-2, part e2a; Robert's brief of 2 Nov 2026, section 5: the owner is alerted "by
 * email and in the admin site").
 *
 * Who calls it: hooks/usePictureOpenings.ts (the panel on the staff home page).
 * What it calls next: admin_recent_picture_openings(), which answers only for every owner and the
 * usernames in the setting picture_open_alert_handles, and null for everyone else.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** One staff member's openings in the last seven days. */
export interface PictureOpening {
  staffHandle: string;
  openings: number;
  lastOpenedAt: string;
}

/**
 * Reads one entry of the database's answer, skipping anything malformed.
 *
 * @param entry - one JSON object
 * @returns the entry, or null when a field is missing
 */
function openingFrom(entry: Json): PictureOpening | null {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return null;
  const { staffHandle, openings, lastOpenedAt } = entry;
  if (typeof staffHandle !== 'string' || typeof openings !== 'number') return null;
  if (typeof lastOpenedAt !== 'string') return null;
  return { staffHandle, openings, lastOpenedAt };
}

/**
 * Lists this week's openings.
 *
 * @param client - the shared Supabase client
 * @returns the openings, newest first; null when the caller isn't someone who is alerted
 * Errors: throws an Error with the database's message when the call fails.
 */
export async function fetchPictureOpenings(
  client: AppSupabaseClient,
): Promise<PictureOpening[] | null> {
  const { data, error } = await client.rpc('admin_recent_picture_openings');
  if (error !== null) throw new Error(error.message);
  if (!Array.isArray(data)) return null;
  const openings: PictureOpening[] = [];
  for (const entry of data) {
    const opening = openingFrom(entry);
    if (opening !== null) openings.push(opening);
  }
  return openings;
}
