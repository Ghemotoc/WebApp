/**
 * useStoryline: a story's storyline and the timeline's changers (stories S1-E17-19 to S1-E17-22).
 *
 * Who calls it: StorylinePage. What it calls: api/storyline.ts. After each change it reads the
 * storyline again, and the writing view's chapter list too, so both show the same chapters.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { chapterProgressQueryKey } from '../api/chapterPlans';
import {
  addChapterToAct,
  addStoryEvent,
  deleteStoryEvent,
  fetchStoryline,
  saveStoryEventChange,
  storylineQueryKey,
  type NewStoryEvent,
  type Storyline,
  type StoryEventChange,
} from '../api/storyline';

/**
 * Follows a story's storyline.
 *
 * @param slug - the story's address
 * @returns storyline (null when it isn't the writer's, undefined while loading), loadFailed,
 *   refresh and the changers: addChapter, addEvent, saveEvent and removeEvent (each throws when
 *   it can't)
 */
export function useStoryline(slug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = storylineQueryKey(userId, slug);
  const storyline = useQuery<Storyline | null>({
    queryKey,
    enabled: userId !== null && slug !== '',
    queryFn: async () => fetchStoryline(await requireClient(), slug),
  });

  /** Reads the storyline and the chapter list again. */
  async function refresh(): Promise<void> {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: chapterProgressQueryKey(userId, slug) }),
    ]);
  }

  /** Runs one change, then refreshes. */
  async function changeThenRefresh(change: () => Promise<unknown>): Promise<void> {
    await change();
    await refresh();
  }

  return {
    storyline: storyline.data,
    loadFailed: storyline.isError,
    refresh,
    addChapter: async (actId: string | null) =>
      changeThenRefresh(async () => addChapterToAct(await requireClient(), slug, actId)),
    addEvent: async (event: NewStoryEvent) =>
      changeThenRefresh(async () => addStoryEvent(await requireClient(), slug, event)),
    saveEvent: async (eventId: string, change: StoryEventChange) =>
      changeThenRefresh(async () => saveStoryEventChange(await requireClient(), eventId, change)),
    removeEvent: async (eventId: string) =>
      changeThenRefresh(async () => deleteStoryEvent(await requireClient(), eventId)),
  };
}
