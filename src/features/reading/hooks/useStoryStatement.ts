/**
 * useStoryStatement: puts a story's statement in the footer while its page is on screen
 * (CALM-9s; boards B01 to B06).
 *
 * Who calls it: StoryPage and ChapterReaderPage.
 * What it calls: api/storyStatement.ts → get_link_preview(), then the shell's footer slot
 * (src/app/shell/footerAboutContext.ts). When the read fails, the footer keeps the site's own
 * words: the statement helps search engines, the page never depends on it.
 */
import { useQuery } from '@tanstack/react-query';

import { useShowInFooter } from '@/app/shell/footerAboutContext';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchStoryStatement, type StoryStatement } from '../api/storyStatement';

/**
 * Loads the statement and hands it to the footer until the page closes.
 *
 * @param storySlug - the story's address, or an empty text while it isn't known
 */
export function useStoryStatement(storySlug: string): void {
  const statement = useQuery<StoryStatement | null>({
    queryKey: ['story-statement', storySlug],
    enabled: storySlug !== '',
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchStoryStatement(client, storySlug);
    },
  });
  useShowInFooter(statement.data ?? null);
}
