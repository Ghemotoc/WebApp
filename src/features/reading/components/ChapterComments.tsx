/**
 * ChapterComments: the comments under a chapter, fetched when the reader nears them (story
 * S1-E6-01).
 *
 * Why lazy: the comments area, its texts and the report button are their own files, fetched only
 * when the reader scrolls within about a screen of the end of the chapter (or at once, for a
 * short chapter). So the reader shows the chapter first and stays inside its script budget
 * (40 KB on top of the home page, e2e/reader-performance.spec.ts, S1-E4-01b). An empty marker
 * holds the place until then; a browser without IntersectionObserver gets the comments at once.
 * Who uses it: ChapterReaderPage, under the copy notice and the banner slot (board 3.5).
 * What it calls: src/features/comments/components/CommentsSection.tsx.
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import type { ChapterAddress } from '../api/likes';

/** The comments area, in its own file. */
const CommentsSection = lazy(async () => {
  const module = await import('@/features/comments/components/CommentsSection');
  return { default: module.CommentsSection };
});

/** How near the reader must be before the comments are fetched. */
const fetchMargin = '800px';

/**
 * True once the marker comes within fetchMargin of the screen; it stays true.
 *
 * @param marker - the element that holds the comments' place
 * @returns whether the comments should be fetched
 */
function useIsNear(marker: React.RefObject<HTMLDivElement | null>): boolean {
  const [isNear, setIsNear] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const element = marker.current;
    if (isNear || element === null) return undefined;
    // Step 1: watch the marker; the first time it nears the screen, fetch and stop watching.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setIsNear(true);
      },
      { rootMargin: fetchMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [isNear, marker]);
  return isNear;
}

/**
 * Renders the marker, then the comments once the reader is near and their file has arrived.
 *
 * @returns the comments area
 */
export function ChapterComments({ address }: { address: ChapterAddress }) {
  const marker = useRef<HTMLDivElement>(null);
  const isNear = useIsNear(marker);
  return (
    <div ref={marker}>
      {isNear && (
        <Suspense fallback={null}>
          <CommentsSection address={address} />
        </Suspense>
      )}
    </div>
  );
}
