/**
 * SharedPassageNotice: the line above a chapter opened from a link to a passage or a picture
 * (story S1-E4-11, second criterion: "the chapter opens at that paragraph with the passage
 * highlighted").
 *
 * Once the text is on screen it scrolls the first highlighted part into view and moves focus to
 * it (ChapterText marks it data-shared-start, with tabIndex -1), so keyboard and screen reader
 * users land on the passage too. The notice says the passage is highlighted, or that it isn't
 * in the chapter any more (the writer may have changed it), with "Read from the start".
 * Who uses it: ChapterReaderPage, when the address ends in a spot (p3 or p3-5).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { Notice } from '@/components/ui/Notice';
import { wantsLessMotion } from '@/lib/motion';

/**
 * Finds the highlighted passage once and brings it into view.
 *
 * @returns null while looking, then true when found and false when not
 */
function useBringPassageIntoView(): boolean | null {
  const [isFound, setIsFound] = useState<boolean | null>(null);
  useEffect(() => {
    // The text is drawn in the same render, so the next frame sees it.
    const frame = window.requestAnimationFrame(() => {
      const passage = document.querySelector<HTMLElement>('[data-shared-start]');
      setIsFound(passage !== null);
      if (passage === null) return;
      // The device's setting or the member's "Less motion" switch: jump instead of gliding.
      passage.scrollIntoView({ block: 'center', behavior: wantsLessMotion() ? 'auto' : 'smooth' });
      passage.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return isFound;
}

/**
 * Renders the notice.
 *
 * @param props.chapterPath - the chapter's own address, for "Read from the start"
 * @returns the notice, once the passage was looked for
 */
export function SharedPassageNotice({ chapterPath }: { chapterPath: string }) {
  const { t } = useTranslation('reading');
  const isFound = useBringPassageIntoView();
  if (isFound === null) return null;
  return (
    <div className="mb-6">
      <Notice tone="info">
        {isFound ? t('reader.sharedPassage.found') : t('reader.sharedPassage.notFound')}{' '}
        <Link to={chapterPath} className="text-link underline">
          {t('reader.sharedPassage.fromStart')}
        </Link>
      </Notice>
    </div>
  );
}
