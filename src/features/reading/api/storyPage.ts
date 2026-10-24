/**
 * Reads a story's public page (story S1-E3-05; ADR 0004).
 *
 * Who calls it: hooks/useStoryPage.ts.
 * What it calls next: get_story_page(slug) (supabase/migrations/…_s1_e3_05_story_settings.sql),
 * the only way readers reach a story: it answers nothing for a story that isn't published, is
 * deleted or is hidden by a moderator (the owner always gets their own), and never the user ID.
 * It applies the rating rule (rating_allows(), S1-E3-06) and serves the labels; the chapter
 * list joins in S1-E3-03.
 */
import type { CoverColourKey, CoverDesignKey } from '@/components/covers/coverDesigns';
import type { AppSupabaseClient } from '@/lib/supabase';
import type { AiDisclosure, StoryRating } from '@/schemas/story';

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
  writer: { displayName: string; handle: string };
  firstPublishedAt: string | null;
  lastChapterPublishedAt: string | null;
  isOwner: boolean;
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
  writer: { display_name: string; handle: string };
  first_published_at: string | null;
  last_chapter_published_at: string | null;
  is_owner: boolean;
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
    drawnCover:
      cover.kind === 'drawn' &&
      cover.design !== null &&
      cover.background !== null &&
      cover.accent !== null
        ? {
            design: cover.design as CoverDesignKey,
            background: cover.background as CoverColourKey,
            accent: cover.accent as CoverColourKey,
          }
        : null,
    writer: { displayName: row.writer.display_name, handle: row.writer.handle },
    firstPublishedAt: row.first_published_at,
    lastChapterPublishedAt: row.last_chapter_published_at,
    isOwner: row.is_owner,
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
