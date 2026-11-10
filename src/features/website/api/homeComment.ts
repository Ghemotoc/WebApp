/**
 * The reader comment on the home page's cover wall: the card, the reader's own invitations and
 * the staff picks (bundle GAPS-13; story S1-E5-13; board Website-Home, the comment card).
 *
 * Who calls it: hooks/useHomeComment.ts (the home page and the reader's hub) and
 * hooks/useStaffHomeComments.ts (the staff page at /staff/featured).
 * What it calls next (migration gaps13_home_comment):
 * - home_comment_card(): the comment most recently agreed to that can still be shown;
 * - my_home_comment_invitations() and answer_home_comment_pick(): the reader's invitations and
 *   their answer, which they can change at any time (GDPR art. 7(3));
 * - admin_home_comment_candidates(), admin_home_comment_picks(), admin_invite_home_comment()
 *   and admin_delete_home_comment_pick(), which check the featured area and write the audit log.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** The reader's answer to an invitation. */
export type HomeCommentAnswer = 'waiting' | 'agreed' | 'declined';

/** The words every view of a comment shares: what was said and where. */
interface CommentPlace {
  body: string;
  storyTitle: string;
  chapterPosition: number;
}

/** The card on the home page. */
export interface HomeCommentCardData extends CommentPlace {
  handle: string;
  displayName: string;
  /** The paragraph the comment was left on, or null when it was on the whole chapter. */
  paragraphNumber: number | null;
}

/** One of the caller's own invitations. */
export interface HomeCommentInvitation extends CommentPlace {
  id: string;
  answer: HomeCommentAnswer;
}

/** A comment staff could invite. */
export interface HomeCommentCandidate extends CommentPlace {
  commentId: string;
  handle: string;
  displayName: string;
}

/** A pick on the staff page. */
export interface StaffHomeCommentPick extends CommentPlace {
  id: string;
  handle: string;
  displayName: string;
  answer: HomeCommentAnswer;
  /** False once the comment was deleted, hidden or its story stopped being public. */
  canShow: boolean;
  isOnHomePage: boolean;
}

/** Why a staff read or change failed, in the words the screen has text for. */
export type HomeCommentStaffFailure = 'not_allowed' | 'cannot_show' | 'failed';

/**
 * Reads an answer the database sent, falling back to "waiting" for a word this version doesn't
 * know, so an unknown answer never counts as agreement.
 *
 * @param answer - the database's word
 * @returns the answer
 */
export function homeCommentAnswerFrom(answer: string): HomeCommentAnswer {
  return answer === 'agreed' || answer === 'declined' ? answer : 'waiting';
}

/**
 * Turns a database error from a staff call into the screen's reason.
 *
 * @param code - the error's SQLSTATE, when there is one
 * @returns not_allowed (42501: no featured area), cannot_show (23514: the comment can no longer
 *   be shown; 23505: it is already picked) or failed
 */
export function homeCommentStaffFailureFrom(code: string | undefined): HomeCommentStaffFailure {
  if (code === '42501') return 'not_allowed';
  if (code === '23514' || code === '23505') return 'cannot_show';
  return 'failed';
}

/** An error from a staff call, carrying the screen's reason. */
export class HomeCommentStaffError extends Error {
  readonly failure: HomeCommentStaffFailure;

  constructor(failure: HomeCommentStaffFailure, message: string) {
    super(message);
    this.failure = failure;
  }
}

/**
 * Builds the error a staff call throws.
 *
 * @param error - what Supabase returned
 * @returns the error with its reason
 */
function staffError(error: { code?: string; message: string }): HomeCommentStaffError {
  return new HomeCommentStaffError(homeCommentStaffFailureFrom(error.code), error.message);
}

/**
 * The comment on the home page.
 *
 * @param client - the shared Supabase client (signed in or not)
 * @returns the card, or null when no reader has agreed to one that can be shown
 * @throws when the read fails
 */
