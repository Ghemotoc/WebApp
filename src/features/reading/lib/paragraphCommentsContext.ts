/**
 * ParagraphCommentsContext: what the paragraph markers inside the chapter text read (story
 * S1-E6-06).
 *
 * The markers sit inside ChapterText, which knows nothing about stories or comments; the reader
 * puts the chapter's address, the counts and which thread is open here around the text. Only
 * one thread is open at a time, and never while Reading settings are open (CALM-5;
 * hooks/useReaderTools.ts). From 1280 px the open thread sits at the top of the side column beside
 * the paper (ReaderSideColumn), so the context also carries that column's slot; below that it
 * opens in the bottom sheet. Kept in its own small file: the reader imports it, and the thread
 * itself is fetched later.
 * Who uses it: ChapterReading (provides it, from useReaderTools), ParagraphCommentMarker,
 * EarlierVersionComments and LazyParagraphThread (read it).
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
   * The side column's slot, where the thread opens from 1280 px, or null while it isn't drawn
   * (narrower windows open the thread in the bottom sheet).
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
