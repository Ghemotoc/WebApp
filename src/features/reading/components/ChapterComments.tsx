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
 * What it calls: useIsNear (src/lib/use-is-near.ts), then
 * src/features/comments/components/CommentsSection.tsx.
 */
import { lazy, Suspense, useRef } from 'react';

import { useIsNear } from '@/lib/use-is-near';

import type { ChapterAddress } from '../api/likes';

/** The comments area, in its own file. */
const CommentsSection = lazy(async () => {
  const module = await import('@/features/comments/components/CommentsSection');
  return { default: module.CommentsSection };
});

/** How near the reader must be before the comments are fetched. */
const fetchMargin = '800px';

/**
 * Renders the marker, then the comments once the reader is near and their file has arrived.
 *
 * @returns the comments area
 */
export function ChapterComments({ address }: { address: ChapterAddress }) {
  const marker = useRef<HTMLDivElement>(null);
  const isNear = useIsNear(marker, fetchMargin);
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
