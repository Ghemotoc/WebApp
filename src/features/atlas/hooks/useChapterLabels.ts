/**
 * useChapterLabels: each chapter's label in the plan: "Chapter 3", or its type for a prologue,
 * interlude or epilogue (story S1-E17-19: "Prologue, Chapter 3, Epilogue…"). Only chapters of
 * the type "chapter" are counted (lib/boardColumns.ts, chapterNumbers).
 *
 * Who calls it: ChapterBoard and StorylinePage (for the timeline and the lanes). What it calls:
 * chapterNumbers and the atlas text.
 */
import type { StorylineChapter } from '../api/storyline';
import { chapterNumbers } from '../lib/boardColumns';
import { useAtlasTranslation } from '../registerAtlasTranslations';

/**
 * Makes the labeller for a story's chapters.
 *
 * @param chapters - the chapters in book order
 * @returns a function from a chapter's code to its label
 */
export function useChapterLabels(chapters: StorylineChapter[]): (code: string) => string {
  const { t } = useAtlasTranslation();
  const numbers = chapterNumbers(chapters);
  return (code: string) => {
    const number = numbers.get(code);
    if (number !== undefined) return t('storyline.board.chapterNumber', { number });
    const kind = chapters.find((chapter) => chapter.code === code)?.kind ?? 'chapter';
    return t(`chapterPlan.kinds.${kind}`);
  };
}
