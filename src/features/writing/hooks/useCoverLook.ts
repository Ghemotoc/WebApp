/**
 * useCoverLook: saves the look and title font of the writer's own cover (bundle CALM-4).
 *
 * Who calls it: CoverLookPicker (story settings).
 * What it calls: api/stories.ts → set_my_story_cover_look(); then the writer's story list is read
 * again, so the preview and every cover show the new look.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  setMyStoryCoverLook,
  type CoverStyleValue,
  type CoverTitleFontValue,
} from '../api/stories';

import { myStoriesKey } from './useMyStories';

/** What one save needs. */
export interface CoverLookChange {
  style: CoverStyleValue;
  titleFont: CoverTitleFontValue;
}

/**
 * Offers the save.
 *
 * @param slug - the story's public address
 * @returns a mutation: call `.mutate({ style, titleFont })`; its data is the outcome
 */
export function useCoverLook(slug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (change: CoverLookChange) =>
      setMyStoryCoverLook(await requireClient(), slug, change.style, change.titleFont),
    // Read the writer's stories again so every cover shows the saved look.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myStoriesKey(userId) }),
  });
}
