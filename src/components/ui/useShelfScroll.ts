/**
 * useShelfScroll: watches a sideways row and works out its arrows and its fade (story S1-E1-03).
 *
 * The rules it implements (DoD design rules; Robert, 16 and 17 Oct 2026):
 *   - Scroll arrows show only when the row is wider than the screen.
 *   - At either end, the arrow pointing that way is disabled.
 *   - The row fades on one side at a time, never both: at the start only the right edge, at the
 *     end only the left edge, in between the side the reader is moving towards (after an arrow or
 *     keyboard move, the direction of that move; before any movement, the right).
 *   - An arrow press moves by whole cards, so the card the fade was covering becomes fully
 *     visible (Robert, 5 Nov 2026; the rule itself is in shelfPaging.ts).
 * Who uses it: Shelf (src/components/ui/Shelf.tsx).
 * Returns the state the Shelf draws, plus scrollByPage() for the arrow buttons.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { fadeWidthFor, pageTarget, SHELF_FADE_PIXELS, type CardEdges } from './shelfPaging';

/** Which way the reader last moved. */
export type ScrollDirection = 'back' | 'forward';

/** What the shelf needs to draw its arrows and fade. */
export interface ShelfScrollState {
  overflows: boolean;
  atStart: boolean;
  atEnd: boolean;
  /** Which edge fades: 'right', 'left' or 'none' (when the row fits). */
  fadeSide: 'left' | 'right' | 'none';
  /** How wide the fade is: 140 px, or a fifth of the row on narrow screens (fadeWidthFor()). */
  fadeWidth: number;
}

/**
 * Every card's left and right edge inside the row's scrolling content.
 *
 * @param row - the scrolling element; each direct child is one card
 * @returns the edges, in order
 */
function cardEdgesOf(row: HTMLElement): CardEdges[] {
  const rowLeft = row.getBoundingClientRect().left;
  return Array.from(row.children).map((card) => {
    const box = card.getBoundingClientRect();
    // From the screen's coordinates to the content's: add what has already scrolled past.
    const start = box.left - rowLeft + row.scrollLeft;
    return { start, end: start + box.width };
  });
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
  const [position, setPosition] = useState({
    overflows: false,
    atStart: true,
    atEnd: false,
    fadeWidth: SHELF_FADE_PIXELS,
  });
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
      fadeWidth: fadeWidthFor(row.clientWidth),
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

  /**
   * Scrolls one section: to the card the fade covered (pageTarget()). The row's CSS makes it
   * smooth unless the reader asked for reduced motion.
   */
  const scrollByPage = useCallback(
    (direction: ScrollDirection) => {
      const row = rowRef.current;
      if (row === null) return;
      setLastDirection(direction);
      const target = pageTarget(
        cardEdgesOf(row),
        { scrollLeft: row.scrollLeft, clientWidth: row.clientWidth, scrollWidth: row.scrollWidth },
        direction,
      );
      row.scrollTo({ left: target });
    },
    [rowRef],
  );

  const state: ShelfScrollState = {
    ...position,
    fadeSide: chooseFadeSide(position.overflows, position.atStart, position.atEnd, lastDirection),
  };
  return { state, scrollByPage };
}
