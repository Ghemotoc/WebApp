/**
 * The sponsor store: the one way Staff › Sponsors reads and writes sponsors, campaigns and what
 * we never advertise (story S1-E12-02; bundle SPONSORS-b2).
 *
 * Who calls it: hooks/useSponsorsAdmin.ts.
 * What it calls next: the sponsors table (RLS lets only owner and admin read it), the public
 * ad_blocked_categories, categories and the contests table, and the admin_* functions in
 * …_sponsors_b1_campaigns.sql, which check the role and write the audit log. A refused call
 * becomes a SponsorError carrying the database's hint (for example checks:missing or
 * picture:not_checked) and, when a campaign isn't complete, the list of problems. Part c adds
 * fetchCampaignReport() (admin_sponsor_campaign_report(), S1-E12-03). Part e2 adds the reason
 * clash, whose detail names the booking already in the slot (api/placements.ts, S1-E12-05).
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import {
  campaignReportSchema,
  savedCampaignSchema,
  staffCampaignListSchema,
  type CampaignFields,
  type CampaignReportDay,
  type ReviewCheck,
  type StaffCampaign,
} from '@/schemas/sponsors';

/** Why a call failed, in words the screens turn into text. */
export class SponsorError extends Error {
  /** The database's hint (for example incomplete), or not_allowed or failed when there is none. */
  readonly reason: string;
  /** The problem codes when the campaign isn't complete. */
  readonly problems: string[];
  /** For a refused booking (reason clash): the campaign and days already in the slot. */
  readonly clashWith: string | null;

  /**
   * @param reason - the hint
   * @param message - the database's message, for the developer console only
   * @param problems - the problem codes from the error's detail
   * @param clashWith - the clashing booking, for reason clash only
   */
  constructor(
    reason: string,
    message: string,
    problems: string[],
    clashWith: string | null = null,
  ) {
    super(message);
    this.name = 'SponsorError';
    this.reason = reason;
    this.problems = problems;
    this.clashWith = clashWith;
  }
}

/**
 * The problem codes in an error's detail, which lists them separated by commas.
 *
 * @param details - the error's detail, if any
 * @returns the codes, or none for an empty detail
 */
function problemsFrom(details: string | undefined | null): string[] {
  if (details === undefined || details === null || details === '') return [];
  return details.split(',');
}

/**
 * Turns a database error into a SponsorError.
 *
 * @param error - the error Supabase returned
 * @returns the SponsorError to throw
 */
export function sponsorErrorFrom(error: {
  code?: string;
  message: string;
  hint?: string;
  details?: string;
}): SponsorError {
  // Step 1: a refused role or a broken row have no hint; give them a reason of their own.
  const fallbacks: Record<string, string> = {
    '42501': 'not_allowed',
    '23514': 'not_valid',
    '23505': 'already_listed',
  };
  const hint = error.hint !== undefined && error.hint !== '' ? error.hint : null;
  const reason = hint ?? fallbacks[error.code ?? ''] ?? 'failed';
  // Step 2: a booking clash names the booking already in the slot in its detail (S1-E12-05).
  if (reason === 'clash') return new SponsorError(reason, error.message, [], error.details ?? null);
  // Step 3: an incomplete campaign lists its problems in the detail.
  return new SponsorError(reason, error.message, problemsFrom(error.details));
}

/** One sponsor in the list and the campaign form. */
export interface Sponsor {
  id: string;
  name: string;
  websiteUrl: string;
}

/** One thing we never advertise. */
export interface BlockedCategory {
  key: string;
  labelRo: string;
  labelEn: string;
  isFixed: boolean;
}

/** A contest a campaign may sponsor. */
export interface SponsorableContest {
  id: string;
  nameRo: string;
  nameEn: string;
}

/**
 * Every active sponsor, by name.
 *
 * @param client - the signed-in admin's client
 * @returns the sponsors (RLS returns none to anyone but owner and admin)
 * Errors: throws a SponsorError when the read fails.
 */
export async function fetchSponsors(client: AppSupabaseClient): Promise<Sponsor[]> {
  const { data, error } = await client
    .from('sponsors')
    .select('id, name, website_url')
    .is('archived_at', null)
    .order('name');
  if (error !== null) throw sponsorErrorFrom(error);
  return data.map((row) => ({ id: row.id, name: row.name, websiteUrl: row.website_url }));
}

