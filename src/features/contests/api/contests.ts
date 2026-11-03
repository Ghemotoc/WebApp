/**
 * The contest store: the one way the app reads and writes contests and entries (story
 * S1-E11-15; bundle CONTESTS-13b1).
 *
 * Who calls it: Staff › Contests (hooks/useStaffContests.ts, hooks/useContestEditor.ts) and the
 * "Contests" card in a story's settings (hooks/useStoryContests.ts).
 * What it calls next: for staff, the contests table (RLS lets only owner and admin read it), the
 * contest landing pages, the markets and languages lists, and the admin_*_contest* functions in
 * …_contests_b1_contests.sql, which check the role and write the audit log; for writers,
 * contest_entry_options(), enter_contest() and withdraw_contest_entry(). A refused call becomes a
 * ContestError carrying the database's hint (for example already_entered) and, when opening is
 * refused, the list of problems, so the screens can say what to fix.
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import {
  contestEntryOptionsSchema,
  type ContestAgeGroup,
  type ContestDetails,
  type ContestEntryOption,
} from '@/schemas/contests';

/** Why a call failed, in words the screens turn into text. */
export class ContestError extends Error {
  /** The database's hint (for example not_ready or rating), or "failed" when there is none. */
  readonly reason: string;
  /** The problems that stop a contest from opening, when the database listed them. */
  readonly problems: string[];

  /**
   * @param reason - the hint
   * @param message - the database's message, for the developer console only
   * @param problems - the problem codes from the error's detail
   */
  constructor(reason: string, message: string, problems: string[]) {
    super(message);
    this.name = 'ContestError';
    this.reason = reason;
    this.problems = problems;
  }
}

/**
 * Turns a database error into a ContestError.
 *
 * @param error - the error Supabase returned
 * @returns the ContestError to throw
 */
export function contestErrorFrom(error: {
  code?: string;
  message: string;
  hint?: string;
  details?: string;
}) {
  // Step 1: the refused role has no hint; give it a reason of its own.
  const reason = error.hint !== undefined && error.hint !== '' ? error.hint : null;
  const fallback = error.code === '42501' ? 'not_allowed' : 'failed';
  // Step 2: a refused opening lists its problems in the detail, separated by commas.
  const problems =
    error.details === undefined || error.details === null || error.details === ''
      ? []
      : error.details.split(',');
  return new ContestError(reason ?? fallback, error.message, problems);
}

/** One contest in the staff list and editor. */
export interface StaffContest extends ContestDetails {
  id: string;
  pageSlug: string;
  openedAt: string | null;
}

/** A contest landing page that has no contest yet, for "New contest". */
export interface FreeContestPage {
  id: string;
  slug: string;
}

/** What the staff editor offers for "Who can enter". */
export interface ContestChoices {
  marketCodes: string[];
  languageCodes: string[];
}

/** The contest row as the staff read returns it. */
interface ContestRow extends Omit<ContestDetails, 'age_groups'> {
  id: string;
  opened_at: string | null;
  age_groups: string[];
  landing_pages: { slug: string } | null;
}

/**
 * Turns a database row into the screen's shape.
 *
 * @param row - one contest with its landing page's address
 * @returns the contest
 */
function toStaffContest(row: ContestRow): StaffContest {
  return {
    ...row,
    // The table's check allows only these three values.
    age_groups: row.age_groups as ContestAgeGroup[],
    pageSlug: row.landing_pages?.slug ?? '',
    openedAt: row.opened_at,
  };
}

/** The columns the editor reads. */
const contestColumns =
  'id, opened_at, name_ro, name_en, entries_open_on, entries_close_on, results_on, age_groups, market_codes, language_codes, what_counts_ro, what_counts_en, word_limit, prize_ro, prize_en, prize_delivered_by, judges, rules_page_key, landing_pages(slug)';

/**
 * Every contest, newest entry window first, for Staff › Contests.
 *
 * @param client - the signed-in staff member's client
 * @returns the contests (RLS returns none to anyone but the owner and admins)
 * Errors: throws a ContestError when the read fails.
 */
export async function fetchStaffContests(client: AppSupabaseClient): Promise<StaffContest[]> {
  const { data, error } = await client
    .from('contests')
    .select(contestColumns)
    .order('created_at', { ascending: false });
  if (error !== null) throw contestErrorFrom(error);
  return data.map(toStaffContest);
}

/**
 * The contest landing pages that don't have a contest yet.
 *
 * @param client - the signed-in staff member's client
 * @param contests - the contests already made
 * @returns the free pages, by address
 * Errors: throws a ContestError when the read fails.
 */