export async function fetchHomeCommentCard(
  client: AppSupabaseClient,
): Promise<HomeCommentCardData | null> {
  const { data, error } = await client.rpc('home_comment_card');
  if (error !== null) throw new Error(`Could not read the home page comment: ${error.message}`);
  const row = data[0];
  if (row === undefined) return null;
  return {
    handle: row.handle,
    displayName: row.display_name,
    body: row.body,
    paragraphNumber: row.paragraph_number,
    storyTitle: row.story_title,
    chapterPosition: row.chapter_position,
  };
}

/**
 * The caller's own invitations, newest first.
 *
 * @param client - the shared Supabase client
 * @returns the invitations; empty for almost everyone
 * @throws when the read fails
 */
export async function fetchHomeCommentInvitations(
  client: AppSupabaseClient,
): Promise<HomeCommentInvitation[]> {
  const { data, error } = await client.rpc('my_home_comment_invitations');
  if (error !== null) throw new Error(`Could not read the invitations: ${error.message}`);
  return data.map((row) => ({
    id: row.pick_id,
    body: row.body,
    storyTitle: row.story_title,
    chapterPosition: row.chapter_position,
    answer: homeCommentAnswerFrom(row.answer),
  }));
}

/**
 * The reader agrees to have the comment shown, or declines or withdraws.
 *
 * @param client - the shared Supabase client
 * @param pickId - the invitation
 * @param agrees - true to be shown, false to decline or withdraw
 * @throws when the invitation is gone or the call fails
 */
export async function answerHomeCommentPick(
  client: AppSupabaseClient,
  pickId: string,
  agrees: boolean,
): Promise<void> {
  const { error } = await client.rpc('answer_home_comment_pick', { pick_id: pickId, agrees });
  if (error !== null) throw new Error(`Could not save the answer: ${error.message}`);
}

/**
 * Recent comments staff could invite, newest first.
 *
 * @param client - the shared Supabase client
 * @returns up to 40 comments
 * @throws HomeCommentStaffError (not_allowed without the featured area)
 */
export async function fetchHomeCommentCandidates(
  client: AppSupabaseClient,
): Promise<HomeCommentCandidate[]> {
  const { data, error } = await client.rpc('admin_home_comment_candidates');
  if (error !== null) throw staffError(error);
  return data.map((row) => ({
    commentId: row.comment_id,
    handle: row.handle,
    displayName: row.display_name,
    body: row.body,
    storyTitle: row.story_title,
    chapterPosition: row.chapter_position,
  }));
}

/**
 * The picks for staff, newest first, each with the reader's answer.
 *
 * @param client - the shared Supabase client
 * @returns the picks
 * @throws HomeCommentStaffError (not_allowed without the featured area)
 */
export async function fetchStaffHomeCommentPicks(
  client: AppSupabaseClient,
): Promise<StaffHomeCommentPick[]> {
  const { data, error } = await client.rpc('admin_home_comment_picks');
  if (error !== null) throw staffError(error);
  return data.map((row) => ({
    id: row.pick_id,
    handle: row.handle,
    displayName: row.display_name,
    body: row.body,
    storyTitle: row.story_title,
    chapterPosition: row.chapter_position,
    answer: homeCommentAnswerFrom(row.answer),
    canShow: row.can_show,
    isOnHomePage: row.is_on_home_page,
  }));
}

/**
 * Invites the reader who wrote a comment; nothing shows until they agree. Logged.
 *
 * @param client - the shared Supabase client
 * @param commentId - the comment to ask about
 * @throws HomeCommentStaffError
 */
export async function inviteHomeComment(
  client: AppSupabaseClient,
  commentId: string,
): Promise<void> {
  const { error } = await client.rpc('admin_invite_home_comment', { target_comment: commentId });
  if (error !== null) throw staffError(error);
}

/**
 * Takes a pick down: off the home page, the reader's invitations and the staff list. Logged.
 *
 * @param client - the shared Supabase client
 * @param pickId - the pick to take down
 * @throws HomeCommentStaffError
 */
export async function deleteHomeCommentPick(
  client: AppSupabaseClient,
  pickId: string,
): Promise<void> {
  const { error } = await client.rpc('admin_delete_home_comment_pick', { pick_id: pickId });
  if (error !== null) throw staffError(error);
}
