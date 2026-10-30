/**
 * QuoteShareWatcher: waits for the reader's first selection in the chapter text, then fetches
 * the "Share quote" bar (story S1-E4-07).
 *
 * Why: most readers never select text, so the bar, its database calls and its texts are their
 * own file, fetched only once something in the chapter text is selected. That keeps the chapter
 * reader inside its 40 KB script budget (e2e/reader-performance.spec.ts, S1-E4-01b). Until then
 * this listens to selectionchange and draws nothing.
 * Who uses it: ChapterReaderPage. What it calls: QuoteShareBar, once something is selected.
 */
import { lazy, Suspense, useEffect, useState } from 'react';

import type { SharedChapter } from '../lib/sharedChapter';

/** The bar, in its own file. */
const QuoteShareBar = lazy(async () => {
  const module = await import('./QuoteShareBar');
  return { default: module.QuoteShareBar };
});

/**
 * Whether something is selected inside the chapter text (lib/quoteSelection.ts reads it fully
 * once the bar has loaded; this only decides whether to fetch the bar).
 *
 * @returns true when a selection starts in [data-protected-text]
 */
function hasSelectionInText(): boolean {
  const selection = window.getSelection();
  if (selection === null || selection.isCollapsed) return false;
  const node = selection.anchorNode;
  const element = node instanceof Element ? node : (node?.parentElement ?? null);
  return element?.closest('[data-protected-text]') != null;
}

/**
 * Renders nothing until the first selection in the chapter text, then the bar.
 *
 * @returns the bar once needed
 */
export function QuoteShareWatcher({ chapter }: { chapter: SharedChapter }) {
  const [hasSelected, setHasSelected] = useState(false);
  useEffect(() => {
    if (hasSelected) return undefined;
    /** The first selection inside the chapter text fetches the bar; it stays after that. */
    function watch() {
      if (hasSelectionInText()) setHasSelected(true);
    }
    document.addEventListener('selectionchange', watch);
    return () => document.removeEventListener('selectionchange', watch);
  }, [hasSelected]);
  if (!hasSelected) return null;
  return (
    <Suspense fallback={null}>
      <QuoteShareBar chapter={chapter} />
    </Suspense>
  );
}
