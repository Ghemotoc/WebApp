/**
 * useShelfScroll: watches a sideways row of covers and moves it one screenful at a time (story
 * S1-E1-03; redrawn in bundle CALM-4).
 *
 * The rules (the simplified design, Robert, 20 Nov 2026, 10:18 UTC: "the fade was visual
 * overload"; design/simplified-system/components/Shelf/README.md):
 *   - No fade at either edge and no scroll bar. Wide screens show 5 whole covers, tablets 4 and
 *     phones 2 and the edge of a third (the row's CSS, in Shelf.tsx).
 *   - The arrows show only when the row holds more than one screenful; at either end the arrow
 *     pointing that way is dimmed and says so to screen readers (aria-disabled).
 *   - Each press moves one screenful; the row snaps to a cover, so a screenful always starts on a
 *     whole cover. Smooth scrolling comes from the row's CSS and only without reduced motion.
 * Who uses it: Shelf (src/components/ui/Shelf.tsx).
 * Returns the state the Shelf draws, plus scrollByPage() for the arrow buttons.
 */
import { useCallback, useEffect, useState, type RefObject } from 'react';

/** Which way an arrow press moves the row. */
export type ScrollDirection = 'back' | 'forward';

/** What the shelf needs to draw its arrows. */
export interface ShelfScrollState {
  /** True when the row holds more than one screenful. */
  overflows: boolean;
  atStart: boolean;
  atEnd: boolean;
}

/**
 * How far one press moves: the row's visible width plus one gap, so the next screenful starts
 * exactly on the first cover that was hidden.
 *
 * @param row - the scrolling element
 * @returns the distance in pixels
 */
export function screenfulOf(row: HTMLElement): number {
  const gap = Number.parseFloat(getComputedStyle(row).columnGap);
  return row.clientWidth + (Number.isNaN(gap) ? 0 : gap);
}

/**
 * Watches the row the ref points at.
 *
 * @param rowRef - the scrolling element
 * @returns the current state and a function that scrolls one screenful back or forward
 */
export function useShelfScroll(rowRef: RefObject<HTMLElement | null>) {
  const [state, setState] = useState<ShelfScrollState>({
    overflows: false,
    atStart: true,
    atEnd: false,
  });

  // Measure the row: does it overflow, and is it at either end (1 px of slack for rounding)?
  const measure = useCallback(() => {
    const row = rowRef.current;
    if (row === null) return;
    setState({
      overflows: row.scrollWidth > row.clientWidth + 1,
      atStart: row.scrollLeft <= 1,
      atEnd: row.scrollLeft + row.clientWidth >= row.scrollWidth - 1,
    });
  }, [rowRef]);

  // Measure now, on every scroll (swipes, trackpads, arrow keys and buttons alike) and whenever
  // the row changes size.
  useEffect(() => {
    const row = rowRef.current;
    if (row === null) return undefined;
    measure();
    row.addEventListener('scroll', measure, { passive: true });
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resizeObserver?.observe(row);
    return () => {
      row.removeEventListener('scroll', measure);
      resizeObserver?.disconnect();
    };
  }, [rowRef, measure]);

  /** Moves one screenful back or forward; the row's snapping lands it on a whole cover. */
  const scrollByPage = useCallback(
    (direction: ScrollDirection) => {
      const row = rowRef.current;
      if (row === null) return;
      const distance = screenfulOf(row);
      row.scrollBy({ left: direction === 'forward' ? distance : -distance });
    },
    [rowRef],
  );

  return { state, scrollByPage };
}
