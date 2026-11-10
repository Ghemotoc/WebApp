/**
 * The contests on the Writers' hub: the one way the hub reads them (bundle G9 WRITING, part a).
 *
 * Who calls it: hooks/useHubContests.ts. What it calls next: the database function
 * writers_hub_contests() (migration g9a_writers_hub), which lists the contests the signed-in
 * writer can enter today. Members can't read the contests table itself (contests_select_staff),
 * so this function is the hub's only way in.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** One open contest as the hub shows it. */
export interface HubContest {
  contestId: string;
  nameRo: string;
  nameEn: string;
  /** The landing page's address part: the contest lives at /c/<pageSlug>. */
  pageSlug: string;
  /** The last day of entries (YYYY-MM-DD, Romania time, included). */
  entriesCloseOn: string;
  /** The word limit, or null when there is none. */
  wordLimit: number | null;
  prizeRo: string;
  prizeEn: string;
}

/**
 * Reads the contests the signed-in writer can enter today, soonest closing first.
 *
 * @param client - the shared Supabase client
 * @returns the contests (empty when none is open for this writer)
 * @throws Error with the database's message when the read fails
 */
export async function fetchHubContests(client: AppSupabaseClient): Promise<HubContest[]> {
  // Step 1: ask the database; it checks the dates, the age group and the market itself.
  const { data, error } = await client.rpc('writers_hub_contests');
  if (error) throw new Error(error.message);
  // Step 2: turn each row into the app's camelCase shape.
  return data.map((row) => ({
    contestId: row.contest_id,
    nameRo: row.name_ro,
    nameEn: row.name_en,
    pageSlug: row.page_slug,
    entriesCloseOn: row.entries_close_on,
    // The generated type says number, but the column may be empty: keep "no limit" as null.
    wordLimit: typeof row.word_limit === 'number' ? row.word_limit : null,
    prizeRo: row.prize_ro,
    prizeEn: row.prize_en,
  }));
}
