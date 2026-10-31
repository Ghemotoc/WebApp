/**
 * ParagraphCommentsContext: what the paragraph markers inside the chapter text read (story
 * S1-E6-06).
 *
 * The markers sit inside ChapterText, which knows nothing about stories or comments; the reader
 * puts the chapter's address, the counts and which thread is open here around the text. Only
 * one thread is open at a time (board 3.5). Kept in its own small file: the reader imports it,
 * and the thread itself is fetched later.
 * Who uses it: ChapterReaderPage (provides it), ParagraphCommentMarker and EarlierVersionComments
 * (read it).
 */
import { createContext } from 'react';

import type { ChapterAddress } from '../api/likes';
import type { ParagraphCounts, ParagraphPlace } from '../api/paragraphComments';

/** What the markers read. */
export interface ParagraphComments {
  address: ChapterAddress;
  counts: ParagraphCounts;
  /** The thread that is open, or null. */
  openPlace: ParagraphPlace | null;
  /** Opens a thread (closing any other), or closes it with null. */
  setOpenPlace: (place: ParagraphPlace | null) => void;
}

/** The markers' facts, or null outside the reader (the writer's preview has no markers). */
export const ParagraphCommentsContext = createContext<ParagraphComments | null>(null);
