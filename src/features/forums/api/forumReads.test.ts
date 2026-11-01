/**
 * Read and unread in the forums (bundle FORUMS-1, part d; S1-E8-04): what api/forumReads.ts asks
 * the database for and how it reads the answers.
 */
import { describe, expect, it } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { fetchNewForYou, markForumsRead, markThreadRead } from './forumReads';

/** One call the fake client received. */
interface Call {
  name: string;
  args: Record<string, unknown>;
}

/**
 * A stand-in for the Supabase client that records its calls and answers with the given data.
 *
 * @param data - what every call answers
 * @param errorMessage - an error to answer with instead, or null
 * @returns the client and the calls it received
 */
function fakeClient(data: unknown, errorMessage: string | null = null) {
  const calls: Call[] = [];
  const client = {
    rpc: (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      const error = errorMessage === null ? null : { message: errorMessage };
      return Promise.resolve({ data, error });
    },
  };
  return { client: client as unknown as AppSupabaseClient, calls };
}

describe('marking as read', () => {
  it('marks a thread up to the last post on screen', async () => {
    const { client, calls } = fakeClient(null);
    await markThreadRead(client, 12, 7);
    expect(calls).toEqual([
      { name: 'mark_forum_thread_read', args: { thread_number: 12, up_to_post: 7 } },
    ]);
  });

  it('sends no forum for "Mark all as read", and the forum for "Mark as read"', async () => {
    const { client, calls } = fakeClient(null);
    await markForumsRead(client, null);
    await markForumsRead(client, 'writing-craft');
    expect(calls.map((call) => call.args)).toEqual([{}, { forum_slug: 'writing-craft' }]);
  });

  it('says so in plain words when the database refuses', async () => {
    const { client } = fakeClient(null, 'denied');
    await expect(markForumsRead(client, null)).rejects.toThrow('Could not mark the forums as read');
  });
});

describe('fetchNewForYou', () => {
  it('reads each thread with where it opens and how many posts are new', async () => {
    const { client, calls } = fakeClient([
      {
        title: 'Iar at the start?',
        forum_name: 'Language help',
        forum_slug: 'language-help',
        number: 4,
        first_unread_post: 6,
        new_count: 5,
        last_post_at: '2026-11-01T10:00:00Z',
      },
    ]);
    const threads = await fetchNewForYou(client, 'en');
    expect(calls[0]?.args).toEqual({ language_code: 'en' });
    expect(threads).toEqual([
      {
        title: 'Iar at the start?',
        forumName: 'Language help',
        forumSlug: 'language-help',
        number: 4,
        firstUnreadPost: 6,
        newCount: 5,
        lastPostAt: '2026-11-01T10:00:00Z',
      },
    ]);
  });
});
