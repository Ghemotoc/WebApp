/**
 * useRelationshipChangers: add and delete relationships between a story's characters (story
 * S1-E17-14), then refresh the cast so every sheet, the map and the family tree redraw.
 *
 * Kept apart from useStoryCast so each hook stays short. Who calls it: CharacterRelationshipsSection
 * and ConnectionsPage. What it calls: addRelationship() and deleteRelationship() in
 * api/characters.ts.
 */
import { useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  addRelationship,
  deleteRelationship,
  storyCastQueryKey,
  type NewRelationship,
} from '../api/characters';

/**
 * The two relationship changers for one story.
 *
 * @param slug - the story's address
 * @returns relate (records one; throws when it can't) and unrelate (deletes one; throws too)
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

  /** Deletes a relationship (after the screen's second click). */
  async function unrelate(relationshipId: string) {
    await deleteRelationship(await requireClient(), relationshipId);
    await refresh();
  }

  return { relate, unrelate };
}
