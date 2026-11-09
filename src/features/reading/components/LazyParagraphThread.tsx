/**
 * LazyParagraphThread: the paragraph thread (story S1-E6-06), fetched only when a reader first
 * opens one, so the comments code stays out of the reader's first load (the 40 KB script budget,
 * e2e/reader-performance.spec.ts).
 *
 * Where it opens (bundle G7d2; board ReaderComments): from 1280 px, in the side column beside
 * the paper (ParagraphCommentsPanel), so the text doesn't move and the reader sees the paragraph
 * and its comments side by side; there it takes focus when the reader opened it, because it sits
 * away from its button. Narrower windows, and any page without the column, keep it under its
 * paragraph as before.
 * Who uses it: ParagraphCommentMarker and EarlierVersionComments.
 * What it reads: ParagraphCommentsContext (the column's element) and useIsWideReader.
 * What it calls: src/features/comments/components/ParagraphThread.tsx.
 */
import { lazy, Suspense, useContext } from 'react';
import { createPortal } from 'react-dom';

import type { ParagraphThreadProps } from '@/features/comments/components/ParagraphThread';

import { useIsWideReader } from '../hooks/useIsWideReader';
import { ParagraphCommentsContext } from '../lib/paragraphCommentsContext';

/** The thread, in its own file. */
const ParagraphThread = lazy(async () => {
  const module = await import('@/features/comments/components/ParagraphThread');
  return { default: module.ParagraphThread };
});

/** What the opener passes: everything but where the thread sits, which is worked out here. */
type LazyParagraphThreadProps = Omit<ParagraphThreadProps, 'isInSidePanel' | 'takesFocus'>;

/**
 * Renders the thread once its file has arrived (nothing until then).
 *
 * @param props - what ParagraphThread needs
 * @returns the thread, under its paragraph or in the side column
 */
export function LazyParagraphThread(props: LazyParagraphThreadProps) {
  const comments = useContext(ParagraphCommentsContext);
  const isWide = useIsWideReader();
  const sidePanel = comments?.sidePanel ?? null;

  // Narrow window, or no side column: the thread stays under its paragraph.
  if (!isWide || sidePanel === null) {
    return (
      <Suspense fallback={null}>
        <ParagraphThread {...props} />
      </Suspense>
    );
  }

  // Wide window: the thread goes into the side column; it takes focus when the reader opened it.
  return createPortal(
    <Suspense fallback={null}>
      <ParagraphThread {...props} isInSidePanel takesFocus={comments?.isOpenedByReader ?? false} />
    </Suspense>,
    sidePanel,
  );
}
