/**
 * useFollow: a Follow button's state and its toggle (story S1-E6-05).
 *
 * Who calls it: FollowButton. What it calls: api/follows.ts → writer_follow_state() or
 * story_follow_state(), then follow_writer() or follow_story(). After a change the cached state
 * is replaced with the database's answer, so the count is always the real one.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';
import { trackEvent } from '@/lib/analytics/track';

import {
  fetchFollowState,
  FollowError,
  setFollow,
  type FollowFailure,
  type FollowState,
  type FollowTarget,
} from '../api/follows';

/**
 * The cache key for one target and one person.
 *
 * @param target - the writer or the story
 * @param userId - the signed-in person, or null
 * @returns the key
 */
function followQueryKey(target: FollowTarget, userId: string | null) {
  const name = target.kind === 'writer' ? target.handle : target.slug;
  return ['follow-state', target.kind, name, userId];
}

/**
 * The reason the last toggle failed, or null when it didn't.
 *
 * @param hasFailed - whether it failed
 * @param error - what it threw
 * @returns the reason; unreachable for anything that isn't a FollowError
 */
function failureOf(hasFailed: boolean, error: unknown): FollowFailure | null {
  if (!hasFailed) return null;
  return error instanceof FollowError ? error.failure : 'unreachable';
}

/**
 * Follows one target.
 *
 * @param target - the writer or the story
 * @returns state (null while loading or when the target can't be seen), isSignedIn, toggle(),
 *   isSaving and failure (why the last toggle failed, or null)
 */
export function useFollow(target: FollowTarget) {
  const { userId, isKnown } = useSession();
  const queryClient = useQueryClient();
  const queryKey = followQueryKey(target, userId);
  const state = useQuery<FollowState | null>({
    queryKey,
    enabled: isKnown,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchFollowState(client, target);
    },
  });
  const change = useMutation({
    mutationFn: async (shouldFollow: boolean) =>
      setFollow(await requireClient(), target, shouldFollow),
    onSuccess: async (newState, shouldFollow) => {
      queryClient.setQueryData(queryKey, newState);
      // Never who or what was followed (docs/analytics-events.md).
      if (shouldFollow && newState.following) {
        trackEvent(target.kind === 'writer' ? 'writer_followed' : 'story_followed', {});
      }
      // Discover's "New from writers you follow" shelf changes with every follow (S1-E5-01).
      await queryClient.invalidateQueries({ queryKey: ['story-list'] });
    },
  });
  const failure = failureOf(change.isError, change.error);
  return {
    state: state.data ?? null,
    isSignedIn: userId !== null,
    isSessionKnown: isKnown,
    toggle: () => {
      const following = state.data?.following ?? false;
      change.mutate(!following);
    },
    isSaving: change.isPending,
    failure,
  };
}
