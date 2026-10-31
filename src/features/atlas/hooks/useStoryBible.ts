/**
 * useStoryBible: one story's bible and every way to change it (stories S1-E17-17 and S1-E17-18).
 *
 * Who calls it: BiblePage and its parts. What it calls: api/bible.ts. After each change it
 * refreshes the bible, so the contents, the section list and the open entry all redraw.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  addBibleSection,
  createBibleEntry,
  deleteBibleEntry,
  deleteBibleSection,
  fetchStoryBible,
  moveBibleSection,
  renameBibleSection,
  saveBibleEntryChange,
  storyBibleQueryKey,
  type BibleEntryChange,
  type StoryBible,
} from '../api/bible';

/**
 * Follows one story's bible.
 *
 * @param slug - the story's address
 * @returns bible (null when it isn't the writer's live story, undefined while loading),
 *   loadFailed and the changers: addSection, renameSection, moveSection, removeSection,
 *   createEntry, saveEntry and removeEntry (each throws when it can't)
 */
export function useStoryBible(slug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = storyBibleQueryKey(userId, slug);
  const bible = useQuery<StoryBible | null>({
    queryKey,
    enabled: userId !== null && slug !== '',
    queryFn: async () => fetchStoryBible(await requireClient(), slug),
  });

  /** Runs one change, then reads the bible again. */
  async function changeThenRefresh<Result>(change: () => Promise<Result>): Promise<Result> {
    const result = await change();
    await queryClient.invalidateQueries({ queryKey });
    return result;
  }

  return {
    bible: bible.data,
    loadFailed: bible.isError,
    addSection: async (name: string) =>
      changeThenRefresh(async () => addBibleSection(await requireClient(), slug, name)),
    renameSection: async (sectionId: string, name: string) =>
      changeThenRefresh(async () => renameBibleSection(await requireClient(), sectionId, name)),
    moveSection: async (sectionId: string, newPosition: number) =>
      changeThenRefresh(async () =>
        moveBibleSection(await requireClient(), sectionId, newPosition),
      ),
    removeSection: async (sectionId: string) =>
      changeThenRefresh(async () => deleteBibleSection(await requireClient(), sectionId)),
    createEntry: async (sectionId: string, title: string) =>
      changeThenRefresh(async () => createBibleEntry(await requireClient(), sectionId, title)),
    saveEntry: async (entryId: string, change: BibleEntryChange) =>
      changeThenRefresh(async () => saveBibleEntryChange(await requireClient(), entryId, change)),
    removeEntry: async (entryId: string) =>
      changeThenRefresh(async () => deleteBibleEntry(await requireClient(), entryId)),
  };
}
