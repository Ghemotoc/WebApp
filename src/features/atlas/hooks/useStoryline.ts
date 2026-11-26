/**
 * useStoryline: a story's storyline, the timeline's changers (stories S1-E17-19 to S1-E17-22) and
 * the acts' changers (bundle GAPS-2a).
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
  addPlanAct,
  addStoryEvent,
  deletePlanAct,
  deleteStoryEvent,
  fetchStoryline,
  renamePlanAct,
  restoreStoryEvent,
  saveStoryEventChange,
  storylineQueryKey,
  type NewStoryEvent,
  type RemovedStoryEvent,
  type Storyline,
  type StoryEventChange,
} from '../api/storyline';

/**
 * Follows a story's storyline.
 *
 * @param slug - the story's address
 * @returns storyline (null when it isn't the writer's, undefined while loading), loadFailed,
 *   refresh and the changers: addChapter, addAct, renameAct, deleteAct, addEvent, saveEvent,
 *   removeEvent (which returns the removed event) and putBackEvent, its Undo (each throws when it
 *   can't)
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

  /** Runs one change, then refreshes; hands back what the change returned. */
  async function changeThenRefresh<Result>(change: () => Promise<Result>): Promise<Result> {
    const result = await change();
    await refresh();
    return result;
  }

  return {
    storyline: storyline.data,
    loadFailed: storyline.isError,
    refresh,
    addChapter: async (actId: string | null) =>
      changeThenRefresh(async () => {
        await addChapterToAct(await requireClient(), slug, actId);
      }),
    addAct: async (name: string) =>
      changeThenRefresh(async () => addPlanAct(await requireClient(), slug, name)),
    renameAct: async (actId: string, name: string) =>
      changeThenRefresh(async () =>
        renamePlanAct(await requireClient(), slug, { id: actId, name }),
      ),
    deleteAct: async (actId: string) =>
      changeThenRefresh(async () => deletePlanAct(await requireClient(), slug, actId)),
    addEvent: async (event: NewStoryEvent) =>
      changeThenRefresh(async () => addStoryEvent(await requireClient(), slug, event)),
    saveEvent: async (eventId: string, change: StoryEventChange) =>
      changeThenRefresh(async () => saveStoryEventChange(await requireClient(), eventId, change)),
    removeEvent: async (eventId: string) =>
      changeThenRefresh(async () => deleteStoryEvent(await requireClient(), eventId)),
    putBackEvent: async (removed: RemovedStoryEvent) =>
      changeThenRefresh(async () => restoreStoryEvent(await requireClient(), slug, removed)),
  };
}
