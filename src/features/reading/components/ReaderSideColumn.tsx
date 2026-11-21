/**
 * ReaderSideColumn: the column beside the paper from 1280 px, "Reading tools" (bundle CALM-5;
 * design handover Step 3, "Reader on wide screens", points 6 and 7; board New-Reader).
 *
 * From the top: the one open panel, if any (Reading settings, or the comments on a paragraph,
 * which LazyParagraphThread draws into the slot here), then About this story, then the
 * 300 × 250 advert. With nothing open it starts with About this story (Robert, 20 Nov 2026,
 * 12:08). It stays in view as the reader scrolls (sticky, under the chapter bar), so a paragraph
 * and its comments sit side by side and the text never moves.
 * Below 1280 px it isn't drawn: the panels open in the bottom sheet, and About this story and
 * the advert follow the chapter's comments (ChapterReading).
 * Who uses it: ChapterReading, which passes in what it holds (ReaderToolPlace, AboutThisStory and
 * PageAdSlot). What it calls: nothing.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** What the column needs. */
export interface ReaderSideColumnProps {
  /** Hands the thread slot's element up, so an open thread can be drawn into it. */
  onThreadSlot: (element: HTMLElement | null) => void;
  /** Reading settings while open, otherwise nothing. */
  settings: ReactNode;
  /** About this story and the side advert. */
  children: ReactNode;
}

/**
 * Renders the column.
 *
 * @returns the sticky complementary region
 */
export function ReaderSideColumn({ onThreadSlot, settings, children }: ReaderSideColumnProps) {
  const { t } = useTranslation('reading');
  return (
    <aside
      aria-label={t('reader.tools')}
      data-testid="reader-side-column"
      className="tmc-reader-side flex flex-col gap-6"
    >
      {settings}
      {/* The open paragraph's comments are drawn here (a portal); empty while none is open. */}
      <div ref={onThreadSlot} className="empty:hidden" />
      {children}
    </aside>
  );
}
