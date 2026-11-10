/**
 * The contests on the Writers' hub: the one way the hub reads them (bundle G9 WRITING, part a).
 *
 * Who calls it: hooks/useHubContests.ts. What it calls next: the database function
 * writers_hub_contests() (migration g9a_writers_hub), which lists the contests the signed-in
 * writer can enter today. Members can't read the contests table itself (contests_select_staff),
 * so this function is the hub's only way in. GAPS-12a adds each contest's entry count and its
 * cover: the landing page's first picture, as a signed address once it passed its check
 * (features/pictures/api/pictures.ts).
 */
import { pictureViewsFromJson } from '@/features/pictures/api/pictures';
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
  /** How many entries count today (withdrawn and disqualified ones don't). */
  entryCount: number;
  /** The cover's signed address (30 minutes); null when the page has no picture readers may see. */
  coverUrl: string | null;
  coverAltRo: string;
  coverAltEn: string;
}

/**
 * The signed address of a contest's cover, from {"<picture ID>": picture_state_json}.
 *
 * @param client - the shared Supabase client
 * @param cover - the cover as writers_hub_contests() answers it
 * @returns the address, or null when there is no picture or it isn't visible yet
 */
async function coverUrlFrom(
  client: AppSupabaseClient,
  cover: Parameters<typeof pictureViewsFromJson>[1],
): Promise<string | null> {
  const views = Object.values(await pictureViewsFromJson(client, cover));
  const visible = views.find((view) => view.state === 'visible' && view.url !== null);
  return visible?.url ?? null;
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
  // Step 2: turn each row into the app's camelCase shape, signing each cover's address.
  return Promise.all(
    data.map(async (row) => ({
      contestId: row.contest_id,
      nameRo: row.name_ro,
      nameEn: row.name_en,
      pageSlug: row.page_slug,
      entriesCloseOn: row.entries_close_on,
      // The generated type says number, but the column may be empty: keep "no limit" as null.
      wordLimit: typeof row.word_limit === 'number' ? row.word_limit : null,
      prizeRo: row.prize_ro,
      prizeEn: row.prize_en,
      entryCount: row.entry_count,
      coverUrl: await coverUrlFrom(client, row.cover),
      coverAltRo: row.cover_alt_ro,
      coverAltEn: row.cover_alt_en,
    })),
  );
}
