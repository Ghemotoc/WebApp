/**
 * The shapes of the ad slots a public page shows (bundle SPONSORS, part a1; story S1-E12-01).
 *
 * Who uses it: src/features/ads/api/ads.ts reads page_ads() through pageAdsSchema. The database's
 * enums (ad_format, ad_label) are generated into src/lib/database.types.ts; these schemas only
 * check the JSON page_ads() returns. Part b1 adds a sponsor's fields to the ad and the
 * "Sponsored by" credit (sponsor_credit()); part d adds the ad network's account and ad unit;
 * part e1 adds the link of a house ad staff wrote.
 */
import { z } from 'zod';

/** The public pages that have ad slots (S1-E12-01 criterion 5). */
export const adPageKeys = [
  'chapter',
  'story',
  'discover',
  'search',
  'classics',
  'see_all',
  'teaser',
  'forums',
  'thread',
  'space',
  'profile',
  'library',
] as const;

/** One public page with ad slots. */
export type AdPageKey = (typeof adPageKeys)[number];

/** A text field only a sponsor's ad carries; missing or null on our own ads. */
const sponsorText = z.string().nullable().optional();

/** The ad filling a slot: who placed it (label), what it is and where it leads. */
export const slotAdSchema = z.object({
  key: z.string(),
  label: z.enum(['sponsored', 'ad', 'house']),
  // landing (one of our landing pages), a built-in house ad (write, classics or forums), staff
  // (a house ad staff wrote, part e1), sponsor (a live sponsor campaign, part b1) or network.
  kind: z.string(),
  page_slug: z.string().nullable(),
  title_ro: z.string().nullable(),
  title_en: z.string().nullable(),
  // A sponsor's creative (S1-E12-02): its name, one line and the picture's alt text in both
  // languages, the checked picture's place in storage, its link and an optional discount code.
  sponsor_name: sponsorText,
  text_ro: sponsorText,
  text_en: sponsorText,
  alt_ro: sponsorText,
  alt_en: sponsorText,
  picture_bucket: sponsorText,
  picture_path: sponsorText,
  link_url: sponsorText,
  discount_code: sponsorText,
  // Where a house ad staff wrote leads: a path on our own site (S1-E12-05), only on kind staff.
  link_path: sponsorText,
  // The ad network's account and ad unit (S1-E12-04; ADR 0014), only on a network ad.
  publisher_id: sponsorText,
  slot_id: sponsorText,
});

/** One slot of a page, in the order the page draws them. */
export const pageAdSlotSchema = z.object({
  slot_key: z.string(),
  position: z.number().int(),
  format: z.enum(['wide', 'portrait', 'side_box', 'list_card']),
  // The page's own context the choice could use, for "Why this ad?". Never anything about the reader.
  matched: z
    .object({
      category: z.string().optional(),
      tag: z.string().optional(),
      language: z.string().optional(),
    })
    .default({}),
  ad: slotAdSchema.nullable(),
});

/** What page_ads() returns: the page's slots, none in a class space. */
export const pageAdsSchema = z.array(pageAdSlotSchema);

/** One slot, as the screens use it. */
export type PageAdSlot = z.infer<typeof pageAdSlotSchema>;

/** The ad in a slot. */
export type SlotAd = z.infer<typeof slotAdSchema>;

/** What a page tells the server about itself; nothing about the reader. */
export interface AdPageContext {
  category?: string | null;
  tag?: string | null;
  language?: string | null;
  /** Only to keep class spaces free of ads (Q70). */
  spaceSlug?: string | null;
  /** Only to keep class-only stories free of ads (Q70). */
  storySlug?: string | null;
}

/** What sponsor_credit() returns for a sponsored category or contest: the line's sponsor. */
export const sponsorCreditSchema = z
  .object({
    sponsor_name: z.string(),
    link_url: z.string().nullable(),
    // The campaign's key, so the line's impressions and clicks can be counted (S1-E12-03).
    ad_key: z.string().optional(),
  })
  .nullable();

/** "Sponsored by <sponsor>", or null when nobody sponsors it (S1-E12-02 criterion 3). */
export type SponsorCredit = z.infer<typeof sponsorCreditSchema>;
