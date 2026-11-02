/**
 * Stories shared only with a class (bundle CLASSES, part c; story S1-E8-11): whether a writer's
 * story is shared with one of their classes, sharing it or making it public again, and the
 * stories a class page lists.
 *
 * Who calls it: hooks/useClassStories.ts. What it calls next: story_class_share(),
 * set_story_class() and class_space_stories() in
 * supabase/migrations/…_classes_c_class_stories.sql. The database decides who may read a
 * class-only story (the writer, the class's active members and the moderation team); this file
 * only reads its answers and turns refusals into ClassStoryError.
 */
import {
  type ListedStory,
  type ListedStoryRow,
  toListedStory,
} from '@/features/discovery/api/storyLists';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** A class, by its address and name. */
export interface ClassChoice {
  slug: string;
  name: string;
}

/** Who may read one of the writer's stories, and which classes they could share it with. */
export interface StoryClassShare {
  /** True while only the class (and the writer) may read it. */
  isClassOnly: boolean;
  /** The class it is shared with; null when public, or when the class was deleted. */
  sharedWith: ClassChoice | null;
  /** The classes the writer is in and may share with (not locked). */
  choices: ClassChoice[];
}

/** Why the database refused a change. */
export type ClassStoryFailure = 'missing' | 'not_yours' | 'unreachable';

/** The error a refused call throws. */
export class ClassStoryError extends Error {
  constructor(readonly failure: ClassStoryFailure) {
    super(`The class story call was refused: ${failure}`);
    this.name = 'ClassStoryError';
  }
}

/** The database's hints and the failure each one means. */
const failureForHint: Record<string, ClassStoryFailure> = {
  'story:missing': 'missing',
  'class:not_yours': 'not_yours',
};

/**
 * Turns a database error into a ClassStoryError.
 *
 * @param error - Postgres's hint
 * @returns the failure by hint, otherwise unreachable
 */
export function classStoryErrorFrom(error: { hint?: string | null }): ClassStoryError {
  return new ClassStoryError(failureForHint[error.hint ?? ''] ?? 'unreachable');
}

/**
 * Reads one class from the database's answer.
 *
 * @param value - an object with slug and name, or null
 * @returns the class, or null when there is none
 */
function classChoiceFrom(value: Json | undefined): ClassChoice | null {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return { slug: String(value['slug']), name: String(value['name']) };
}

/**
 * Reads the whole answer of story_class_share() or set_story_class().
 *
 * @param data - the answer, or null when the story isn't the caller's
 * @returns the share, or null when there is no such story of theirs
 */
export function storyClassShareFrom(data: Json): StoryClassShare | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
  const choices = Array.isArray(data['choices']) ? data['choices'] : [];
  return {
    isClassOnly: data['class_only'] === true,
    sharedWith: classChoiceFrom(data['class']),
    choices: choices
      .map((choice) => classChoiceFrom(choice))
      .filter((choice): choice is ClassChoice => choice !== null),
  };
}

/**
 * Whether the writer's story is shared with a class, and the classes they could pick.
 *
 * @param client - the Supabase client
 * @param storySlug - the writer's own story
 * @returns the share, or null when it isn't their story
 * @throws ClassStoryError when the database can't be reached
 */
export async function fetchStoryClassShare(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<StoryClassShare | null> {
  const { data, error } = await client.rpc('story_class_share', { story_slug: storySlug });
  if (error) throw classStoryErrorFrom(error);
  return storyClassShareFrom(data);
}

/**
 * Shares the story only with one class, or makes it public again (classSlug null).
 *
 * @param client - the Supabase client
 * @param request - the story and the class, or null for everyone
 * @returns the share after the change
 * @throws ClassStoryError when refused (missing, not_yours)
 */
export async function setStoryClass(
  client: AppSupabaseClient,
  request: { storySlug: string; classSlug: string | null },
): Promise<StoryClassShare | null> {
  // Leaving the class out makes the story public again (the function's default).
  const args =
    request.classSlug === null
      ? { story_slug: request.storySlug }
      : { story_slug: request.storySlug, class_slug: request.classSlug };
  const { data, error } = await client.rpc('set_story_class', args);
  if (error) throw classStoryErrorFrom(error);
  return storyClassShareFrom(data);
}

/**
 * The stories shared with a class, for whoever may read the class.
 *
 * @param client - the Supabase client
 * @param slug - the class's address
 * @returns the stories, most recently updated first (empty when the caller may not read it)
 * @throws ClassStoryError when the database can't be reached
 */
export async function fetchClassSpaceStories(
  client: AppSupabaseClient,
  slug: string,
): Promise<ListedStory[]> {
  const { data, error } = await client.rpc('class_space_stories', { slug });
  if (error) throw classStoryErrorFrom(error);
  // The rows are story_card_json(), the same shape browse_stories() lists.
  const rows = Array.isArray(data) ? (data as unknown as ListedStoryRow[]) : [];
  return rows.map(toListedStory);
}
