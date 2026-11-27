/**
 * Blocking someone from a space, and taking the block back (bundle BOOKS-7, board F11, user story
 * 7.11: "Block (they can't ask again or see members-only posts)").
 *
 * Who calls it: hooks/useSpaceBlocks.ts. What it calls: block_space_member(),
 * unblock_space_member() and space_blocked_members() in
 * supabase/migrations/…_books7_02_together_and_spaces.sql; each checks the members power (the
 * owner alone for a moderator) and writes the space's moderation log.
 */
import { personFrom, type ForumPerson } from '@/features/forums/api/forumThreads';
import type { AppSupabaseClient } from '@/lib/supabase';

import { spaceErrorFrom } from './spaces';

/** One person a space blocked. */
export interface SpaceBlockedPerson {
  person: ForumPerson;
  blockedAt: string;
}

/**
 * Blocks a member or someone waiting to join: they leave the space and can't ask again.
 *
 * @param client - the Supabase client
 * @param block - the space's address, the username and an optional reason for the log
 * @throws SpaceError when refused
 */
export async function blockSpaceMember(
  client: AppSupabaseClient,
  block: { slug: string; handle: string; reason: string },
): Promise<void> {
  const reason = block.reason.trim();
  const { error } = await client.rpc('block_space_member', {
    slug: block.slug,
    handle: block.handle,
    reason: reason === '' ? undefined : reason,
  });
  if (error) throw spaceErrorFrom(error);
}

/**
 * Takes a block back, so the person may ask to join again.
 *
 * @param client - the Supabase client
 * @param unblock - the space's address and the username
 * @throws SpaceError when refused
 */
export async function unblockSpaceMember(
  client: AppSupabaseClient,
  unblock: { slug: string; handle: string },
): Promise<void> {
  const { error } = await client.rpc('unblock_space_member', unblock);
  if (error) throw spaceErrorFrom(error);
}

/**
 * Reads the people the space blocked, newest first.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @returns the list
 * @throws SpaceError when refused
 */
export async function fetchBlockedMembers(
  client: AppSupabaseClient,
  slug: string,
): Promise<SpaceBlockedPerson[]> {
  const { data, error } = await client.rpc('space_blocked_members', { slug });
  if (error) throw spaceErrorFrom(error);
  const rows = Array.isArray(data) ? data : [];
  return rows.map((row) => {
    const object = row !== null && typeof row === 'object' && !Array.isArray(row) ? row : {};
    return { person: personFrom(object['person']), blockedAt: String(object['blocked_at'] ?? '') };
  });
}
