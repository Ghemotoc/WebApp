/**
 * LazyParagraphThread: the comments on one paragraph (story S1-E6-06), fetched only when a reader
 * first opens them, so the comments code stays out of the reader's first load (the 40 KB script
 * budget, e2e/reader-performance.spec.ts).
 *
 * Where they open (bundle CALM-5; design handover Step 4, "Comments on a paragraph", point 4;
 * boards New-Reader and New-PhoneReader): from 1280 px at the top of the reader's side column
 * (ReaderSideColumn), so the text doesn't move and the paragraph and its comments sit side by
 * side; there the thread takes focus when the reader opened it, because it sits away from its
 * button. Below 1280 px they open in the reader's bottom sheet (ReaderSheet), a modal dialog
 * named "Comments on this paragraph" that keeps focus inside until it closes; the thread takes
 * focus as it opens there.
 * Who uses it: ParagraphCommentMarker and EarlierVersionComments.
 * What it reads: ParagraphCommentsContext (the side column's slot) and useIsWideReader.
 * What it calls: src/features/comments/components/ParagraphThread.tsx and ReaderSheet.
 */
import { lazy, Suspense, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import type { ParagraphThreadProps } from '@/features/comments/components/ParagraphThread';

import { useIsWideReader } from '../hooks/useIsWideReader';
import { ParagraphCommentsContext } from '../lib/paragraphCommentsContext';

/** The thread, in its own file. */
const ParagraphThread = lazy(async () => {
  const module = await import('@/features/comments/components/ParagraphThread');
  return { default: module.ParagraphThread };
});

/** The bottom sheet, fetched with the first thread opened below 1280 px. */
const ReaderSheet = lazy(async () => {
  const module = await import('./ReaderSheet');
  return { default: module.ReaderSheet };
});

/** What the opener passes: everything but where the thread sits, which is worked out here. */
type LazyParagraphThreadProps = Omit<ParagraphThreadProps, 'isInSidePanel' | 'takesFocus'>;

/**
 * Renders the thread once its file has arrived (nothing until then).
 *
 * @param props - what ParagraphThread needs
 * @returns the thread, in the side column or the bottom sheet
 */
export function LazyParagraphThread(props: LazyParagraphThreadProps) {
  const { t } = useTranslation('reading');
  const comments = useContext(ParagraphCommentsContext);
  const isWide = useIsWideReader();
  const sidePanel = comments?.sidePanel ?? null;

  // Narrow window, or no side column: the bottom sheet, which takes focus as a dialog does.
  if (!isWide || sidePanel === null) {
    const label =
      props.place === 'earlier'
        ? t('reader.paragraphComments.earlierSheetLabel')
        : t('reader.paragraphComments.sheetLabel');
    // The sheet is a dialog, so the thread takes focus inside it as it arrives (WCAG 2.4.3).
    return (
      <Suspense fallback={null}>
        <ReaderSheet label={label} onClose={props.onClose}>
          <ParagraphThread {...props} takesFocus />
        </ReaderSheet>
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
