/**
 * CommentSelectionWatcher: fetches the selection's Comment button and the underlines only when
 * they are needed (READER-SELECT; boards B12 to B14).
 *
 * Why: most readers never select text, and most chapters have no comments on chosen words yet,
 * so SelectionComment and PartHighlights are their own files. That keeps the chapter reader's
 * script budget (e2e/reader-performance.spec.ts). The button's file comes on the first selection
 * in the chapter text; the underlines' file once the chapter has a part to underline.
 * Who uses it: ChapterReading, inside ParagraphCommentsContext. What it calls: SelectionComment
 * and PartHighlights, when needed.
 */
import { lazy, Suspense, useContext, useEffect, useState } from 'react';

import { ParagraphCommentsContext } from '../lib/paragraphCommentsContext';

/** The Comment pill and the touch bar, in their own file. */
const SelectionComment = lazy(async () => {
  const module = await import('./SelectionComment');
  return { default: module.SelectionComment };
});

/** The underlines under commented words, in their own file. */
const PartHighlights = lazy(async () => {
  const module = await import('./PartHighlights');
  return { default: module.PartHighlights };
});

/**
 * Whether something is selected inside the chapter text, outside an open panel.
 *
 * @returns true when a selection starts in the chapter text
 */
function hasSelectionInText(): boolean {
  const selection = window.getSelection();
  if (selection === null || selection.isCollapsed) return false;
  const node = selection.anchorNode;
  const element = node instanceof Element ? node : (node?.parentElement ?? null);
  if (element?.closest('[data-paragraph-thread]') != null) return false;
  return element?.closest('.tmc-chapter-text') != null;
}

/**
 * Renders nothing until it is needed, then the button and the underlines.
 *
 * @returns the lazy parts, once needed
 */
export function CommentSelectionWatcher() {
  const comments = useContext(ParagraphCommentsContext);
  const [hasSelected, setHasSelected] = useState(false);
  // Step 1: listen until the first selection in the text, then fetch the button for good.
  useEffect(() => {
    if (hasSelected || comments === null) return undefined;
    /** The first selection in the text fetches the button. */
    function watch() {
      if (hasSelectionInText()) setHasSelected(true);
    }
    document.addEventListener('selectionchange', watch);
    // The counts can arrive after the reader already selected: look once now too.
    watch();
    return () => document.removeEventListener('selectionchange', watch);
  }, [hasSelected, comments]);
  if (comments === null) return null;
  // Step 2: the underlines only when there is something to underline.
  const hasParts = comments.counts.parts.length > 0;
  return (
    <Suspense fallback={null}>
      {hasSelected && <SelectionComment />}
      {hasParts && <PartHighlights />}
    </Suspense>
  );
}
