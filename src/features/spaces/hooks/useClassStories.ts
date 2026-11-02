/**
 * Stories shared only with a class, as React hooks (bundle CLASSES, part c; story S1-E8-11).
 *
 * Who calls it: StoryClassCard (Story settings, "Who can read it") and ClassStoriesCard (the
 * class's page). What it calls: api/classStories.ts. After a change every story list refreshes,
 * so the story leaves or rejoins public lists at once.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  ClassStoryError,
  fetchClassSpaceStories,
  fetchStoryClassShare,
  setStoryClass,
} from '../api/classStories';

import { spacesQueryKey } from './useSpaces';

/** The cache key every class story read starts with. */
const classStoriesKey = [...spacesQueryKey, 'class-stories'] as const;

/**
 * The failure a call ended with, as a ClassStoryError.
 *
 * @param error - whatever the call threw
 * @returns the error, or null when there is none
 */
export function classStoryFailureOf(error: Error | null): ClassStoryError | null {
  if (error === null) return null;
  return error instanceof ClassStoryError ? error : new ClassStoryError('unreachable');
}

/**
 * Whether the writer's story is shared with a class.
 *
 * @param storySlug - the writer's own story
 * @returns the query: data is the share, or null when it isn't theirs
 */
export function useStoryClassShare(storySlug: string) {
  return useQuery({
    queryKey: [...classStoriesKey, 'share', storySlug],
    queryFn: async () => fetchStoryClassShare(await requireClient(), storySlug),
  });
}

/**
 * Shares the story with one class, or makes it public again.
 *
 * @param storySlug - the writer's own story
 * @returns change(classSlug) where null makes it public; the failure and isRunning
 */
export function useSetStoryClass(storySlug: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (classSlug: string | null) =>
      setStoryClass(await requireClient(), { storySlug, classSlug }),
    // Every list may now show or hide the story, so everything cached is read again.
    onSuccess: () => queryClient.invalidateQueries(),
  });
  return {
    change: mutation.mutateAsync,
    failure: classStoryFailureOf(mutation.error),
    isRunning: mutation.isPending,
    isDone: mutation.isSuccess,
  };
}

/**
 * The stories shared with a class.
 *
 * @param slug - the class's address
 * @returns the query: data is the list
 */
export function useClassSpaceStories(slug: string) {
  return useQuery({
    queryKey: [...classStoriesKey, 'list', slug],
    queryFn: async () => fetchClassSpaceStories(await requireClient(), slug),
  });
}