/**
 * Adds a sponsor, or changes one.
 *
 * @param client - the signed-in admin's client
 * @param sponsor - its ID (null to add), name and website (https or empty)
 * @returns the sponsor's ID
 * Errors: a SponsorError (not_allowed, not_valid for an empty name or a website that isn't https).
 */
export async function saveSponsor(
  client: AppSupabaseClient,
  sponsor: { id: string | null; name: string; websiteUrl: string },
): Promise<string> {
  const { data, error } = await client.rpc('admin_save_sponsor', {
    target_sponsor_id: sponsor.id as string,
    sponsor_name: sponsor.name,
    website: sponsor.websiteUrl,
  });
  if (error !== null) throw sponsorErrorFrom(error);
  return data;
}

/**
 * Every campaign with its sponsor, picture state and what it still needs, newest first.
 *
 * @param client - the signed-in admin's client
 * @returns the campaigns
 * Errors: throws a SponsorError when the read fails or the answer has an unexpected shape.
 */
export async function fetchCampaigns(client: AppSupabaseClient): Promise<StaffCampaign[]> {
  const { data, error } = await client.rpc('admin_sponsor_campaigns');
  if (error !== null) throw sponsorErrorFrom(error);
  const parsed = staffCampaignListSchema.safeParse(data);
  if (!parsed.success) throw new SponsorError('failed', parsed.error.message, []);
  return parsed.data;
}

/**
 * Creates a campaign or saves changes to one, always as a draft.
 *
 * @param client - the signed-in admin's client
 * @param campaignId - the campaign, or null to create one
 * @param fields - every field of the form
 * @returns the campaign's ID and what it still needs before review
 * Errors: a SponsorError (not_allowed, not_valid, failed).
 */
export async function saveCampaign(
  client: AppSupabaseClient,
  campaignId: string | null,
  fields: CampaignFields,
): Promise<{ id: string; problems: string[] }> {
  const { data, error } = await client.rpc('admin_save_sponsor_campaign', {
    target_campaign_id: campaignId as string,
    fields: { ...fields },
  });
  if (error !== null) throw sponsorErrorFrom(error);
  const parsed = savedCampaignSchema.safeParse(data);
  if (!parsed.success) throw new SponsorError('failed', parsed.error.message, []);
  return parsed.data;
}

/**
 * Sends a complete campaign to the review queue.
 *
 * @param client - the signed-in admin's client
 * @param campaignId - the campaign
 * Errors: a SponsorError (incomplete with problems, state:<state>, not_allowed).
 */
export async function submitCampaign(client: AppSupabaseClient, campaignId: string): Promise<void> {
  const { error } = await client.rpc('admin_submit_sponsor_campaign', {
    target_campaign_id: campaignId,
  });
  if (error !== null) throw sponsorErrorFrom(error);
}

/** A reviewer's decision on one campaign. */
export interface CampaignReview {
  campaignId: string;
  decision: 'approve' | 'send_back';
  checks: ReviewCheck[];
  note: string;
}

/**
 * Approves a campaign waiting for review, or sends it back with a note.
 *
 * @param client - the signed-in admin's client
 * @param review - the campaign, the decision, the ticked checks and the note
 * Errors: a SponsorError (checks:missing, incomplete, picture:not_checked, not_valid for a missing
 *   note, state:<state>, not_allowed).
 */
export async function reviewCampaign(
  client: AppSupabaseClient,
  review: CampaignReview,
): Promise<void> {
  const { error } = await client.rpc('admin_review_sponsor_campaign', {
    target_campaign_id: review.campaignId,
    decision: review.decision,
    confirmed_checks: review.checks,
    note: review.note,
  });
  if (error !== null) throw sponsorErrorFrom(error);
}

/**
 * Ends a campaign early.
 *
 * @param client - the signed-in admin's client
 * @param campaignId - the campaign
 * @param reason - why, for the audit log
 * Errors: a SponsorError (not_valid for an empty reason, state:ended, not_allowed).
 */
