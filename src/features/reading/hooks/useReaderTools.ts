/**
 * useReaderTools: which of the reader's two panels is open, Reading settings or a paragraph's
 * comments (story S1-E6-06 for the comments, S1-E4-02 for the settings; bundle CALM-5, design
 * handover Step 4, point 8).
 *
 * Both are closed when a chapter opens. Reading settings open from Aa in the chapter bar and a
 * paragraph's comments from its count; opening one closes the other, so the side column (from
 * 1280 px) or the bottom sheet (below that) holds one panel at a time. A link such as a
 * notification's "#paragraph-4" is the one way a thread starts open (IDEAS-1e).
 * Who calls it: ChapterReading in ChapterReaderPage.
 * What it calls: useParagraphCommentCounts → paragraph_comment_counts() and
 * useLinkedParagraphThread.
 */
import { useCallback, useMemo, useState } from 'react';

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
}

/**
 * Works out the panels' state for one chapter.
 *
 * @param chapter - the chapter being read
 * @param hasText - false while there is no text (no counts are read then)
 * @param sidePanel - the side column's slot for a thread, or null below 1280 px
 * @returns the markers' facts and the settings' state
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
  // Step 2: which thread is open, starting with the one a link asked for (IDEAS-1e).
  const linkedPlace = useLinkedParagraphThread(counts !== null);
  const [openPlace, setOpenPlaceNow] = useState<ParagraphPlace | null>(linkedPlace);
  // Whether the reader opened the thread themselves (not a link), so a thread in the side column
  // takes focus: it sits away from its button (WCAG 2.4.3).
  const [isOpenedByReader, setIsOpenedByReader] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Step 3: opening a thread closes Reading settings, and the other way round (handover point 8).
  const setOpenPlace = useCallback((place: ParagraphPlace | null) => {
    setIsOpenedByReader(true);
    setOpenPlaceNow(place);
    if (place !== null) setIsSettingsOpen(false);
  }, []);
  const toggleSettings = useCallback(() => {
    setIsSettingsOpen((isOpen) => !isOpen);
    setOpenPlaceNow(null);
  }, []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  // Step 4: the context the markers read, or null when there are no markers.
  const paragraphComments = useMemo(
    () =>
      counts === null
        ? null
        : { address, counts, openPlace, setOpenPlace, sidePanel, isOpenedByReader },
    [address, counts, openPlace, setOpenPlace, sidePanel, isOpenedByReader],
  );
  return { paragraphComments, isSettingsOpen, toggleSettings, closeSettings };
}
