/**
 * Staff › Settings › Markets and languages (story S1-E11-05): each language with the moderators who
 * read it, each market with its legal check, and changing their status.
 *
 * Who calls it: hooks/useMarketsAdmin.ts and, for one staff member's languages, the staff roles
 * page (features/staff/components/StaffLanguages.tsx).
 * What it calls next: language_moderator_counts(), the markets table (anyone reads it) and
 * admin_set_language_status(), admin_set_market() and admin_set_staff_languages()
 * (…_s1_e11_05_markets_and_languages.sql). The database applies the rules (a moderator for each
 * open language, the legal check, the owner opens a market) and writes the audit log.
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { settingsErrorFrom } from './settingsAdmin';

/** Open, Ready to open or Closed. */
export type OpeningStatus = Enums<'market_status'>;

/** A market's legal check. */
export type LegalCheckStatus = Enums<'legal_check_status'>;

/** One language as the settings screen shows it. */
export interface LanguageRow {
  code: string;
  status: OpeningStatus;
  isInterface: boolean;
  moderators: number;
}

/** One market as the settings screen shows it. */
export interface MarketRow {
  countryCode: string;
  status: OpeningStatus;
  legalCheck: LegalCheckStatus;
  languages: string[];
}

/**
 * Reads every language with how many moderators read it.
 *
 * @param client - the shared Supabase client
 * @returns the languages, interface languages first
 * Errors: throws SettingsAdminError when the database can't be read.
 */
export async function fetchLanguages(client: AppSupabaseClient): Promise<LanguageRow[]> {
  const { data, error } = await client.rpc('language_moderator_counts');
  if (error !== null) throw settingsErrorFrom(error);
  return data.map((row) => ({
    code: row.code,
    status: row.status,
    isInterface: row.is_interface,
    moderators: row.moderators,
  }));
}

/**
 * Reads every market, open ones first.
 *
 * @param client - the shared Supabase client
 * @returns the markets
 * Errors: throws SettingsAdminError when the database can't be read.
 */
export async function fetchMarkets(client: AppSupabaseClient): Promise<MarketRow[]> {
  const { data, error } = await client
    .from('markets')
    .select('country_code, status, legal_check, languages')
    .order('is_open', { ascending: false })
    .order('country_code');
  if (error !== null) throw settingsErrorFrom(error);
  return data.map((row) => ({
    countryCode: row.country_code,
    status: row.status,
    legalCheck: row.legal_check,
    languages: row.languages,
  }));
}

/**
 * Opens, readies or closes a language.
 *
 * @param client - the shared Supabase client
 * @param languageCode - for example 'ro'
 * @param status - the new status
 * Errors: throws SettingsAdminError; "invalid" carries no_moderator or interface_language.
 */
export async function setLanguageStatus(
  client: AppSupabaseClient,
  languageCode: string,
  status: OpeningStatus,
): Promise<void> {
  const { error } = await client.rpc('admin_set_language_status', {
    language_code: languageCode,
    new_status: status,
  });
  if (error !== null) throw settingsErrorFrom(error);
}

/**
 * Changes a market's status and legal check.
 *
 * @param client - the shared Supabase client
 * @param market - the market with its new status and legal check
 * Errors: throws SettingsAdminError; "invalid" carries legal_check_not_done or no_open_language,
 *   "not_allowed" carries owner_only when an admin tries to open a market.
 */
export async function saveMarket(
  client: AppSupabaseClient,
  market: Pick<MarketRow, 'countryCode' | 'status' | 'legalCheck'>,
): Promise<void> {
  const { error } = await client.rpc('admin_set_market', {
    market_country: market.countryCode,
    new_status: market.status,
    new_legal_check: market.legalCheck,
  });
  if (error !== null) throw settingsErrorFrom(error);
}

/**
 * Reads the languages one staff member reads.
 *
 * @param client - the shared Supabase client
 * @param staffUserId - the staff member's user ID
 * @returns their language codes
 * Errors: throws SettingsAdminError when the database can't be read.
 */
export async function fetchStaffLanguages(
  client: AppSupabaseClient,
  staffUserId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from('staff_languages')
    .select('language_code')
    .eq('user_id', staffUserId)
    .order('language_code');
  if (error !== null) throw settingsErrorFrom(error);
  return data.map((row) => row.language_code);
}

/**
 * Records the languages a staff member reads (the whole list).
 *
 * @param client - the shared Supabase client
 * @param staffUserId - the staff member's user ID
 * @param languageCodes - every language they read
 * Errors: throws SettingsAdminError.
 */
export async function saveStaffLanguages(
  client: AppSupabaseClient,
  staffUserId: string,
  languageCodes: string[],
): Promise<void> {
  const { error } = await client.rpc('admin_set_staff_languages', {
    target_user_id: staffUserId,
    language_codes: languageCodes,
  });
  if (error !== null) throw settingsErrorFrom(error);
}
