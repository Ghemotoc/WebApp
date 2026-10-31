/**
 * Onboarding's calls (story S1-E2-06; board Onboarding 2.5).
 *
 * Who calls it: the hooks in ../hooks/.
 * What it calls next, all in …_s1_e2_06_onboarding.sql:
 * - my_onboarding(): whether the steps are due, the age group, the county, the likes and the
 *   adult messages switch (never the year of birth);
 * - the regions table and onboarding_topics(language): what the drop-down and chips offer;
 * - save_my_region(), save_my_preferences(), set_adults_may_message() and finish_onboarding().
 * Every write is the person's own; the database refuses anyone else.
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** What the steps know about the signed-in person. */
export interface MyOnboarding {
  /** The steps should show now (not yet set up, and past the age check). */
  isDue: boolean;
  hasHandle: boolean;
  ageBand: Enums<'age_band'>;
  regionCode: string | null;
  adultsMayMessage: boolean;
  readCategories: string[];
  writeCategories: string[];
  topicTagIds: string[];
}

/** What my_onboarding() answers. */
interface MyOnboardingRow {
  outcome: 'ok' | 'signed_out';
  is_due: boolean;
  has_handle: boolean;
  age_band: Enums<'age_band'>;
  region_code: string | null;
  adults_may_message: boolean;
  read_categories: string[];
  write_categories: string[];
  topic_tag_ids: string[];
}

/** One county in the drop-down. */
export interface Region {
  code: string;
  nameRo: string;
  nameEn: string;
}

/** One topic chip. */
export interface Topic {
  tagId: string;
  name: string;
}

/** The likes, as step 2 and Settings save them. */
export interface Preferences {
  readCategories: string[];
  writeCategories: string[];
  topicTagIds: string[];
}

/** The cache key of the signed-in person's onboarding. */
export const myOnboardingQueryKey = (userId: string | null) => ['my-onboarding', userId];

/**
 * Reads the signed-in person's onboarding.
 *
 * @param client - the shared Supabase client
 * @returns the details, or null when signed out
 * Errors: throws when the database can't be reached.
 */
export async function fetchMyOnboarding(client: AppSupabaseClient): Promise<MyOnboarding | null> {
  const answer = await client.rpc('my_onboarding');
  if (answer.error !== null) throw new Error(`Could not read onboarding: ${answer.error.message}`);
  const row = answer.data as unknown as MyOnboardingRow;
  if (row.outcome !== 'ok') return null;
  return {
    isDue: row.is_due,
    hasHandle: row.has_handle,
    ageBand: row.age_band,
    regionCode: row.region_code,
    adultsMayMessage: row.adults_may_message,
    readCategories: row.read_categories,
    writeCategories: row.write_categories,
    topicTagIds: row.topic_tag_ids,
  };
}

/**
 * Reads the counties, in alphabetical order of their Romanian names.
 *
 * @returns the counties
 * Errors: throws when the database can't be reached.
 */
export async function fetchRegions(client: AppSupabaseClient): Promise<Region[]> {
  const { data, error } = await client
    .from('regions')
    .select('code, name_ro, name_en')
    .order('name_ro');
  if (error !== null) throw new Error(`Could not read the counties: ${error.message}`);
  return data.map((row) => ({ code: row.code, nameRo: row.name_ro, nameEn: row.name_en }));
}

/**
 * Reads the topics a person can pick, named in one language.
 *
 * @param language - 'ro' or 'en'
 * @returns the topics, by name
 * Errors: throws when the database can't be reached.
 */
export async function fetchTopics(client: AppSupabaseClient, language: string): Promise<Topic[]> {
  const { data, error } = await client.rpc('onboarding_topics', { wanted_language: language });
  if (error !== null) throw new Error(`Could not read the topics: ${error.message}`);
  return data.map((row) => ({ tagId: row.tag_id, name: row.name }));
}

/**
 * Throws when a write was refused.
 *
 * @throws Error with the database's message
 */
function throwIfRefused(error: { message: string } | null, what: string): void {
  if (error !== null) throw new Error(`Could not save ${what}: ${error.message}`);
}

/**
 * Sets or clears the county.
 *
 * @param regionCode - a county code, or null to clear it
 * @throws Error when it was refused
 */
export async function saveRegion(client: AppSupabaseClient, regionCode: string | null) {
  const { error } = await client.rpc('save_my_region', {
    wanted_region: regionCode ?? undefined,
  });
  throwIfRefused(error, 'the county');
}

/**
 * Replaces the likes.
 *
 * @param preferences - categories to read and write, and topics
 * @throws Error when it was refused
 */
export async function savePreferences(client: AppSupabaseClient, preferences: Preferences) {
  const { error } = await client.rpc('save_my_preferences', {
    read_categories: preferences.readCategories,
    write_categories: preferences.writeCategories,
    topic_tag_ids: preferences.topicTagIds,
  });
  throwIfRefused(error, 'the likes');
}

/**
 * Switches adult messages on or off (16 and 17-year-olds only; S1-E9-03).
 *
 * @throws Error when it was refused
 */
export async function saveAdultsMayMessage(client: AppSupabaseClient, allowed: boolean) {
  const { error } = await client.rpc('set_adults_may_message', { allowed });
  throwIfRefused(error, 'the messages switch');
}

/**
 * Marks setup as done.
 *
 * @throws Error when it was refused (no username yet)
 */
export async function finishOnboarding(client: AppSupabaseClient) {
  const { error } = await client.rpc('finish_onboarding');
  throwIfRefused(error, 'the setup');
}
