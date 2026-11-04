/**
 * The shapes of the ad slots a public page shows (bundle SPONSORS, part a1; story S1-E12-01).
 *
 * Who uses it: src/features/ads/api/ads.ts reads page_ads() through pageAdsSchema. The database's
 * enums (ad_format, ad_label) are generated into src/lib/database.types.ts; these schemas only
 * check the JSON page_ads() returns. The ad network (part d) and sponsors (part b) add to the
 * ad's fields later.
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

/** The ad filling a slot: who placed it (label), what it is and where it leads. */
export const slotAdSchema = z.object({
  key: z.string(),
  label: z.enum(['sponsored', 'ad', 'house']),
  // landing (one of our landing pages) or a built-in house ad: write, classics or forums.
  kind: z.string(),
  page_slug: z.string().nullable(),
  title_ro: z.string().nullable(),
  title_en: z.string().nullable(),
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
