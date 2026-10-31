/**
 * useChapterPlan: one chapter's planning and every way to change it (stories S1-E17-24 and
 * S1-E17-25).
 *
 * Who calls it: ChapterPlanPanel and ChapterWordsLine (beside the chapter editor). What it calls:
 * api/chapterPlans.ts. After each change it reads the plan again, and the chapter list too, so
 * a new word target shows in both at once (S1-E17-26).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  addChapterScene,
  chapterPlanQueryKey,
  chapterProgressQueryKey,
  deleteChapterScene,
  fetchChapterPlan,
  moveChapterScene,
  saveChapterPlanChange,
  saveChapterSceneChange,
  setCharacterPresent,
  type ChapterPlan,
  type ChapterPlanChange,
  type ChapterSceneChange,
} from '../api/chapterPlans';

/**
 * Follows one chapter's planning.
 *
 * @param slug - the story's address (to refresh its chapter list after a change)
 * @param chapterCode - the chapter's code
 * @returns plan (null when it isn't the writer's live chapter, undefined while loading),
 *   loadFailed and the changers: saveFields, setPresent, addScene, saveScene, moveScene and
 *   removeScene (each throws when it can't)
 */
export function useChapterPlan(slug: string, chapterCode: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = chapterPlanQueryKey(userId, chapterCode);
  const plan = useQuery<ChapterPlan | null>({
    queryKey,
    enabled: userId !== null && chapterCode !== '',
    queryFn: async () => fetchChapterPlan(await requireClient(), chapterCode),
  });

  /** Runs one change, then reads the plan and the chapter list again. */
  async function changeThenRefresh(change: () => Promise<void>): Promise<void> {
    await change();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: chapterProgressQueryKey(userId, slug) }),
    ]);
  }

  return {
    plan: plan.data,
    loadFailed: plan.isError,
    saveFields: async (change: ChapterPlanChange) =>
      changeThenRefresh(async () =>
        saveChapterPlanChange(await requireClient(), chapterCode, change),
      ),
    setPresent: async (characterId: string, isPresent: boolean) =>
      changeThenRefresh(async () =>
        setCharacterPresent(await requireClient(), chapterCode, characterId, isPresent),
      ),
    addScene: async (title: string) =>
      changeThenRefresh(async () => addChapterScene(await requireClient(), chapterCode, title)),
    saveScene: async (sceneId: string, change: ChapterSceneChange) =>
      changeThenRefresh(async () => saveChapterSceneChange(await requireClient(), sceneId, change)),
    moveScene: async (sceneId: string, newPosition: number) =>
      changeThenRefresh(async () => moveChapterScene(await requireClient(), sceneId, newPosition)),
    removeScene: async (sceneId: string) =>
      changeThenRefresh(async () => deleteChapterScene(await requireClient(), sceneId)),
  };
}
