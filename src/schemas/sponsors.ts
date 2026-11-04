/**
 * The shapes of Staff › Sponsors (bundle SPONSORS, part b2; story S1-E12-02).
 *
 * Who uses it: src/features/sponsors/api/sponsors.ts reads admin_sponsor_campaigns() through
 * staffCampaignListSchema and sends admin_save_sponsor_campaign() a CampaignFields object. The
 * enums (sponsor_placement, sponsor_campaign_state) are generated into src/lib/database.types.ts;
 * these schemas only check the JSON the functions return.
 */
import { z } from 'zod';

import type { Enums } from '@/lib/database.types';

/** Where a campaign shows, in the order the form lists them (board AdminSponsors "Placement"). */
export const sponsorPlacements = [
  'chapter_banner',
  'list_banner',
  'discover_banner',
  'category',
  'contest',
  'featured_slot',
] as const satisfies readonly Enums<'sponsor_placement'>[];

/** A campaign's place in the review. */
export const campaignStates = [
  'draft',
  'in_review',
  'approved',
  'sent_back',
  'ended',
] as const satisfies readonly Enums<'sponsor_campaign_state'>[];

/** The four checks a reviewer ticks, in the order sponsor_review_checks() returns them. */
export const reviewChecks = [
  'suitable_for_minors',
  'alt_text_describes',
  'link_goes_to_sponsor',
  'text_makes_sense',
] as const;

/** One review check. */
export type ReviewCheck = (typeof reviewChecks)[number];

/** The picture's state as picture_state_json() gives it. */
const pictureStateSchema = z
  .object({
    state: z.enum(['visible', 'checking', 'waiting_for_person', 'removed']),
    bucket: z.string().nullable(),
    path: z.string().nullable(),
  })
  .nullable();

/** One campaign as admin_sponsor_campaigns() returns it. */
export const staffCampaignSchema = z.object({
  id: z.string(),
  sponsor_id: z.string(),
  sponsor_name: z.string(),
  name: z.string(),
  placement: z.enum(sponsorPlacements),
  category_slug: z.string().nullable(),
  contest_id: z.string().nullable(),
  target_categories: z.array(z.string()),
  target_tags: z.array(z.string()),
  target_languages: z.array(z.string()),
  picture_id: z.string().nullable(),
  picture: pictureStateSchema,
  alt_ro: z.string(),
  alt_en: z.string(),
  text_ro: z.string(),
  text_en: z.string(),
  link_url: z.string(),
  discount_code: z.string(),
  starts_on: z.string().nullable(),
  ends_on: z.string().nullable(),
  state: z.enum(campaignStates),
  review_note: z.string(),
  reviewed_at: z.string().nullable(),
  reviewer_handle: z.string().nullable(),
  problems: z.array(z.string()),
  is_live: z.boolean(),
});

/** Every campaign, newest first. */
export const staffCampaignListSchema = z.array(staffCampaignSchema);

/** One campaign in Staff › Sponsors. */
export type StaffCampaign = z.infer<typeof staffCampaignSchema>;

/** What admin_save_sponsor_campaign() returns: the campaign and what it still needs. */
export const savedCampaignSchema = z.object({ id: z.string(), problems: z.array(z.string()) });

/** The fields the campaign form edits (the picture is uploaded on its own). */
export interface CampaignFields {
  sponsor_id: string;
  name: string;
  placement: Enums<'sponsor_placement'>;
  category_slug: string;
  contest_id: string;
  target_categories: string[];
  target_tags: string[];
  target_languages: string[];
  alt_ro: string;
  alt_en: string;
  text_ro: string;
  text_en: string;
  link_url: string;
  discount_code: string;
  starts_on: string;
  ends_on: string;
}

/** One day of a campaign's report: the day and its two totals (S1-E12-03). */
export const campaignReportDaySchema = z.object({
  day: z.string(),
  impressions: z.number().int(),
  clicks: z.number().int(),
});

/** A campaign's report: every day of its run so far, oldest first. */
export const campaignReportSchema = z.array(campaignReportDaySchema);

/** One day of a campaign's report. */
export type CampaignReportDay = z.infer<typeof campaignReportDaySchema>;
