/**
 * Reads and saves the interface language on the signed-in person's account (story S1-E1-04).
 *
 * Who calls it: the hooks in src/features/language/hooks/.
 * What it calls next: Supabase. Reading goes to profiles.locale through the profiles_select_own
 * policy (a person reads only their own row); saving goes through set_my_locale(), which changes
 * the caller's own locale and nothing else (supabase/migrations/…_s1_e1_04_profile_locale.sql).
 * Signed out: there is no account, so reading answers null and nothing is saved.
 */
import { isSupportedLanguage, type SupportedLanguage } from '@/lib/i18n';
import type { AppSupabaseClient } from '@/lib/supabase';

/**
 * Says whether someone is signed in in this browser. Reads the stored session only; no network.
 *
 * @param client - the shared Supabase client
 * @returns true when there is a session
 */
export async function hasSignedInSession(client: AppSupabaseClient): Promise<boolean> {
  const { data } = await client.auth.getSession();
  return data.session !== null;
}

/**
 * Reads the language saved on the signed-in person's account.
 *
 * @param client - the shared Supabase client
 * @returns the account's language; null when signed out or the account has no profile yet
 * Errors: throws when the database can't be reached, with Supabase's message, so the caller can
 *   keep the device language and say nothing went wrong on screen (the page still works).
 */
export async function readAccountLanguage(
  client: AppSupabaseClient,
): Promise<SupportedLanguage | null> {
  // Step 1: no session, no account to read from.
  if (!(await hasSignedInSession(client))) return null;

  // Step 2: the row-level security policy returns the person's own profile only.
  const { data, error } = await client.from('profiles').select('locale').maybeSingle();
  if (error !== null) {
    throw new Error(`Could not read the account language: ${error.message}`);
  }

  // Step 3: ignore anything that isn't an interface language (the table's check prevents it).
  const accountLanguage = data?.locale;
  return isSupportedLanguage(accountLanguage) ? accountLanguage : null;
}

/**
 * Saves a language on the signed-in person's account, so every device they sign in on opens in it.
 *
 * @param client - the shared Supabase client
 * @param language - 'ro' or 'en'
 * Errors: throws when the database refuses or can't be reached; the language drop-down then tells
 *   the person the choice is kept on this device only.
 */
export async function saveAccountLanguage(
  client: AppSupabaseClient,
  language: SupportedLanguage,
): Promise<void> {
  const { error } = await client.rpc('set_my_locale', { new_locale: language });
  if (error !== null) {
    throw new Error(`Could not save the account language: ${error.message}`);
  }
}
