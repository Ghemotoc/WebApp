/**
 * Reads a story's public page (story S1-E3-05; ADR 0004).
 *
 * Who calls it: hooks/useStoryPage.ts.
 * What it calls next: get_story_page(slug) (supabase/migrations/…_s1_e3_05_story_settings.sql),
 * the only way readers reach a story: it answers nothing for a story that isn't published, is
 * deleted or is hidden by a moderator (the owner always gets their own), and never the user ID.
 * It applies the rating rule (rating_allows(), S1-E3-06), serves the labels and the chapter list,
 * and shows a story only while it has a published chapter (S1-E3-03).
 * Since TRANSLATE-1b it also carries the languages the story can be read in (`editions`, empty
 * for a story in one language) and what "About this edition" says (`edition`); the parsers are
 * in api/editions.ts.
 */
import type { CoverColourKey, CoverDesignKey } from '@/components/covers/coverDesigns';
import type { AppSupabaseClient } from '@/lib/supabase';
import type { AiDisclosure, StoryRating } from '@/schemas/story';

import {
  editionFactsFrom,
  storyEditionsFrom,
  type EditionFacts,
  type StoryEdition,
} from './editions';
import { nextChapterFrom, type NextChapter, type NextChapterRow } from './chapter';

/** One chapter in the story page's list (S1-E3-03). */
export interface StoryPageChapter {
  code: string;
  /** Its number among the chapters shown (1, 2, 3…). */
  number: number;
  title: string;
  status: 'draft' | 'scheduled' | 'published';
  publishedAt: string | null;
  editedAt: string | null;
  wordCount: number | null;
  /**
   * False in a later language edition for a chapter that isn't translated yet (TRANSLATE-1b): the
   * row then carries the original's title and code, and the list says "<language> only for now".
   */
  isTranslated: boolean;
}

/** What the story page shows. */
export interface StoryPageData {
  /** The story's ID (never the writer's), used to draw the automatic cover (S1-E3-13). */
  id: string;
  slug: string;
  title: string;
  blurb: string;
  languageCode: string;
  categorySlug: string;
  tags: string[];
  completionStatus: 'ongoing' | 'completed';
  /** CALM-6: the marked last chapter's number for "of N", or null while none is marked. */
  lastChapterNumber: number | null;
  /** CALM-6: the next scheduled chapter, for "Next chapter Thursday"; null when none is. */
  nextChapter: NextChapter | null;
  commentsEnabled: boolean;
  /**
   * When the writer's pause of new comments ends, while one runs (bundle CALM-8); null otherwise.
   * The database stops sending it once the end has passed; the screen also checks the time,
   * because the page may have been read a while ago (runningPauseEnd()).
   */
  commentsPausedUntil: string | null;
  coverKind: 'automatic' | 'drawn' | 'upload';
  drawnCover: { design: CoverDesignKey; background: CoverColourKey; accent: CoverColourKey } | null;
  /** The cover's look and title font (cover.style, cover.title_font; bundle CALM-4). */
  coverStyle?: string | null;
  titleFont?: string | null;
  /**
   * The writer's public name, username and bio (S1-E5-05). For a public-domain classic the name
   * is its real author and classicAuthor says who (S1-E5-06, 25 Oct 2026); null otherwise.
   */
  writer: {
    displayName: string;
    handle: string;
    bio: string;
    classicAuthor: ClassicAuthor | null;
  };
  firstPublishedAt: string | null;
  lastChapterPublishedAt: string | null;
  isOwner: boolean;
  /** True while a chapter is published, so readers can see the story (S1-E3-03). */
  isPublic: boolean;
  /**
   * True when the writer chose "In the app only" and that applies now (S1-E3-08, GAPS-15): the
   * page shows the notice and the chapters open in the app.
   */
  appOnly: boolean;
  /**
   * True when the story is hidden in the reader's country (COUNTRY-3): the page still opens, but
   * says "Sorry, this book isn't available in your country" in place of the read button, and the
   * chapters refuse their text. Never true for the owner.
   */
  unavailableHere: boolean;
  /** The chapters: the readable ones for readers; every live one for the owner (S1-E3-03). */
  chapters: StoryPageChapter[];
  /**
   * The languages the story can be read in, the first edition first (TRANSLATE-1b). Empty for a
   * story in one language, which then shows no switch (Robert, 16 Nov 2026).
   */
  editions: StoryEdition[];
  /** What "About this edition" says; null in answers saved before TRANSLATE-1. */
  edition: EditionFacts | null;
  /**
   * The stats row's totals: the public reads total (bundle 2, board B01; it was private under
   * S1-E5-03), the story's own Likes (story_likes) and live comments.
   */
  stats: { reads: number; likes: number; comments: number };
  /** The labels (S1-E3-06); a stored story always has a rating and an AI answer. */
  labels: {
    rating: StoryRating;
    isFanFiction: boolean;
    isParody: boolean;
    dealsWithAbuseOrCoercion: boolean;
    contentNote: string;
    aiDisclosure: AiDisclosure;
    aiUndisclosedLabelled: boolean;
  };
}

