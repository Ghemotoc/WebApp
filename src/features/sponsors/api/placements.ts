/**
 * The placements store: the one way Staff › Sponsors › Placements reads the slot inventory and
 * books slots and our own house ads (story S1-E12-05; bundle SPONSORS-e2).
 *
 * Who calls it: hooks/usePlacements.ts.
 * What it calls next: the admin_* functions in …_sponsors_e1_bookings.sql, which check that the
 * caller is owner or admin, lock the slot while checking for a clash and write the audit log. A
 * refused call becomes a SponsorError (api/sponsors.ts); a clash carries the booking already in
 * the slot in clashWith.
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import {
  adPlacementsSchema,
  houseAdListSchema,
  type AdPlacements,
  type BookingFields,
  type HouseAd,
  type HouseAdFields,
} from '@/schemas/adPlacements';

import { SponsorError, sponsorErrorFrom } from './sponsors';

/**
 * Every slot on every public page against the next six weeks, and the bookings that stand.
 *
 * @param client - the signed-in admin's client
 * @returns the inventory
 * Errors: throws a SponsorError when the read fails or the answer has an unexpected shape.
 */
export async function fetchPlacements(client: AppSupabaseClient): Promise<AdPlacements> {
  const { data, error } = await client.rpc('admin_ad_placements', { week_count: 6 });
  if (error !== null) throw sponsorErrorFrom(error);
  const parsed = adPlacementsSchema.safeParse(data);
  if (!parsed.success) throw new SponsorError('failed', parsed.error.message, []);
  return parsed.data;
}

/**
 * Books an approved campaign into one slot for some days.
 *
 * @param client - the signed-in admin's client
 * @param campaignId - the approved campaign
 * @param fields - the slot, the days and the pages it should match
 * @returns the booking's ID
 * Errors: a SponsorError: clash (with clashWith), not_valid (days outside the campaign's, a
 *   "Sponsored by" credit), state:<state> (not approved), not_allowed.
 */
export async function bookSlot(
  client: AppSupabaseClient,
  campaignId: string,
  fields: BookingFields,
): Promise<string> {
  const { data, error } = await client.rpc('admin_book_ad_slot', {
    target_campaign_id: campaignId,
    fields: { ...fields },
  });
  if (error !== null) throw sponsorErrorFrom(error);
  return data;
}

/**
 * Cancels a booking with a reason, freeing the slot.
 *
 * @param client - the signed-in admin's client
 * @param bookingId - the booking
 * @param reason - why, for the audit log
 * Errors: a SponsorError (not_valid for an empty reason or a booking already cancelled).
 */
export async function cancelBooking(
  client: AppSupabaseClient,
  bookingId: string,
  reason: string,
): Promise<void> {
  const { error } = await client.rpc('admin_cancel_ad_booking', {
    target_booking_id: bookingId,
    reason,
  });
  if (error !== null) throw sponsorErrorFrom(error);
}

/**
 * Every one of our house ads that isn't archived, newest first.
 *
 * @param client - the signed-in admin's client
 * @returns the house ads
 * Errors: throws a SponsorError when the read fails or the answer has an unexpected shape.
 */
export async function fetchHouseAds(client: AppSupabaseClient): Promise<HouseAd[]> {
  const { data, error } = await client.rpc('admin_house_ads');
  if (error !== null) throw sponsorErrorFrom(error);
  const parsed = houseAdListSchema.safeParse(data);
  if (!parsed.success) throw new SponsorError('failed', parsed.error.message, []);
  return parsed.data;
}

/**
 * Adds a house ad, or changes one.
 *
 * @param client - the signed-in admin's client
 * @param houseAdId - the house ad, or null to add one
 * @param fields - both titles, both lines, the path on our site, the slot (empty for any) and dates
 * @returns the house ad's ID
 * Errors: a SponsorError (not_valid for a missing title, a link to another site or bad dates).
 */
export async function saveHouseAd(
  client: AppSupabaseClient,
  houseAdId: string | null,
  fields: HouseAdFields,
): Promise<string> {
  const { data, error } = await client.rpc('admin_save_house_ad', {
    target_house_ad_id: houseAdId as string,
    fields: { ...fields },
  });
  if (error !== null) throw sponsorErrorFrom(error);
  return data;
}

/**
 * Takes a house ad off every page, keeping it for the record.
 *
 * @param client - the signed-in admin's client
 * @param houseAdId - the house ad
 * Errors: a SponsorError (failed for an unknown house ad, not_allowed).
 */
export async function archiveHouseAd(client: AppSupabaseClient, houseAdId: string): Promise<void> {
  const { error } = await client.rpc('admin_archive_house_ad', { target_house_ad_id: houseAdId });
  if (error !== null) throw sponsorErrorFrom(error);
}
