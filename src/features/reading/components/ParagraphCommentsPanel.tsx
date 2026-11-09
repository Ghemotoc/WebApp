/**
 * ParagraphCommentsPanel: the side column beside the paper where a paragraph's comments open,
 * from 1280 px (bundle G7d2; board ReaderComments).
 *
 * It is a labelled region that stays in view as the reader scrolls (sticky), so the paragraph and
 * its comments sit side by side and the text never moves when a thread opens. With no thread
 * open it holds a short glass hint saying how to open one; the open thread itself is drawn into
 * this element by LazyParagraphThread (a portal), so the thread keeps its own code split.
 * Below 1280 px the column isn't shown and threads open under their paragraph (S1-E6-06).
 * No doodles (DoD: none on the reader).
 * Who uses it: ChapterReaderPage, only for a reader who has paragraph markers (signed in,
 * comments on). What it reads: ParagraphCommentsContext (whether a thread is open).
 */
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';

import { ParagraphCommentsContext } from '../lib/paragraphCommentsContext';

/** What the panel needs. */
export interface ParagraphCommentsPanelProps {
  /** Hands the column's element up, so the open thread can be drawn into it. */
  onElement: (element: HTMLElement | null) => void;
}

/**
 * Renders the column.
 *
 * @returns the sticky side region, hidden below 1280 px
 */
export function ParagraphCommentsPanel({ onElement }: ParagraphCommentsPanelProps) {
  const { t } = useTranslation('reading');
  const comments = useContext(ParagraphCommentsContext);
  const isThreadOpen = comments !== null && comments.openPlace !== null;
  return (
    <aside
      ref={onElement}
      aria-label={t('reader.paragraphComments.panelLabel')}
      data-testid="paragraph-comments-panel"
      className="sticky top-28 mt-7 hidden max-h-[calc(100dvh-8rem)] flex-col gap-4 overflow-y-auto xl:flex"
    >
      {/* The hint, only while no thread is open; an open thread is drawn after it. */}
      {!isThreadOpen && (
        <p className="m-0 glass-pill rounded-[24px] px-5 py-[18px] text-[15px] leading-normal text-body">
          {t('reader.paragraphComments.panelHint')}
        </p>
      )}
    </aside>
  );
}