/** The shape get_story_page() answers, as JSON. */
interface StoryPageRow {
  id: string;
  slug: string;
  title: string;
  blurb: string;
  language_code: string;
  category_slug: string;
  tags: string[];
  completion_status: 'ongoing' | 'completed';
  /** CALM-6: missing from answers saved before it. */
  last_chapter_number?: number | null;
  next_chapter?: NextChapterRow | null;
  comments_enabled: boolean;
  /** CALM-8: missing from a database without the pause, so it may be absent. */
  comments_paused_until?: string | null;
  cover: {
    kind: 'automatic' | 'drawn' | 'upload';
    design: string | null;
    background: string | null;
    accent: string | null;
    /** CALM-4 (get_story_page()); missing from functions that build their own cards. */
    style?: string | null;
    title_font?: string | null;
  };
  writer: {
    display_name: string;
    handle: string;
    bio: string;
    classic_author: ClassicAuthorRow | null;
  };
  first_published_at: string | null;
  last_chapter_published_at: string | null;
  is_owner: boolean;
  is_public: boolean;
  app_only?: boolean;
  /** COUNTRY-3: missing from answers saved before it. */
  unavailable_here?: boolean;
  chapters: {
    code: string;
    number: number;
    title: string;
    status: 'draft' | 'scheduled' | 'published';
    published_at: string | null;
    edited_at: string | null;
    word_count: number | null;
    /** Only in a later language edition's list (edition_page_chapters()). */
    is_translated?: boolean;
  }[];
  /** TRANSLATE-1a: missing from answers saved before it. */
  editions?: unknown;
  edition?: unknown;
  /** Missing only from an answer older than S1-E5-03. */
  stats?: { reads?: number; likes: number; comments: number };
  labels: {
    rating: StoryRating;
    is_fan_fiction: boolean;
    is_parody: boolean;
    deals_with_abuse_or_coercion: boolean;
    content_note: string;
    ai_disclosure: AiDisclosure;
    ai_undisclosed_labelled: boolean;
  };
}

/** A classic's real author and, since S1-E11-16, the edition its text comes from. */
export interface ClassicAuthor {
  name: string;
  diedYear: number;
  /** The source edition and its link; null for classics added before S1-E11-16. */
  sourceTitle: string | null;
  sourceUrl: string | null;
  /** The translator, when the text is a translation. */
  translatorName: string | null;
  /** The year the work was first published anywhere, when staff saved it (6 Nov 2026). */
  firstPublishedYear: number | null;
}

/** The database's classic_author (story_classic_author()). */
interface ClassicAuthorRow {
  name: string;
  died_year: number;
  source_title?: string | null;
  source_url?: string | null;
  translator_name?: string | null;
  first_published_year?: number | null;
}

/**
 * A classic's real author in the app's shape (S1-E5-06, S1-E11-16).
 *
 * @param author - the database's classic_author, or null for a writer's own story
 * @returns the author with the source, or null
 */
function classicAuthorFrom(author: ClassicAuthorRow | null | undefined): ClassicAuthor | null {
  if (author === null || author === undefined) return null;
  return {
    name: author.name,
    diedYear: author.died_year,
    sourceTitle: author.source_title ?? null,
    sourceUrl: author.source_url ?? null,
    translatorName: author.translator_name ?? null,
    firstPublishedYear: author.first_published_year ?? null,
  };
}

