/**
 * The database calls of the writer's Languages screens (bundle TRANSLATE-1c; Robert, 16 Nov 2026).
 *
 * One story can be written in several languages. Each language is an edition: a story row of its
 * own, linked to the first edition (supabase/migrations/…_translate1_01_story_editions.sql). Only
 * the writer adds and translates a language (Robert, 16 Nov 2026, 12:20 UTC), so every function
 * here acts on the signed-in writer's own stories.
 *
 * Who calls it: the hooks of this folder.
 * What it calls next: story_languages(), add_story_language(), update_story_language(),
 * story_translation_chapters(), start_chapter_translation(), chapter_translation_source() and
 * publish_chapter() / update_published_chapter().
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** One language of a story, as the Languages table lists it. */
export interface StoryLanguage {
  /** This edition's own story address. */
  slug: string;
  languageCode: string;
  title: string;
  blurb: string;
  /** True for the edition the story started as (the original). */
  isFirstEdition: boolean;
  /** How many chapters the original has, and how many this edition has published. */
  chaptersInStory: number;
  chaptersPublished: number;
  /** True once readers can open at least one chapter of this edition. */
  isPublic: boolean;
}

/** A story's languages and how many it may have. */
export interface StoryLanguages {
  firstEditionSlug: string;
  languagesMax: number;
  editions: StoryLanguage[];
}

/** What add_story_language() answers. */
export type AddLanguageResult =
  | { outcome: 'ok'; slug: string }
  | { outcome: 'not_active' | 'not_found' | 'language_taken' | 'too_many' };

/** One chapter of the original with where its translation stands. */
export interface TranslationChapter {
  number: number;
  originalCode: string;
  originalTitle: string;
  isOriginalPublished: boolean;
  /** The translation's own code; null until the writer starts it. */
  code: string | null;
  /** null until the translation is started. */
  status: 'draft' | 'scheduled' | 'published' | null;
}

/** The original a translated chapter stands beside in the editor. */
export interface TranslationSource {
  /** The language being translated into. */
  languageCode: string;
  original: {
    languageCode: string;
    storySlug: string;
    title: string;
    body: string;
    isPublished: boolean;
  };
}

/** What publishing a translated chapter answers. */
export type PublishTranslationOutcome =
  'ok' | 'not_active' | 'not_found' | 'empty' | 'wrong_state' | 'original_not_published';

/** The JSON story_languages() answers. */
interface StoryLanguagesRow {
  first_edition_slug: string;
  languages_max: number;
  editions: {
    slug: string;
    language_code: string;
    title: string;
    blurb: string;
    is_first_edition: boolean;
    chapters_in_story: number;
    chapters_published: number;
    is_public: boolean;
  }[];
}

/**
 * Reads the languages of one of the writer's stories.
 *
 * @param client - the shared Supabase client
 * @param storySlug - any edition's address
 * @returns the languages, the original first; null when the writer has no live story there
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchStoryLanguages(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<StoryLanguages | null> {
  const { data, error } = await client.rpc('story_languages', { story_slug: storySlug });
  if (error !== null) throw new Error(`Could not read the languages: ${error.message}`);
  if (data === null) return null;
  const row = data as unknown as StoryLanguagesRow;
  return {
    firstEditionSlug: row.first_edition_slug,
    languagesMax: row.languages_max,
    editions: row.editions.map((edition) => ({
      slug: edition.slug,
      languageCode: edition.language_code,
      title: edition.title,
      blurb: edition.blurb,
      isFirstEdition: edition.is_first_edition,
      chaptersInStory: edition.chapters_in_story,
      chaptersPublished: edition.chapters_published,
      isPublic: edition.is_public,
    })),
  };
}

/**
 * Adds a language to the writer's own story.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's address
 * @param language - the language code, and the title and description in that language
 * @returns ok with the new edition's address, or why not
 * Errors: throws when the database refuses the words (a check the form should have caught) or
 *   can't be reached.
 */
export async function addStoryLanguage(
  client: AppSupabaseClient,
  storySlug: string,
  language: { languageCode: string; title: string; blurb: string },
): Promise<AddLanguageResult> {
  const { data, error } = await client.rpc('add_story_language', {
    story_slug: storySlug,
    language_code: language.languageCode,
    title: language.title,
    blurb: language.blurb,
  });
  if (error !== null) throw new Error(`Could not add the language: ${error.message}`);
  return data as unknown as AddLanguageResult;
}

