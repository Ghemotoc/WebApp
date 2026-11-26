/**
 * useReaderTools: which of the reader's panels is open: Contents, Reading settings or a
 * paragraph's comments (story S1-E6-06 for the comments, S1-E4-02 for the settings, user story
 * 2.2 for Contents; bundle CALM-5, design handover Step 4, point 8; board B02).
 *
 * All are closed when a chapter opens. Contents and Reading settings open from the chapter bar
 * and a paragraph's comments from its count; opening one closes the others, so the side column
 * (from 1280 px) or the bottom sheet (below that) holds one panel at a time. A link such as a
 * notification's "#paragraph-4" is the one way a thread starts open (IDEAS-1e).
 * READER-SELECT (boards B12 to B14): a stanza's panel can also open at chosen words, from the
 * Comment button on a selection or from underlined words; pointing at a part is shared too.
 * Who calls it: ChapterReading in ChapterReaderPage.
 * What it calls: useParagraphCommentCounts → paragraph_comment_counts() and
 * useLinkedParagraphThread.
 */
import { useCallback, useMemo, useState } from 'react';

import type { CommentQuote } from '@/features/comments/api/comments';

import type { ReaderChapter } from '../api/chapter';
import type { ParagraphPlace } from '../api/paragraphComments';
import type { ParagraphComments } from '../lib/paragraphCommentsContext';

import { useLinkedParagraphThread } from './useLinkedParagraphThread';
import { useParagraphCommentCounts } from './useParagraphCommentCounts';

/** What the reader page gets back. */
export interface ReaderTools {
  /** The paragraph markers' facts, or null when there are none (signed out, comments off). */
  paragraphComments: ParagraphComments | null;
  /** True while Reading settings are open. */
  isSettingsOpen: boolean;
  /** Opens Reading settings (closing any open thread), or closes them when open. */
  toggleSettings: () => void;
  /** Closes Reading settings. */
  closeSettings: () => void;
  /** True while Contents (the chapter list) is open. */
  isContentsOpen: boolean;
  /** Opens Contents (closing the other panels), or closes it when open. */
  toggleContents: () => void;
  /** Closes Contents. */
  closeContents: () => void;
}

/**
 * Which panel is open: a stanza's (and at which words), Reading settings or Contents. Opening
 * one closes the others (handover point 8; board B02).
 *
 * @param linkedPlace - the thread a link asked to open (IDEAS-1e), or null
 * @returns the panels' state and the ways to change it
 */
function usePanelState(linkedPlace: ParagraphPlace | null) {
  const [openPlace, setOpenPlaceNow] = useState<ParagraphPlace | null>(linkedPlace);
  // READER-SELECT: the words the open panel is on (null: the whole stanza), and the part pointed at.
  const [panelQuote, setPanelQuote] = useState<CommentQuote | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  // Whether the reader opened the thread themselves (not a link), so a thread in the side column
  // takes focus: it sits away from its button (WCAG 2.4.3).
  const [isOpenedByReader, setIsOpenedByReader] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isContentsOpen, setIsContentsOpen] = useState(false);

  // Opening one panel closes the others (handover point 8; board B02).
  const setOpenPlace = useCallback((place: ParagraphPlace | null) => {
    setIsOpenedByReader(true);
    setOpenPlaceNow(place);
    setPanelQuote(null);
    if (place === null) return;
    setIsSettingsOpen(false);
    setIsContentsOpen(false);
  }, []);
  // READER-SELECT: a stanza's panel at some words (or the whole stanza with null).
  const openPanel = useCallback((block: number, quote: CommentQuote | null) => {
    setIsOpenedByReader(true);
    setOpenPlaceNow(block);
    setPanelQuote(quote);
    setIsSettingsOpen(false);
    setIsContentsOpen(false);
  }, []);
  const toggleSettings = useCallback(() => {
    setIsSettingsOpen((isOpen) => !isOpen);
    setIsContentsOpen(false);
    setOpenPlaceNow(null);
  }, []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const toggleContents = useCallback(() => {
    setIsContentsOpen((isOpen) => !isOpen);
    setIsSettingsOpen(false);
    setOpenPlaceNow(null);
  }, []);
  const closeContents = useCallback(() => setIsContentsOpen(false), []);

  return {
    openPlace,
    setOpenPlace,
    panelQuote,
    openPanel,
    hoverKey,
    setHoverKey,
    isOpenedByReader,
    isSettingsOpen,
    toggleSettings,
    closeSettings,
    isContentsOpen,
    toggleContents,
    closeContents,
  };
}

/**
 * Works out the panels' state for one chapter.
 *
 * @param chapter - the chapter being read
 * @param hasText - false while there is no text (no counts are read then)
 * @param sidePanel - the side column's slot for a thread, or null below 1280 px
 * @returns the markers' facts and the panels' state
 */
export function useReaderTools(
  chapter: ReaderChapter,
  hasText: boolean,
  sidePanel: HTMLElement | null,
): ReaderTools {
  // Step 1: the chapter's address and the paragraphs' comment counts.
  const address = useMemo(
    () => ({ storySlug: chapter.story.slug, chapterCode: chapter.code }),
    [chapter.story.slug, chapter.code],
  );
  const counts = useParagraphCommentCounts(address, hasText);
  // Step 2: which panel is open, starting with the thread a link asked for (IDEAS-1e).
  const linkedPlace = useLinkedParagraphThread(counts !== null);
  const panels = usePanelState(linkedPlace);
  const { openPlace, setOpenPlace, panelQuote, openPanel, hoverKey, setHoverKey } = panels;
  const { isOpenedByReader } = panels;

  // Step 3: the context the markers read, or null when there are no markers.
  const isPoem = chapter.isPoem;
  const language = chapter.story.languageCode;
  const paragraphComments = useMemo(() => {
    if (counts === null) return null;
    return {
      address,
      counts,
      openPlace,
      setOpenPlace,
      sidePanel,
      isOpenedByReader,
      isPoem,
      language,
      panelQuote,
      openPanel,
      hoverKey,
      setHoverKey,
    };
  }, [
    address,
    counts,
    openPlace,
    setOpenPlace,
    sidePanel,
    isOpenedByReader,
    isPoem,
    language,
    panelQuote,
    openPanel,
    hoverKey,
  ]);
  return {
    paragraphComments,
    isSettingsOpen: panels.isSettingsOpen,
    toggleSettings: panels.toggleSettings,
    closeSettings: panels.closeSettings,
    isContentsOpen: panels.isContentsOpen,
    toggleContents: panels.toggleContents,
    closeContents: panels.closeContents,
  };
}
