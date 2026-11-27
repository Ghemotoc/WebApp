/**
 * useChapterLayout: a chapter's Layout in the editor, Prose, Play or Poem (LAYOUTS-1; boards
 * D14-EditorPlay and D15-EditorPoem; it replaces MUST-2's Poem switch).
 *
 * The choice changes at once on screen (the editor's Enter and paste follow it straight away) and
 * is saved in the background. If the save fails, it goes back and says so, so the writer is never
 * left believing readers will see a layout they won't.
 * Who calls it: ChapterEditorPage (useLoadedEditor). What it calls: setChapterLayout() →
 * set_chapter_layout(), then refreshes the chapter list (useChapterProgress).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { chapterProgressQueryKey } from '@/features/atlas/api/chapterPlans';
import { useSession } from '@/features/auth/hooks/useSession';

import { setChapterLayout, type ChapterLayout, type MyChapter } from '../api/chapters';

/** What the Layout choice needs (LayoutChoice). */
export interface ChapterLayoutState {
  layout: ChapterLayout;
  change: (next: ChapterLayout) => void;
  isSaving: boolean;
  hasFailed: boolean;
}

/**
 * Starts the choice from the chapter as loaded.
 *
 * @param chapter - the chapter being edited
 * @returns the layout, change(next), isSaving and hasFailed
 */
export function useChapterLayout(chapter: MyChapter): ChapterLayoutState {
  const [layout, setLayout] = useState(chapter.layout);
  const queryClient = useQueryClient();
  const { userId } = useSession();
  const saving = useMutation({
    mutationFn: async (next: ChapterLayout) => {
      const outcome = await setChapterLayout(await requireClient(), chapter.code, next);
      if (outcome !== 'ok') throw new Error('The chapter could not be found.');
    },
    // The chapter list beside the editor shows each chapter's layout, so it reads again once saved.
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: chapterProgressQueryKey(userId, chapter.story.slug),
      }),
  });

  /** A change: shown at once, saved after; put back if the save fails. */
  function change(next: ChapterLayout) {
    // A second change while the first saves would only race it, and the same choice does nothing.
    if (saving.isPending || next === layout) return;
    const before = layout;
    setLayout(next);
    saving.mutate(next, { onError: () => setLayout(before) });
  }

  return { layout, change, isSaving: saving.isPending, hasFailed: saving.isError };
}
