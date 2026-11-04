/**
 * "This answered it": the thread's starter marks the reply that answered their question, or takes
 * the mark away (bundle 14d IDEAS-3, part f; idea IDEA-20261102-8).
 *
 * Who calls it: hooks/useForumAnswers.ts. What it calls next: mark_forum_thread_answer() in
 * supabase/migrations/20270126100001_ideas3_f_forum_help_and_passages.sql. A refusal becomes a
 * ForumAnswerError the screen can say in plain words.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** Why the database refused a mark. */
export type ForumAnswerFailure = 'not_starter' | 'not_reply' | 'gone' | 'unreachable';

/** The error a refused mark throws. */
export class ForumAnswerError extends Error {
  /**
   * @param failure - why it was refused
   */
  constructor(readonly failure: ForumAnswerFailure) {
    super(`The forum refused the answer: ${failure}`);
    this.name = 'ForumAnswerError';
  }
}

/**
 * Turns a database error into a ForumAnswerError.
 *
 * @param error - Postgres's code and hint
 * @returns not_starter (42501: only the thread's starter may mark, criterion 2), not_reply (23514:
 *   the opening post, the starter's own reply or a reply that went), gone (P0002: no such
 *   thread), otherwise unreachable
 */
export function forumAnswerErrorFrom(error: {
  code?: string;
  hint?: string | null;
}): ForumAnswerError {
  if (error.code === '42501') return new ForumAnswerError('not_starter');
  if (error.code === '23514') return new ForumAnswerError('not_reply');
  if (error.code === 'P0002') return new ForumAnswerError('gone');
  return new ForumAnswerError('unreachable');
}

/** Which reply to mark: a post number, or null to take the mark away. */
export interface AnswerMark {
  threadNumber: number;
  postNumber: number | null;
}

/**
 * Marks a reply as the thread's answer, or takes the mark away.
 *
 * @param client - the Supabase client
 * @param mark - the thread and the reply (null takes the mark away)
 * @returns nothing; the thread's reads refresh afterwards
 * @throws ForumAnswerError when refused
 */
export async function markThreadAnswer(client: AppSupabaseClient, mark: AnswerMark): Promise<void> {
  const postNumber = mark.postNumber === null ? {} : { post_number: mark.postNumber };
  const { error } = await client.rpc('mark_forum_thread_answer', {
    thread_number: mark.threadNumber,
    ...postNumber,
  });
  if (error) throw forumAnswerErrorFrom(error);
}
