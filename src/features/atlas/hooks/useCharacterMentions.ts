/**
 * useCharacterMentions: "Mentioned in" for one character (story S1-E17-12).
 *
 * Who calls it: CharacterMentionsList. What it calls: api/links.ts → character_mentions().
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { characterMentionsQueryKey, fetchCharacterMentions } from '../api/links';

/**
 * Follows where a character is mentioned.
 *
 * @param characterId - the character's ID
 * @returns mentions (undefined while loading) and loadFailed
 */
export function useCharacterMentions(characterId: string) {
  const { userId } = useSession();
  const mentions = useQuery({
    queryKey: characterMentionsQueryKey(userId, characterId),
    enabled: userId !== null && characterId !== '',
    queryFn: async () => fetchCharacterMentions(await requireClient(), characterId),
  });
  return { mentions: mentions.data, loadFailed: mentions.isError };
}