export async function fetchFreeContestPages(
  client: AppSupabaseClient,
  contests: StaffContest[],
): Promise<FreeContestPage[]> {
  const { data, error } = await client
    .from('landing_pages')
    .select('id, slug')
    .eq('page_type', 'contest')
    .is('archived_at', null)
    .order('slug');
  if (error !== null) throw contestErrorFrom(error);
  const taken = new Set(contests.map((contest) => contest.pageSlug));
  return data.filter((page) => !taken.has(page.slug));
}

/**
 * The markets and story languages a contest can be open to.
 *
 * @param client - any client (both lists are public)
 * @returns the country codes and language codes
 * Errors: throws a ContestError when a read fails.
 */
export async function fetchContestChoices(client: AppSupabaseClient): Promise<ContestChoices> {
  const markets = await client.from('markets').select('country_code').order('country_code');
  if (markets.error !== null) throw contestErrorFrom(markets.error);
  const languages = await client.from('languages').select('code').order('code');
  if (languages.error !== null) throw contestErrorFrom(languages.error);
  return {
    marketCodes: markets.data.map((market) => market.country_code),
    languageCodes: languages.data.map((language) => language.code),
  };
}

/**
 * Starts a contest on a contest landing page.
 *
 * @param client - the signed-in admin's client
 * @param pageSlug - the landing page's address after /c/
 * @returns the new contest's id
 * Errors: a ContestError (not_allowed, not_a_contest_page, already_has_contest, failed).
 */
export async function createContest(client: AppSupabaseClient, pageSlug: string): Promise<string> {
  const { data, error } = await client.rpc('admin_create_contest', { landing_slug: pageSlug });
  if (error !== null) throw contestErrorFrom(error);
  return data;
}

/**
 * Saves a contest's details.
 *
 * @param client - the signed-in admin's client
 * @param contestId - the contest
 * @param details - every field of the editor
 * @returns the problems still stopping it from opening
 * Errors: a ContestError (too_long, bad_word_limit, breaks_open_contest with problems, …).
 */
export async function saveContest(
  client: AppSupabaseClient,
  contestId: string,
  details: ContestDetails,
): Promise<string[]> {
  const { data, error } = await client.rpc('admin_save_contest', {
    target_contest_id: contestId,
    // The fields as a plain JSON object (every value is text, a number, a list or null).
    details: Object.fromEntries(Object.entries(details)),
  });
  if (error !== null) throw contestErrorFrom(error);
  return data;
}

/**
 * What still stops a contest from opening.
 *
 * @param client - the signed-in admin's client
 * @param contestId - the contest
 * @returns the problem codes (empty when it may open)
 * Errors: a ContestError.
 */
export async function fetchContestProblems(
  client: AppSupabaseClient,
  contestId: string,
): Promise<string[]> {
  const { data, error } = await client.rpc('admin_contest_problems', {
    target_contest_id: contestId,
  });
  if (error !== null) throw contestErrorFrom(error);
  return data;
}

/**
 * Opens a contest for entries.
 *
 * @param client - the signed-in admin's client
 * @param contestId - the contest
 * Errors: a ContestError (not_ready with problems, already_open, not_allowed).
 */
export async function openContest(client: AppSupabaseClient, contestId: string): Promise<void> {
  const { error } = await client.rpc('admin_open_contest', { target_contest_id: contestId });
  if (error !== null) throw contestErrorFrom(error);
}

/**
 * The contests the signed-in writer can enter now, seen from one of their stories.
 *
 * @param client - the writer's client
 * @param storySlug - the writer's story
 * @returns the contests (empty for anyone else's story)
 * Errors: a ContestError when the call fails; a ZodError when the answer has the wrong shape.
 */
export async function fetchContestEntryOptions(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<ContestEntryOption[]> {
  const { data, error } = await client.rpc('contest_entry_options', { story_slug: storySlug });
  if (error !== null) throw contestErrorFrom(error);
  return contestEntryOptionsSchema.parse(data);
}

/**
 * Enters a story in a contest.
 *
 * @param client - the writer's client
 * @param contestId - the contest
 * @param storySlug - the writer's story
 * Errors: a ContestError (already_entered, rating, word_limit, not_active, no_contest, …).
 */
export async function enterContest(
  client: AppSupabaseClient,
  contestId: string,
  storySlug: string,
): Promise<void> {
  const { error } = await client.rpc('enter_contest', {
    target_contest_id: contestId,
    story_slug: storySlug,
  });
  if (error !== null) throw contestErrorFrom(error);
}

/**
 * Withdraws the writer's entry while entries are open.
 *
 * @param client - the writer's client
 * @param contestId - the contest
 * Errors: a ContestError (closed, no_entry).
 */
export async function withdrawContestEntry(
  client: AppSupabaseClient,
  contestId: string,
): Promise<void> {
  const { error } = await client.rpc('withdraw_contest_entry', { target_contest_id: contestId });
  if (error !== null) throw contestErrorFrom(error);
}
