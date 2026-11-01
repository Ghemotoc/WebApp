/**
 * useLinkedParagraphThread: opens the paragraph thread a link asked for, such as a notification's
 * "#paragraph-4" (bundle IDEAS-1, part e; idea IDEA-20261031-2).
 *
 * The address is read once, when the reader opens. Once the comment markers are drawn, the
 * marker of that paragraph (or "comments on an earlier version") is brought to the middle of the
 * screen and takes focus, so a screen reader hears that its thread is open and Escape or Close
 * hands focus straight back to it. Nothing happens for any other address.
 * Who calls it: ChapterReaderPage's useParagraphComments. What it calls: src/lib/paragraph-link.ts.
 */
import { useEffect, useRef, useState } from 'react';

import { paragraphPlaceFromHash, type ParagraphLinkPlace } from '@/lib/paragraph-link';

/** How many animation frames to wait for the marker before giving up (about two seconds). */
const mostFramesToWait = 120;

/**
 * Finds the button that opens a thread: its aria-controls names the open thread.
 *
 * @param place - the paragraph's number, or 'earlier'
 * @returns the button, or null while it isn't drawn
 */
function openerOf(place: ParagraphLinkPlace): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[aria-controls="paragraph-thread-${String(place)}"]`);
}

/**
 * Reads the link and, once the markers are ready, takes the reader to the thread.
 *
 * @param isReady - true once the paragraph counts have arrived and the markers can be drawn
 * @returns the thread to start open, or null when the address didn't ask for one
 */
export function useLinkedParagraphThread(isReady: boolean): ParagraphLinkPlace | null {
  // Step 1: the thread the address asked for, read once.
  const [linkedPlace] = useState(() => paragraphPlaceFromHash(window.location.hash));
  const hasArrived = useRef(false);
  // Step 2: once the markers are drawn, scroll to the opener and give it focus, one time only.
  useEffect(() => {
    if (!isReady || linkedPlace === null || hasArrived.current) return;
    let framesLeft = mostFramesToWait;
    let frame = 0;
    function goToOpener() {
      if (linkedPlace === null) return;
      const opener = openerOf(linkedPlace);
      if (opener !== null) {
        hasArrived.current = true;
        opener.scrollIntoView({ block: 'center' });
        opener.focus({ preventScroll: true });
        return;
      }
      // The chapter text may still be drawing; try again on the next frame, for a while.
      framesLeft -= 1;
      if (framesLeft > 0) frame = requestAnimationFrame(goToOpener);
    }
    frame = requestAnimationFrame(goToOpener);
    return () => cancelAnimationFrame(frame);
  }, [isReady, linkedPlace]);
  return linkedPlace;
}
