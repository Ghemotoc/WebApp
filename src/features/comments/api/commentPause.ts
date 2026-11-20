/**
 * A writer's pause of new comments as the comment lists report it, and "Resume now" (bundle
 * CALM-8; IDEA-20261109-8; the design handover's Step 4, "Pausing new comments", points 5 to 8).
 *
 * While a pause runs, chapter_comments() and paragraph_comments() add comments_paused_until (when
 * new comments open again) and can_resume_comments (true for the story's writer); otherwise they
 * leave both out. The page then shows "New comments are paused until …" in place of the comment
 * box, with "Resume now" for the writer, and hides Reply.
 * Who calls it: api/comments.ts and api/paragraphComments.ts (reading the pause from a list), and
 * hooks/useResumeComments.ts ("Resume now").
 * What it calls next: end_my_comment_pause() (…_calm8_pause_comments.sql), which ends the pause on
 * the caller's own story, in every language, and refuses anyone else's story.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** A pause of new comments, as the comments area needs it. */
export interface CommentPause {
  /** When new comments open again (ISO time), or null when no pause runs. */
  pausedUntil: string | null;
  /** True for the story's writer, who gets "Resume now". */
  canResume: boolean;
}

/** The JSON fields a comment list adds while a pause runs. */
export interface CommentPauseRow {
  comments_paused_until?: string | null;
  can_resume_comments?: boolean;
}

/** What "Resume now" answered: done, the account can't change stories now, or not their story. */
export type ResumeOutcome = 'ok' | 'not_active' | 'not_found';

/**
 * Reads the pause from a comment list's JSON.
 *
 * @param row - chapter_comments() or paragraph_comments() as the database sends it
 * @returns the pause; pausedUntil null when the list says none runs
 */
export function commentPauseFrom(row: CommentPauseRow): CommentPause {
  return {
    pausedUntil: row.comments_paused_until ?? null,
    canResume: row.can_resume_comments === true,
  };
}

/**
 * Ends the pause of new comments on the caller's own story at once ("Resume now").
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's address; a language edition's address ends the story's pause
 * @returns the outcome
 * Errors: throws with Supabase's message when the database can't be reached or the caller is
 *   signed out, and on an answer it doesn't know.
 */
export async function endMyCommentPause(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<ResumeOutcome> {
  const { data, error } = await client.rpc('end_my_comment_pause', { story_slug: storySlug });
  if (error !== null) throw new Error(`Could not open comments again: ${error.message}`);
  const outcome = (data as { outcome?: string } | null)?.outcome;
  if (outcome === 'ok' || outcome === 'not_active' || outcome === 'not_found') return outcome;
  throw new Error(`Unexpected answer from end_my_comment_pause: ${JSON.stringify(data)}`);
}
