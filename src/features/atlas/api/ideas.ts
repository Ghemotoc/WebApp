/**
 * Reads and changes a story's questions and ideas (stories S1-E17-27 and S1-E17-28; bundle
 * ATLAS, part g).
 *
 * Who calls it: hooks/useStoryIdeas.ts.
 * What it calls next: Supabase (supabase/migrations/…_s1_e17_27_ideas_and_marketing.sql):
 * story_ideas() to read them, add_story_idea() for the quick-add box, update_story_idea() and
 * delete_story_idea(). Only the writer reads them (story_ideas_select_own).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { checkedAnswer } from './checkedAnswer';

/** S1-E17-27's four types of note. */
export const ideaKinds = ['question', 'idea', 'todo', 'decision'] as const;
export type IdeaKind = (typeof ideaKinds)[number];

/** One question, idea, to-do or decision. */
export interface StoryIdea {
  id: string;
  kind: IdeaKind;
  body: string;
  /** "Action or outcome" (S1-E17-28). */
  outcome: string;
  /** When it was ticked done, or null while it is open. */
  doneAt: string | null;
  createdAt: string;
}

/** What the Ideas page shows. */
export interface StoryIdeas {
  storyTitle: string;
  /** Newest first. */
  items: StoryIdea[];
}

/** The cache key of a story's notes. */
export const storyIdeasQueryKey = (userId: string | null, slug: string) => [
  'story-ideas',
  userId,
  slug,
];

/** story_ideas()'s answer, as the database writes it. */
interface StoryIdeasRow {
  title: string;
  items: {
    id: string;
    kind: IdeaKind;
    body: string;
    outcome: string;
    done_at: string | null;
    created_at: string;
  }[];
}

/**
 * Reads a story's notes.
 *
 * @returns the notes, or null when the story isn't the writer's
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function fetchStoryIdeas(
  client: AppSupabaseClient,
  slug: string,
): Promise<StoryIdeas | null> {
  const answer = await client.rpc('story_ideas', { story_slug: slug });
  const data = checkedAnswer(answer, 'read the notes', ['ok', 'not_found']);
  if (data.outcome === 'not_found') return null;
  const row = data as unknown as StoryIdeasRow;
  return {
    storyTitle: row.title,
    items: row.items.map((item) => ({
      id: item.id,
      kind: item.kind,
      body: item.body,
      outcome: item.outcome,
      doneAt: item.done_at,
      createdAt: item.created_at,
    })),
  };
}

/**
 * Adds one line from the quick-add box (S1-E17-27).
 *
 * Errors: throws when the line is empty, the story has 1,000 notes or the database can't be
 *   reached.
 */
export async function addStoryIdea(
  client: AppSupabaseClient,
  slug: string,
  kind: IdeaKind,
  body: string,
) {
  const answer = await client.rpc('add_story_idea', {
    story_slug: slug,
    idea_kind: kind,
    idea_body: body,
  });
  checkedAnswer(answer, 'add the note');
}

/** One change to a note, keyed as the database names its fields. */
export interface StoryIdeaChange {
  kind?: IdeaKind;
  body?: string;
  outcome?: string;
  /** true records the date it was done; false clears it. */
  is_done?: boolean;
}

/**
 * Saves one change to a note (S1-E17-28: each field saves by itself).
 *
 * Errors: throws when the database refuses it or can't be reached.
 */
export async function saveStoryIdeaChange(
  client: AppSupabaseClient,
  ideaId: string,
  change: StoryIdeaChange,
) {
  const answer = await client.rpc('update_story_idea', { idea_id: ideaId, changes: { ...change } });
  checkedAnswer(answer, 'save the note');
}

/**
 * Deletes a note (the screen asks twice first).
 *
 * Errors: throws when the database can't be reached or the note isn't the writer's.
 */
export async function deleteStoryIdea(client: AppSupabaseClient, ideaId: string) {
  const answer = await client.rpc('delete_story_idea', { idea_id: ideaId });
  checkedAnswer(answer, 'delete the note');
}
