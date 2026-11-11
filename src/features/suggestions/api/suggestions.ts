/**
 * The three suggestion rows (story S1-E15-06, bundle ANALYTICS-1c): "More by <writer>", "Stories
 * like this" and "Because you read <title>".
 *
 * Who calls it: hooks/useSuggestionRow.ts.
 * What it calls next: more_by_writer(), stories_like_this() and because_you_read()
 * (…_s1_e15_06_suggestions.sql). Each answers only with stories the caller may see, through the
 * same list rules as every shelf (rating, blocks, moderation, class spaces, unlisted stories).
 */
import {
  toListedStory,
  type ListedStory,
  type ListedStoryRow,
} from '@/features/discovery/api/storyLists';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** Which row: beside a story (the first two) or on Discover (the third). */
export type SuggestionKind = 'more_by_writer' | 'like_this' | 'because_you_read';

/** One row's stories, and for "Because you read" the finished story it starts from. */
export interface SuggestionRow {
  stories: ListedStory[];
  /** The story the reader finished, for "Because you read"; null for the other rows. */
  source: ListedStory | null;
}

/** An empty row, for a failed read or a row with nothing to show. */
export const emptySuggestionRow: SuggestionRow = { stories: [], source: null };

/**
 * Whether a value looks like a story card from story_card_json().
 *
 * @param value - one element of the answer
 * @returns true for an object with a slug and a writer
 */
function isCardRow(value: Json | undefined): value is Json & ListedStoryRow {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return typeof value.slug === 'string' && typeof value.writer === 'object';
}

/**
 * The answer in the page's words: {stories: [...], source?: card or null}.
 *
 * @param answer - what the database function returned
 * @returns the row; anything unexpected becomes an empty row
 */
export function suggestionRowFromAnswer(answer: Json): SuggestionRow {
  if (typeof answer !== 'object' || answer === null || Array.isArray(answer)) {
    return emptySuggestionRow;
  }
  const stories = Array.isArray(answer.stories) ? answer.stories.filter(isCardRow) : [];
  const source = isCardRow(answer.source) ? toListedStory(answer.source) : null;
  return { stories: stories.map((row) => toListedStory(row)), source };
}

/**
 * Reads one row.
 *
 * @param client - the shared Supabase client
 * @param kind - which row
 * @param storySlug - the story the row is shown beside (ignored for "Because you read")
 * @returns the row
 * @throws Error when the database can't be reached
 */
export async function fetchSuggestionRow(
  client: AppSupabaseClient,
  kind: SuggestionKind,
  storySlug: string,
): Promise<SuggestionRow> {
  // Step 1: each row has its own function; the first two take the story beside them.
  const reply =
    kind === 'because_you_read'
      ? await client.rpc('because_you_read')
      : await client.rpc(kind === 'more_by_writer' ? 'more_by_writer' : 'stories_like_this', {
          story_slug: storySlug,
        });
  // Step 2: a refusal is said plainly, so the hook can log it and show nothing.
  if (reply.error !== null) {
    throw new Error(`The ${kind} suggestions could not be read: ${reply.error.message}`);
  }
  return suggestionRowFromAnswer(reply.data);
}
