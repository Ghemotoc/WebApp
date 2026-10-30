/**
 * The seasonal doodle store: today's doodle for readers, and the schedule for staff (stories
 * S1-E5-07 and S1-E11-11; architecture B30).
 *
 * Who calls it: hooks/useSeasonalDoodle.ts and hooks/useOccasionSchedule.ts.
 * What it calls next: current_seasonal_doodle() (anyone), the seasonal_occasions table (owner and
 * admin read it through RLS) and admin_save_occasion() / admin_remove_occasion(), which check the
 * role and write the audit log (…_s1_e11_11_seasonal_occasions.sql). Staff errors become the
 * website editors' error, so the shared feedback names the fields to fix.
 */
import { websiteErrorFrom } from '@/features/website/api/websiteContentStore';
import type { Tables } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import type { SeasonalDoodleName } from '../lib/seasonalCalendar';

/** Where a seasonal doodle shows. */
export type SeasonalPlace = 'discover' | 'search';

/** One occasion as the staff screens use it. */
export interface Occasion {
  id: string;
  nameRo: string;
  nameEn: string;
  startsOn: string;
  endsOn: string;
  everyYear: boolean;
  doodle: SeasonalDoodleName;
  showsOn: SeasonalPlace | 'both';
  isSeasonDefault: boolean;
}

/** What the form sends: an occasion, with no id when it is new. */
export type OccasionDraft = Omit<Occasion, 'id'> & { id: string | null };

/**
 * Shapes one row for the staff screens.
 *
 * @param row - the table row
 * @returns the occasion
 */
function occasionFromRow(row: Tables<'seasonal_occasions'>): Occasion {
  const places: Occasion['showsOn'][] = ['discover', 'search', 'both'];
  const showsOn = places.find((place) => place === row.shows_on) ?? 'both';
  return {
    id: row.id,
    nameRo: row.name_ro,
    nameEn: row.name_en,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    everyYear: row.every_year,
    doodle: row.doodle,
    showsOn,
    isSeasonDefault: row.is_season_default,
  };
}

/**
 * The doodle a place shows on a day.
 *
 * @param client - the shared client
 * @param isoDate - the reader's own date ("yyyy-mm-dd")
 * @param place - Discover or Search
 * @returns the doodle, or null when nothing covers the day
 * Errors: rejects when the read fails; the caller then shows no doodle.
 */
export async function fetchSeasonalDoodle(
  client: AppSupabaseClient,
  isoDate: string,
  place: SeasonalPlace,
): Promise<SeasonalDoodleName | null> {
  const { data, error } = await client.rpc('current_seasonal_doodle', {
    on_date: isoDate,
    place,
  });
  if (error !== null) throw new Error(`Couldn't read the seasonal doodle: ${error.message}`);
  return data[0]?.doodle ?? null;
}

/**
 * The whole schedule, earliest first (staff).
 *
 * @param client - the shared client
 * @returns the occasions that aren't removed
 * Errors: a WebsiteContentError when the read fails.
 */
export async function listOccasions(client: AppSupabaseClient): Promise<Occasion[]> {
  const { data, error } = await client
    .from('seasonal_occasions')
    .select('*')
    .is('deleted_at', null)
    .order('starts_on');
  if (error !== null) throw websiteErrorFrom(error);
  return data.map(occasionFromRow);
}

/**
 * Adds or changes an occasion. It applies at once.
 *
 * @param client - the shared client
 * @param draft - the occasion; id null to add one
 * @returns the occasion's id
 * Errors: a WebsiteContentError naming the fields to fix ("endsOn:before_start").
 */
export async function saveOccasion(
  client: AppSupabaseClient,
  draft: OccasionDraft,
): Promise<string> {
  const { data, error } = await client.rpc('admin_save_occasion', {
    name_ro: draft.nameRo,
    name_en: draft.nameEn,
    starts_on: draft.startsOn,
    ends_on: draft.endsOn,
    every_year: draft.everyYear,
    doodle: draft.doodle,
    shows_on: draft.showsOn,
    is_season_default: draft.isSeasonDefault,
    // Left out for a new occasion.
    occasion_id: draft.id ?? undefined,
  });
  if (error !== null) throw websiteErrorFrom(error);
  return data;
}

/**
 * Takes an occasion off the schedule.
 *
 * @param client - the shared client
 * @param occasionId - the occasion
 * Errors: a WebsiteContentError when it can't be removed.
 */
export async function removeOccasion(client: AppSupabaseClient, occasionId: string): Promise<void> {
  const { error } = await client.rpc('admin_remove_occasion', { occasion_id: occasionId });
  if (error !== null) throw websiteErrorFrom(error);
}
