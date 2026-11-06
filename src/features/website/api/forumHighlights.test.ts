/**
 * Tests for reading the home page's forums band (bundle LOOK-3). Supabase is a small fake here;
 * the database rules are in supabase/tests/database/306-home-bands-and-forum-highlights.test.sql.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { fetchForumHighlights } from './forumHighlights';

/**
 * A client whose function answers with the given JSON.
 *
 * @returns the fake client and its rpc spy
 */
function clientAnswering(data: unknown, error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

describe('fetchForumHighlights', () => {
  it('asks in the page’s language and turns threads and spaces into the band’s shape', async () => {
    const { client, rpc } = clientAnswering({
      threads: [
        {
          forum_slug: 'feedback',
          forum_name: 'Feedback',
          number: 12,
          title: 'Primul meu capitol',
          starter: { handle: 'adult_writer', display_name: 'Lia Scrie' },
          reply_count: 3,
        },
      ],
      spaces: [{ slug: 'cercul', name: 'Cercul' }],
    });
    const highlights = await fetchForumHighlights(client, 'ro');
    expect(rpc).toHaveBeenCalledWith('public_forum_highlights', { wanted_language: 'ro' });
    expect(highlights.threads).toEqual([
      {
        forumSlug: 'feedback',
        forumName: 'Feedback',
        number: 12,
        title: 'Primul meu capitol',
        starterHandle: 'adult_writer',
        starterName: 'Lia Scrie',
        replyCount: 3,
      },
    ]);
    expect(highlights.spaces).toEqual([{ slug: 'cercul', name: 'Cercul' }]);
  });

  it('leaves out a thread whose starter has gone', async () => {
    const { client } = clientAnswering({
      threads: [
        { forum_slug: 'f', forum_name: null, number: 1, title: 'x', starter: null, reply_count: 0 },
      ],
      spaces: [],
    });
    await expect(fetchForumHighlights(client, 'en')).resolves.toEqual({ threads: [], spaces: [] });
  });

  it('throws when the database can’t be reached, so the band shows without the list', async () => {
    const { client } = clientAnswering(null, { message: 'offline' });
    await expect(fetchForumHighlights(client, 'en')).rejects.toThrow('offline');
  });
});
