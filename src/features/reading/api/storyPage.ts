/**
 * Reads a story's public page (story S1-E3-05; ADR 0004).
 *
 * Who calls it: hooks/useStoryPage.ts.
 * What it calls next: get_story_page(slug) (supabase/migrations/…_s1_e3_05_story_settings.sql),
 * the only way readers reach a story: it answers nothing for a story that isn't published, is
 * deleted or is hidden by a moderator (the owner always gets their own), and never the user ID.
 * It applies the rating rule (rating_allows(), S1-E3-06), serves the labels and the chapter list,
 * and shows a story only while it has a published chapter (S1-E3-03).
 */
import type { CoverColourKey, CoverDesignKey } from '@/components/covers/coverDesigns';
import type { AppSupabaseClient } from '@/lib/supabase';
import type { AiDisclosure, StoryRating } from '@/schemas/story';

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
  commentsEnabled: boolean;
  coverKind: 'automatic' | 'drawn' | 'upload';
  drawnCover: { design: CoverDesignKey; background: CoverColourKey; accent: CoverColourKey } | null;
  /**
   * The writer's public name, username and bio (S1-E5-05). For a public-domain classic the name
   * is its real author and classicAuthor says who (S1-E5-06, 25 Oct 2026); null otherwise.
   */
  writer: {
    displayName: string;
    handle: string;
    bio: string;
    classicAuthor: { name: string; diedYear: number } | null;
  };
  firstPublishedAt: string | null;
  lastChapterPublishedAt: string | null;
  isOwner: boolean;
  /** True while a chapter is published, so readers can see the story (S1-E3-03). */
  isPublic: boolean;
  /** The chapters: the readable ones for readers; every live one for the owner (S1-E3-03). */
  chapters: StoryPageChapter[];
  /**
   * The stats row's totals (S1-E5-03): likes on its chapters and live comments. Read totals stay
   * private to the writer (S1-E3-07), so they aren't here.
   */
  stats: { likes: number; comments: number };
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
  comments_enabled: boolean;
  cover: {
    kind: 'automatic' | 'drawn' | 'upload';
    design: string | null;
    background: string | null;
    accent: string | null;
  };
  writer: {
    display_name: string;
    handle: string;
    bio: string;
    classic_author: { name: string; died_year: number } | null;
  };
  first_published_at: string | null;
  last_chapter_published_at: string | null;
  is_owner: boolean;
  is_public: boolean;
  chapters: {
    code: string;
    number: number;
    title: string;
    status: 'draft' | 'scheduled' | 'published';
    published_at: string | null;
    edited_at: string | null;
    word_count: number | null;
  }[];
  /** Missing only from an answer older than S1-E5-03. */
  stats?: { likes: number; comments: number };
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

/**
 * A classic's real author in the app's shape (S1-E5-06).
 *
 * @param author - the database's classic_author, or null for a writer's own story
 * @returns { name, diedYear }, or null
 */
function classicAuthorFrom(
  author: { name: string; died_year: number } | null | undefined,
): { name: string; diedYear: number } | null {
  if (author === null || author === undefined) return null;
  return { name: author.name, diedYear: author.died_year };
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
    commentsEnabled: row.comments_enabled,
    coverKind: cover.kind,
    drawnCover: drawnCoverFrom(cover),
    writer: {
      displayName: row.writer.display_name,
      handle: row.writer.handle,
      bio: row.writer.bio,
      classicAuthor: classicAuthorFrom(row.writer.classic_author),
    },
    firstPublishedAt: row.first_published_at,
    lastChapterPublishedAt: row.last_chapter_published_at,
    isOwner: row.is_owner,
    isPublic: row.is_public,
    stats: { likes: row.stats?.likes ?? 0, comments: row.stats?.comments ?? 0 },
    chapters: row.chapters.map((chapter) => ({
      code: chapter.code,
      number: chapter.number,
      title: chapter.title,
      status: chapter.status,
      publishedAt: chapter.published_at,
      editedAt: chapter.edited_at,
      wordCount: chapter.word_count,
    })),
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
