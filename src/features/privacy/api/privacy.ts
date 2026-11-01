/**
 * Privacy settings and online status (story S1-E13-01; GDPR art. 25(2), privacy by default).
 *
 * Who calls it: the hooks in ../hooks (Settings › Privacy, the heartbeat and the online dot).
 * What it calls next: my_privacy_settings(), set_profile_audience(), set_library_audience(),
 * set_shows_online_status(), note_i_am_online() and who_is_online()
 * (supabase/migrations/…_s1_e13_01_privacy_settings.sql). The database fills in each setting's
 * default for the person's age group, so an under-18 starts on the most private value.
 */
import type { Database } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** Who sees the whole profile: everyone, people with an account, or people the owner follows. */
export type ProfileAudience = Database['public']['Enums']['profile_audience'];

/** Who sees the library shelf on the profile. */
export type LibraryAudience = Database['public']['Enums']['library_audience'];

/** Who may start a chat (owned by Messages, S1-E9-04; shown here as a line with Change). */
export type MessageAudience = Database['public']['Enums']['message_audience'];

/** The profile choices, in the order Settings shows them (board 6.3). */
export const profileAudiences: readonly ProfileAudience[] = [
  'everyone',
  'members',
  'people_i_follow',
];

/** The library choices, in the order Settings shows them (board 6.3). */
export const libraryAudiences: readonly LibraryAudience[] = [
  'only_me',
  'people_i_follow',
  'everyone',
];

/** The caller's privacy settings, with the defaults filled in. */
export interface PrivacySettings {
  profileAudience: ProfileAudience;
  libraryAudience: LibraryAudience;
  showsOnlineStatus: boolean;
  messageAudience: MessageAudience;
  /** Shows the note that every setting started at its most private choice (criterion 2). */
  isUnder18: boolean;
}

/** The answer of my_privacy_settings(), as JSON. */
interface PrivacySettingsRow {
  profile_audience: ProfileAudience;
  library_audience: LibraryAudience;
  shows_online_status: boolean;
  message_audience: MessageAudience;
  is_under_18: boolean;
}

/**
 * Reads the caller's privacy settings.
 *
 * @param client - the shared Supabase client
 * @returns the settings
 * Errors: throws with Supabase's message (signed out, or the database can't be reached).
 */
export async function fetchPrivacySettings(client: AppSupabaseClient): Promise<PrivacySettings> {
  const { data, error } = await client.rpc('my_privacy_settings');
  if (error !== null) throw new Error(`Could not read the privacy settings: ${error.message}`);
  const row = data as unknown as PrivacySettingsRow;
  return {
    profileAudience: row.profile_audience,
    libraryAudience: row.library_audience,
    showsOnlineStatus: row.shows_online_status,
    messageAudience: row.message_audience,
    isUnder18: row.is_under_18,
  };
}

/**
 * Saves who sees the caller's whole profile.
 *
 * @throws Error with Supabase's message when the save is refused
 */
export async function saveProfileAudience(
  client: AppSupabaseClient,
  audience: ProfileAudience,
): Promise<void> {
  const { error } = await client.rpc('set_profile_audience', { audience });
  if (error !== null) throw new Error(`Could not save who sees your profile: ${error.message}`);
}

/**
 * Saves who sees the caller's library shelf.
 *
 * @throws Error with Supabase's message when the save is refused
 */
export async function saveLibraryAudience(
  client: AppSupabaseClient,
  audience: LibraryAudience,
): Promise<void> {
  const { error } = await client.rpc('set_library_audience', { audience });
  if (error !== null) throw new Error(`Could not save who sees your library: ${error.message}`);
}

/**
 * Turns "Show when I'm online" on or off; off forgets the last active time.
 *
 * @throws Error with Supabase's message when the save is refused
 */
export async function saveShowsOnlineStatus(
  client: AppSupabaseClient,
  shouldShow: boolean,
): Promise<void> {
  const { error } = await client.rpc('set_shows_online_status', { should_show: shouldShow });
  if (error !== null) throw new Error(`Could not save your online status: ${error.message}`);
}

/**
 * Tells the database the caller has the app open; it keeps nothing while the switch is off.
 *
 * @throws Error with Supabase's message when the call fails
 */
export async function noteIAmOnline(client: AppSupabaseClient): Promise<void> {
  const { error } = await client.rpc('note_i_am_online');
  if (error !== null) throw new Error(`Could not note that you're online: ${error.message}`);
}

/**
 * Which of some usernames show as online to the caller.
 *
 * @param client - the shared Supabase client
 * @param handles - the usernames on screen (the database looks at the first 100)
 * @returns the online usernames, in lower case so the screen can compare them
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchOnlineHandles(
  client: AppSupabaseClient,
  handles: string[],
): Promise<Set<string>> {
  const { data, error } = await client.rpc('who_is_online', { wanted_handles: handles });
  if (error !== null) throw new Error(`Could not read who is online: ${error.message}`);
  return new Set((data ?? []).map((handle) => handle.toLowerCase()));
}
