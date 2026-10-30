/**
 * Staff › Settings: read and change the feature flags, the named settings, the order of the
 * categories, the reserved names and the username word lists (story S1-E11-03).
 *
 * Who calls it: hooks/useSettingsAdmin.ts, hooks/useCategoryOrder.ts and hooks/useNameRules.ts.
 * What it calls next: the feature_flags, settings, categories, reserved_names and
 * username_word_lists tables (owner and admin read every row through their *_select_admin
 * policies) and the admin_* functions in …_s1_e11_03_settings_admin.sql, which check the staff
 * area and write the audit log in the same transaction. This file only shapes the answers.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** Why a settings action failed, for the page's message. */
export type SettingsFailure =
  'not_allowed' | 'invalid' | 'not_found' | 'already_there' | 'unreachable';

/** A failed settings action: the failure, plus the database's reason word when it gave one. */
export class SettingsAdminError extends Error {
  readonly failure: SettingsFailure;
  /** A reason word from the database (for example "below_zero" or "no_moderator"), or null. */
  readonly reason: string | null;

  constructor(failure: SettingsFailure, message: string, reason: string | null) {
    super(message);
    this.failure = failure;
    this.reason = reason;
  }
}

/**
 * Turns a database error into a failure the page can word.
 *
 * @param error - the error Supabase answered
 * @returns the matching SettingsAdminError
 */
export function settingsErrorFrom(error: {
  code?: string;
  message: string;
  hint?: string;
}): SettingsAdminError {
  const reason = error.hint === undefined || error.hint === '' ? null : error.hint;
  const failureByCode: Record<string, SettingsFailure> = {
    '42501': 'not_allowed',
    '23514': 'invalid',
    '22023': 'invalid',
    P0002: 'not_found',
    '23505': 'already_there',
  };
  const failure = failureByCode[error.code ?? ''] ?? 'unreachable';
  return new SettingsAdminError(failure, error.message, reason);
}

/** One feature flag. */
export interface FeatureFlagRow {
  key: string;
  isEnabled: boolean;
  /** The developers' note from the database, shown when the locale files have no text for it. */
  description: string;
}

/** One named setting. */
export interface SettingRow {
  key: string;
  value: Json;
  description: string;
}

/**
 * Reads every flag (owner and admin see the private ones too).
 *
 * @param client - the shared Supabase client
 * @returns the flags, by key
 * Errors: throws SettingsAdminError when the database can't be read.
 */
export async function fetchAllFlags(client: AppSupabaseClient): Promise<FeatureFlagRow[]> {
  const { data, error } = await client
    .from('feature_flags')
    .select('key, is_enabled, description')
    .order('key');
  if (error !== null) throw settingsErrorFrom(error);
  return data.map((row) => ({
    key: row.key,
    isEnabled: row.is_enabled,
    description: row.description,
  }));
}

/**
 * Reads every named setting.
 *
 * @param client - the shared Supabase client
 * @returns the settings, by key
 * Errors: throws SettingsAdminError when the database can't be read.
 */
export async function fetchAllSettings(client: AppSupabaseClient): Promise<SettingRow[]> {
  const { data, error } = await client
    .from('settings')
    .select('key, value, description')
    .order('key');
  if (error !== null) throw settingsErrorFrom(error);
  return data.map((row) => ({ key: row.key, value: row.value, description: row.description }));
}

/**
 * Switches a flag on or off.
 *
 * @param client - the shared Supabase client
 * @param flagKey - for example 'maintenance_mode'
 * @param turnOn - the new state
 * Errors: throws SettingsAdminError (not_allowed, not_found or unreachable).
 */
export async function setFlag(
  client: AppSupabaseClient,
  flagKey: string,
  turnOn: boolean,
): Promise<void> {
  const { error } = await client.rpc('admin_set_flag', { flag_key: flagKey, turn_on: turnOn });
  if (error !== null) throw settingsErrorFrom(error);
}

/**
 * Changes a named setting; the database refuses a value of another shape.
 *
 * @param client - the shared Supabase client
 * @param settingKey - for example 'teaser_length'
 * @param newValue - the new value, the same shape as the old one
 * Errors: throws SettingsAdminError; "invalid" carries the reason word (wrong_kind, below_zero,
 *   bad_item, repeated_item or changed_parts).
 */
export async function setSetting(
  client: AppSupabaseClient,
  settingKey: string,
  newValue: Json,
): Promise<void> {
  const { error } = await client.rpc('admin_set_setting', {
    setting_key: settingKey,
    new_value: newValue,
  });
  if (error !== null) throw settingsErrorFrom(error);
}

/**
 * Reads the categories in the order readers see them.
 *
 * @param client - the shared Supabase client
 * @returns the category slugs, in order
 * Errors: throws SettingsAdminError when the database can't be read.
 */
export async function fetchCategoryOrder(client: AppSupabaseClient): Promise<string[]> {
  const { data, error } = await client.from('categories').select('slug').order('position');
  if (error !== null) throw settingsErrorFrom(error);
  return data.map((row) => row.slug);
}

/**
 * Moves a category one place up or down.
 *
 * @param client - the shared Supabase client
 * @param categorySlug - for example 'poetry'
 * @param moveBy - -1 for up, 1 for down
 * Errors: throws SettingsAdminError.
 */
export async function moveCategory(
  client: AppSupabaseClient,
  categorySlug: string,
  moveBy: -1 | 1,
): Promise<void> {
  const { error } = await client.rpc('admin_move_category', {
    category_slug: categorySlug,
    move_by: moveBy,
  });
  if (error !== null) throw settingsErrorFrom(error);
}
