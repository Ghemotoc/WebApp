/**
 * useReadingProgress: how far through the chapter text the reader has scrolled, 0 to 100 (story
 * S1-E4-01a; board 3.5's gold progress line under the chapter bar).
 *
 * How: it compares the text's top and bottom with the bottom of the window. 0 before the text
 * reaches the bottom of the window, 100 once its last line has. Updated once per animation frame
 * while scrolling or resizing.
 * Who calls it: ChapterReaderPage, which hands the number to ChapterBar.
 */
import { useEffect, useState, type RefObject } from 'react';

/**
 * The percentage read for a text box.
 *
 * @param top - the text's top, from the window's top
 * @param height - the text's height
 * @param windowHeight - the window's height
 * @returns 0 to 100
 */
export function progressThrough(top: number, height: number, windowHeight: number): number {
  if (height <= 0) return 0;
  const readPixels = windowHeight - top;
  const percent = Math.round((readPixels / height) * 100);
  return Math.min(100, Math.max(0, percent));
}

/**
 * Follows the scroll.
 *
 * @param textRef - the element that holds the chapter text
 * @param isReady - true once the text is on screen
 * @returns the percentage read
 */
export function useReadingProgress(textRef: RefObject<HTMLElement | null>, isReady: boolean) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!isReady) return;
    let frame = 0;
    // Measure in the next frame, so a burst of scroll events costs one measurement.
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = textRef.current?.getBoundingClientRect();
        if (box !== undefined) setPercent(progressThrough(box.top, box.height, window.innerHeight));
      });
    };
    measure();
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [textRef, isReady]);

  return percent;
}
