/**
 * useStoryListGenres: the genres the See all filter offers, only those on stories this reader
 * may see (story S1-E3-01; Robert's rule for the language filter, applied to genres).
 *
 * Who calls it: components/GenreFilterSelect.tsx. What it calls:
 * src/features/writing/api/genres.ts → story_list_genres(). The answer depends on the reader
 * (their age, blocks and country), so it is cached per person.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { fetchStoryListGenres, type ListedGenre } from '@/features/writing/api/genres';
import { getSupabaseClient } from '@/lib/supabase';

/** New stories add genres slowly, so five minutes is fresh enough. */
const genresFreshMilliseconds = 5 * 60 * 1000;

/**
 * Loads the genres in use.
 *
 * @param isWanted - false while the filter panel is closed, so the list is read only when needed
 * @returns genres (empty while loading or when the read failed)
 */
export function useStoryListGenres(isWanted: boolean): ListedGenre[] {
  const { userId, isKnown } = useSession();
  const genres = useQuery<ListedGenre[]>({
    queryKey: ['story-list-genres', userId],
    enabled: isWanted && isKnown,
    staleTime: genresFreshMilliseconds,
    queryFn: async () => {
      // Step 1: the client, or a plain error when the app has no database (shown as no genres).
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      // Step 2: the genres in use on stories this reader may see.
      return fetchStoryListGenres(client);
    },
  });
  return genres.data ?? [];
}
