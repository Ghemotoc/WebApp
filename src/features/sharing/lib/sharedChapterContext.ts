/**
 * SharedChapterContext: the chapter being read, for the Share buttons drawn inside the chapter
 * text (story S1-E4-11).
 *
 * The picture Share button sits inside ChapterText, which knows nothing about stories; the
 * reader puts the chapter here around the text so the button can build its link and card.
 * Kept in its own small file: the reader imports it, and the button itself is fetched later.
 * Who uses it: ChapterReaderPage (provides it) and PictureShareButton (reads it).
 */
import { createContext } from 'react';

import type { SharedChapter } from './sharedChapter';

/** The chapter, or null outside the reader (the writer's preview has no Share buttons). */
export const SharedChapterContext = createContext<SharedChapter | null>(null);
