/**
 * Reads the comments readers wrote under the signed-in writer's chapters, a page at a time
 * (bundle GAPS-5, "See all comments" on the Write page; story S1-E3-07).
 *
 * Who calls it: hooks/useMyChapterComments.ts (the page at /write/comments).
 * What it calls next: Supabase (supabase/migrations/…_gaps5_my_chapter_comments.sql):
 * my_chapter_comments(), which answers only the caller's own chapters' comments and leaves out
 * deleted, blocked and moderated ones, with no user ID.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { LatestComment } from './dashboard';

/** One comment on the page: the dashboard card's fields, plus its story and whether it was cut. */
export interface ChapterComment extends LatestComment {
  storyTitle: string;
  /** True when the comment is longer than what is shown; the chapter holds the rest. */
  isShortened: boolean;
}

/** One of the writer's stories to pick from. */
export interface CommentedStory {
  slug: string;
  title: string;
}

/** One page of the list. */
export interface ChapterCommentsPage {
  stories: CommentedStory[];
  comments: ChapterComment[];
  hasMore: boolean;
}

/** One comment as the database answers it. */
interface ChapterCommentRow {
  display_name: string;
  handle: string;
  story_slug: string;
  story_title: string;
  chapter_code: string;
  chapter_position: number;
  body: string;
  is_shortened: boolean;
  created_at: string;
}

/** The answer of my_chapter_comments(). */
interface ChapterCommentsAnswer {
  stories: CommentedStory[];
  has_more: boolean;
  comments: ChapterCommentRow[];
}

/**
 * Turns the database's answer into the page's shape.
 *
 * @param answer - my_chapter_comments()'s answer
 * @returns the page
 */
export function chapterCommentsFrom(answer: ChapterCommentsAnswer): ChapterCommentsPage {
  return {
    stories: answer.stories,
    hasMore: answer.has_more,
    comments: answer.comments.map((row) => ({
      displayName: row.display_name,
      handle: row.handle,
      storySlug: row.story_slug,
      storyTitle: row.story_title,
      chapterCode: row.chapter_code,
      chapterPosition: row.chapter_position,
      body: row.body,
      isShortened: row.is_shortened,
      createdAt: row.created_at,
    })),
  };
}

/**
 * Reads one page of the comments.
 *
 * @param client - the shared Supabase client
 * @param olderThan - the time of the oldest comment shown so far, or null for the first page
 * @param storySlug - one of the writer's stories, or null for every story
 * @returns the page
 * Errors: throws with Supabase's message when the database refuses or can't be reached.
 */
export async function fetchMyChapterComments(
  client: AppSupabaseClient,
  olderThan: string | null,
  storySlug: string | null,
): Promise<ChapterCommentsPage> {
  // Only the choices that were made are sent; the function's defaults cover the rest.
  const { data, error } = await client.rpc('my_chapter_comments', {
    ...(olderThan === null ? {} : { older_than: olderThan }),
    ...(storySlug === null ? {} : { only_story_slug: storySlug }),
  });
  if (error !== null) throw new Error(`Could not read the comments: ${error.message}`);
  return chapterCommentsFrom(data as unknown as ChapterCommentsAnswer);
}
