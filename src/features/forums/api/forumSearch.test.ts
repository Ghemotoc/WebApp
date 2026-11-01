/**
 * Tests for forum search's call and answer (bundle FORUMS-1, part f; S1-E8-10).
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { searchForums } from './forumSearch';

/**
 * A client whose rpc() answers with the given data.
 *
 * @param data - what the database sends back
 * @returns the client and its rpc spy
 */
function clientAnswering(data: unknown) {
  const rpc = vi.fn().mockResolvedValue({ data, error: null });
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

describe('searchForums', () => {
  it('sends only the filters that are set', async () => {
    const { client, rpc } = clientAnswering({ results: [], has_more: false });
    await searchForums(
      client,
      { term: 'dragoni', forumSlug: null, authorHandle: '@inkwolf' },
      { skip: 20, languageCode: 'en' },
    );
    expect(rpc).toHaveBeenCalledWith('search_forum_posts', {
      term: 'dragoni',
      author_handle: '@inkwolf',
      skip: 20,
      language_code: 'en',
    });
  });

  it('reads a thread result with its author and snippet', async () => {
    const { client } = clientAnswering({
      results: [
        {
          kind: 'thread',
          thread_number: 7,
          thread_title: 'Dragoni',
          forum_slug: 'first-chapters',
          forum_name: 'First chapters',
          post_number: 1,
          author: { handle: 'inkwolf', display_name: 'Ink Wolf', is_staff: false },
          created_at: '2026-11-01T10:00:00Z',
          snippet: 'How do I start?',
        },
      ],
      has_more: true,
    });
    const page = await searchForums(
      client,
      { term: 'dragoni', forumSlug: null, authorHandle: null },
      { skip: 0, languageCode: 'ro' },
    );
    expect(page.hasMore).toBe(true);
    expect(page.results[0]).toMatchObject({
      kind: 'thread',
      threadNumber: 7,
      postNumber: 1,
      snippet: 'How do I start?',
    });
  });
});
