/**
 * Turns the reader's chapter into what sharing needs (stories S1-E4-05 and S1-E4-07).
 *
 * Only public things go across: the address, the titles, the number and the pen name; never the
 * chapter's or the writer's IDs (CLAUDE.md rule 15).
 * Who calls it: ChapterEnd (the Share button) and ChapterReaderPage (the Share quote bar).
 */
import type { SharedChapter } from '@/features/sharing/lib/sharedChapter';

import type { ReaderChapter } from '../api/chapter';

/**
 * Builds the shared chapter.
 *
 * @param chapter - the chapter from get_chapter()
 * @returns the chapter as sharing shows it
 */
export function toSharedChapter(chapter: ReaderChapter): SharedChapter {
  return {
    address: { storySlug: chapter.story.slug, chapterCode: chapter.code },
    storyTitle: chapter.story.title,
    chapterTitle: chapter.title,
    chapterNumber: chapter.number,
    writerName: chapter.story.writer.displayName,
  };
}
