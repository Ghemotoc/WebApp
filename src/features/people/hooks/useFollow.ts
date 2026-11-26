/**
 * useFollow: a Follow button's state and its toggle (story S1-E6-05).
 *
 * Who calls it: FollowButton. What it calls: api/follows.ts → writer_follow_state() or
 * story_follow_state(), then follow_writer() or follow_story(). The button changes at once
 * (design books item 13: within 100 ms) through lib/query/optimistic.ts and goes back with
 * FollowButton's failure note if the database says no. After a change the cached state is
 * replaced with the database's answer, so the count is always the real one.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { rollBack, showOptimistic } from '@/lib/query/optimistic';
import { libraryQueryKey } from '@/features/library/libraryQueryKey';
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
  return ['follow-state', target.kind, followTargetKey(target), userId];
}

/**
 * The one name that picks out a target within its kind.
 *
 * @param target - the writer, story, genre or tag
 * @returns the username, the address, the slug or the tag's name
 */
function followTargetKey(target: FollowTarget): string {
  if (target.kind === 'writer') return target.handle;
  if (target.kind === 'tag') return target.name;
  return target.slug;
}

/**
 * The state the person expects after pressing Follow or Following.
 *
 * @param current - what the button shows now (undefined or null while loading)
 * @param shouldFollow - true to follow, false to stop
 * @returns the new state, or the current one when there is nothing to change yet
 */
export function expectedFollowState(
  current: FollowState | null | undefined,
  shouldFollow: boolean,
): FollowState | null | undefined {
  if (current === null || current === undefined || current.following === shouldFollow) {
    return current;
  }
  const step = shouldFollow ? 1 : -1;
  return {
    ...current,
    following: shouldFollow,
    followerCount: Math.max(0, current.followerCount + step),
  };
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
 *   setFollowing() (follow or stop and wait for the answer, used by Undo; design books item 14),
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
    // Step 1: show the new state before the database answers.
    onMutate: (shouldFollow) =>
      showOptimistic<FollowState | null>(queryClient, queryKey, (current) =>
        expectedFollowState(current, shouldFollow),
      ),
    // Step 2: the database said no, so the button goes back; FollowButton shows the note.
    onError: (_error, _shouldFollow, snapshot) => rollBack(queryClient, snapshot),
    onSuccess: async (newState, shouldFollow) => {
      queryClient.setQueryData(queryKey, newState);
      // Never who or what was followed (docs/analytics-events.md).
      // Genres and tags have no event in the catalogue yet, so only writers and stories count.
      if (shouldFollow && newState.following && target.kind === 'writer') {
        trackEvent('writer_followed', {});
      }
      if (shouldFollow && newState.following && target.kind === 'story') {
        trackEvent('story_followed', {});
      }
      // Library's "What you follow" lists genres and tags too (BOOKS-A06).
      await queryClient.invalidateQueries({ queryKey: [libraryQueryKey, 'follows'] });
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
    // Undo after "Unfollowed." calls this and waits, so the undo note can say if it failed.
    setFollowing: async (shouldFollow: boolean) => {
      await change.mutateAsync(shouldFollow);
    },
    isSaving: change.isPending,
    failure,
  };
}
