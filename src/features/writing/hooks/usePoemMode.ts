/**
 * usePoemMode: a chapter's Poem mode switch in the editor (bundle MUST-2; IDEA-20261106-1).
 *
 * The switch changes at once on screen (the editor's Enter and paste follow it straight away) and
 * is saved in the background. If the save fails, the switch goes back and says so, so the writer
 * is never left believing the reader will see a poem when it won't.
 * Who calls it: ChapterEditorPage (useLoadedEditor). What it calls: setChapterPoemMode() →
 * set_chapter_poem_mode().
 */
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { setChapterPoemMode, type MyChapter } from '../api/chapters';

/**
 * Starts the switch from the chapter as loaded.
 *
 * @param chapter - the chapter being edited
 * @returns isPoem, change(next), isSaving and hasFailed
 */
export function usePoemMode(chapter: MyChapter) {
  const [isPoem, setIsPoem] = useState(chapter.isPoem);
  const saving = useMutation({
    mutationFn: async (next: boolean) => {
      const outcome = await setChapterPoemMode(await requireClient(), chapter.code, next);
      if (outcome !== 'ok') throw new Error('The chapter could not be found.');
    },
  });

  /** A change: shown at once, saved after; put back if the save fails. */
  function change(next: boolean) {
    setIsPoem(next);
    saving.mutate(next, { onError: () => setIsPoem(!next) });
  }

  return { isPoem, change, isSaving: saving.isPending, hasFailed: saving.isError };
}
