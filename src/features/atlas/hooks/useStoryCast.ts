/**
 * useStoryCast: one story's characters and the writer's own fields, and every way to change them
 * (stories S1-E17-08 to S1-E17-11 and S1-E17-13).
 *
 * Who calls it: CharactersPage, the sheet's parts and CharacterFieldsSection. What it calls:
 * api/characters.ts and, for a picture, uploadAtlasPicture() in the pictures feature. After each
 * change it refreshes the cast, and the plan too where the at-a-glance page counts the cast
 * (S1-E17-06).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { uploadAtlasPicture } from '@/features/pictures/api/pictureUploads';

import {
  addCharacterField,
  createCharacter,
  deleteCharacter,
  fetchStoryCast,
  removeCharacterPicture,
  saveCharacterChange,
  setCharacterPicture,
  storyCastQueryKey,
  updateCharacterField,
  type CharacterChange,
  type StoryCast,
} from '../api/characters';
import { storyPlanQueryKey } from '../api/storyPlans';

/**
 * Follows one story's cast.
 *
 * @param slug - the story's address
 * @returns cast (null when it isn't the writer's live story, undefined while loading), loadFailed
 *   and the changers: create, save, remove, addField, changeField, uploadPicture, removePicture
 */
export function useStoryCast(slug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = storyCastQueryKey(userId, slug);
  const cast = useQuery<StoryCast | null>({
    queryKey,
    enabled: userId !== null && slug !== '',
    queryFn: async () => fetchStoryCast(await requireClient(), slug),
  });

  /** Refreshes the cast and the at-a-glance page's cast count. */
  async function refresh() {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey: storyPlanQueryKey(userId, slug) });
  }

  /** "New character": returns the new character's ID so its sheet opens. */
  async function create(name: string): Promise<string> {
    const characterId = await createCharacter(await requireClient(), slug, name);
    await refresh();
    return characterId;
  }

  /** Saves one change to one character. */
  async function save(characterId: string, change: CharacterChange) {
    await saveCharacterChange(await requireClient(), characterId, change);
    await refresh();
  }

  /** Deletes a character and its picture (after the screen's second click). */
  async function remove(characterId: string) {
    await deleteCharacter(await requireClient(), characterId);
    await refresh();
  }

  /** Adds one of the writer's own fields to every sheet. */
  async function addField(name: string) {
    await addCharacterField(await requireClient(), slug, name);
    await refresh();
  }

  /** Renames, removes or brings back one of the writer's own fields. */
  async function changeField(fieldId: string, change: { name: string } | { is_hidden: boolean }) {
    await updateCharacterField(await requireClient(), fieldId, change);
    await refresh();
  }

  /** Uploads a picture, puts it on the sheet and returns its check status. */
  async function uploadPicture(characterId: string, file: File): Promise<string> {
    const client = await requireClient();
    const storyId = cast.data?.storyId ?? '';
    const uploaded = await uploadAtlasPicture(client, { storyId, file });
    await setCharacterPicture(client, characterId, uploaded.pictureId);
    await refresh();
    return uploaded.status;
  }

  /** Takes the picture off the sheet and deletes its file. */
  async function removePicture(characterId: string) {
    await removeCharacterPicture(await requireClient(), characterId);
    await refresh();
  }

  return {
    cast: cast.data,
    loadFailed: cast.isError,
    create,
    save,
    remove,
    addField,
    changeField,
    uploadPicture,
    removePicture,
  };
}
