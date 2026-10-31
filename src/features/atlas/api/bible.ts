/**
 * Reads and changes one story's bible in Story Atlas (stories S1-E17-17 and S1-E17-18).
 *
 * Who calls it: hooks/useStoryBible.ts.
 * What it calls next: Supabase (supabase/migrations/…_s1_e17_17_bible.sql):
 * - story_bible(): the sections in order and every entry;
 * - add_bible_section(), rename_bible_section(), move_bible_section() and delete_bible_section();
 * - create_bible_entry(), update_bible_entry() and delete_bible_entry().
 * The bible is private: only its writer can read it (story_bible_sections_select_own and
 * story_bible_entries_select_own).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** The seven default sections every plan starts with (S1-E17-17). */
export const bibleSectionPresets = [
  'premise',
  'world',
  'magic',
  'cosmology',
  'factions',
  'history',
  'glossary',
] as const;
export type BibleSectionPreset = (typeof bibleSectionPresets)[number];

/** One section of the bible. */
export interface BibleSection {
  id: string;
  /** A default section's key, so its name shows in the writer's language; null for their own. */
  preset: BibleSectionPreset | null;
  /** The writer's own name; empty while a default section keeps its default name. */
  name: string;
  position: number;
}

/** One entry of the bible (S1-E17-18). */
export interface BibleEntry {
  id: string;
  sectionId: string;
  title: string;
  tags: string[];
  /** Free text in the Markdown subset (CLAUDE.md rule 8). */
  body: string;
  updatedAt: string;
}

/** Everything the bible page shows. */
export interface StoryBible {
  storyTitle: string;
  sections: BibleSection[];
  entries: BibleEntry[];
}

/** The cache key of one story's bible. */
export const storyBibleQueryKey = (userId: string | null, slug: string) => [
  'story-bible',
  userId,
  slug,
];

/** story_bible()'s answer, as the database writes it. */
interface StoryBibleRow {
  story: { title: string };
  sections: BibleSection[];
  entries: {
    id: string;
    section_id: string;
    title: string;
    tags: string[];
    body: string;
    updated_at: string;
  }[];
}

/**
 * Reads one story's bible.
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @returns the bible, or null when the story isn't the writer's or is deleted
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function fetchStoryBible(
  client: AppSupabaseClient,
  slug: string,
): Promise<StoryBible | null> {
  const { data, error } = await client.rpc('story_bible', { story_slug: slug });
  if (error !== null) throw new Error(`Could not read the story bible: ${error.message}`);
  const answer = data as { outcome?: string } | null;
  if (answer?.outcome === 'not_found') return null;
  if (answer?.outcome !== 'ok') {
    throw new Error(`Unexpected answer from story_bible: ${JSON.stringify(data)}`);
  }
  const row = answer as unknown as StoryBibleRow;
  return {
    storyTitle: row.story.title,
    sections: row.sections,
    entries: row.entries.map((entry) => ({
      id: entry.id,
      sectionId: entry.section_id,
      title: entry.title,
      tags: entry.tags,
      body: entry.body,
      updatedAt: entry.updated_at,
    })),
  };
}

/**
 * The answer of a change, or an error naming what didn't work.
 *
 * @param answer - what Supabase returned
 * @param action - the words for the error message ("add the section")
 * @param allowedOutcomes - the outcomes that aren't an error ('ok' unless the caller says more)
 * @returns the answer's object, whose outcome is 'ok' or one the caller allows
 */
function checkedAnswer(
  answer: { data: unknown; error: { message: string } | null },
  action: string,
  allowedOutcomes: string[] = ['ok'],
): Record<string, unknown> {
  if (answer.error !== null) throw new Error(`Could not ${action}: ${answer.error.message}`);
  const data = answer.data as Record<string, unknown> | null;
  if (!allowedOutcomes.includes(String(data?.outcome))) {
    throw new Error(`Could not ${action}: ${String(data?.outcome)}`);
  }
  return data ?? {};
}

/**
 * Adds a section of the writer's own at the end (S1-E17-17).
 *
 * @returns the new section's ID
 * Errors: throws when the name is empty or too long, there are 50 sections already, or the
 *   database can't be reached.
 */
export async function addBibleSection(client: AppSupabaseClient, slug: string, name: string) {
  const answer = await client.rpc('add_bible_section', { story_slug: slug, section_name: name });
  return String(checkedAnswer(answer, 'add the section').id);
}

/**
 * Renames a section; an empty name gives a default section its default name back.
 *
 * Errors: throws when the database refuses the name or can't be reached.
 */
export async function renameBibleSection(
  client: AppSupabaseClient,
  sectionId: string,
  name: string,
) {
  const answer = await client.rpc('rename_bible_section', {
    section_id: sectionId,
    section_name: name,
  });
  checkedAnswer(answer, 'rename the section');
}

/**
 * Puts a section at a new place (from 1), the others shifting (S1-E17-17).
 *
 * Errors: throws when the database can't be reached.
 */
export async function moveBibleSection(
  client: AppSupabaseClient,
  sectionId: string,
  newPosition: number,
) {
  const answer = await client.rpc('move_bible_section', {
    section_id: sectionId,
    new_position: newPosition,
  });
  checkedAnswer(answer, 'move the section');
}

/**
 * Deletes a section, only when it is empty (S1-E17-17; the screen asks twice first).
 *
 * @returns 'ok', or 'not_empty' when it still has entries
 * Errors: throws when the database can't be reached.
 */
export async function deleteBibleSection(
  client: AppSupabaseClient,
  sectionId: string,
): Promise<'ok' | 'not_empty'> {
  const answer = await client.rpc('delete_bible_section', { section_id: sectionId });
  const data = checkedAnswer(answer, 'delete the section', ['ok', 'not_empty']);
  return data.outcome === 'not_empty' ? 'not_empty' : 'ok';
}

/**
 * Adds an entry to a section (S1-E17-18).
 *
 * @returns the new entry's ID, so it opens
 * Errors: throws when the title is empty, there are 2,000 entries already, or the database can't
 *   be reached.
 */
export async function createBibleEntry(
  client: AppSupabaseClient,
  sectionId: string,
  title: string,
) {
  const answer = await client.rpc('create_bible_entry', {
    section_id: sectionId,
    entry_title: title,
  });
  return String(checkedAnswer(answer, 'add the entry').id);
}

/** One change to an entry: any of its title, tags, text or section. */
export interface BibleEntryChange {
  title?: string;
  tags?: string[];
  body?: string;
  section_id?: string;
}

/**
 * Saves one change to an entry (S1-E17-18: each field saves by itself).
 *
 * Errors: throws when the database refuses it (raw HTML, a script link, an empty title) or can't
 *   be reached.
 */
export async function saveBibleEntryChange(
  client: AppSupabaseClient,
  entryId: string,
  change: BibleEntryChange,
) {
  const answer = await client.rpc('update_bible_entry', {
    entry_id: entryId,
    changes: { ...change },
  });
  checkedAnswer(answer, 'save the entry');
}

/**
 * Deletes an entry (S1-E17-18; the screen asks twice first).
 *
 * Errors: throws when the database can't be reached or the entry isn't the writer's.
 */
export async function deleteBibleEntry(client: AppSupabaseClient, entryId: string) {
  const answer = await client.rpc('delete_bible_entry', { entry_id: entryId });
  checkedAnswer(answer, 'delete the entry');
}
