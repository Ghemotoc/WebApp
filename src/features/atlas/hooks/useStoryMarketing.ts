/**
 * useStoryMarketing: a story's marketing notes and their save (story S1-E17-29).
 *
 * Who calls it: MarketingPage. What it calls: api/marketing.ts; after a save it reads the notes
 * again, so the back-cover preview shows the new text.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  fetchStoryMarketing,
  saveMarketingField,
  storyMarketingQueryKey,
  type MarketingNotes,
} from '../api/marketing';

/**
 * Follows a story's marketing notes.
 *
 * @param slug - the story's address
 * @returns notes (null when it isn't the writer's, undefined while loading), loadFailed and save
 *   (one field; throws when it can't)
 */
export function useStoryMarketing(slug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = storyMarketingQueryKey(userId, slug);
  const notes = useQuery<MarketingNotes | null>({
    queryKey,
    enabled: userId !== null && slug !== '',
    queryFn: async () => fetchStoryMarketing(await requireClient(), slug),
  });

  return {
    notes: notes.data,
    loadFailed: notes.isError,
    save: async (field: keyof MarketingNotes, value: string) => {
      await saveMarketingField(await requireClient(), slug, field, value);
      await queryClient.invalidateQueries({ queryKey });
    },
  };
}
