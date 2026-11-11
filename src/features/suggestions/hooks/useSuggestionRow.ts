/**
 * useSuggestionRow: one suggestion row's stories (story S1-E15-06, bundle ANALYTICS-1c).
 *
 * Who calls it: components/StorySuggestions.tsx (the story page and the end of the latest
 * chapter) and components/BecauseYouReadShelf.tsx (Discover).
 * What it calls: api/suggestions.ts. The pairs change once a night and scores once an hour, so
 * one read per visit is enough. A failed read shows no row: suggestions are extra, and the page
 * works without them.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import {
  emptySuggestionRow,
  fetchSuggestionRow,
  type SuggestionKind,
  type SuggestionRow,
} from '../api/suggestions';

/** The first part of every row's cache key, so turning the switch refreshes them all. */
export const suggestionsQueryKey = 'suggestions';

/**
 * Loads one row.
 *
 * @param kind - which row
 * @param storySlug - the story beside it ('' for "Because you read")
 * @param isWanted - false to skip the read (a signed-out visitor on Discover)
 * @returns the row, or null while it loads
 */
export function useSuggestionRow(
  kind: SuggestionKind,
  storySlug: string,
  isWanted = true,
): SuggestionRow | null {
  const { userId, isKnown } = useSession();
  const needsStory = kind !== 'because_you_read';
  const query = useQuery<SuggestionRow>({
    queryKey: [suggestionsQueryKey, kind, storySlug, userId],
    enabled: isKnown && isWanted && (!needsStory || storySlug !== ''),
    staleTime: 10 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) return emptySuggestionRow;
      try {
        return await fetchSuggestionRow(client, kind, storySlug);
      } catch (error) {
        // Say so in the console only: the page doesn't need the row to work.
        console.warn('A suggestion row was not shown.', error);
        return emptySuggestionRow;
      }
    },
  });
  return query.data ?? null;
}
