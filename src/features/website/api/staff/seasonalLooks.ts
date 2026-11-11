/**
 * Staff › Website › Seasonal looks: read and change when each seasonal look shows (bundle G12a;
 * the canvas's StaffWebsiteSeasonal board).
 *
 * Who calls it: hooks/useSeasonalLooks.ts.
 * What it calls next: the settings table (owner and admins read every row through
 * settings_select_admin) for the seasonal_look_dates row, and admin_set_seasonal_look_dates(),
 * which checks the role, checks the dates and writes the audit log in the same transaction.
 * Members' devices keep reading the same setting through get_client_config().
 */
import { decidedSeasonalWindows, parseSeasonalWindows, type SeasonalWindow } from '@/lib/looks';
import type { AppSupabaseClient } from '@/lib/supabase';

/** Why saving failed, for the page's message. */
export type SeasonalSaveFailure =
  'not_allowed' | 'overlap' | 'bad_day' | 'wrong_looks' | 'unreachable';

/** A failed save, with the word the page shows. */
export class SeasonalSaveError extends Error {
  readonly failure: SeasonalSaveFailure;

  constructor(failure: SeasonalSaveFailure, message: string) {
    super(message);
    this.failure = failure;
  }
}

/**
 * Turns a database error into a failure the page can word.
 *
 * @param error - the error Supabase answered
 * @returns the matching SeasonalSaveError
 */
function saveErrorFrom(error: { code?: string; message: string; hint?: string }) {
  // Step 1: a refused role.
  if (error.code === '42501') return new SeasonalSaveError('not_allowed', error.message);
  // Step 2: a refused set of dates names its reason in the hint.
  if (error.hint === 'overlap' || error.hint === 'bad_day') {
    return new SeasonalSaveError(error.hint, error.message);
  }
  if (error.code === '23514') return new SeasonalSaveError('wrong_looks', error.message);
  // Step 3: anything else is a connection or server problem.
  return new SeasonalSaveError('unreachable', error.message);
}

/**
 * Reads the four windows as they are saved now.
 *
 * @param client - the signed-in Supabase client
 * @returns the windows, or the decided ones when the setting can't be read as windows
 * @throws SeasonalSaveError('unreachable') when the read fails
 */
export async function fetchSeasonalWindows(client: AppSupabaseClient): Promise<SeasonalWindow[]> {
  const { data, error } = await client
    .from('settings')
    .select('value')
    .eq('key', 'seasonal_look_dates')
    .maybeSingle();
  if (error !== null) throw new SeasonalSaveError('unreachable', error.message);
  return parseSeasonalWindows(data?.value) ?? [...decidedSeasonalWindows];
}

/**
 * Saves the four windows.
 *
 * @param client - the signed-in Supabase client
 * @param windows - the four windows, one for each seasonal look
 * @throws SeasonalSaveError when the database refuses them or can't be reached
 */
export async function saveSeasonalWindows(
  client: AppSupabaseClient,
  windows: readonly SeasonalWindow[],
): Promise<void> {
  const { error } = await client.rpc('admin_set_seasonal_look_dates', {
    new_windows: windows.map((window) => ({ ...window })),
  });
  if (error !== null) throw saveErrorFrom(error);
}
