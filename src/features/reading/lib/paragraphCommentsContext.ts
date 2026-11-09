/**
 * ParagraphCommentsContext: what the paragraph markers inside the chapter text read (story
 * S1-E6-06).
 *
 * The markers sit inside ChapterText, which knows nothing about stories or comments; the reader
 * puts the chapter's address, the counts and which thread is open here around the text. Only
 * one thread is open at a time (board 3.5). From 1280 px the open thread sits in the side column
 * beside the paper (bundle G7d2; board ReaderComments), so the context also carries that column's
 * element. Kept in its own small file: the reader imports it,
 * and the thread itself is fetched later.
 * Who uses it: ChapterReaderPage (provides it), ParagraphCommentMarker, EarlierVersionComments,
 * LazyParagraphThread and ParagraphCommentsPanel (read it).
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
  /**
   * The side column's element, where the thread opens from 1280 px, or null while it isn't drawn
   * (narrower windows put the thread under its paragraph).
   */
  sidePanel: HTMLElement | null;
  /**
   * True when the reader opened the thread themselves, so a thread in the side column takes focus
   * (it sits away from its button). False for a thread a link opened: the link's own step gives
   * focus to the paragraph's button instead (useLinkedParagraphThread).
   */
  isOpenedByReader: boolean;
}

/** The markers' facts, or null outside the reader (the writer's preview has no markers). */
export const ParagraphCommentsContext = createContext<ParagraphComments | null>(null);
