/**
 * Tests for the moderator changes to a thread (bundle FORUMS-1, part e; S1-E8-05).
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { moderateThread, moderationErrorFrom } from './forumModeration';

/**
 * A client whose rpc() answers with the given error.
 *
 * @param error - what the database says, or null
 * @returns the client and its rpc spy
 */
function clientAnswering(error: { code: string; hint?: string } | null) {
  const rpc = vi.fn().mockResolvedValue({ data: null, error });
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

describe('moderateThread', () => {
  it('locks a thread with the reason through the lock function', async () => {
    const { client, rpc } = clientAnswering(null);
    await moderateThread(client, { action: 'lock', threadNumber: 7, reason: 'Gata' });
    expect(rpc).toHaveBeenCalledWith('admin_lock_forum_thread', {
      thread_number: 7,
      reason: 'Gata',
    });
  });

  it('pins and unpins through the sticky function', async () => {
    const { client, rpc } = clientAnswering(null);
    await moderateThread(client, { action: 'unsticky', threadNumber: 3, reason: 'Nu' });
    expect(rpc).toHaveBeenCalledWith('admin_set_forum_thread_sticky', {
      thread_number: 3,
      reason: 'Nu',
      is_sticky: false,
    });
  });

  it('says a member is not allowed when the server refuses them', async () => {
    const { client } = clientAnswering({ code: '42501' });
    await expect(
      moderateThread(client, { action: 'unlock', threadNumber: 1, reason: 'x' }),
    ).rejects.toMatchObject({ failure: 'not_allowed' });
  });
});

describe('moderationErrorFrom', () => {
  it('asks for a reason when the reason is empty', () => {
    expect(moderationErrorFrom({ code: '23514', hint: 'reason:empty' }).failure).toBe(
      'reason_empty',
    );
  });

  it('says the thread is gone when it was deleted', () => {
    expect(moderationErrorFrom({ code: 'P0002', hint: 'thread:missing' }).failure).toBe('gone');
  });
});
