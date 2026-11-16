/**
 * useStoryLanguages: the languages of one of the writer's stories (bundle TRANSLATE-1c).
 *
 * Who calls it: StoryLanguagesPage and TranslateChaptersPage.
 * What it calls: api/storyLanguages.ts → story_languages(); useSession, so a signed-out visitor
 * never asks the database.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchStoryLanguages, type StoryLanguages } from '../api/storyLanguages';

/** The cache key of one story's languages; the add, save and remove actions refresh it. */
export const storyLanguagesKey = (userId: string | null, storySlug: string) => [
  'story-languages-of',
  userId,
  storySlug,
];

/**
 * Follows a story's languages.
 *
 * @param storySlug - any edition's address
 * @returns languages (null while loading, signed out or when the story isn't the writer's),
 *   isSignedIn, isKnown (the session and the list have loaded) and loadFailed
 */
export function useStoryLanguages(storySlug: string) {
  const { userId, isKnown: isSessionKnown } = useSession();
  const languages = useQuery<StoryLanguages | null>({
    queryKey: storyLanguagesKey(userId, storySlug),
    enabled: userId !== null && storySlug !== '',
    queryFn: async () => fetchStoryLanguages(await requireClient(), storySlug),
  });
  return {
    languages: languages.data ?? null,
    isSignedIn: userId !== null,
    isKnown: isSessionKnown && (userId === null || !languages.isPending),
    loadFailed: languages.isError,
  };
}
