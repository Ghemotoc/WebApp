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
 * READER-SELECT (boards B12 to B14): a stanza's panel can open at chosen words (the reader's new
 * selection, or an underlined part's words), and pointing at a part tints it in the text and in
 * the panel at once, so the context also carries those.
 * Who uses it: ChapterReading (provides it, from useReaderTools), ParagraphCommentMarker,
 * EarlierVersionComments, LazyParagraphThread, PartHighlights and SelectionComment (read it).
 */
import { createContext } from 'react';

import type { CommentQuote } from '@/features/comments/api/comments';

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
  /** True for a poem (MUST-2): the panel says stanza and lines, not paragraph and sentences. */
  isPoem: boolean;
  /** The story's language, for splitting a paragraph into sentences (Choose sentences). */
  language: string;
  /**
   * The words the open panel is on (READER-SELECT): the reader's new selection, or an underlined
   * part's words; null for the whole stanza. The panel's field then posts on these words.
   */
  panelQuote: CommentQuote | null;
  /**
   * Opens a stanza's panel at some words (closing any other panel); null words for the whole
   * stanza. "Whole stanza instead" calls it with the same block and null.
   */
  openPanel: (block: number, quote: CommentQuote | null) => void;
  /** The key of the part the pointer is on, in the text or in the panel (lib/commentParts.ts). */
  hoverKey: string | null;
  setHoverKey: (key: string | null) => void;
}

/** The markers' facts, or null outside the reader (the writer's preview has no markers). */
export const ParagraphCommentsContext = createContext<ParagraphComments | null>(null);
