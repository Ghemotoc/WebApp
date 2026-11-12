/**
 * useFocusClearOfTabBar: keeps the focused control out from under the floating tab bar
 * (GLASS-4 follow-up, 12 Nov 2026; WCAG 2.2, 2.4.11 Focus not obscured).
 *
 * Why it exists: `scroll-padding-bottom` (src/styles/index.css) only helps when the browser
 * scrolls to a focused control. A control that is already on screen, at the foot of the window,
 * gets no scroll at all, so the Tab key could land on a link that sat wholly under the tab bar.
 * This hook watches where focus goes and nudges the page down by the hidden amount.
 * Who uses it: TabBar (the hook only runs while the bar is on screen).
 * What it calls: the browser's focusin event and window.scrollBy.
 */
import { useEffect, type RefObject } from 'react';

/** Air kept between the focused control and the top of the tab bar, in px. */
const gapAboveBar = 12;

/** Room the floating phone header needs at the top of the window, in px (see scroll-padding-top). */
const headerRoom = 88;

/**
 * Works out how far to scroll so the focused control clears the bar.
 *
 * @param focusedBox - the focused control's place on screen
 * @param barTop - the tab bar's top edge on screen, in px
 * @returns the distance to scroll down, in px (0 when nothing is hidden)
 */
export function scrollNeededToClearBar(
  focusedBox: Pick<DOMRect, 'top' | 'bottom'>,
  barTop: number,
): number {
  // Step 1: how much of the control reaches below the line it must stay above.
  const hiddenBy = focusedBox.bottom - (barTop - gapAboveBar);
  if (hiddenBy <= 0) return 0;
  // Step 2: never push the control's top under the header (a control taller than the free space
  // keeps its top in view; its foot may stay under the bar).
  const roomAbove = focusedBox.top - headerRoom;
  return Math.max(0, Math.min(hiddenBy, roomAbove));
}

/**
 * Scrolls the page whenever focus lands on a control the tab bar would cover.
 *
 * @param barRef - the tab bar's element
 * Errors: none; without a bar element it does nothing.
 */
export function useFocusClearOfTabBar(barRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    /** Runs on every focus change in the page. */
    function handleFocusIn(event: FocusEvent) {
      const bar = barRef.current;
      const focused = event.target;
      if (bar === null || !(focused instanceof HTMLElement)) return;
      // The bar's own tabs are never under it.
      if (bar.contains(focused)) return;
      const distance = scrollNeededToClearBar(
        focused.getBoundingClientRect(),
        bar.getBoundingClientRect().top,
      );
      if (distance > 0) window.scrollBy({ top: distance, behavior: 'instant' });
    }
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, [barRef]);
}
