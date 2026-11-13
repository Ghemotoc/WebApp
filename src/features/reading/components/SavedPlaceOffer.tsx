/**
 * SavedPlaceOffer: "You stopped 45% of the way through this chapter. Go back there" at the top of
 * the chapter (story S1-E4-03, first criterion: the place is offered on any device).
 *
 * It offers, never jumps on its own: a reader who opened the chapter to start again, or on
 * purpose from the top, stays where they are. The button scrolls the text so the saved line
 * sits at the bottom of the window, which is how the place was measured (useReadingProgress),
 * then the offer goes away. No doodles: this is the chapter reader (DoD design rules).
 * With goesAtOnce (IDEAS-1 part a, IDEA-20261031-4: the story page's "You are here" link, an
 * address ending "#resume"), it goes back to the place as soon as the text is on screen, shows
 * nothing, and takes "#resume" off the address so reloading starts where the reader is.
 * Who uses it: ChapterReaderPage, with the place from useSavedPlace.
 */
import { useEffect, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { wantsLessMotion } from '@/lib/motion';

import { scrollTopForPlace } from '../lib/savedPlace';

/**
 * Scrolls the page so the saved place sits at the bottom of the window.
 *
 * @param text - the chapter text's box, or null before it is drawn
 * @param percent - the saved place
 */
function scrollToPlace(text: HTMLElement | null, percent: number) {
  const box = text?.getBoundingClientRect();
  if (box === undefined) return;
  const top = scrollTopForPlace(box.top + window.scrollY, box.height, window.innerHeight, percent);
  // The device's setting or the member's "Less motion" switch: jump instead of gliding.
  window.scrollTo({ top, behavior: wantsLessMotion() ? 'auto' : 'smooth' });
}

/**
 * Renders the offer, or nothing once used.
 *
 * @param props.percent - the saved place
 * @param props.textRef - the chapter text's box
 * @param props.goesAtOnce - true to go back straight away instead of offering
 * @returns the offer
 */
export function SavedPlaceOffer({
  percent,
  textRef,
  goesAtOnce = false,
}: {
  percent: number;
  textRef: RefObject<HTMLElement | null>;
  goesAtOnce?: boolean;
}) {
  const { t } = useTranslation('reading');
  const [isUsed, setIsUsed] = useState(false);
  // "You are here": go back at once, then drop "#resume" from the address.
  useEffect(() => {
    if (!goesAtOnce) return;
    scrollToPlace(textRef.current, percent);
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, [goesAtOnce, percent, textRef]);
  if (isUsed || goesAtOnce) return null;
  const goBack = () => {
    scrollToPlace(textRef.current, percent);
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
