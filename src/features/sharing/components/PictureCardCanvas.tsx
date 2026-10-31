/**
 * PictureCardCanvas: the picture card, drawn on a canvas (story S1-E4-11; board 3.6).
 *
 * It draws the card at its full 1080 px and shows it scaled down to the dialog, redrawing once
 * the picture has loaded and the page's fonts are ready. Screen readers get the card's alt text
 * through a role="img" wrapper, as on the quote card.
 * Who uses it: PictureCardDialog, which reads the canvas through canvasRef to copy or save it.
 * What it calls: lib/pictureCard.ts.
 */
import { useEffect, type RefObject } from 'react';

import { drawPictureCard, type PictureCardContent } from '../lib/pictureCard';
import { cardSize } from '../lib/quoteCard';

/** What the canvas needs. */
export interface PictureCardCanvasProps {
  content: PictureCardContent;
  picture: ImageBitmap | null;
  altText: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

/**
 * Renders the canvas and draws the card whenever its content or picture changes.
 *
 * @returns the canvas
 */
export function PictureCardCanvas({
  content,
  picture,
  altText,
  canvasRef,
}: PictureCardCanvasProps) {
  useEffect(() => {
    let isCurrent = true;
    // Wait for the fonts so the title is drawn in Bricolage Grotesque, then draw.
    void document.fonts.ready.then(() => {
      const context = canvasRef.current?.getContext('2d') ?? null;
      if (!isCurrent || context === null) return;
      drawPictureCard(context, content, picture);
    });
    return () => {
      isCurrent = false;
    };
  }, [content, picture, canvasRef]);
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