/**
 * The writer's drawn cover choice, when the story has one.
 *
 * @param cover - the answer's cover part
 * @returns the design and colours, or null for an automatic or uploaded cover
 */
function drawnCoverFrom(cover: StoryPageRow['cover']): StoryPageData['drawnCover'] {
  if (cover.kind !== 'drawn') return null;
  if (cover.design === null || cover.background === null || cover.accent === null) return null;
  return {
    design: cover.design as CoverDesignKey,
    background: cover.background as CoverColourKey,
    accent: cover.accent as CoverColourKey,
  };
}

/**
 * The last-chapter facts in the app's shape (CALM-6).
 *
 * @param row - get_story_page()'s answer; older answers lack both fields
 * @returns lastChapterNumber and nextChapter
 */
function lastChapterFactsFrom(
  row: StoryPageRow,
): Pick<StoryPageData, 'lastChapterNumber' | 'nextChapter'> {
  return {
    lastChapterNumber: row.last_chapter_number ?? null,
    nextChapter: nextChapterFrom(row.next_chapter),
  };
}

/**
 * The stats row's totals, with 0 for any an older answer leaves out.
 *
 * @param stats - the answer's stats, if any
 * @returns reads, likes and comments
 */
function statsFrom(stats: StoryPageRow['stats']): StoryPageData['stats'] {
  return { reads: stats?.reads ?? 0, likes: stats?.likes ?? 0, comments: stats?.comments ?? 0 };
}

/**
 * One chapter of the list, from the database's shape to the screen's (split out of
 * fetchStoryPage to keep it short; COUNTRY-3).
 *
 * @param chapter - one entry of get_story_page()'s 'chapters'
 * @returns the chapter for the list
 */
function chapterFrom(chapter: StoryPageRow['chapters'][number]): StoryPageChapter {
  return {
    code: chapter.code,
    number: chapter.number,
    title: chapter.title,
    status: chapter.status,
    publishedAt: chapter.published_at,
    editedAt: chapter.edited_at,
    wordCount: chapter.word_count,
    // TRANSLATE-1b: answers saved before it carry no flag, so a missing one means translated.
    isTranslated: chapter.is_translated !== false,
  };
}

/**
 * Reads the page for a story's public address.
 *
 * @param client - the shared Supabase client
 * @param slug - the story's public address
 * @returns the page, or null when the reader may not see the story
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchStoryPage(
  client: AppSupabaseClient,
  slug: string,
): Promise<StoryPageData | null> {
  const { data, error } = await client.rpc('get_story_page', { story_slug: slug });
  if (error !== null) throw new Error(`Could not read the story: ${error.message}`);
  if (data === null) return null;
  const row = data as unknown as StoryPageRow;
  const { cover } = row;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    blurb: row.blurb,
    languageCode: row.language_code,
    categorySlug: row.category_slug,
    tags: row.tags,
    completionStatus: row.completion_status,
    ...lastChapterFactsFrom(row),
    commentsEnabled: row.comments_enabled,
    commentsPausedUntil: row.comments_paused_until ?? null,
    coverKind: cover.kind,
    drawnCover: drawnCoverFrom(cover),
    coverStyle: cover.style ?? null,
    titleFont: cover.title_font ?? null,
    writer: {
      displayName: row.writer.display_name,
      handle: row.writer.handle,
      bio: row.writer.bio,
      classicAuthor: classicAuthorFrom(row.writer.classic_author),
    },
    firstPublishedAt: row.first_published_at,
    lastChapterPublishedAt: row.last_chapter_published_at,
    isOwner: row.is_owner,
    appOnly: row.app_only === true,
    unavailableHere: row.unavailable_here === true,
    isPublic: row.is_public,
    stats: statsFrom(row.stats),
    chapters: row.chapters.map(chapterFrom),
    editions: storyEditionsFrom(row.editions),
    edition: editionFactsFrom(row.edition),
    labels: {
      rating: row.labels.rating,
      isFanFiction: row.labels.is_fan_fiction,
      isParody: row.labels.is_parody,
      dealsWithAbuseOrCoercion: row.labels.deals_with_abuse_or_coercion,
      contentNote: row.labels.content_note,
      aiDisclosure: row.labels.ai_disclosure,
      aiUndisclosedLabelled: row.labels.ai_undisclosed_labelled,
    },
  };
}
