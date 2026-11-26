/**
 * Unit tests for the Search page's trending tags read (user story 1.7, board A07-Search):
 * fetchTrendingTags() asks trending_tags() for six and keeps only tag names.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { fetchTrendingTags } from './search';

/**
 * A client whose one call answers as given.
 *
 * @param answer - what rpc() resolves to
 * @returns the client and its rpc mock
 */
function clientAnswering(answer: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(answer);
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

describe('fetchTrendingTags', () => {
  it('asks for the number of tags and keeps their names in order', async () => {
    const { client, rpc } = clientAnswering({ data: ['found-family', 'ghosts', 7], error: null });
    await expect(fetchTrendingTags(client, 6)).resolves.toEqual(['found-family', 'ghosts']);
    expect(rpc).toHaveBeenCalledWith('trending_tags', { how_many: 6 });
  });

  it('gives no tags when the answer is not a list', async () => {
    const { client } = clientAnswering({ data: null, error: null });
    await expect(fetchTrendingTags(client, 6)).resolves.toEqual([]);
  });

  it('says in plain words when the database can’t be reached', async () => {
    const { client } = clientAnswering({ data: null, error: { message: 'offline' } });
    await expect(fetchTrendingTags(client, 6)).rejects.toThrow('Could not read the trending tags');
  });
});
