/**
 * Reads one chapter for the reader and counts a read (story S1-E4-01a; ADR 0004).
 *
 * Who calls it: hooks/useChapter.ts and hooks/useRecordRead.ts.
 * What it calls next: get_chapter(story_slug, chapter_code), the only way a reader reaches a
 * chapter's text. It answers nothing when the reader may not see the chapter: unpublished,
 * deleted, hidden by a moderator, rated above the reader's age or by someone either side blocks.
 * It never carries the user ID. A signed-out visitor gets only the teaser: the first whole
 * paragraphs up to 600 words, cut on the server (S1-E4-04). The pictures in the text come with
 * it, each with its check state (S1-E3-09); their files are read through signed addresses. So
 * do the music and video cards, each with its service and what to play (S1-E3-10).
 * record_chapter_read(story_slug, chapter_code) adds one to today's total, never who read
 * (supabase/migrations/…_s1_e4_01a_reader.sql).
 * A story in several languages (TRANSLATE-1b): the answer lists the languages with each one's
 * address for this same chapter (`editions`), and a chapter the edition doesn't have yet comes
 * back as `missingTranslation` with no text (…_translate1_01_story_editions.sql).
 */
import { embedViewsFromJson, type EmbedView } from '@/features/embeds/api/embeds';
import { pictureViewsFromJson, type PictureView } from '@/features/pictures/api/pictures';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import {
  editionFactsFrom,
  storyEditionsFrom,
  type EditionFacts,
  type StoryEdition,
} from './editions';

/** A chapter this language edition doesn't have yet (TRANSLATE-1b; board TrMissing). */
export interface MissingTranslation {
  /** The chapter in the language the reader can read it in now. */
  original: { slug: string; languageCode: string; code: string; title: string };
  /** The unbroken run of translated chapters from chapter one ("chapters 1 to 4"); 0 for none. */
  translatedThrough: number;
  /** A classic's translator; null for a member's story (its writer translates it). */
  translatorName: string | null;
  /** The nearest earlier chapter this edition has, for "Back to chapter n"; null for none. */
  previousNumber: number | null;
}

/** One chapter as the reader shows it. */
export interface ReaderChapter {
  story: {
    slug: string;
    title: string;
    /** The story's language, for the text's lang attribute (WCAG 3.1.2). */
    languageCode: string;
    writer: { displayName: string; handle: string };
  };
  /** The chapter's row ID, which the Report button sends (S1-E10-01); never a user ID. */
  id: string;
  code: string;
  title: string;
  /** Its number among the chapters readers can open (1, 2, 3…), and how many there are. */
  number: number;
  total: number;
  previousCode: string | null;
  nextCode: string | null;
  publishedAt: string | null;
  editedAt: string | null;
  minutesToRead: number;
  isOwner: boolean;
  /** True for a signed-out visitor. */
  needsSignIn: boolean;
  /** True when body is only the teaser, for a signed-out visitor (S1-E4-04). */
  isTeaser: boolean;
  /** True when the chapter goes on after the teaser. */
  textContinues: boolean;
  /**
   * True when the writer chose "In the app only" and that applies now (S1-E3-08, GAPS-15): the
   * body is empty and the reader shows the app only notice instead (S1-E4-09).
   */
  appOnly: boolean;
  /** True when the chapter is a poem: drawn line by line, stanza by stanza (MUST-2). */
  isPoem: boolean;
  /** The published text as the Markdown subset (ADR 0005), or only its teaser. */
  body: string | null;
  /**
   * The pictures in that text by ID, with their check state and a signed address for those the
   * reader may see (S1-E3-09).
   */
  pictures: Record<string, PictureView>;
  /** The music and video cards in that text by ID (S1-E3-10). */
  embeds: Record<string, EmbedView>;
  /**
   * The languages the story can be read in, each with its address for this chapter; empty for a
   * story in one language (TRANSLATE-1b; Robert, 16 Nov 2026).
   */
  editions: StoryEdition[];
  /** The original language and a classic's translator, for the credit; null in one language. */
  edition: EditionFacts | null;
  /**
   * Set when this edition doesn't have the chapter yet: the page shows the notice instead of a
   * text, and id, body and the dates are empty.
   */
  missingTranslation: MissingTranslation | null;
}

