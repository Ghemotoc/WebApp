/**
 * useQuoteSelection: follows what the reader selects in the chapter text (story S1-E4-07).
 *
 * The browser fires selectionchange many times while a reader drags; this reads the selection
 * once per frame and keeps the last answer, so "Share quote" appears as soon as a passage is
 * selected and goes when the selection does.
 * Who calls it: QuoteShareBar. What it calls: lib/quoteSelection.ts.
 */
import { useEffect, useState } from 'react';

import { readQuoteSelection, type QuoteSelection } from '../lib/quoteSelection';

/**
 * Follows the selection while `isWatching` is true.
 *
 * @param isWatching - false when quote cards aren't allowed, so nothing is listened to
 * @returns the selected passage, or null
 */
export function useQuoteSelection(isWatching: boolean): QuoteSelection | null {
  const [selection, setSelection] = useState<QuoteSelection | null>(null);
  useEffect(() => {
    if (!isWatching) return;
    let frame = 0;
    /** Reads the selection on the next frame, once however many events arrived. */
    function scheduleRead() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() =>
        setSelection(readQuoteSelection(window.getSelection())),
      );
    }
    // The selection may already be there (it is what fetched the bar), so read it now too.
    scheduleRead();
    document.addEventListener('selectionchange', scheduleRead);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('selectionchange', scheduleRead);
    };
  }, [isWatching]);
  return isWatching ? selection : null;
}
