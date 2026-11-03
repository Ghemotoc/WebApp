/**
 * The contest contract: who can enter, the editor's fields and what a story's settings card
 * reads (story S1-E11-15; bundle CONTESTS-13b1).
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
    })
    .nullable(),
  problems: z.array(z.enum(contestStoryProblemCodes)),
});
export type ContestEntryOption = z.infer<typeof contestEntryOptionSchema>;

/** The whole list for one story. */
export const contestEntryOptionsSchema = z.array(contestEntryOptionSchema);

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