export async function endCampaign(
  client: AppSupabaseClient,
  campaignId: string,
  reason: string,
): Promise<void> {
  const { error } = await client.rpc('admin_end_sponsor_campaign', {
    target_campaign_id: campaignId,
    reason,
  });
  if (error !== null) throw sponsorErrorFrom(error);
}

/**
 * What we never advertise, the fixed ones first.
 *
 * @param client - any client (the list is public)
 * @returns the categories
 * Errors: throws a SponsorError when the read fails.
 */
export async function fetchBlockedCategories(
  client: AppSupabaseClient,
): Promise<BlockedCategory[]> {
  const { data, error } = await client
    .from('ad_blocked_categories')
    .select('category_key, label_ro, label_en, is_fixed')
    .order('is_fixed', { ascending: false })
    .order('category_key');
  if (error !== null) throw sponsorErrorFrom(error);
  return data.map((row) => ({
    key: row.category_key,
    labelRo: row.label_ro,
    labelEn: row.label_en,
    isFixed: row.is_fixed,
  }));
}

/**
 * Adds something no ad may promote.
 *
 * @param client - the signed-in admin's client
 * @param category - its key (lower case, underscores) and labels in both languages
 * Errors: a SponsorError (not_valid, already_listed, not_allowed).
 */
export async function addBlockedCategory(
  client: AppSupabaseClient,
  category: { key: string; labelRo: string; labelEn: string },
): Promise<void> {
  const { error } = await client.rpc('admin_add_ad_blocked_category', {
    new_key: category.key,
    label_ro: category.labelRo,
    label_en: category.labelEn,
  });
  if (error !== null) throw sponsorErrorFrom(error);
}

/**
 * Removes a category staff added earlier; the fixed ones are refused.
 *
 * @param client - the signed-in admin's client
 * @param key - the category's key
 * @param reason - why, for the audit log
 * Errors: a SponsorError (not_valid for a fixed category or an empty reason, not_allowed).
 */
export async function removeBlockedCategory(
  client: AppSupabaseClient,
  key: string,
  reason: string,
): Promise<void> {
  const { error } = await client.rpc('admin_remove_ad_blocked_category', {
    target_key: key,
    reason,
  });
  if (error !== null) throw sponsorErrorFrom(error);
}

/**
 * The contests a campaign may sponsor, newest first.
 *
 * @param client - the signed-in admin's client
 * @returns each contest's ID and names
 * Errors: throws a SponsorError when the read fails.
 */
export async function fetchSponsorableContests(
  client: AppSupabaseClient,
): Promise<SponsorableContest[]> {
  const { data, error } = await client
    .from('contests')
    .select('id, name_ro, name_en')
    .order('created_at', { ascending: false });
  if (error !== null) throw sponsorErrorFrom(error);
  return data.map((row) => ({ id: row.id, nameRo: row.name_ro, nameEn: row.name_en }));
}

/**
 * The story categories, for "Sponsored by" on a category and for targeting.
 *
 * @param client - any client (categories are public)
 * @returns the category slugs in the form's order
 * Errors: throws a SponsorError when the read fails.
 */
export async function fetchCategorySlugs(client: AppSupabaseClient): Promise<string[]> {
  const { data, error } = await client.from('categories').select('slug').order('position');
  if (error !== null) throw sponsorErrorFrom(error);
  return data.map((row) => row.slug);
}

/**
 * A campaign's daily impressions and clicks, every day of its run so far (S1-E12-03 criterion 2).
 *
 * @param client - the signed-in admin's client
 * @param campaignId - the campaign
 * @returns the days, oldest first; empty before the campaign starts
 * Errors: throws a SponsorError (not_allowed, failed) when the read fails or the answer has an
 * unexpected shape.
 */
export async function fetchCampaignReport(
  client: AppSupabaseClient,
  campaignId: string,
): Promise<CampaignReportDay[]> {
  const { data, error } = await client.rpc('admin_sponsor_campaign_report', {
    target_campaign_id: campaignId,
  });
  if (error !== null) throw sponsorErrorFrom(error);
  const parsed = campaignReportSchema.safeParse(data);
  if (!parsed.success) throw new SponsorError('failed', parsed.error.message, []);
  return parsed.data;
}
