/**
 * useStoryLike: the story page's Like button state and its toggle (bundle 2, board B01).
 *
 * Who calls it: StoryLikeButton. What it calls: api/storyLikes.ts → story_like_state(), then
 * like_story(). Like the chapter's button (useChapterLike), it changes at once through
 * lib/query/optimistic.ts and goes back if the database says no. After a toggle the cached state is
 * replaced with the database's answer, and the story page is read again so "418 likes" in the
 * numbers line follows.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { rollBack, showOptimistic } from '@/lib/query/optimistic';
import { getSupabaseClient } from '@/lib/supabase';

import { LikeError, type LikeFailure, type LikeState } from '../api/likes';
import { fetchStoryLikeState, setStoryLike } from '../api/storyLikes';

import { expectedLikeState } from './useChapterLike';

/**
 * The reason the last toggle failed, or null when it didn't.
 *
 * @param hasFailed - whether it failed
 * @param error - what it threw
 * @returns the reason; unreachable for anything that isn't a LikeError
 */
function failureOf(hasFailed: boolean, error: unknown): LikeFailure | null {
  if (!hasFailed) return null;
  return error instanceof LikeError ? error.failure : 'unreachable';
}

/**
 * Follows the like on one story.
 *
 * @param storySlug - the story's address
 * @returns state (null while loading or when the story can't be seen), toggle(), isSaving and
 *   failure
 */
export function useStoryLike(storySlug: string) {
  const { userId, isKnown } = useSession();
  const queryClient = useQueryClient();
  const queryKey = ['story-like', storySlug, userId];
  const state = useQuery<LikeState | null>({
    queryKey,
    enabled: isKnown && userId !== null,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchStoryLikeState(client, storySlug);
    },
  });
  const change = useMutation({
    mutationFn: async (shouldLike: boolean) =>
      setStoryLike(await requireClient(), storySlug, shouldLike),
    // Step 1: show the new state before the database answers.
    onMutate: (shouldLike) =>
      showOptimistic<LikeState | null>(queryClient, queryKey, (current) =>
        expectedLikeState(current, shouldLike),
      ),
    // Step 2: the database said no, so the button goes back; StoryLikeButton shows the note.
    onError: (_error, _shouldLike, snapshot) => rollBack(queryClient, snapshot),
    // Step 3: the database's answer replaces the guess, and the page's numbers line is read again.
    onSuccess: async (newState) => {
      queryClient.setQueryData(queryKey, newState);
      await queryClient.invalidateQueries({ queryKey: ['story-page', storySlug] });
    },
  });
  return {
    state: state.data ?? null,
    toggle: () => change.mutate(!(state.data?.liked ?? false)),
    isSaving: change.isPending,
    failure: failureOf(change.isError, change.error),
  };
}
