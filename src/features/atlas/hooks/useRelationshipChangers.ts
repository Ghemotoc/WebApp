/**
 * useRelationshipChangers: add and delete relationships between a story's characters (story
 * S1-E17-14), move cards on the relationship map and put them back ("Arrange for me", G10b2),
 * then refresh the cast so every sheet, the map and the family tree redraw.
 *
 * Kept apart from useStoryCast so each hook stays short. Who calls it: CharacterRelationshipsSection
 * and ConnectionsPage. What it calls: addRelationship(), deleteRelationship(), moveOnMap() and
 * arrangeMap() in api/characters.ts.
 */
import { useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  addRelationship,
  arrangeMap,
  deleteRelationship,
  moveOnMap,
  storyCastQueryKey,
  type MapPlace,
  type NewRelationship,
} from '../api/characters';

/**
 * The two relationship changers for one story.
 *
 * @param slug - the story's address
 * @returns relate (records one), unrelate (deletes one), move (saves a card's place on the map)
 *   and arrange (forgets every place); each throws when it can't
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

  /** Saves where a card was dropped on the map. */
  async function move(characterId: string, place: MapPlace) {
    await moveOnMap(await requireClient(), characterId, place);
    await refresh();
  }

  /** "Arrange for me": every card goes back to where the map places it. */
  async function arrange() {
    await arrangeMap(await requireClient(), slug);
    await refresh();
  }

  return { relate, unrelate, move, arrange };
}
