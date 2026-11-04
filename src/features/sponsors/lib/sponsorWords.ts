/**
 * Small helpers that turn sponsor data into the keys and words the screens show (story
 * S1-E12-02; bundle SPONSORS-b2).
 *
 * Who calls them: the components in components/staff/. They call nothing; the words themselves
 * are in the ro and en sponsors.json locale files.
 */
import type { StaffCampaign } from '@/schemas/sponsors';

import type { SponsorError } from '../api/sponsors';

/** The problem codes the locale files have words for. */
const knownProblems = new Set([
  'name_empty',
  'sponsor_archived',
  'picture_missing',
  'ro_alt_empty',
  'en_alt_empty',
  'ro_alt_too_long',
  'en_alt_too_long',
  'ro_text_empty',
  'en_text_empty',
  'ro_text_too_long',
  'en_text_too_long',
  'link_empty',
  'link_not_https',
  'link_tracking',
  'discount_code_bad',
  'dates_missing',
  'dates_past',
  'targets_unknown_category',
]);

/**
 * The locale key of a problem code from the database, for example "ro.alt:empty".
 *
 * @param code - the code
 * @returns "problems.ro_alt_empty", or "problems.other" for a code the files don't know
 */
export function problemKeyOf(code: string): string {
  // Dots and colons separate keys and namespaces in i18next, so they become underscores.
  const key = code.replace(/[.:]/g, '_');
  return knownProblems.has(key) ? `problems.${key}` : 'problems.other';
}

/** The error reasons the locale files have words for. */
const knownErrors = new Set([
  'not_allowed',
  'not_valid',
  'already_listed',
  'incomplete',
  'checks_missing',
  'picture_not_checked',
  'wrong_type',
  'too_big',
  'too_many',
  'unreachable',
]);

/**
 * The locale key of a failed change's message.
 *
 * @param failure - the error, whose reason is the database's hint or an upload's failure
 * @returns for example "errors.checks_missing"; "errors.state" when the campaign moved on;
 *   "errors.failed" for anything else
 */
export function errorKeyOf(failure: SponsorError): string {
  const reason = failure.reason;
  // "state:approved" means someone else moved the campaign on.
  if (reason.startsWith('state:')) return 'errors.state';
  const key = reason.replace(/[.:]/g, '_');
  return knownErrors.has(key) ? `errors.${key}` : 'errors.failed';
}

/**
 * The status a campaign shows: "live" for an approved campaign showing today.
 *
 * @param campaign - the campaign
 * @returns the key under "states"
 */
export function campaignStatusOf(campaign: StaffCampaign): string {
  if (campaign.state === 'approved' && campaign.is_live) return 'live';
  return campaign.state;
}

/**
 * A day as words in the screen's language, for example "4 Nov 2026".
 *
 * @param day - an ISO date (yyyy-mm-dd)
 * @param language - the screen's language
 * @returns the words
 */
export function sponsorDayInWords(day: string, language: string): string {
  // Noon UTC keeps the same calendar day in every time zone.
  const date = new Date(`${day}T12:00:00Z`);
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
