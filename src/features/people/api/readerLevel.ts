/**
 * Reader levels: reads a profile's reading level for the profile page (bundle G7a).
 *
 * The level is worked out in the database from chapters read and stories finished, never from
 * time spent, and nobody can set it by hand. Others see it only when its owner turned on "Show it
 * on my profile" in Settings › Privacy; the owner always sees their own.
 * Who calls it: hooks/useReaderLevel.ts, and ReaderLevelPanel and WriterProfilePage for
 * showsReaderLevelPanel(). What it calls next: profile_reader_level()
 * (supabase/migrations/…_g7a_reader_levels.sql).
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { readerLevelFrom, type ReaderLevel } from '../lib/readerLevels';

/** A profile's reading level with the counts it comes from. */
export interface ProfileReaderLevel {
  /** null before the first chapter read (only the owner ever sees that). */
  level: ReaderLevel | null;
  chaptersRead: number;
  storiesFinished: number;
  /** Whether the owner shows it on their profile. */
  isShown: boolean;
  /** Whether the person looking is the profile's owner. */
  isOwn: boolean;
}

/**
 * Reads profile_reader_level()'s JSON.
 *
 * @param data - the JSON, or null when there is nothing the viewer may see
 * @returns the level, or null
 */
export function profileReaderLevelFrom(data: Json): ProfileReaderLevel | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
  const chaptersRead = data['chapters_read'];
  const storiesFinished = data['stories_finished'];
  if (typeof chaptersRead !== 'number' || typeof storiesFinished !== 'number') return null;
  return {
    level: readerLevelFrom(data['level']),
    chaptersRead,
    storiesFinished,
    isShown: data['is_shown'] === true,
    isOwn: data['is_own'] === true,
  };
}

/**
 * A profile's reading level.
 *
 * @param client - the Supabase client
 * @param handle - the profile's username
 * @returns the level, or null when the owner keeps it hidden from this viewer
 * @throws the Supabase error when the read fails, so the screen can say so
 */
export async function fetchProfileReaderLevel(
  client: AppSupabaseClient,
  handle: string,
): Promise<ProfileReaderLevel | null> {
  const { data, error } = await client.rpc('profile_reader_level', { wanted_handle: handle });
  if (error) throw new Error(`Couldn't read the reading level: ${error.message}`);
  return profileReaderLevelFrom(data);
}

/**
 * Whether the card has anything to show this viewer.
 *
 * @param reading - the level as read, or null when hidden from this viewer
 * @returns true for the owner, or for others when a shown level exists
 */
export function showsReaderLevelPanel(reading: ProfileReaderLevel | null): boolean {
  if (reading === null) return false;
  return reading.isOwn || (reading.isShown && reading.level !== null);
}
