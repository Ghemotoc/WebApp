/**
 * QuoteCardCanvas: the quote card itself, drawn on a canvas (story S1-E4-07; board 3.6).
 *
 * It draws the card at its full 1080 px and shows it scaled down to the dialog. Screen readers
 * get the alt text the reader can edit (a role="img" wrapper with that name), so the picture is described
 * the same way inside the app as in the post (S1-E4-07, fifth criterion).
 * It waits for the page's fonts before drawing, so the title isn't drawn in a fallback font.
 * Who uses it: QuoteCardDialog, which reads the canvas through canvasRef to copy or save it.
 * What it calls: lib/quoteCard.ts.
 */
import { useEffect, type RefObject } from 'react';

import { cardSize, drawQuoteCard, type QuoteCardContent } from '../lib/quoteCard';

/** What the canvas needs. */
export interface QuoteCardCanvasProps {
  content: QuoteCardContent;
  altText: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

/**
 * Renders the canvas and draws the card whenever its content changes.
 *
 * @returns the canvas
 */
export function QuoteCardCanvas({ content, altText, canvasRef }: QuoteCardCanvasProps) {
  useEffect(() => {
    let isCurrent = true;
    // Step 1: wait for the fonts (Bricolage Grotesque and Inter) so the card uses them.
    void document.fonts.ready.then(() => {
      // Step 2: draw, unless the content changed again meanwhile.
      const context = canvasRef.current?.getContext('2d') ?? null;
      if (!isCurrent || context === null) return;
      drawQuoteCard(context, content);
    });
    return () => {
      isCurrent = false;
    };
  }, [content, canvasRef]);
  // The canvas is hidden from screen readers; the wrapper is the picture, named by the alt text.
  return (
    <div role="img" aria-label={altText} className="mx-auto w-full max-w-[386px]">
      <canvas
        ref={canvasRef}
        width={cardSize}
        height={cardSize}
        aria-hidden="true"
        className="block aspect-square w-full rounded-[20px] shadow-card"
      />
    </div>
  );
}
