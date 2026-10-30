/**
 * What the share dialog and the quote card need to know about a chapter (stories S1-E4-05 and
 * S1-E4-07). The reader screen fills it from get_chapter()'s answer; it never holds a user ID.
 * Who uses it: every component in src/features/sharing/components/.
 */
import type { ChapterAddress } from '../api/sharing';

/** One chapter, as sharing shows it. */
export interface SharedChapter {
  address: ChapterAddress;
  storyTitle: string;
  chapterTitle: string;
  chapterNumber: number;
  /** The writer's pen name, or their handle when they have none. */
  writerName: string;
}
