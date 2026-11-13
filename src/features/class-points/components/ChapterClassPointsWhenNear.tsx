/**
 * ChapterClassPointsWhenNear: loads the class points section only for a signed-in reader who has
 * come near the end of the chapter (bundle CLASS-POINTS, part 1; story S1-E8-13).
 *
 * Why: most chapters aren't shared with a class, so the section's code and its question to the
 * database wait until the reader is nearly through the text. It also fits the rule that points
 * follow reading: the database notes that a classmate opened the chapter when this asks.
 * Who shows it: ChapterEnd in the chapter reader. What it shows: ChapterClassPoints.
 */
import { lazy, Suspense, useRef } from 'react';

import { useSession } from '@/features/auth/hooks/useSession';
import { useIsNear } from '@/lib/use-is-near';

/** The section, in its own file. */
const ChapterClassPoints = lazy(async () => {
  const module = await import('./ChapterClassPoints');
  return { default: module.ChapterClassPoints };
});

/** How near the reader must be before the section is fetched. */
const fetchMargin = '600px';

/**
 * Renders the marker, then the section once the reader is near.
 *
 * @param props.chapterId - the chapter's row ID
 * @returns the marker and, later, the section; only the empty marker for a signed-out visitor
 */
export function ChapterClassPointsWhenNear({ chapterId }: { chapterId: string }) {
  const marker = useRef<HTMLDivElement>(null);
  const isNear = useIsNear(marker, fetchMargin);
  const { userId } = useSession();
  // The marker is always drawn: the session arrives a moment after the page, and the watcher
  // starts only once, on the first draw, so a marker added later would never be watched.
  return (
    <div ref={marker}>
      {isNear && userId !== null && (
        <Suspense fallback={null}>
          <ChapterClassPoints chapterId={chapterId} />
        </Suspense>
      )}
    </div>
  );
}
