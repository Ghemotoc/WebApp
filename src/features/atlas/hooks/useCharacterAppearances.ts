/**
 * useCharacterAppearances: the chapters a character is the point of view of or present in
 * (story S1-E17-12, "Appears in").
 *
 * Who calls it: CharacterAppearancesSection. What it calls: api/chapterPlans.ts →
 * character_appearances().
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  characterAppearancesQueryKey,
  fetchCharacterAppearances,
  type CharacterAppearance,
} from '../api/chapterPlans';

/**
 * Follows where one character appears.
 *
 * @param characterId - the character's ID
 * @returns appearances (null when the character isn't the writer's, undefined while loading)
 *   and loadFailed
 */
export function useCharacterAppearances(characterId: string) {
  const { userId } = useSession();
  const appearances = useQuery<CharacterAppearance[] | null>({
    queryKey: characterAppearancesQueryKey(userId, characterId),
    enabled: userId !== null && characterId !== '',
    queryFn: async () => fetchCharacterAppearances(await requireClient(), characterId),
  });
  return { appearances: appearances.data, loadFailed: appearances.isError };
}
