/**
 * The contest contract: who can enter, the editor's fields and what a story's settings card
 * reads (story S1-E11-15; bundle CONTESTS-13b1), the staff entries list (part 13b2a) and placings (part 13b2b).
 *
 * Who uses it: the contest store (src/features/contests/api/contests.ts) parses every answer from
 * the database with these schemas, and the staff editor uses the limits for its counters. The
 * database checks the same lists and limits (contest_details_from_json() and contest_problems() in
 * …_contests_b1_contests.sql), so the form and the server agree.
 */
import { z } from 'zod';

/** The platform age groups a contest can be open to (age_band values; never a year of birth). */
export const contestAgeGroups = ['13_to_15', '16_to_17', '18_plus'] as const;
export type ContestAgeGroup = (typeof contestAgeGroups)[number];

/** The longest each text field may be, the same as the database's checks. */
export const contestFieldLimits = {
  name: 120,
  whatCounts: 1000,
  prize: 500,
  judges: 500,
  prizeDeliveredBy: 200,
} as const;

/** The smallest and largest word limit the database accepts. */
export const contestWordLimitRange = { smallest: 100, largest: 500000 } as const;

/**
 * Every reason a contest can't open yet, in the order the database lists them (criterion 2).
 * The editor shows each as a line to fix.
 */
export const contestProblemCodes = [
  'name_ro',
  'name_en',
  'dates_missing',
  'dates_order',
  'age_groups',
  'markets',
  'languages',
  'what_counts',
  'prize',
  'prize_delivered_by',
  'judges',
  'rules_page',
  'rules_not_published',
  'landing_not_contest',
  'landing_not_live',
  'rules_not_linked',
] as const;

/** Why one story can't be entered (contest_story_problems(), plus not_active for the account). */
export const contestStoryProblemCodes = [
  'not_active',
  'not_readable',
  'class_only',
  // GAPS-14: contests take original work only (Robert, 7 Nov 2026).
  'fan_fiction',
  'language',
  'rating',
  'word_limit',
] as const;
export type ContestStoryProblem = (typeof contestStoryProblemCodes)[number];

/** One contest in a story's settings card, as contest_entry_options() returns it. */
export const contestEntryOptionSchema = z.object({
  id: z.string().uuid(),
  name_ro: z.string(),
  name_en: z.string(),
  page_slug: z.string(),
  closes_on: z.string(),
  word_limit: z.number().int().nullable(),
  entry: z
    .object({
      story_slug: z.string(),
      story_title: z.string(),
      is_this_story: z.boolean(),
      // Part 13b2a: a disqualified entry still holds the writer's one place.
      status: z.enum(['valid', 'disqualified']),
      statement_reference: z.string().nullable(),
    })
    .nullable(),
  problems: z.array(z.enum(contestStoryProblemCodes)),
});
export type ContestEntryOption = z.infer<typeof contestEntryOptionSchema>;

/** The whole list for one story. */
export const contestEntryOptionsSchema = z.array(contestEntryOptionSchema);

/** The statuses an entry can have (criterion 5). */
export const contestEntryStatuses = ['valid', 'withdrawn', 'disqualified'] as const;

/** The results staff can choose for an entry; none means a participant (criterion 7). */
export const contestPlacings = ['winner', 'finalist'] as const;
export type ContestPlacing = (typeof contestPlacings)[number];

/** The longest reason staff can give when disqualifying an entry (the database's limit). */
export const disqualifyReasonLimit = 2000;

/**
 * One entry in Staff › Contests, as admin_contest_entries() returns it: the pen name and age group
 * only, never the user ID or the year of birth (criterion 5).
 */
export const staffContestEntrySchema = z.object({
  id: z.string().uuid(),
  pen_name: z.string(),
  age_group: z.string(),
  story_title: z.string(),
  story_slug: z.string(),
  rating: z.string(),
  // GAPS-14: whether the story is labelled fan fiction now (it may have been relabelled after
  // it was entered; staff decide whether to disqualify it).
  is_fan_fiction: z.boolean(),
  words: z.number().int(),
  entered_at: z.string(),
  status: z.enum(contestEntryStatuses),
  statement_reference: z.string().nullable(),
  // Part 13b2b: the result staff chose, the prize and whether it needs a parent's consent.
  placing: z.enum(contestPlacings).nullable(),
  prize_sent_at: z.string().nullable(),
  needs_parent_consent: z.boolean(),
});
export type StaffContestEntry = z.infer<typeof staffContestEntrySchema>;

/** One contest's whole entries list. */
export const staffContestEntriesSchema = z.array(staffContestEntrySchema);

/** The fields the staff editor saves, in admin_save_contest()'s shape. */
export interface ContestDetails {
  name_ro: string;
  name_en: string;
  entries_open_on: string | null;
  entries_close_on: string | null;
  results_on: string | null;
  age_groups: ContestAgeGroup[];
  market_codes: string[];
  language_codes: string[];
  what_counts_ro: string;
  what_counts_en: string;
  word_limit: number | null;
  prize_ro: string;
  prize_en: string;
  prize_delivered_by: string;
  judges: string;
  rules_page_key: string | null;
}
