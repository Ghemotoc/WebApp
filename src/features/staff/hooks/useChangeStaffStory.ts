/**
 * useChangeStaffStory: the changes staff make to one story (bundle ADMIN-2, part b1; story
 * S1-E11-08, part 08a): its settings, its visibility and one chapter's visibility.
 *
 * Who calls it: StaffStoryPage, which passes it to StaffStorySettingsForm,
 * StaffStoryVisibilityForm and StaffStoryChapters. What it calls: api/staffStoryChanges.ts.
 * After every change the story and the Stories list are read again, so the page shows what the
 * database now holds.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  changeStaffStorySettings,
  setStaffChapterVisibility,
  setStaffStoryVisibility,
  StoryChangeError,
  type StaffStorySettingsChange,
  type StoryChangeFailure,
  type StoryChangeReason,
} from '../api/staffStoryChanges';

import { requireStaffClient } from './requireStaffClient';

/** One change staff ask for. */
export type StaffStoryChange =
  | { kind: 'settings'; change: StaffStorySettingsChange; reason: StoryChangeReason }
  | { kind: 'visibility'; visibility: 'shown' | 'restricted' | 'hidden'; reason: StoryChangeReason }
  | {
      kind: 'chapter';
      chapterId: string;
      visibility: 'shown' | 'hidden';
      reason: StoryChangeReason;
    };

/**
 * Sends one change to the database.
 *
 * @param storyId - the story
 * @param wanted - the change
 */
async function sendChange(storyId: string, wanted: StaffStoryChange): Promise<void> {
  const client = await requireStaffClient();
  if (wanted.kind === 'settings') {
    return changeStaffStorySettings(client, storyId, wanted.change, wanted.reason);
  }
  if (wanted.kind === 'visibility') {
    return setStaffStoryVisibility(client, storyId, wanted.visibility, wanted.reason);
  }
  return setStaffChapterVisibility(client, wanted.chapterId, wanted.visibility, wanted.reason);
}

/**
 * Why a change failed, or null.
 *
 * @param error - the mutation's error
 * @returns the failure
 */
function changeFailureOf(error: unknown): StoryChangeFailure | null {
  if (error === null || error === undefined) return null;
  return error instanceof StoryChangeError ? error.failure : 'unreachable';
}

/**
 * Follows the changes to one story.
 *
 * @param storyId - the story
 * @returns change(wanted) (rejects when refused), the last change asked for, whether it was
 *   saved, its failure and isBusy
 */
export function useChangeStaffStory(storyId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (wanted: StaffStoryChange) => sendChange(storyId, wanted),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['staff-story', storyId] });
      await queryClient.invalidateQueries({ queryKey: ['staff-stories'] });
    },
  });
  return {
    change: (wanted: StaffStoryChange) => mutation.mutateAsync(wanted),
    /** The last change asked for, so only its own form shows how it went. */
    last: mutation.variables ?? null,
    isDone: mutation.isSuccess,
    failure: changeFailureOf(mutation.error),
    isBusy: mutation.isPending,
  };
}

/** What the hook gives the forms. */
export type StaffStoryChanger = ReturnType<typeof useChangeStaffStory>;
