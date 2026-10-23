/**
 * useMyStories: the signed-in writer's own stories (story S1-E3-01).
 *
 * Who calls it: YourWritingPage (/write). What it calls: api/stories.ts → stories through
 * stories_select_own, and useSession to know whether someone is signed in. Signed out, it never
 * asks the database.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchMyStories, type MyStory } from '../api/stories';

/** The cache key of a writer's stories; the key the create hook refreshes. */
export const myStoriesKey = (userId: string | null) => ['my-stories', userId];

/**
 * Follows the writer's stories.
 *
 * @returns stories (empty while loading or signed out), isSignedIn, isKnown (the session and the
 *   list have loaded) and loadFailed
 */
export function useMyStories() {
  const { userId, isKnown: isSessionKnown } = useSession();
  const stories = useQuery<MyStory[]>({
    queryKey: myStoriesKey(userId),
    enabled: userId !== null,
    queryFn: async () => fetchMyStories(await requireClient()),
  });
  return {
    stories: stories.data ?? [],
    isSignedIn: userId !== null,
    isKnown: isSessionKnown && (userId === null || !stories.isPending),
    loadFailed: stories.isError,
  };
}
