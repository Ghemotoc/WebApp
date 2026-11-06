/**
 * useShelfScroll: watches a sideways row and works out its arrows and its fades (story S1-E1-03).
 *
 * The rules it implements (DoD design rules; Robert, 16 and 17 Oct 2026, 5 and 6 Nov 2026):
 *   - Scroll arrows show only when the row is wider than the screen.
 *   - At either end, the arrow pointing that way is disabled.
 *   - Each edge fades while cards are hidden past it (Robert, 6 Nov 2026, 06:25 UTC; this
 *     replaces the 16 Oct rule of one side at a time): at the start only the right edge, at the
 *     end only the left edge, and in between both. The first card is never faded at rest,
 *     because the left edge only fades once the row has moved.
 *   - An arrow press moves by whole cards, so the card a fade was covering becomes fully
 *     visible between the two fades (Robert, 5 Nov 2026; the rule itself is in shelfPaging.ts).
 * Who uses it: Shelf (src/components/ui/Shelf.tsx).
 * Returns the state the Shelf draws, plus scrollByPage() for the arrow buttons.
 */
import { useCallback, useEffect, useState, type RefObject } from 'react';

import {
  fadeWidthFor,
  pageTarget,
  SHELF_FADE_PIXELS,
  widestCardOf,
  type CardEdges,
} from './shelfPaging';

/** Which way an arrow press moves the row. */
export type ScrollDirection = 'back' | 'forward';

/** Which edges of the row fade. */
export interface FadeEdges {
  left: boolean;
  right: boolean;
}

/** What the shelf needs to draw its arrows and fades. */
export interface ShelfScrollState {
  overflows: boolean;
  atStart: boolean;
  atEnd: boolean;
  /** Which edges fade: neither when the row fits, both in the middle of a long row. */
  fadeEdges: FadeEdges;
  /** How wide each fade is: 140 px, or less on narrow screens (fadeWidthFor()). */
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
 * Works out which edges fade: an edge fades while cards are hidden past it.
 *
 * @param overflows - whether the row is wider than the screen
 * @param atStart - whether the row is scrolled all the way back
 * @param atEnd - whether the row is scrolled all the way forward
 * @returns the edges that fade
 */
export function chooseFadeEdges(overflows: boolean, atStart: boolean, atEnd: boolean): FadeEdges {
  // A row that fits hides nothing, so neither edge fades.
  if (!overflows) return { left: false, right: false };
  // Cards are hidden on the left once the row has moved, and on the right until its end.
  return { left: !atStart, right: !atEnd };
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

  // Measure the row: does it overflow, is it at either end (1 px of slack for rounding), and how
  // wide may its fades be so the widest card fits between them?
  const measure = useCallback(() => {
    const row = rowRef.current;
    if (row === null) return;
    setPosition({
      overflows: row.scrollWidth > row.clientWidth + 1,
      atStart: row.scrollLeft <= 1,
      atEnd: row.scrollLeft + row.clientWidth >= row.scrollWidth - 1,
      fadeWidth: fadeWidthFor(row.clientWidth, widestCardOf(cardEdgesOf(row))),
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

  /**
   * Scrolls one section: to the card a fade covered (pageTarget()). The row's CSS makes it
   * smooth unless the reader asked for reduced motion.
   */
  const scrollByPage = useCallback(
    (direction: ScrollDirection) => {
      const row = rowRef.current;
      if (row === null) return;
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
    fadeEdges: chooseFadeEdges(position.overflows, position.atStart, position.atEnd),
  };
  return { state, scrollByPage };
}
