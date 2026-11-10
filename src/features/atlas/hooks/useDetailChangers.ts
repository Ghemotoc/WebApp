/**
 * useDetailChangers: adding one of the writer's own details in a place on the character sheets,
 * and renaming one of the writer's own groups (bundle GAPS-1).
 *
 * Who calls it: AddDetailForm, AddDetailGroupForm and OwnDetailGroupSection. What it calls:
 * api/characterDetails.ts; after each change it refreshes the story's cast, which carries the
 * details and their places (useStoryCast reads the same query).
 */
import { useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  addCharacterDetail,
  renameCharacterDetailGroup,
  type NewDetailPlace,
} from '../api/characterDetails';
import { storyCastQueryKey } from '../api/characters';

/**
 * The two changers for one story.
 *
 * @param slug - the story's address
 * @returns addDetail and renameDetailGroup; each throws when the change can't be saved
 */
export function useDetailChangers(slug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();

  /** Reads the cast again, so every sheet shows the change. */
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: storyCastQueryKey(userId, slug) });
  }

  /** Adds a detail in a place on every sheet. */
  async function addDetail(detail: { name: string } & NewDetailPlace) {
    await addCharacterDetail(await requireClient(), slug, detail);
    await refresh();
  }

  /** Renames one of the writer's own groups. */
  async function renameDetailGroup(from: string, to: string) {
    await renameCharacterDetailGroup(await requireClient(), slug, { from, to });
    await refresh();
  }

  return { addDetail, renameDetailGroup };
}
