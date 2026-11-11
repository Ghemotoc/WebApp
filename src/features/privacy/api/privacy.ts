/**
 * Privacy settings and online status (story S1-E13-01; GDPR art. 25(2), privacy by default).
 *
 * Who calls it: the hooks in ../hooks (Settings › Privacy, the heartbeat and the online dot).
 * What it calls next: my_privacy_settings(), set_profile_audience(), set_library_audience(),
 * set_shows_online_status(), note_i_am_online() and who_is_online()
 * (supabase/migrations/…_s1_e13_01_privacy_settings.sql), and set_suggest_me() for "Suggest me
 * and my stories to other people" (…_look4c_02_rising_writers.sql, story S1-E5-11), and
 * set_shows_reader_level() for "Your reading level" (…_g7a_reader_levels.sql, bundle G7a), and
 * set_checks_personal_details() for the personal details heads-up (…_must1b_personal_details_check.sql,
 * MUST-1b). The database fills in each setting's
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
  /** "Suggest me and my stories to other people": on for 18+, off for under-18s until chosen. */
  suggestMe: boolean;
  /** For 13 to 15-year-olds, where the parent's separate yes stands (S1-E2-03b). */
  parentSpotlight: ParentSpotlight;
  /** True when a 13 to 15-year-old's parent already agreed to the account, so can be asked. */
  canAskParent: boolean;
  /** "Your reading level": false keeps it hidden (the default for everyone), true shows it. */
  showsReaderLevel: boolean;
  /**
   * The heads-up before sharing personal details (MUST-1b): always on under 18, an adult's own
   * choice otherwise (off until chosen).
   */
  checksPersonalDetails: boolean;
  /**
   * "Suggestions from my reading" (S1-E15-06): on for adults and off under 18 until chosen.
   */
  suggestsFromReading: boolean;
}

/** not_needed (16 and over), agreed, asked (email sent, no answer yet) or none. */
export type ParentSpotlight = 'not_needed' | 'agreed' | 'asked' | 'none';

/** The answer of my_privacy_settings(), as JSON. */
interface PrivacySettingsRow {
  profile_audience: ProfileAudience;
  library_audience: LibraryAudience;
  shows_online_status: boolean;
  message_audience: MessageAudience;
  is_under_18: boolean;
  suggest_me: boolean;
  parent_spotlight: ParentSpotlight;
  can_ask_parent: boolean;
  shows_reader_level: boolean;
  checks_personal_details: boolean;
  suggests_from_reading: boolean;
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
    suggestMe: row.suggest_me,
    parentSpotlight: row.parent_spotlight,
    canAskParent: row.can_ask_parent,
    showsReaderLevel: row.shows_reader_level,
    checksPersonalDetails: row.checks_personal_details,
    suggestsFromReading: row.suggests_from_reading,
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
 * Turns "Suggest me and my stories to other people" on or off (S1-E5-11). For a 13 to
 * 15-year-old, on means nothing until their parent also agrees (S1-E2-03b).
 *
 * @throws Error with Supabase's message when the save is refused
 */
export async function saveSuggestMe(
  client: AppSupabaseClient,
  shouldSuggest: boolean,
): Promise<void> {
  const { error } = await client.rpc('set_suggest_me', { should_suggest: shouldSuggest });
  if (error !== null) throw new Error(`Could not save Suggest me: ${error.message}`);
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

/** One kind of the member's data and how long it is kept (IDEAS-2a; retention_periods()). */
export type RetentionPeriod =
  Database['public']['Functions']['retention_periods']['Returns'][number];

/**
 * How long each kind of the caller's data is kept, from the settings the clean-up jobs read
 * (IDEAS-2a; idea IDEA-20261101-5).
 *
 * @param client - the shared Supabase client
 * @returns the periods, in the screen's order
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchRetentionPeriods(client: AppSupabaseClient): Promise<RetentionPeriod[]> {
  const { data, error } = await client.rpc('retention_periods');
  if (error !== null) throw new Error(`Could not read how long we keep things: ${error.message}`);
  return data ?? [];
}

/** "Your reading level" in Settings › Privacy: hidden (the default) or shown on the profile. */
export type ReaderLevelVisibility = 'hidden' | 'shown';

/** The two choices, in the order Settings shows them (Settings board, Privacy). */
export const readerLevelVisibilities: readonly ReaderLevelVisibility[] = ['hidden', 'shown'];

/**
 * Shows or hides the caller's reading level on their profile (bundle G7a).
 *
 * @param client - the shared Supabase client
 * @param visibility - 'shown' puts it on the profile, 'hidden' takes it off
 * @throws Error with Supabase's message when the save is refused
 */
export async function saveReaderLevelVisibility(
  client: AppSupabaseClient,
  visibility: ReaderLevelVisibility,
): Promise<void> {
  const { error } = await client.rpc('set_shows_reader_level', {
    should_show: visibility === 'shown',
  });
  if (error !== null) throw new Error(`Could not save your reading level choice: ${error.message}`);
}

/**
 * Saves whether the caller gets the heads-up before sharing personal details (MUST-1b).
 *
 * @param client - the shared Supabase client
 * @param shouldCheck - true to ask "Post anyway?" before text that looks like contact details
 * @throws Error with Supabase's message when the save is refused (under 18 it stays on)
 */
/**
 * Turns "Suggestions from my reading" on or off (S1-E15-06). Off takes the caller's finished
 * stories out of the next night's totals and hides "Because you read" at once.
 *
 * @throws Error with Supabase's message when the save is refused
 */
export async function saveSuggestsFromReading(
  client: AppSupabaseClient,
  shouldSuggest: boolean,
): Promise<void> {
  const { error } = await client.rpc('set_suggests_from_reading', {
    should_suggest: shouldSuggest,
  });
  if (error !== null)
    throw new Error(`Could not save Suggestions from my reading: ${error.message}`);
}

export async function saveChecksPersonalDetails(
  client: AppSupabaseClient,
  shouldCheck: boolean,
): Promise<void> {
  const { error } = await client.rpc('set_checks_personal_details', { should_check: shouldCheck });
  if (error !== null) throw new Error(`Could not save the heads-up setting: ${error.message}`);
}
