/**
 * useThreadLevelWithParagraph: from 1280 px, starts the open paragraph's comment box level with
 * the paragraph it belongs to (CALM-9, board B03 "Reader comments", Robert's canvas comment of
 * 23 Nov 2026: "the comment box starts level with the paragraph it belongs to").
 *
 * How: while the side column's thread slot holds a thread, the slot gets a top margin equal to the
 * gap between where the slot would start and where the open paragraph starts (the row marked
 * .tmc-paragraph-row--open by ParagraphCommentMarker). The gap is measured from the page, never
 * hard-coded, so it follows the reader's text size, line spacing and the chapter's own layout.
 * When the paragraph sits higher than the slot can go (a paragraph near the top, with About this
 * story above the box), the margin stays 0 and the box starts right under About this story.
 * An earlier version's thread has no paragraph row, so it starts there too.
 * While a thread is open the column scrolls with the text instead of sticking (index.css,
 * .tmc-reader-side:has(…)), so the box stays beside its paragraph as the reader scrolls.
 * Who uses it: ReaderSideColumn. What it calls: browser APIs only (MutationObserver, resize).
 */
import { useEffect } from 'react';

/** The class ParagraphCommentMarker sets on the open paragraph's row. */
const OPEN_ROW_SELECTOR = '.tmc-paragraph-row--open';

/**
 * Works out and sets the slot's top margin for the paragraph that is open now.
 *
 * @param slot - the side column's thread slot
 */
function alignSlot(slot: HTMLElement) {
  // Step 1: with no thread in the slot there is nothing to line up.
  const row = document.querySelector(OPEN_ROW_SELECTOR);
  if (slot.childElementCount === 0 || row === null) {
    slot.style.marginTop = '';
    return;
  }
  // Step 2: measure from the slot's natural place (no margin), so a second paragraph opened
  // after the first is measured afresh.
  slot.style.marginTop = '';
  const gap = row.getBoundingClientRect().top - slot.getBoundingClientRect().top;
  // Step 3: never pull the box up over About this story; only push it down.
  slot.style.marginTop = gap > 0 ? `${Math.round(gap)}px` : '';
}

/**
 * Keeps the slot level with the open paragraph: when a thread arrives or changes and when the
 * window is resized (the text reflows), and again when another paragraph opens.
 *
 * @param slot - the side column's thread slot, or null before it is drawn
 * @param openPlace - which paragraph's thread is open (from ParagraphCommentsContext), so opening
 *   another paragraph straight after the first measures again
 */
export function useThreadLevelWithParagraph(slot: HTMLElement | null, openPlace: unknown) {
  useEffect(() => {
    if (slot === null) return;
    // A frame's wait lets the marker tint its row and the thread draw before measuring.
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => alignSlot(slot));
    };
    // The thread is drawn into the slot through a portal, so watch the slot's children.
    const observer = new MutationObserver(schedule);
    observer.observe(slot, { childList: true });
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [slot, openPlace]);
}
