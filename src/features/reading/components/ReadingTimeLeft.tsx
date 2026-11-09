/**
 * ReadingTimeLeft: "3 min left", a small glass pill floating at the bottom of the window while
 * there is still chapter text to scroll (bundle G7d; rulebook: "The reading time floats at the
 * bottom while there is still text to scroll").
 *
 * It counts down as the reader scrolls and goes away once the last line is on screen. It is a
 * plain line, not a live region, so a screen reader is not interrupted at every scroll; the
 * chapter's header already says the whole reading time. It takes no clicks, so it never covers
 * a link or a button it floats over. It is drawn at the end of <body> (a portal), because the
 * page's entrance animation leaves a transform on the page box, and a fixed element inside a
 * transformed box would float at the bottom of that box instead of the window.
 * Who uses it: ChapterReaderPage. What it calls: lib/readingTimeLeft.ts.
 */
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { minutesLeft } from '../lib/readingTimeLeft';

/** What the pill needs. */
export interface ReadingTimeLeftProps {
  /** The whole chapter's reading time in minutes. */
  minutesToRead: number;
  /** How far through the text the reader is, 0 to 100. */
  progress: number;
}

/**
 * Renders the pill, or nothing once the chapter is read.
 *
 * @returns the floating pill or null
 */
export function ReadingTimeLeft({ minutesToRead, progress }: ReadingTimeLeftProps) {
  const { t } = useTranslation('reading');
  const minutes = minutesLeft(minutesToRead, progress);
  if (minutes === null) return null;
  return createPortal(
    <p
      data-testid="reading-time-left"
      className="glass-float pointer-events-none fixed bottom-[calc(18px+env(safe-area-inset-bottom))] left-1/2 z-20 m-0 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap text-heading"
    >
      {t('reader.minutesLeft', { count: minutes })}
    </p>,
    document.body,
  );
}