/** The shape get_chapter() answers, as JSON. */
interface ChapterRow {
  story: {
    slug: string;
    title: string;
    language_code: string;
    writer: { display_name: string; handle: string };
  };
  id: string;
  code: string;
  title: string;
  number: number;
  total: number;
  previous_code: string | null;
  next_code: string | null;
  published_at: string | null;
  edited_at: string | null;
  minutes_to_read: number;
  is_owner: boolean;
  needs_sign_in: boolean;
  is_teaser: boolean;
  text_continues: boolean;
  /** GAPS-15: missing from answers saved before the switch existed (prefetch caches). */
  app_only?: boolean;
  is_poem?: boolean;
  body: string | null;
  pictures?: Json;
  embeds?: Json;
  /** TRANSLATE-1a: missing from answers saved before it. */
  editions?: unknown;
  edition?: unknown;
}

/** The shape get_chapter() answers for a chapter the edition doesn't have yet. */
interface MissingChapterRow {
  missing_translation: true;
  story: ChapterRow['story'];
  number: number;
  total: number;
  original: { slug: string; language_code: string; code: string; title: string | null };
  translated_through: number;
  translator_name: string | null;
  previous_number: number | null;
  previous_code: string | null;
  editions?: unknown;
}

/** The story part of an answer, in the app's shape. */
function storyFrom(story: ChapterRow['story']): ReaderChapter['story'] {
  return {
    slug: story.slug,
    title: story.title,
    languageCode: story.language_code,
    writer: { displayName: story.writer.display_name, handle: story.writer.handle },
  };
}

/**
 * A "not translated yet" answer as a ReaderChapter with no text, so the page can draw the bar
 * ("Chapter 5 of 6", Read in) and the notice from one shape.
 *
 * @param row - the database's answer
 * @returns the chapter with missingTranslation set
 */
function missingChapterFrom(row: MissingChapterRow): ReaderChapter {
  return {
    story: storyFrom(row.story),
    id: '',
    code: row.original.code,
    title: row.original.title ?? '',
    number: row.number,
    total: row.total,
    previousCode: row.previous_code,
    nextCode: null,
    publishedAt: null,
    editedAt: null,
    minutesToRead: 0,
    isOwner: false,
    needsSignIn: false,
    isTeaser: false,
    textContinues: false,
    appOnly: false,
    isPoem: false,
    body: null,
    pictures: {},
    embeds: {},
    editions: storyEditionsFrom(row.editions),
    edition: null,
    missingTranslation: {
      original: {
        slug: row.original.slug,
        languageCode: row.original.language_code,
        code: row.original.code,
        title: row.original.title ?? '',
      },
      translatedThrough: row.translated_through,
      translatorName: row.translator_name,
      previousNumber: row.previous_number,
    },
  };
}

/**
 * Reads a chapter.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's public address
 * @param chapterCode - the chapter's 8-character code
 * @returns the chapter, or null when the reader may not see it
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchChapter(
  client: AppSupabaseClient,
  storySlug: string,
  chapterCode: string,
): Promise<ReaderChapter | null> {
  const { data, error } = await client.rpc('get_chapter', {
    story_slug: storySlug,
    chapter_code: chapterCode,
  });
  if (error !== null) throw new Error(`Could not read the chapter: ${error.message}`);
  if (data === null) return null;
  // TRANSLATE-1b: this language edition doesn't have the chapter yet.
  if ((data as { missing_translation?: boolean }).missing_translation === true) {
    return missingChapterFrom(data as unknown as MissingChapterRow);
  }
  const row = data as unknown as ChapterRow;
  return {
    story: storyFrom(row.story),
    id: row.id,
    code: row.code,
    title: row.title,
    number: row.number,
    total: row.total,
    previousCode: row.previous_code,
    nextCode: row.next_code,
    publishedAt: row.published_at,
    editedAt: row.edited_at,
    minutesToRead: row.minutes_to_read,
    isOwner: row.is_owner,
    needsSignIn: row.needs_sign_in,
    isTeaser: row.is_teaser,
    appOnly: row.app_only === true,
    isPoem: row.is_poem === true,
    textContinues: row.text_continues,
    body: row.body,
    // Signed addresses for the pictures the reader may see; Storage refuses the others.
    pictures: await pictureViewsFromJson(client, row.pictures),
    embeds: embedViewsFromJson(row.embeds),
    editions: storyEditionsFrom(row.editions),
    edition: editionFactsFrom(row.edition),
    missingTranslation: null,
  };
}

/**
 * Adds one to today's read total for the chapter.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's public address
 * @param chapterCode - the chapter's code
 * @returns true when it was counted (not for the writer's own reads)
 * Errors: throws with Supabase's message when the call fails.
 */
export async function recordChapterRead(
  client: AppSupabaseClient,
  storySlug: string,
  chapterCode: string,
): Promise<boolean> {
  const { data, error } = await client.rpc('record_chapter_read', {
    story_slug: storySlug,
    chapter_code: chapterCode,
  });
  if (error !== null) throw new Error(`Could not count the read: ${error.message}`);
  return data === true;
}