/**
 * Changes the title and description of one language of the writer's own story.
 *
 * @param client - the shared Supabase client
 * @param editionSlug - that language's story address
 * @param words - the new title and description
 * @returns 'ok', 'not_active' or 'not_found'
 * Errors: throws when the database refuses the words or can't be reached.
 */
export async function updateStoryLanguage(
  client: AppSupabaseClient,
  editionSlug: string,
  words: { title: string; blurb: string },
): Promise<'ok' | 'not_active' | 'not_found'> {
  const { data, error } = await client.rpc('update_story_language', {
    story_slug: editionSlug,
    title: words.title,
    blurb: words.blurb,
  });
  if (error !== null) throw new Error(`Could not save the language: ${error.message}`);
  return (data as unknown as { outcome: 'ok' | 'not_active' | 'not_found' }).outcome;
}

/** One row of story_translation_chapters(). */
interface TranslationChapterRow {
  number: number;
  original_code: string;
  original_title: string | null;
  original_status: string;
  code: string | null;
  status: TranslationChapter['status'];
}

/**
 * Reads the original's chapters with where each translation stands.
 *
 * @param client - the shared Supabase client
 * @param editionSlug - the address of the language being translated into
 * @returns the chapters in the original's order; null when that address isn't one of the
 *   writer's later editions (the original itself has nothing to translate)
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchTranslationChapters(
  client: AppSupabaseClient,
  editionSlug: string,
): Promise<TranslationChapter[] | null> {
  const { data, error } = await client.rpc('story_translation_chapters', {
    story_slug: editionSlug,
  });
  if (error !== null) throw new Error(`Could not read the chapters: ${error.message}`);
  if (data === null) return null;
  return (data as unknown as TranslationChapterRow[]).map((row) => ({
    number: row.number,
    originalCode: row.original_code,
    originalTitle: row.original_title ?? '',
    isOriginalPublished: row.original_status === 'published',
    code: row.code,
    status: row.status,
  }));
}

/**
 * Starts (or finds) the translation of one chapter.
 *
 * @param client - the shared Supabase client
 * @param editionSlug - the address of the language being translated into
 * @param originalCode - the original chapter's code
 * @returns the translated chapter's code, or null when it couldn't be started
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function startChapterTranslation(
  client: AppSupabaseClient,
  editionSlug: string,
  originalCode: string,
): Promise<string | null> {
  const { data, error } = await client.rpc('start_chapter_translation', {
    story_slug: editionSlug,
    original_chapter_code: originalCode,
  });
  if (error !== null) throw new Error(`Could not start the translation: ${error.message}`);
  const answer = data as unknown as { outcome: string; code?: string };
  return answer.outcome === 'ok' ? (answer.code ?? null) : null;
}

/** The JSON chapter_translation_source() answers. */
interface TranslationSourceRow {
  language_code: string;
  original: {
    language_code: string;
    story_slug: string;
    title: string | null;
    body: string | null;
    is_published: boolean;
  };
}

/**
 * Reads the original of one of the writer's translated chapters.
 *
 * @param client - the shared Supabase client
 * @param chapterCode - the translated chapter's code
 * @returns the original's words, or null when that chapter isn't one of the writer's translations
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchTranslationSource(
  client: AppSupabaseClient,
  chapterCode: string,
): Promise<TranslationSource | null> {
  const { data, error } = await client.rpc('chapter_translation_source', {
    chapter_code: chapterCode,
  });
  if (error !== null) throw new Error(`Could not read the original: ${error.message}`);
  if (data === null) return null;
  const row = data as unknown as TranslationSourceRow;
  return {
    languageCode: row.language_code,
    original: {
      languageCode: row.original.language_code,
      storySlug: row.original.story_slug,
      title: row.original.title ?? '',
      body: row.original.body ?? '',
      isPublished: row.original.is_published,
    },
  };
}

/**
 * Puts a translated chapter live, or its changes when it is live already.
 *
 * @param client - the shared Supabase client
 * @param chapterCode - the translated chapter's code
 * @param isPublished - true when readers can already open it (its changes are published)
 * @returns the outcome; 'original_not_published' while the original chapter is a draft
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function publishTranslation(
  client: AppSupabaseClient,
  chapterCode: string,
  isPublished: boolean,
): Promise<PublishTranslationOutcome> {
  const { data, error } = await client.rpc(
    isPublished ? 'update_published_chapter' : 'publish_chapter',
    { chapter_code: chapterCode },
  );
  if (error !== null) throw new Error(`Could not publish the chapter: ${error.message}`);
  return (data as unknown as { outcome: PublishTranslationOutcome }).outcome;
}
