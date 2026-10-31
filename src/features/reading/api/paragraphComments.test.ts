/**
 * fetchParagraphCounts turns paragraph_comment_counts()'s answer into a lookup by paragraph
 * (story S1-E6-06).
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { fetchParagraphCounts } from './paragraphComments';

/**
 * A client whose rpc() answers the given data.
 *
 * @param data - what the database answers
 * @returns the client and its rpc spy
 */
function clientAnswering(data: unknown) {
  const rpc = vi.fn().mockResolvedValue({ data, error: null });
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

const address = { storySlug: 'statia-meteo', chapterCode: 'abc12345' };

describe('fetchParagraphCounts', () => {
  it('gives each paragraph its count and keeps the earlier-version count', async () => {
    const { client, rpc } = clientAnswering({
      comments_enabled: true,
      paragraphs: [
        { block: 2, count: 3 },
        { block: 5, count: 1 },
      ],
      earlier: 2,
    });
    const counts = await fetchParagraphCounts(client, address);
    expect(rpc).toHaveBeenCalledWith('paragraph_comment_counts', {
      story_slug: 'statia-meteo',
      chapter_code: 'abc12345',
    });
    expect(counts).toEqual({ commentsEnabled: true, byParagraph: { 2: 3, 5: 1 }, earlier: 2 });
  });

  it('answers null when the reader may not read the chapter', async () => {
    const { client } = clientAnswering(null);
    expect(await fetchParagraphCounts(client, address)).toBeNull();
  });
});
