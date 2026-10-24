/**
 * useStoryPage: a story's public page (story S1-E3-05).
 *
 * Who calls it: StoryPage. What it calls: api/storyPage.ts → get_story_page(). The answer is
 * cached per address and per person (the owner sees their unpublished story, others don't).
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchStoryPage, type StoryPageData } from '../api/storyPage';

/**
 * Loads the page.
 *
 * @param slug - the story's public address
 * @returns story (null while loading or when it may not be seen), isLoaded, loadFailed
 */
export function useStoryPage(slug: string) {
  const { userId, isKnown } = useSession();
  const page = useQuery<StoryPageData | null>({
    queryKey: ['story-page', slug, userId],
    enabled: isKnown && slug !== '',
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchStoryPage(client, slug);
    },
  });
  return { story: page.data ?? null, isLoaded: page.isSuccess, loadFailed: page.isError };
}
