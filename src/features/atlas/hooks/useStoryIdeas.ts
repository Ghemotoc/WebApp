/**
 * useStoryIdeas: a story's questions and ideas and every way to change them (stories S1-E17-27
 * and S1-E17-28).
 *
 * Who calls it: IdeasPage and IdeaItem. What it calls: api/ideas.ts; after each change it reads
 * the notes again. remove hands back the deleted note so putBack can bring it back for Undo
 * (story 6.12).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  addStoryIdea,
  deleteStoryIdea,
  fetchStoryIdeas,
  restoreStoryIdea,
  saveStoryIdeaChange,
  storyIdeasQueryKey,
  type IdeaKind,
  type RemovedStoryIdea,
  type StoryIdeaChange,
  type StoryIdeas,
} from '../api/ideas';

/**
 * Follows a story's notes.
 *
 * @param slug - the story's address
 * @returns ideas (null when it isn't the writer's, undefined while loading), loadFailed and the
 *   changers: add, save, remove (which returns the removed note) and putBack (each throws when it
 *   can't)
 */
export function useStoryIdeas(slug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const queryKey = storyIdeasQueryKey(userId, slug);
  const ideas = useQuery<StoryIdeas | null>({
    queryKey,
    enabled: userId !== null && slug !== '',
    queryFn: async () => fetchStoryIdeas(await requireClient(), slug),
  });

  /** Runs one change, then reads the notes again; hands back what the change returned. */
  async function changeThenRefresh<Result>(change: () => Promise<Result>): Promise<Result> {
    const result = await change();
    await queryClient.invalidateQueries({ queryKey });
    return result;
  }

  return {
    ideas: ideas.data,
    loadFailed: ideas.isError,
    add: async (kind: IdeaKind, body: string) =>
      changeThenRefresh(async () => addStoryIdea(await requireClient(), slug, kind, body)),
    save: async (ideaId: string, change: StoryIdeaChange) =>
      changeThenRefresh(async () => saveStoryIdeaChange(await requireClient(), ideaId, change)),
    remove: async (ideaId: string) =>
      changeThenRefresh(async () => deleteStoryIdea(await requireClient(), ideaId)),
    putBack: async (removed: RemovedStoryIdea) =>
      changeThenRefresh(async () => restoreStoryIdea(await requireClient(), slug, removed)),
  };
}
