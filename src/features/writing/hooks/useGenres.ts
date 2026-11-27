/**
 * useGenres: the genres a writer may pick, for the Genres field of the new story wizard and
 * story settings (story S1-E3-01).
 *
 * Who calls it: components/GenrePickerField.tsx. What it calls: api/genres.ts (the genres
 * table). The list depends on who is signed in (an 18+ genre only for adults, rule 18), so it is
 * cached per person.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchGenres, type Genre } from '../api/genres';

/** The list changes only by migration, so an hour is fresh enough. */
const genresFreshMilliseconds = 60 * 60 * 1000;

/**
 * Loads the genres the signed-in person may pick.
 *
 * @returns genres (empty while loading), isLoaded and loadFailed
 */
export function useGenres() {
  const { userId } = useSession();
  const genres = useQuery<Genre[]>({
    queryKey: ['story-genres', userId],
    staleTime: genresFreshMilliseconds,
    queryFn: async () => fetchGenres(await requireClient()),
  });
  return {
    genres: genres.data ?? [],
    isLoaded: genres.isSuccess,
    loadFailed: genres.isError,
  };
}
