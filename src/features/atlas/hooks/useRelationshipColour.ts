/**
 * useRelationshipColour: saves the colour a writer picks for one relationship category (CALM-9,
 * board E25: "Save the choice per story").
 *
 * The map, the chips and the list change colour at once (the cached cast is updated before the
 * save), then the cast is read again so it matches what the database kept. If the save fails, the
 * cast is read again too, which puts the old colour back, and the error goes to the caller.
 * Who calls it: ConnectionsPage (for CategoryColoursFold). What it calls: setRelationshipColour()
 * in api/characters.ts.
 */
import { useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { setRelationshipColour, storyCastQueryKey, type StoryCast } from '../api/characters';
import type { RelationshipCategory, RelationshipSwatch } from '../lib/relationshipCategories';

/**
 * The colour saver for one story.
 *
 * @param slug - the story's address
 * @returns pickColour(category, swatch), which throws when the save fails
 */
export function useRelationshipColour(slug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = storyCastQueryKey(userId, slug);

  /** Saves one category's colour, showing it straight away. */
  async function pickColour(category: RelationshipCategory, swatch: RelationshipSwatch) {
    // Step 1: show the new colour now, so the picker and the map answer the click at once.
    queryClient.setQueryData<StoryCast | null>(queryKey, (cast) =>
      cast
        ? { ...cast, relationshipColours: { ...cast.relationshipColours, [category]: swatch } }
        : cast,
    );
    try {
      // Step 2: save it on the story.
      await setRelationshipColour(await requireClient(), slug, category, swatch);
    } finally {
      // Step 3: read the cast again, which also undoes the colour when the save failed.
      await queryClient.invalidateQueries({ queryKey });
    }
  }

  return { pickColour };
}
