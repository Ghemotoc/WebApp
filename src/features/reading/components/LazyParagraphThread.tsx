/**
 * LazyParagraphThread: the paragraph thread (story S1-E6-06), fetched only when a reader first
 * opens one, so the comments code stays out of the reader's first load (the 40 KB script budget,
 * e2e/reader-performance.spec.ts).
 *
 * Who uses it: ParagraphCommentMarker and EarlierVersionComments.
 * What it calls: src/features/comments/components/ParagraphThread.tsx.
 */
import { lazy, Suspense } from 'react';

import type { ParagraphThreadProps } from '@/features/comments/components/ParagraphThread';

/** The thread, in its own file. */
const ParagraphThread = lazy(async () => {
  const module = await import('@/features/comments/components/ParagraphThread');
  return { default: module.ParagraphThread };
});

/**
 * Renders the thread once its file has arrived (nothing until then).
 *
 * @param props - what ParagraphThread needs
 * @returns the thread
 */
export function LazyParagraphThread(props: ParagraphThreadProps) {
  return (
    <Suspense fallback={null}>
      <ParagraphThread {...props} />
    </Suspense>
  );
}
