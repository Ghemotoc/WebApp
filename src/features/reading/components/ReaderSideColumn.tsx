/**
 * ReaderSideColumn: the column beside the paper from 1280 px, "Reading tools" (bundle CALM-5;
 * design handover Step 3, "Reader on wide screens", points 6 and 7; board New-Reader).
 *
 * From the top: Contents or Reading settings while open (board B02), then About this story, then the comments on a
 * paragraph while open (LazyParagraphThread draws them into the slot here), then the 300 × 250
 * advert. With nothing open it starts with About this story (Robert, 20 Nov 2026, 12:08).
 * The comment box starts level with its paragraph, About this story above it (CALM-9, board B03,
 * Robert's canvas comment of 23 Nov 2026; useThreadLevelWithParagraph works out the gap).
 * With no thread open the column stays in view as the reader scrolls (sticky, under the chapter
 * bar); with one open it scrolls with the text, so the box stays beside its paragraph.
 * Below 1280 px it isn't drawn: the panels open in the bottom sheet, and About this story and
 * the advert follow the chapter's comments (ChapterReading).
 * Who uses it: ChapterReading, which passes in what it holds (ReaderToolPlace, AboutThisStory and
 * PageAdSlot). What it calls: nothing.
 */
import { useContext, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useThreadLevelWithParagraph } from '../hooks/useThreadLevelWithParagraph';
import { ParagraphCommentsContext } from '../lib/paragraphCommentsContext';

/** What the column needs. */
export interface ReaderSideColumnProps {
  /** Hands the thread slot's element up, so an open thread can be drawn into it. */
  onThreadSlot: (element: HTMLElement | null) => void;
  /** The open bar panel (Contents or Reading settings), otherwise nothing. */
  settings: ReactNode;
  /** About this story, which sits above the comment box. */
  about: ReactNode;
  /** The side advert, below everything else. */
  children: ReactNode;
}

/**
 * Renders the column.
 *
 * @returns the sticky complementary region
 */
export function ReaderSideColumn(props: ReaderSideColumnProps) {
  const { onThreadSlot, settings, about, children } = props;
  const { t } = useTranslation('reading');
  const comments = useContext(ParagraphCommentsContext);
  // The slot is kept here as well as handed up, so its gap to the paragraph can be worked out.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useThreadLevelWithParagraph(slot, comments?.openPlace ?? null);

  /** Hands the slot to ChapterReading (for the portal) and keeps it for the measuring. */
  function keepSlot(element: HTMLElement | null) {
    setSlot(element);
    onThreadSlot(element);
  }

  return (
    <aside
      aria-label={t('reader.tools')}
      data-testid="reader-side-column"
      className="tmc-reader-side flex flex-col gap-6"
    >
      {settings}
      {about}
      {/* The open paragraph's comments are drawn here (a portal); empty while none is open. */}
      <div ref={keepSlot} data-thread-slot className="empty:hidden" />
      {children}
    </aside>
  );
}
