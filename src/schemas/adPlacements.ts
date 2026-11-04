/**
 * The shapes of Staff › Sponsors › Placements: the slot inventory, the bookings and our own house
 * ads (bundle SPONSORS, part e2; story S1-E12-05).
 *
 * Who uses it: src/features/sponsors/api/placements.ts reads admin_ad_placements() and
 * admin_house_ads() through these schemas, and sends admin_book_ad_slot(),
 * admin_change_ad_booking() and admin_save_house_ad() the field objects below. The ad_format enum
 * is generated into src/lib/database.types.ts; these schemas only check the JSON the functions
 * return.
 */
import { z } from 'zod';

/** What fills one slot in one week (ad_placement_week()). */
export const placementWeekSchema = z.object({
  week_start: z.string(),
  state: z.enum(['booked', 'house', 'network', 'free']),
  booking_id: z.string().optional(),
  campaign_name: z.string().optional(),
  sponsor_name: z.string().optional(),
  house_title: z.string().optional(),
});

/** One slot with its weeks. */
export const placementSlotSchema = z.object({
  slot_key: z.string(),
  page_key: z.string(),
  position: z.number().int(),
  format: z.enum(['wide', 'portrait', 'side_box', 'list_card']),
  is_on: z.boolean(),
  weeks: z.array(placementWeekSchema),
});

/** One booking that stands, as Placements lists it under the grid. */
export const adBookingSchema = z.object({
  id: z.string(),
  campaign_id: z.string(),
  campaign_name: z.string(),
  sponsor_name: z.string(),
  slot_key: z.string(),
  starts_on: z.string(),
  ends_on: z.string(),
  target_categories: z.array(z.string()),
  target_tags: z.array(z.string()),
  target_languages: z.array(z.string()),
});

/** What admin_ad_placements() returns. */
export const adPlacementsSchema = z.object({
  weeks: z.array(z.string()),
  network_ready: z.boolean(),
  slots: z.array(placementSlotSchema),
  bookings: z.array(adBookingSchema),
});

/** One of our own house ads, as admin_house_ads() returns it. */
export const houseAdSchema = z.object({
  id: z.string(),
  title_ro: z.string(),
  title_en: z.string(),
  text_ro: z.string(),
  text_en: z.string(),
  link_path: z.string(),
  slot_key: z.string().nullable(),
  starts_on: z.string(),
  ends_on: z.string(),
});

/** Every house ad that isn't archived. */
export const houseAdListSchema = z.array(houseAdSchema);

/** What fills one slot in one week. */
export type PlacementWeek = z.infer<typeof placementWeekSchema>;
/** One slot with its weeks. */
export type PlacementSlot = z.infer<typeof placementSlotSchema>;
/** One booking. */
export type AdBooking = z.infer<typeof adBookingSchema>;
/** The whole inventory. */
export type AdPlacements = z.infer<typeof adPlacementsSchema>;
/** One house ad. */
export type HouseAd = z.infer<typeof houseAdSchema>;

/** What the booking form sends: the slot, the days and the pages it should match. */
export interface BookingFields {
  slot_key: string;
  starts_on: string;
  ends_on: string;
  categories: string[];
  tags: string[];
  languages: string[];
}

/** What the house ad form sends. An empty slot_key means any slot. */
export interface HouseAdFields {
  title_ro: string;
  title_en: string;
  text_ro: string;
  text_en: string;
  link_path: string;
  slot_key: string;
  starts_on: string;
  ends_on: string;
}
