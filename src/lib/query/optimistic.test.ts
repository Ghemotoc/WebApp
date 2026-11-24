/**
 * Tests for the optimistic helper and the expected states (design books item 13, "Small
 * moments"): the screen changes at once and goes back exactly as it was when the server says no.
 */
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { expectedFollowState } from '@/features/people/hooks/useFollow';
import { expectedLikeState } from '@/features/reading/hooks/useChapterLike';

import { rollBack, showOptimistic } from './optimistic';

describe('showOptimistic and rollBack', () => {
  it('shows the expected state at once and puts the old one back after a refusal', async () => {
    const queryClient = new QueryClient();
    const key = ['chapter-like', 'story', 'abcdefgh', 'me'];
    queryClient.setQueryData(key, { liked: false, likeCount: 4 });

    const snapshot = await showOptimistic(queryClient, key, (current: unknown) =>
      expectedLikeState(current as { liked: boolean; likeCount: number }, true),
    );
    expect(queryClient.getQueryData(key)).toEqual({ liked: true, likeCount: 5 });

    rollBack(queryClient, snapshot);
    expect(queryClient.getQueryData(key)).toEqual({ liked: false, likeCount: 4 });
  });

  it('changes nothing when the mutation failed before the state was shown', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['k'], 1);
    rollBack(queryClient, undefined);
    expect(queryClient.getQueryData(['k'])).toBe(1);
  });
});

describe('the expected like and follow states', () => {
  it('a like adds one and taking it back removes one, never below zero', () => {
    expect(expectedLikeState({ liked: false, likeCount: 0 }, true)).toEqual({
      liked: true,
      likeCount: 1,
    });
    expect(expectedLikeState({ liked: true, likeCount: 0 }, false)).toEqual({
      liked: false,
      likeCount: 0,
    });
  });

  it('pressing twice quickly does not count the same like twice', () => {
    const state = { liked: true, likeCount: 3 };
    expect(expectedLikeState(state, true)).toBe(state);
  });

  it('nothing is guessed while the state is still loading', () => {
    expect(expectedLikeState(undefined, true)).toBeUndefined();
    expect(expectedFollowState(null, true)).toBeNull();
  });

  it('following adds one follower and stopping removes one', () => {
    expect(expectedFollowState({ following: false, followerCount: 9 }, true)).toEqual({
      following: true,
      followerCount: 10,
    });
    expect(expectedFollowState({ following: true, followerCount: 10 }, false)).toEqual({
      following: false,
      followerCount: 9,
    });
  });
});
