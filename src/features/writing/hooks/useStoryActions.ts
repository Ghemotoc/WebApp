/**
 * useStoryActions: deleting a story and undoing it (story S1-E3-05).
 *
 * Who calls it: DeleteStoryControl (story settings) and RecentlyDeleted (Your writing).
 * What it calls: api/stories.ts → delete_my_story() and restore_my_story(); then the writer's
 * story list is read again so every screen shows the new state.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { deleteMyStory, restoreMyStory } from '../api/stories';

import { myStoriesKey } from './useMyStories';

/**
 * Offers the two actions.
 *
 * @returns deleteStory and restoreStory mutations (call `.mutate(slug)`)
 */
export function useStoryActions() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: myStoriesKey(userId) });
  const deleteStory = useMutation({
    mutationFn: async (slug: string) => deleteMyStory(await requireClient(), slug),
    onSuccess: refresh,
  });
  const restoreStory = useMutation({
    mutationFn: async (slug: string) => restoreMyStory(await requireClient(), slug),
    onSuccess: refresh,
  });
  return { deleteStory, restoreStory };
}
