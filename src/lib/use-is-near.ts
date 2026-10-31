/**
 * useIsNear: true once an element comes within a margin of the screen (S1-E6-01, moved here in
 * S1-E4-05 so the Share button can use it too).
 *
 * Why: parts of the chapter reader that sit at the end of the chapter (the comments, the Share
 * button) are their own files, fetched only when the reader nears them, so the reader stays
 * inside its 40 KB script budget (e2e/reader-performance.spec.ts, S1-E4-01b). A browser without
 * IntersectionObserver gets them at once.
 * Who calls it: ChapterComments and ShareButtonWhenNear.
 */
import { useEffect, useState, type RefObject } from 'react';

/**
 * Watches an element until it nears the screen; the answer stays true after that.
 *
 * @param marker - the element that holds the place
 * @param margin - how near, as a CSS margin ("800px")
 * @returns whether the element has come near
 */
export function useIsNear(marker: RefObject<HTMLElement | null>, margin: string): boolean {
  const [isNear, setIsNear] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const element = marker.current;
    if (isNear || element === null) return undefined;
    // Step 1: watch the marker; the first time it nears the screen, say so and stop watching.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setIsNear(true);
      },
      { rootMargin: margin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [isNear, marker, margin]);
  return isNear;
}
