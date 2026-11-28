/**
 * Reads and saves a play's cast, the story's list of characters (LAYOUTS-2; board D14).
 *
 * Who calls it: usePlayCast (src/features/writing/hooks/). What it calls next: Supabase.
 * - Reading: stories.play_cast of the writer's own story, through the stories table's own-row
 *   read (a writer reads every column of their own story).
 * - Saving: set_story_cast(story_slug, cast_list) → 'ok' | 'not_found' | one of
 *   play_cast_problem()'s answers ('too_many', 'bad_name', 'bad_note', 'duplicate_name', …).
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import { readStoredCast, type CastMember } from '@/schemas/playCast';

/** What a save answers: 'ok', or why the cast wasn't saved. */
export type SaveCastOutcome =
  | 'ok'
  | 'not_found'
  | 'not_a_list'
  | 'too_many'
  | 'bad_entry'
  | 'bad_name'
  | 'bad_note'
  | 'duplicate_name';

/** Every answer set_story_cast() can give, to check the database's answer against. */
const SAVE_OUTCOMES: SaveCastOutcome[] = [
  'ok',
  'not_found',
  'not_a_list',
  'too_many',
  'bad_entry',
  'bad_name',
  'bad_note',
  'duplicate_name',
];

/**
 * Reads the cast of the writer's own story.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's address
 * @returns the characters, in the writer's order; none for a story with no cast yet
 * Errors: throws when the database can't be reached.
 */
export async function fetchStoryCast(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<CastMember[]> {
  const { data, error } = await client
    .from('stories')
    .select('play_cast')
    .eq('slug', storySlug)
    .is('deleted_at', null)
    .maybeSingle();
  if (error !== null) throw new Error(`Could not read the characters: ${error.message}`);
  return readStoredCast(data?.play_cast);
}

/**
 * Replaces the cast of the writer's own story.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's address
 * @param cast - the whole new list
 * @returns 'ok', or why it wasn't saved
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function saveStoryCast(
  client: AppSupabaseClient,
  storySlug: string,
  cast: CastMember[],
): Promise<SaveCastOutcome> {
  const { data, error } = await client.rpc('set_story_cast', {
    story_slug: storySlug,
    cast_list: cast,
  });
  if (error !== null) throw new Error(`Could not save the characters: ${error.message}`);
  const outcome = SAVE_OUTCOMES.find((known) => known === data);
  if (outcome === undefined) {
    throw new Error(`Unexpected answer from set_story_cast: ${JSON.stringify(data)}`);
  }
  return outcome;
}
