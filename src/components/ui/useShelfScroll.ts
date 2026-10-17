/**
 * useShelfScroll: watches a sideways row and works out its arrows and its fade (story S1-E1-03).
 *
 * The rules it implements (DoD design rules; Robert, 16 and 17 Oct 2026):
 *   - Scroll arrows show only when the row is wider than the screen.
 *   - At either end, the arrow pointing that way is disabled.
 *   - The row fades on one side at a time, never both: at the start only the right edge, at the
 *     end only the left edge, in between the side the reader is moving towards (after an arrow or
 *     keyboard move, the direction of that move; before any movement, the right).
 * Who uses it: Shelf (src/components/ui/Shelf.tsx).
 * Returns the state the Shelf draws, plus scrollByPage() for the arrow buttons.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/** Which way the reader last moved. */
export type ScrollDirection = 'back' | 'forward';

/** What the shelf needs to draw its arrows and fade. */
export interface ShelfScrollState {
  overflows: boolean;
  atStart: boolean;
  atEnd: boolean;
  /** Which edge fades: 'right', 'left' or 'none' (when the row fits). */
  fadeSide: 'left' | 'right' | 'none';
}

/** One arrow press moves most of a screen, but at least 240 px (boards: Discover shelves). */
function pageWidth(row: HTMLElement): number {
  return Math.max(240, row.clientWidth * 0.8);
}

/**
 * Works out which edge fades from where the row is and which way it last moved.
 *
 * @returns the edge that fades
 */
export function chooseFadeSide(
  overflows: boolean,
  atStart: boolean,
  atEnd: boolean,
  lastDirection: ScrollDirection,
): ShelfScrollState['fadeSide'] {
  if (!overflows) return 'none';
  if (atStart) return 'right';
  if (atEnd) return 'left';
  return lastDirection === 'forward' ? 'right' : 'left';
}

/**
 * Watches the row the ref points at.
 *
 * @param rowRef - the scrolling element
 * @returns the current state and a function that scrolls one page back or forward
 */
export function useShelfScroll(rowRef: RefObject<HTMLElement | null>) {
  const [position, setPosition] = useState({ overflows: false, atStart: true, atEnd: false });
  const [lastDirection, setLastDirection] = useState<ScrollDirection>('forward');
  const lastScrollLeft = useRef(0);

  // Measure the row: does it overflow, and is it at either end? (1 px of slack for rounding.)
  const measure = useCallback(() => {
    const row = rowRef.current;
    if (row === null) return;
    setPosition({
      overflows: row.scrollWidth > row.clientWidth + 1,
      atStart: row.scrollLeft <= 1,
      atEnd: row.scrollLeft + row.clientWidth >= row.scrollWidth - 1,
    });
    // Remember the direction of any movement, including swipes, trackpads and arrow keys.
    if (row.scrollLeft !== lastScrollLeft.current) {
      setLastDirection(row.scrollLeft > lastScrollLeft.current ? 'forward' : 'back');
      lastScrollLeft.current = row.scrollLeft;
    }
  }, [rowRef]);

  // Measure now, on every scroll and whenever the row changes size.
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

  /** Scrolls one page; the row's CSS makes it smooth unless the reader asked for reduced motion. */
  const scrollByPage = useCallback(
    (direction: ScrollDirection) => {
      const row = rowRef.current;
      if (row === null) return;
      setLastDirection(direction);
      row.scrollBy({ left: direction === 'forward' ? pageWidth(row) : -pageWidth(row) });
    },
    [rowRef],
  );

  const state: ShelfScrollState = {
    ...position,
    fadeSide: chooseFadeSide(position.overflows, position.atStart, position.atEnd, lastDirection),
  };
  return { state, scrollByPage };
}
