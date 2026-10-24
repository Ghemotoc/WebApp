/**
 * useStoryPreview: for a signed-out visitor who can't open a story, whether it is because of its
 * 16+ or 18+ rating, and its title (story S1-E4-04).
 *
 * Who calls it: ChapterReaderPage and StoryPage, only when their own read answered nothing.
 * What it calls: api/storyPreview.ts → get_link_preview(). Signed-in readers skip it: for them
 * "not available" already covers every reason (S1-E4-01a).
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchHiddenStoryPreview, type HiddenStoryPreview } from '../api/storyPreview';

/**
 * Loads the preview when it is wanted.
 *
 * @param storySlug - the story's address
 * @param chapterCode - the chapter's code, or null on the story page
 * @param isWanted - true once the page's own read answered nothing
 * @returns hidden (the title and rating, or null), isSettled (true once there is an answer, or
 *   when nothing needs asking)
 */
export function useStoryPreview(storySlug: string, chapterCode: string | null, isWanted: boolean) {
  const { userId, isKnown } = useSession();
  const isAsked = isWanted && isKnown && userId === null;
  const preview = useQuery<HiddenStoryPreview | null>({
    queryKey: ['story-preview', storySlug, chapterCode],
    enabled: isAsked,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchHiddenStoryPreview(client, storySlug, chapterCode);
    },
  });
  return {
    hidden: preview.data ?? null,
    // A failed read settles too: the page then says "not available", as before.
    isSettled: !isAsked || preview.isSuccess || preview.isError,
  };
}
