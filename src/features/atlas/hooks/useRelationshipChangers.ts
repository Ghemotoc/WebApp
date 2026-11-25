/**
 * useRelationshipChangers: add and delete relationships between a story's characters (story
 * S1-E17-14), then refresh the cast so every sheet, the map and the family tree redraw. The map
 * places its cards itself since board E25 (story 6.6), so cards are no longer moved or arranged.
 *
 * Kept apart from useStoryCast so each hook stays short. Who calls it: CharacterRelationshipsSection
 * and ConnectionsPage. What it calls: addRelationship(), deleteRelationship() and
 * restoreRelationship() in api/characters.ts.
 */
import { useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  addRelationship,
  deleteRelationship,
  restoreRelationship,
  storyCastQueryKey,
  type NewRelationship,
} from '../api/characters';

/**
 * The two relationship changers for one story.
 *
 * @param slug - the story's address
 * @returns relate (records one) and unrelate (deletes one and returns its Undo); each throws
 *   when it can't
 */
export function useRelationshipChangers(slug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();

  /** Refreshes the cast, which carries the relationships. */
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: storyCastQueryKey(userId, slug) });
  }

  /** Records a relationship between two characters. */
  async function relate(relationship: NewRelationship) {
    await addRelationship(await requireClient(), relationship);
    await refresh();
  }

  /**
   * Deletes a relationship at once and returns how to put it back, for the Undo note
   * (design books item 14).
   */
  async function unrelate(relationshipId: string): Promise<() => Promise<void>> {
    const removed = await deleteRelationship(await requireClient(), relationshipId);
    await refresh();
    return async () => {
      await restoreRelationship(await requireClient(), removed);
      await refresh();
    };
  }

  return { relate, unrelate };
}
