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
 *   - Quick presses add up: a press during a smooth scroll counts from where the last press was
 *     heading, not from where the row has got to (CALM-4 break test, 20 Nov 2026: six quick
 *     presses of Next moved one screenful).
 * Who uses it: Shelf (src/components/ui/Shelf.tsx).
 * Returns the state the Shelf draws, plus scrollByPage() for the arrow buttons.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react';

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
 * Forgets where the last arrow press was heading once the row stops, or once a swipe or a wheel
 * takes over, so the next press counts from where the row really is.
 *
 * @param rowRef - the scrolling element
 * @param headingTo - the target the last press set, or null at rest
 */
function useForgetTargetWhenSettled(
  rowRef: RefObject<HTMLElement | null>,
  headingTo: MutableRefObject<number | null>,
) {
  useEffect(() => {
    const row = rowRef.current;
    if (row === null) return undefined;
    const settle = () => {
      headingTo.current = null;
    };
    // Browsers without scrollend: the row has arrived when it is within a pixel of the target.
    const settleOnArrival = () => {
      const target = headingTo.current;
      if (target !== null && Math.abs(row.scrollLeft - target) <= 1) settle();
    };
    row.addEventListener('scrollend', settle);
    row.addEventListener('scroll', settleOnArrival, { passive: true });
    row.addEventListener('pointerdown', settle);
    row.addEventListener('wheel', settle, { passive: true });
    return () => {
      row.removeEventListener('scrollend', settle);
      row.removeEventListener('scroll', settleOnArrival);
      row.removeEventListener('pointerdown', settle);
      row.removeEventListener('wheel', settle);
    };
  }, [rowRef]);
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

  // Where the last press sent the row, while it is still on its way there (null: at rest).
  const headingTo = useRef<number | null>(null);

  /** Moves one screenful back or forward; the row's snapping lands it on a whole cover. */
  const scrollByPage = useCallback(
    (direction: ScrollDirection) => {
      const row = rowRef.current;
      if (row === null) return;
      // Step 1: start from where an earlier press is still heading, or from where the row is.
      const start = headingTo.current ?? row.scrollLeft;
      // Step 2: one screenful that way, kept between the two ends.
      const distance = screenfulOf(row);
      const furthest = row.scrollWidth - row.clientWidth;
      const step = direction === 'forward' ? distance : -distance;
      const target = Math.min(furthest, Math.max(0, start + step));
      headingTo.current = target;
      row.scrollTo({ left: target });
    },
    [rowRef],
  );

  useForgetTargetWhenSettled(rowRef, headingTo);

  return { state, scrollByPage };
}
