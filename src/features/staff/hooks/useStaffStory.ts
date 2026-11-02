/**
 * useStaffStory: one story's overview in the admin site (bundle ADMIN-2, part a; story S1-E11-07).
 *
 * Who calls it: StaffStoryPage. What it calls: api/staffStories.ts fetchStaffStory().
 */
import { useQuery } from '@tanstack/react-query';

import { fetchStaffStory, type StaffStoryOverview } from '../api/staffStories';

import { requireStaffClient } from './requireStaffClient';
import { staffStoryFailureOf } from './useStaffStories';

/**
 * Follows one story.
 *
 * @param storyId - the story from the address
 * @returns the story (null while loading), whether it is loading and why it failed
 */
export function useStaffStory(storyId: string) {
  const story = useQuery<StaffStoryOverview>({
    queryKey: ['staff-story', storyId],
    retry: false,
    queryFn: async () => fetchStaffStory(await requireStaffClient(), storyId),
  });
  return {
    story: story.data ?? null,
    isLoading: story.isPending,
    failure: staffStoryFailureOf(story.error),
  };
}
