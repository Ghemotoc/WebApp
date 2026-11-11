/**
 * StorySuggestionsWhenNear: "More by" and "Stories like this" after the latest chapter, fetched
 * when the reader nears the end (story S1-E15-06, bundle ANALYTICS-1c).
 *
 * Why: the rows bring the shelf and the story cards with them, and the chapter reader keeps to its
 * script budget (e2e/reader-performance.spec.ts, S1-E4-01b). So, like the Share button, their
 * file is fetched only when the end of the chapter comes within about a screen. Until then an
 * empty marker holds the place; the rows have no fixed height, and they draw nothing when empty.
 * Who uses it: ChapterEnd. What it calls: useIsNear, then StorySuggestions.
 */
import { lazy, Suspense, useRef } from 'react';

import { useIsNear } from '@/lib/use-is-near';

/** The rows and what they need, in their own file. */
const StorySuggestions = lazy(async () => {
  const module = await import('./StorySuggestions');
  return { default: module.StorySuggestions };
});

/** How near the end must be before the rows are fetched. */
const fetchMargin = '800px';

/**
 * Renders the marker, then the rows once the reader is near and their file has arrived.
 *
 * @param props.storySlug - the story the rows are shown beside
 * @returns the rows, or the empty marker
 */
export function StorySuggestionsWhenNear({ storySlug }: { storySlug: string }) {
  const marker = useRef<HTMLDivElement>(null);
  const isNear = useIsNear(marker, fetchMargin);
  return (
    <div ref={marker}>
      {isNear && (
        <Suspense fallback={null}>
          <StorySuggestions storySlug={storySlug} />
        </Suspense>
      )}
    </div>
  );
}
