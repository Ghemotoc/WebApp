/**
 * useStoryLibraryState: a story's shelf in the reader's library, their latest place in it and
 * a way to change the shelf (story S1-E4-03; board 3.4 Story, "Library" and "Continue").
 *
 * Who calls it: StoryReadingActions on the story page. What it calls: api/library.ts →
 * story_library_state() and set_library_shelf(). After a change the Library page and its
 * shelves are refreshed, so they never show an old shelf.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { storyListQueryKey } from '@/features/discovery/hooks/useStoryShelf';

import {
  fetchStoryLibraryState,
  setLibraryShelf,
  type LibraryShelf,
  type StoryLibraryState,
} from '../api/library';

import { libraryQueryKey } from '../libraryQueryKey';

/**
 * Follows one story's place in the library.
 *
 * @param storySlug - the story's address
 * @returns state (null while loading or when the story can't be seen), isSignedIn,
 *   isSessionKnown, changeShelf(shelf), isSaving, saveFailed
 */
export function useStoryLibraryState(storySlug: string) {
  const { userId, isKnown } = useSession();
  const queryClient = useQueryClient();
  const queryKey = [libraryQueryKey, 'story', storySlug, userId];
  const state = useQuery<StoryLibraryState | null>({
    queryKey,
    enabled: isKnown,
    queryFn: async () => fetchStoryLibraryState(await requireClient(), storySlug),
  });
  const change = useMutation({
    mutationFn: async (shelf: LibraryShelf | null) =>
      setLibraryShelf(await requireClient(), storySlug, shelf),
    onSuccess: async (shelf) => {
      // Step 1: the button shows the new shelf at once.
      queryClient.setQueryData<StoryLibraryState | null>(queryKey, (old) =>
        old === null || old === undefined ? old : { ...old, shelf },
      );
      // Step 2: the Library page and the shelves read again next time they show.
      await queryClient.invalidateQueries({ queryKey: [libraryQueryKey, 'overview'] });
      await queryClient.invalidateQueries({ queryKey: [storyListQueryKey] });
    },
  });
  return {
    state: state.data ?? null,
    isSignedIn: userId !== null,
    isSessionKnown: isKnown,
    changeShelf: (shelf: LibraryShelf | null) => change.mutate(shelf),
    isSaving: change.isPending,
    saveFailed: change.isError,
  };
}
