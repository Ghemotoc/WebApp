/**
 * useManageChapters: the chapter list of one story and the changes Manage chapters makes
 * (story S1-E3-04; board 4.4).
 *
 * Who calls it: ManageChaptersPage. What it calls: api/manageChapters.ts.
 * A new order (a drag or an arrow) shows at once (an optimistic update); every change then
 * reads the list again from the database, so a refused move puts the old order back. A refusal or failure becomes one plain message for the page.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import {
  changeChapters,
  fetchStoryChapters,
  type ManagedChapter,
  type ManageOutcome,
} from '../api/manageChapters';

import { myStoriesKey } from './useMyStories';

/** One change from the page. */
export type ChapterChange =
  | { kind: 'move'; code: string; direction: -1 | 1 }
  // movedCode names the dragged chapter, so the page can ask before a published one moves and
  // the record of moves can say which chapter the writer picked up (GAPS-11).
  | { kind: 'order'; codes: string[]; movedCode?: string }
  | { kind: 'rename'; code: string; title: string }
  | { kind: 'delete'; code: string }
  | { kind: 'restore'; code: string }
  | { kind: 'publish'; code: string }
  | { kind: 'unpublish'; code: string };

/** The message key under the list for a change that didn't go through. */
export type ManageProblem = 'notActive' | 'empty' | 'outOfDate' | 'failed';

/** The query key for one story's chapters. */
export const storyChaptersKey = (userId: string | null, slug: string) => [
  'story-chapters',
  userId,
  slug,
];

/** The function and arguments for a change. */
function callFor(slug: string, change: ChapterChange) {
  switch (change.kind) {
    case 'move':
      return {
        name: 'move_chapter',
        args: { chapter_code: change.code, direction: change.direction },
      } as const;
    case 'order':
      return {
        name: 'set_chapter_order',
        args: {
          story_slug: slug,
          chapter_codes: change.codes,
          moved_chapter_code: change.movedCode ?? null,
        },
      } as const;
    case 'rename':
      return {
        name: 'rename_chapter',
        args: { chapter_code: change.code, title: change.title },
      } as const;
    case 'delete':
      return { name: 'delete_chapter', args: { chapter_code: change.code } } as const;
    case 'restore':
      return { name: 'restore_chapter', args: { chapter_code: change.code } } as const;
    case 'publish':
      return { name: 'publish_chapter', args: { chapter_code: change.code } } as const;
    case 'unpublish':
      return { name: 'unpublish_chapter', args: { chapter_code: change.code } } as const;
  }
}

/** The plain message for an outcome that isn't "ok". */
function problemFor(outcome: ManageOutcome): ManageProblem | null {
  if (outcome === 'ok' || outcome === 'at_edge') return null;
  if (outcome === 'not_active') return 'notActive';
  if (outcome === 'empty') return 'empty';
  if (outcome === 'wrong_list' || outcome === 'wrong_state' || outcome === 'not_found')
    return 'outOfDate';
  return 'failed';
}

/** The list with the order the writer just dragged to, before the database answers. */
function reordered(chapters: ManagedChapter[], codes: string[]): ManagedChapter[] {
  const byCode = new Map(chapters.map((chapter) => [chapter.code, chapter]));
  const live = codes.flatMap((code, index) => {
    const chapter = byCode.get(code);
    return chapter === undefined ? [] : [{ ...chapter, position: index + 1 }];
  });
  return [...live, ...chapters.filter((chapter) => chapter.deletedAt !== null)];
}

/**
 * The order to show at once for a drag or an arrow; null for changes that wait for the database.
 *
 * @param chapters - the list as it is now
 * @param change - the change being sent
 * @returns the live chapters' codes in their new order, or null
 */
function optimisticOrder(chapters: ManagedChapter[], change: ChapterChange): string[] | null {
  if (change.kind === 'order') return change.codes;
  if (change.kind !== 'move') return null;
  const codes = chapters
    .filter((chapter) => chapter.deletedAt === null)
    .sort((a, b) => a.position - b.position)
    .map((chapter) => chapter.code);
  const from = codes.indexOf(change.code);
  const to = from + change.direction;
  if (from === -1 || to < 0 || to >= codes.length) return null;
  // Swap the chapter with its neighbour.
  const neighbour = codes[to] ?? '';
  codes[to] = change.code;
  codes[from] = neighbour;
  return codes;
}

/**
 * Loads the list and runs the changes.
 *
 * @param slug - the story's address
 * @returns live and deleted chapters, isKnown, loadFailed, problem, isBusy and change(change)
 */
export function useManageChapters(slug: string) {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  const key = storyChaptersKey(userId, slug);
  const [problem, setProblem] = useState<ManageProblem | null>(null);
  const list = useQuery<ManagedChapter[]>({
    queryKey: key,
    enabled: userId !== null,
    queryFn: async () => fetchStoryChapters(await requireClient(), slug),
  });

  const mutation = useMutation({
    mutationFn: async (change: ChapterChange) => {
      const call = callFor(slug, change);
      return changeChapters(await requireClient(), call.name, call.args);
    },
    onMutate: (change) => {
      // Dragging and the arrows show the new order straight away.
      const codes = optimisticOrder(queryClient.getQueryData<ManagedChapter[]>(key) ?? [], change);
      if (codes === null) return;
      queryClient.setQueryData<ManagedChapter[]>(key, (current) => reordered(current ?? [], codes));
    },
    onSuccess: (outcome) => setProblem(problemFor(outcome)),
    onError: () => setProblem('failed'),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      await queryClient.invalidateQueries({ queryKey: myStoriesKey(userId) });
    },
  });

  const chapters = list.data ?? [];
  return {
    live: chapters
      .filter((chapter) => chapter.deletedAt === null)
      .sort((a, b) => a.position - b.position),
    deleted: chapters.filter((chapter) => chapter.deletedAt !== null),
    isKnown: userId === null || !list.isPending,
    loadFailed: list.isError,
    problem,
    isBusy: mutation.isPending,
    change: (change: ChapterChange) => mutation.mutate(change),
  };
}
