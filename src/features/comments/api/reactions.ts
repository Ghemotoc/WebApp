/**
 * Reactions on a comment: the six kinds, their counts and the reader's own (story S1-E6-02).
 *
 * Who calls it: api/comments.ts (each comment's reactions, from chapter_comments()) and
 * hooks/useReactToComment.ts (picking one). What it calls next: react_to_comment()
 * (…_s1_e6_02_reactions.sql), which checks the reader may read the comment and, for adding or
 * changing a reaction, the account gate. Nothing here says who reacted: only counts arrive.
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { commentErrorFrom } from './comments';

/** One of the six reactions (decided 17 Oct 2026, 12:44): heart, fire, laugh, wow, sad, star. */
export type ReactionKind = Enums<'reaction_kind'>;

/** The six, in the board's order, for the picker and for ordering the chips. */
export const REACTION_KINDS: readonly ReactionKind[] = [
  'heart',
  'fire',
  'laugh',
  'wow',
  'sad',
  'star',
];

/** A comment's reactions as the chips draw them. */
export interface CommentReactions {
  /** How many of each kind; a kind nobody picked is left out. */
  counts: Partial<Record<ReactionKind, number>>;
  /** The reader's own reaction, or null. */
  mine: ReactionKind | null;
}

/** The JSON the reactions arrive as (comment_reactions_json()): already in the screen's shape. */
export type ReactionsRow = CommentReactions;

/**
 * Sets, changes or takes away the reader's reaction. Picking the kind they already have, or
 * null, takes it away (one reaction per person per comment, criterion 1).
 *
 * @param client - the shared Supabase client
 * @param commentId - the comment
 * @param wantedKind - the kind picked, or null to take the reaction away
 * @returns the comment's reactions afterwards
 * Errors: throws CommentError: read_only (signed out, or the account may not write), gone (the
 *   comment isn't there for this reader), unreachable.
 */
export async function reactToComment(
  client: AppSupabaseClient,
  commentId: string,
  wantedKind: ReactionKind | null,
): Promise<CommentReactions> {
  const { data, error } = await client.rpc('react_to_comment', {
    comment_id: commentId,
    // The function takes null to take a reaction away; the generated type lists only the kinds.
    wanted_kind: wantedKind as ReactionKind,
  });
  if (error !== null) throw commentErrorFrom(error);
  return data as unknown as ReactionsRow;
}
