/**
 * Sharing a chapter and the quote-share card (stories S1-E4-05 and S1-E4-07; board 3.6 Share).
 *
 * Who calls it: components/ShareButton.tsx, hooks/useQuoteCardState.ts and
 * components/QuoteCardDialog.tsx.
 * What it calls next (supabase/migrations/…_s1_e4_05_07_share_and_quote_cards.sql):
 * - record_chapter_share(): one more on the chapter's share total for today, never who shared;
 * - quote_card_state(): whether the reader may make a quote card and whether they already did;
 * - make_quote_card(): records the card (one per chapter, Q17) before the device draws it;
 * - share_options() (S1-E4-11, …_s1_e4_11_share_passages_and_pictures.sql): whether the reader may
 *   share passages and pictures from the chapter (the writer's two switches; never for 16+ or 18+),
 *   and the writer's colour for new cards (IDEAS-1c, …_ideas1_c_readers_to_writers.sql).
 * Every function takes the chapter's address and applies the reader's rules (rating, blocks,
 * moderation); none returns a user ID.
 */
import type { SpotRange } from '@/lib/chapter-blocks';
import type { AppSupabaseClient } from '@/lib/supabase';

/** A chapter by its address. */
export interface ChapterAddress {
  storySlug: string;
  chapterCode: string;
}

/** Whether the reader may make a quote card from a chapter. */
export interface QuoteCardState {
  /** False for a visitor, a chapter they can't read, or a story whose writer switched cards off. */
  allowed: boolean;
  /** True once they made a card from this chapter (the limit is one, Q17). */
  alreadyMade: boolean;
}

/** What make_quote_card() can answer. */
export type QuoteCardOutcome = 'ok' | 'already_made' | 'switched_off' | 'not_found';

/** Thrown when the reader made many cards in the last hour (S1-E10-12). */
export class QuoteCardRateLimitError extends Error {
  constructor(public readonly waitMinutes: number | null) {
    super('Too many quote cards in the last hour.');
  }
}

/** The SQLSTATE take_rate_limit() raises (program_limit_exceeded). */
const rateLimitCode = '54000';

/**
 * Reads the minutes to wait from a rate-limit error's hint ("wait_minutes:12").
 *
 * @param hint - the error's hint
 * @returns the minutes, or null when the hint has none
 */
function waitMinutesFrom(hint: string | undefined): number | null {
  const match = /wait_minutes:(\d+)/.exec(hint ?? '');
  return match?.[1] === undefined ? null : Number(match[1]);
}

/**
 * Counts one share of a chapter. A share past the hourly limit, or by the chapter's own writer,
 * isn't counted, and that is not an error: the link was still shared.
 *
 * @param client - the shared Supabase client
 * @param address - the chapter
 * @returns true when the share was counted
 * Errors: throws with Supabase's message when the database refuses or can't be reached.
 */
export async function recordChapterShare(
  client: AppSupabaseClient,
  address: ChapterAddress,
): Promise<boolean> {
  const { data, error } = await client.rpc('record_chapter_share', {
    story_slug: address.storySlug,
    chapter_code: address.chapterCode,
  });
  if (error !== null) throw new Error(`Could not count the share: ${error.message}`);
  return data === true;
}

/**
 * Counts one share of a passage or picture link: once for the chapter and once for each paragraph
 * it covers, for the writer's most-loved lines (IDEAS-1d). Never records who.
 *
 * @param client - the shared Supabase client
 * @param address - the chapter
 * @param range - the blocks the link covers (at most five)
 * @returns true when counted; false for the writer's own chapter, a wrong range or past the limit
 * Errors: throws with Supabase's message (signed out, or the database can't be reached).
 */
export async function recordPassageShare(
  client: AppSupabaseClient,
  address: ChapterAddress,
  range: SpotRange,
): Promise<boolean> {
  const { data, error } = await client.rpc('record_passage_share', {
    story_slug: address.storySlug,
    chapter_code: address.chapterCode,
    first_block: range.first,
    last_block: range.last,
  });
  if (error !== null) throw new Error(`Could not count the share: ${error.message}`);
  return data === true;
}

/**
 * Asks whether the reader may make a quote card from a chapter.
 *
 * @param client - the shared Supabase client
 * @param address - the chapter
 * @returns the state
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchQuoteCardState(
  client: AppSupabaseClient,
  address: ChapterAddress,
): Promise<QuoteCardState> {
  const { data, error } = await client.rpc('quote_card_state', {
    story_slug: address.storySlug,
    chapter_code: address.chapterCode,
  });
  if (error !== null) throw new Error(`Could not read the quote card state: ${error.message}`);
  const row = data as { allowed?: boolean; already_made?: boolean } | null;
  return { allowed: row?.allowed === true, alreadyMade: row?.already_made === true };
}

/**
 * Records a quote card from a chapter, before it is copied or saved.
 *
 * @param client - the shared Supabase client
 * @param address - the chapter
 * @returns the outcome: 'ok', or why no card can be made
 * Errors: QuoteCardRateLimitError past the hourly limit; otherwise throws with Supabase's message.
 */
export async function makeQuoteCard(
  client: AppSupabaseClient,
  address: ChapterAddress,
): Promise<QuoteCardOutcome> {
  const { data, error } = await client.rpc('make_quote_card', {
    story_slug: address.storySlug,
    chapter_code: address.chapterCode,
  });
  if (error !== null) {
    if (error.code === rateLimitCode)
      throw new QuoteCardRateLimitError(waitMinutesFrom(error.hint));
    throw new Error(`Could not make the quote card: ${error.message}`);
  }
  const outcome = (data as { outcome?: string } | null)?.outcome;
  if (outcome === 'ok' || outcome === 'already_made' || outcome === 'switched_off') return outcome;
  return 'not_found';
}

/** What the reader may share from a chapter beyond its plain link (S1-E4-11). */
export interface ShareOptions {
  /** Passages: quote cards and passage links. */
  passages: boolean;
  /** The chapter's pictures: picture cards and picture links. */
  pictures: boolean;
  /** The palette colour the writer picked for new cards (IDEAS-1c); null for our default. */
  cardColour: string | null;
}

/**
 * Asks what the reader may share from a chapter.
 *
 * @param client - the shared Supabase client
 * @param address - the chapter
 * @returns the options; both false (and no colour) for a visitor, a 16+ or 18+ story, or a
 *   chapter they can't read
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchShareOptions(
  client: AppSupabaseClient,
  address: ChapterAddress,
): Promise<ShareOptions> {
  const { data, error } = await client.rpc('share_options', {
    story_slug: address.storySlug,
    chapter_code: address.chapterCode,
  });
  if (error !== null) throw new Error(`Could not read what may be shared: ${error.message}`);
  const row = data as {
    passages?: boolean;
    pictures?: boolean;
    card_colour?: string | null;
  } | null;
  return {
    passages: row?.passages === true,
    pictures: row?.pictures === true,
    cardColour: row?.card_colour ?? null,
  };
}
