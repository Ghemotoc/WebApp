/**
 * Says whether the browser has painted the chapter once yet (READER-SPEED, after CALM-5).
 *
 * Why: since CALM-5 the chapter screen draws much more under the paper (the chapter navigation,
 * the comments, About this story and two adverts). Drawn in the same pass as the text, on a slow
 * phone they held back the first paragraph past its 2-second budget (S1-E4-01b,
 * e2e/reader-performance.spec.ts). Waiting one frame lets the text paint first; nothing a reader
 * sees moves, because those parts sit below the paper.
 * Who calls it: ChapterReading (src/features/reading/components/ChapterReading.tsx).
 */
import { useEffect, useState } from 'react';

/**
 * Turns true on the frame after the component's first paint.
 *
 * @returns false for the first paint, true from the next frame on
 */
export function useAfterFirstPaint(): boolean {
  const [hasPainted, setHasPainted] = useState(false);
  useEffect(() => {
    // Step 1: the first frame callback runs just before the browser paints the text.
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      // Step 2: the second runs after that paint, so the rest is drawn in the next pass.
      secondFrame = requestAnimationFrame(() => setHasPainted(true));
    });
    // Step 3: leaving the chapter before then cancels both, so nothing updates a gone screen.
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, []);
  return hasPainted;
}
