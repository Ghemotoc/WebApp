/**
 * The campaign form's values: an empty campaign, a saved campaign's values and the tags field
 * (story S1-E12-02; bundle SPONSORS-b2).
 *
 * Who calls them: CampaignForm and CampaignTargetingFields. They call nothing.
 */
import type { CampaignFields, StaffCampaign } from '@/schemas/sponsors';

/**
 * The values of a new campaign.
 *
 * @param sponsorId - the sponsor picked first (the first in the list), or '' when there is none
 * @returns a banner below the chapter with every other field empty
 */
export function emptyCampaignFields(sponsorId: string): CampaignFields {
  return {
    sponsor_id: sponsorId,
    name: '',
    placement: 'chapter_banner',
    category_slug: '',
    contest_id: '',
    target_categories: [],
    target_tags: [],
    target_languages: [],
    alt_ro: '',
    alt_en: '',
    text_ro: '',
    text_en: '',
    link_url: '',
    discount_code: '',
    starts_on: '',
    ends_on: '',
  };
}

/**
 * The values of a saved campaign.
 *
 * @param campaign - the campaign as admin_sponsor_campaigns() returned it
 * @returns the form's values
 */
export function fieldsOfCampaign(campaign: StaffCampaign): CampaignFields {
  return {
    sponsor_id: campaign.sponsor_id,
    name: campaign.name,
    placement: campaign.placement,
    category_slug: campaign.category_slug ?? '',
    contest_id: campaign.contest_id ?? '',
    target_categories: campaign.target_categories,
    target_tags: campaign.target_tags,
    target_languages: campaign.target_languages,
    alt_ro: campaign.alt_ro,
    alt_en: campaign.alt_en,
    text_ro: campaign.text_ro,
    text_en: campaign.text_en,
    link_url: campaign.link_url,
    discount_code: campaign.discount_code,
    starts_on: campaign.starts_on ?? '',
    ends_on: campaign.ends_on ?? '',
  };
}

/**
 * The tags typed in the field, one per comma.
 *
 * @param text - what staff typed, for example "mister, set in Romania"
 * @returns the tags, trimmed, without empty ones (the server normalises them)
 */
export function tagsFromText(text: string): string[] {
  return text
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag !== '');
}
