/**
 * Reading a pause of new comments from a comment list, and "Resume now" (bundle CALM-8;
 * IDEA-20261109-8).
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { commentPauseFrom, endMyCommentPause } from './commentPause';

describe('commentPauseFrom', () => {
  it('reads the end and whether the reader may resume, while a pause runs', () => {
    expect(
      commentPauseFrom({
        comments_paused_until: '2026-11-22T16:40:00+00:00',
        can_resume_comments: true,
      }),
    ).toEqual({ pausedUntil: '2026-11-22T16:40:00+00:00', canResume: true });
  });

  it('is no pause when the list leaves the fields out', () => {
    expect(commentPauseFrom({})).toEqual({ pausedUntil: null, canResume: false });
  });
});

describe('endMyCommentPause', () => {
  /**
   * A client whose rpc() answers the given result.
   *
   * @param result - the data and error the database answers
   * @returns the client and its rpc spy
   */
  function clientAnswering(result: { data: unknown; error: unknown }) {
    const rpc = vi.fn().mockResolvedValue(result);
    return { client: { rpc } as unknown as AppSupabaseClient, rpc };
  }

  it('ends the pause on the story by its address', async () => {
    const { client, rpc } = clientAnswering({ data: { outcome: 'ok' }, error: null });
    expect(await endMyCommentPause(client, 'statia-meteo')).toBe('ok');
    expect(rpc).toHaveBeenCalledWith('end_my_comment_pause', { story_slug: 'statia-meteo' });
  });

  it('passes on a refusal for someone else’s story', async () => {
    const { client } = clientAnswering({ data: { outcome: 'not_found' }, error: null });
    expect(await endMyCommentPause(client, 'statia-meteo')).toBe('not_found');
  });

  it('throws when the database can’t be reached', async () => {
    const { client } = clientAnswering({ data: null, error: { message: 'offline' } });
    await expect(endMyCommentPause(client, 'statia-meteo')).rejects.toThrow('offline');
  });
});
