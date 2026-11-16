/**
 * LazyReadInSwitch: the "Read in" switch for the chapter reader and the teaser page, fetched only
 * for a story in several languages (bundle TRANSLATE-1b).
 *
 * Why: most stories have one language, and the reader's first download has a budget
 * (e2e/reader-performance.spec.ts, S1-E4-01b), so the switch and its text travel only with the
 * chapters that show it. The story page imports ReadInSwitch directly; it has no such budget.
 * Who uses it: ChapterBar and TeaserPage. What it loads: ./ReadInSwitch.
 */
import { lazy, Suspense } from 'react';

import type { ReadInSwitchProps } from './ReadInSwitch';

const ReadInSwitch = lazy(async () => {
  const module = await import('./ReadInSwitch');
  return { default: module.ReadInSwitch };
});

/**
 * Renders the switch once its code has arrived.
 *
 * @returns the switch, or nothing for a story in one language (Robert, 16 Nov 2026) and while
 *   the code is on its way
 */
export function LazyReadInSwitch({ editions, chapterNumber }: ReadInSwitchProps) {
  if (editions.length < 2) return null;
  return (
    <Suspense fallback={null}>
      <ReadInSwitch editions={editions} chapterNumber={chapterNumber} />
    </Suspense>
  );
}
