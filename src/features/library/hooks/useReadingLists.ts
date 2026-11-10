/**
 * useReadingLists, useReadingList, useStoryListChoices and useReadingListActions: the reads and
 * changes behind reading lists (bundle GAPS-6; board Library, "Your lists").
 *
 * Who calls them: ReadingListsCard (the Library), ReadingListPage (/library/lists/:listId) and
 * AddToReadingList (the story page).
 * What they call: api/readingLists.ts → my_reading_lists(), reading_list(),
 * story_reading_lists() and the four change functions. Every change refreshes each read that
 * starts with the library's key, and the story lists, so counts, covers and the list's own page
 * agree at once.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { storyListQueryKey } from '@/features/discovery/hooks/useStoryShelf';
import { getSupabaseClient } from '@/lib/supabase';

import {
  createReadingList,
  deleteReadingList,
  fetchMyReadingLists,
  fetchReadingList,
  fetchStoryListChoices,
  setStoryInReadingList,
  updateReadingList,
  type ReadingList,
  type ReadingListChange,
  type ReadingListDetails,
  type StoryInListChange,
  type StoryListChoice,
} from '../api/readingLists';
import { libraryQueryKey } from '../libraryQueryKey';

/** The part of the cache keys every reading list read shares. */
const readingListsKey = 'reading-lists';

/**
 * Reads the reader's own lists.
 *
 * @returns lists (null while loading) and loadFailed
 */
export function useReadingLists() {
  const { userId, isKnown } = useSession();
  const lists = useQuery<ReadingList[]>({
    queryKey: [libraryQueryKey, readingListsKey, 'mine', userId],
    enabled: isKnown && userId !== null,
    queryFn: async () => fetchMyReadingLists(await requireClient()),
  });
  return { lists: lists.data ?? null, loadFailed: lists.isError };
}

/**
 * Reads one list for its page. A signed-out visitor can open a public list too.
 *
 * @param listId - the list's ID, from the address
 * @returns list (undefined while loading, null when there is none to see) and loadFailed
 */
export function useReadingList(listId: string) {
  const { userId, isKnown } = useSession();
  const list = useQuery<ReadingListDetails | null>({
    queryKey: [libraryQueryKey, readingListsKey, 'one', listId, userId],
    enabled: isKnown,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchReadingList(client, listId);
    },
  });
  return { list: list.data, loadFailed: list.isError };
}

/**
 * Reads the reader's lists with whether one story is in each.
 *
 * @param storySlug - the story's address
 * @param isEnabled - false until the control is opened, so a story page reads nothing extra
 * @returns choices (null while loading) and loadFailed
 */
export function useStoryListChoices(storySlug: string, isEnabled: boolean) {
  const { userId } = useSession();
  const choices = useQuery<StoryListChoice[]>({
    queryKey: [libraryQueryKey, readingListsKey, 'story', storySlug, userId],
    enabled: isEnabled && userId !== null,
    queryFn: async () => fetchStoryListChoices(await requireClient(), storySlug),
  });
  return { choices: choices.data ?? null, loadFailed: choices.isError };
}

/**
 * The changes a reader makes to their lists. Each throws when it can't (the caller says why with
 * readingListFailureKey()) and refreshes what the screens show when it can.
 *
 * @returns createList, changeList, deleteList and setStoryInList
 */
export function useReadingListActions() {
  const queryClient = useQueryClient();

  /** Runs one change, then reads the lists and their stories again. */
  async function changeThenRefresh<Answer>(change: () => Promise<Answer>): Promise<Answer> {
    const answer = await change();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [libraryQueryKey, readingListsKey] }),
      queryClient.invalidateQueries({ queryKey: [storyListQueryKey] }),
    ]);
    return answer;
  }

  return {
    createList: async (name: string) =>
      changeThenRefresh(async () => createReadingList(await requireClient(), name)),
    changeList: async (listId: string, change: ReadingListChange) =>
      changeThenRefresh(async () => updateReadingList(await requireClient(), listId, change)),
    deleteList: async (listId: string) =>
      changeThenRefresh(async () => deleteReadingList(await requireClient(), listId)),
    setStoryInList: async (change: StoryInListChange) =>
      changeThenRefresh(async () => setStoryInReadingList(await requireClient(), change)),
  };
}
