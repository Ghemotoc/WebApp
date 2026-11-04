/**
 * Tests for classThreadReplies (bundle 14d IDEAS-3, part b): reading "Who has replied".
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { fetchClassThreadReplies } from './classThreadReplies';

/**
 * A client whose rpc() gives one answer.
 *
 * @param answer - the data or error the call returns
 * @returns the client and its rpc spy
 */
function fakeClient(answer: { data?: unknown; error?: { message: string } }) {
  const rpc = vi.fn().mockResolvedValue({ data: answer.data ?? null, error: answer.error ?? null });
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

describe('fetchClassThreadReplies', () => {
  it('reads both lists and asks about the right thread', async () => {
    const { client, rpc } = fakeClient({
      data: {
        replied: [{ handle: 'radu.c', display_name: 'Radu' }],
        not_yet: [{ handle: 'ioana.v' }],
      },
    });
    const replies = await fetchClassThreadReplies(client, 'thread-1');
    expect(rpc).toHaveBeenCalledWith('class_thread_replies', { target_thread_id: 'thread-1' });
    expect(replies).toEqual({
      replied: [{ handle: 'radu.c', displayName: 'Radu' }],
      notYet: [{ handle: 'ioana.v', displayName: 'ioana.v' }],
    });
  });

  it('gives nothing to a student, so the panel stays hidden', async () => {
    const { client } = fakeClient({ data: null });
    expect(await fetchClassThreadReplies(client, 'thread-1')).toBeNull();
  });

  it('passes a failed call on, so the panel can say it couldn’t load', async () => {
    const { client } = fakeClient({ error: { message: 'offline' } });
    await expect(fetchClassThreadReplies(client, 'thread-1')).rejects.toMatchObject({
      message: 'offline',
    });
  });
});
