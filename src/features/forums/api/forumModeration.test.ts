/**
 * Tests for the moderator changes to a thread (bundle FORUMS-1, part e; S1-E8-05; GAPS-9 for the
 * rules thread and a locked thread's pointer).
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

  it('makes a thread the rules thread, and stops it, through the rules function', async () => {
    const { client, rpc } = clientAnswering(null);
    await moderateThread(client, { action: 'rules', threadNumber: 5, reason: 'Reguli' });
    expect(rpc).toHaveBeenCalledWith('admin_set_forum_rules_thread', {
      thread_number: 5,
      reason: 'Reguli',
      is_rules: true,
    });
  });

  it('points a locked thread at the next one, and takes the pointer away by naming none', async () => {
    const { client, rpc } = clientAnswering(null);
    const where = { threadNumber: 5, reason: 'Continuă' };
    await moderateThread(client, { ...where, action: 'next', nextThreadNumber: 9 });
    expect(rpc).toHaveBeenLastCalledWith('admin_set_forum_thread_next', {
      thread_number: 5,
      reason: 'Continuă',
      next_thread_number: 9,
    });
    await moderateThread(client, { ...where, action: 'unnext' });
    expect(rpc).toHaveBeenLastCalledWith('admin_set_forum_thread_next', {
      thread_number: 5,
      reason: 'Continuă',
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

  it('tells the pointer refusals apart', () => {
    expect(moderationErrorFrom({ code: 'P0002', hint: 'next:missing' }).failure).toBe(
      'next_missing',
    );
    expect(moderationErrorFrom({ code: '23514', hint: 'next:same' }).failure).toBe('next_same');
    expect(moderationErrorFrom({ code: '23514', hint: 'thread:not_locked' }).failure).toBe(
      'not_locked',
    );
  });
});
