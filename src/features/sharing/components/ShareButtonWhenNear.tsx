/**
 * ShareButtonWhenNear: the Share button, fetched when the reader nears the end of the chapter
 * (story S1-E4-05).
 *
 * Why: the button sits in the end-of-chapter row, far below the first paragraph, so its file is
 * fetched only when the row comes within about a screen, as the comments are. That keeps the
 * chapter reader inside its 40 KB script budget (e2e/reader-performance.spec.ts, S1-E4-01b).
 * Until then an empty, button-sized place holds the row's layout still.
 * Who uses it: ChapterEnd. What it calls: useIsNear, then ShareButton.
 */
import { lazy, Suspense, useRef } from 'react';

import { useIsNear } from '@/lib/use-is-near';

import type { SharedChapter } from '../lib/sharedChapter';

/** The button and its sharing code, in their own file. */
const ShareButton = lazy(async () => {
  const module = await import('./ShareButton');
  return { default: module.ShareButton };
});

/** How near the row must be before the button is fetched. */
const fetchMargin = '800px';

/**
 * Renders the place, then the button once the reader is near and its file has arrived.
 *
 * @returns the Share button, or its empty place
 */
export function ShareButtonWhenNear({ chapter }: { chapter: SharedChapter }) {
  const marker = useRef<HTMLSpanElement>(null);
  const isNear = useIsNear(marker, fetchMargin);
  const place = <span aria-hidden="true" className="inline-block h-11 w-24" />;
  return (
    <span ref={marker} className="inline-flex">
      {isNear ? (
        <Suspense fallback={place}>
          <ShareButton chapter={chapter} />
        </Suspense>
      ) : (
        place
      )}
    </span>
  );
}
