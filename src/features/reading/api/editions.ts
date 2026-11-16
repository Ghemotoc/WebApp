/**
 * The languages a story can be read in (bundle TRANSLATE-1b; Robert, 16 Nov 2026).
 *
 * One story can have several language editions: each is a story page of its own, linked to the
 * first edition (supabase/migrations/…_translate1_01_story_editions.sql). This file turns what
 * get_story_page(), get_chapter() and the story cards answer about them into the app's shape.
 *
 * Who calls it: api/storyPage.ts, api/chapter.ts and src/features/discovery/api/storyLists.ts
 * (the parsers); hooks/useOpeningEdition.ts (fetchOpeningEdition).
 * What it calls next: story_opening_edition(story_slug), which names the edition a story should
 * open in for this reader: the page's language, then a language they read, then the first edition.
 * Robert's rule (16 Nov 2026, 12:23 UTC): the list of editions is empty for a story in one
 * language, so no switch and no language tag is ever drawn for it.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** One language a story can be read in. */
export interface StoryEdition {
  languageCode: string;
  /** This edition's own story address. */
  slug: string;
  /** The title in this language. */
  title: string;
  /** True for the language the story was written in. */
  isOriginal: boolean;
  /** A classic's translator; null for the original and for a member's story. */
  translatorName: string | null;
  /** True for the edition on screen. */
  isCurrent: boolean;
  /**
   * In the reader: this edition's address for the chapter on screen, so changing language keeps
   * the chapter. Null on the story page.
   */
  chapterCode: string | null;
}

/** What "About this edition" on the story page says. */
export interface EditionFacts {
  /** The language the story was written in. */
  originalLanguage: string;
  isOriginal: boolean;
  /** How many of the story's chapters this edition has, and how many the story has. */
  chaptersHere: number;
  chaptersInStory: number;
  /** A classic's translator; null for a member's story (only the writer translates it). */
  translatorName: string | null;
  /** True for a public-domain classic (TRANSLATE-1d): its page says why it may be shown. */
  isClassic: boolean;
  /** Why a translated classic may be shown; null when staff haven't said, or for an original. */
  translationRights: TranslationRights | null;
}

/** Why a translated classic may be shown (classic_works.translation_rights). */
export type TranslationRights = 'public_domain' | 'signed_licence' | 'made_for_platform';

/** One edition as the database answers it (story_editions_json()). */
interface StoryEditionRow {
  language_code: string;
  slug: string;
  title: string;
  is_original: boolean;
  translator_name?: string | null;
  is_current: boolean;
  chapter_code?: string | null;
}

/** The edition facts as the database answers them (story_edition_json()). */
interface EditionFactsRow {
  original_language: string;
  is_original: boolean;
  chapters_here: number;
  chapters_in_story: number;
  translator_name: string | null;
  /** Missing from answers saved before TRANSLATE-1d. */
  is_classic?: boolean;
  translation_rights?: TranslationRights | null;
}

/**
 * The editions in the app's shape.
 *
 * @param rows - the answer's `editions` (or a card's `languages`); missing from answers saved
 *   before TRANSLATE-1
 * @returns the editions, the first edition first; empty for a story in one language
 */
export function storyEditionsFrom(rows: unknown): StoryEdition[] {
  if (!Array.isArray(rows)) return [];
  return (rows as StoryEditionRow[]).map((row) => ({
    languageCode: row.language_code,
    slug: row.slug,
    title: row.title,
    isOriginal: row.is_original,
    translatorName: row.translator_name ?? null,
    isCurrent: row.is_current,
    chapterCode: row.chapter_code ?? null,
  }));
}

/**
 * The edition facts in the app's shape.
 *
 * @param row - the answer's `edition`; missing from answers saved before TRANSLATE-1
 * @returns the facts, or null
 */
export function editionFactsFrom(row: unknown): EditionFacts | null {
  if (row === null || row === undefined) return null;
  const facts = row as EditionFactsRow;
  return {
    originalLanguage: facts.original_language,
    isOriginal: facts.is_original,
    chaptersHere: facts.chapters_here,
    chaptersInStory: facts.chapters_in_story,
    translatorName: facts.translator_name,
    isClassic: facts.is_classic ?? false,
    translationRights: facts.translation_rights ?? null,
  };
}

/**
 * Asks which edition a story should open in for this reader.
 *
 * @param client - the shared Supabase client
 * @param storySlug - any edition's address
 * @returns the address and language of the edition to show, or null for a story in one language
 *   (or one the reader may not see)
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchOpeningEdition(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<{ slug: string; languageCode: string } | null> {
  const { data, error } = await client.rpc('story_opening_edition', { story_slug: storySlug });
  if (error !== null) throw new Error(`Could not choose the language: ${error.message}`);
  if (data === null) return null;
  const row = data as unknown as { slug: string; language_code: string };
  return { slug: row.slug, languageCode: row.language_code };
}
