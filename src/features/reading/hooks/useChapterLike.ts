/**
 * useChapterLike: the Like button's state and its toggle (story S1-E6-03).
 *
 * Who calls it: LikeButton. What it calls: api/likes.ts → chapter_like_state(), then
 * like_chapter(). After a toggle the cached state is replaced with the database's answer, so the
 * count shown is always the real one.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import {
  fetchLikeState,
  LikeError,
  setLike,
  type ChapterAddress,
  type LikeFailure,
  type LikeState,
} from '../api/likes';

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
 * Follows the like on one chapter.
 *
 * @param address - the chapter
 * @returns state (null while loading or when the chapter can't be read), isSignedIn,
 *   isSessionKnown, toggle(), isSaving and failure
 */
export function useChapterLike(address: ChapterAddress) {
  const { userId, isKnown } = useSession();
  const queryClient = useQueryClient();
  const queryKey = ['chapter-like', address.storySlug, address.chapterCode, userId];
  const state = useQuery<LikeState | null>({
    queryKey,
    enabled: isKnown,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchLikeState(client, address);
    },
  });
  const change = useMutation({
    mutationFn: async (shouldLike: boolean) => setLike(await requireClient(), address, shouldLike),
    onSuccess: (newState) => queryClient.setQueryData(queryKey, newState),
  });
  return {
    state: state.data ?? null,
    isSignedIn: userId !== null,
    isSessionKnown: isKnown,
    toggle: () => change.mutate(!(state.data?.liked ?? false)),
    isSaving: change.isPending,
    failure: failureOf(change.isError, change.error),
  };
}
