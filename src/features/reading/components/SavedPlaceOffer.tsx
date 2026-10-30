/**
 * SavedPlaceOffer: "You stopped 45% of the way through this chapter. Go back there" at the top of
 * the chapter (story S1-E4-03, first criterion: the place is offered on any device).
 *
 * It offers, never jumps on its own: a reader who opened the chapter to start again, or on
 * purpose from the top, stays where they are. The button scrolls the text so the saved line
 * sits at the bottom of the window, which is how the place was measured (useReadingProgress),
 * then the offer goes away. No doodles: this is the chapter reader (DoD design rules).
 * Who uses it: ChapterReaderPage, with the place from useSavedPlace.
 */
import { useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';

import { scrollTopForPlace } from '../lib/savedPlace';

/**
 * Renders the offer, or nothing once used.
 *
 * @param props.percent - the saved place
 * @param props.textRef - the chapter text's box
 * @returns the offer
 */
export function SavedPlaceOffer({
  percent,
  textRef,
}: {
  percent: number;
  textRef: RefObject<HTMLElement | null>;
}) {
  const { t } = useTranslation('reading');
  const [isUsed, setIsUsed] = useState(false);
  if (isUsed) return null;
  const goBack = () => {
    const box = textRef.current?.getBoundingClientRect();
    if (box !== undefined) {
      const top = scrollTopForPlace(
        box.top + window.scrollY,
        box.height,
        window.innerHeight,
        percent,
      );
      window.scrollTo({ top, behavior: 'smooth' });
    }
    setIsUsed(true);
  };
  return (
    <div
      role="status"
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-tint px-4 py-3"
    >
      <p className="m-0 text-sm text-body">{t('reader.savedPlace', { percent })}</p>
      <Button variant="secondary" onClick={goBack}>
        {t('reader.goToSavedPlace')}
      </Button>
    </div>
  );
}
