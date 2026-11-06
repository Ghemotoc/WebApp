/**
 * Unit tests for shelfPaging (bundle FIXES-1, part a): an arrow press moves a row by whole cards,
 * so the card a fade covered becomes fully visible (Robert, 5 Nov 2026), between the left and the
 * right fade that both show in the middle of a row (Robert, 6 Nov 2026).
 * Who runs it: `npm test` (Vitest).
 */
import { describe, expect, it } from 'vitest';

import {
  fadeWidthFor,
  pageTarget,
  widestCardOf,
  type CardEdges,
  type RowPosition,
} from './shelfPaging';

/**
 * A row of equal cards 20 px apart, starting 4 px in (the row's padding).
 *
 * @returns the cards' edges
 */
function cardsOf(count: number, width: number): CardEdges[] {
  return Array.from({ length: count }, (_, index) => {
    const start = 4 + index * (width + 20);
    return { start, end: start + width };
  });
}

/**
 * Where a card sits on screen once the row has scrolled.
 *
 * @returns its left and right edge in the visible part of the row
 */
function onScreen(card: CardEdges, scrollLeft: number): { left: number; right: number } {
  return { left: card.start - scrollLeft, right: card.end - scrollLeft };
}

/**
 * The first card the right fade touches before the press.
 *
 * @returns the card
 */
function firstFadedOnTheRight(cards: CardEdges[], row: RowPosition): CardEdges {
  const fade = fadeWidthFor(row.clientWidth, widestCardOf(cards));
  const card = cards.find((each) => each.end > row.scrollLeft + row.clientWidth - fade + 1);
  if (card === undefined) throw new Error('no card under the fade');
  return card;
}

describe('shelfPaging', () => {
  const cards = cardsOf(20, 180);
  const scrollWidth = (cards.at(-1)?.end ?? 0) + 4;

  it('keeps the board’s 140 px fade on a wide row and a fifth of the row on a phone', () => {
    expect(fadeWidthFor(1280)).toBe(140);
    expect(fadeWidthFor(358)).toBe(72);
  });

  it('narrows the fade on a small phone so the widest card fits between two fades', () => {
    // 296 px of row and a 196 px card: 50 px is left on each side of the card.
    expect(fadeWidthFor(296, 196)).toBe(50);
    // A wide row keeps the board's 140 px whatever the card.
    expect(fadeWidthFor(1280, 196)).toBe(140);
    // Never thinner than 24 px, even when the card can't fit.
    expect(fadeWidthFor(300, 400)).toBe(24);
  });

  it('a forward press shows the card that was half faded on the right fully', () => {
    const row = { scrollLeft: 0, clientWidth: 1000, scrollWidth };
    const faded = firstFadedOnTheRight(cards, row);
    const target = pageTarget(cards, row, 'forward');
    const place = onScreen(faded, target);
    // Fully clear of both fades: the left one shows once the row has moved, the right one stays.
    expect(place.left).toBeGreaterThanOrEqual(140);
    expect(place.right).toBeLessThanOrEqual(1000 - 140);
  });

  it('after a forward press, the card before it is part-shown on the left', () => {
    const row = { scrollLeft: 0, clientWidth: 1000, scrollWidth };
    const faded = firstFadedOnTheRight(cards, row);
    const target = pageTarget(cards, row, 'forward');
    const before = cards[cards.indexOf(faded) - 1];
    if (before === undefined) throw new Error('no card before');
    const place = onScreen(before, target);
    expect(place.left).toBeLessThan(0);
    expect(place.right).toBeGreaterThan(0);
  });

  it('a back press shows the card half faded on the left fully, clear of the left fade', () => {
    const row = { scrollLeft: 1500, clientWidth: 1000, scrollWidth };
    const target = pageTarget(cards, row, 'back');
    const touched = cards.filter((card) => card.start < 1500 + 140 - 1).at(-1);
    if (touched === undefined) throw new Error('no card under the fade');
    const place = onScreen(touched, target);
    expect(place.left).toBeGreaterThanOrEqual(140);
    expect(place.right).toBeLessThanOrEqual(1000 - 140);
  });

  it('works on a phone, where the fade is narrower', () => {
    const phoneCards = cardsOf(20, 160);
    const row = { scrollLeft: 0, clientWidth: 358, scrollWidth: (phoneCards.at(-1)?.end ?? 0) + 4 };
    const faded = firstFadedOnTheRight(phoneCards, row);
    const place = onScreen(faded, pageTarget(phoneCards, row, 'forward'));
    expect(place.left).toBeGreaterThanOrEqual(72);
    expect(place.right).toBeLessThanOrEqual(358 - 72);
  });

  it('on a small phone, the card is still fully clear of both fades', () => {
    const smallCards = cardsOf(20, 196);
    const row = { scrollLeft: 0, clientWidth: 296, scrollWidth: (smallCards.at(-1)?.end ?? 0) + 4 };
    const faded = firstFadedOnTheRight(smallCards, row);
    const place = onScreen(faded, pageTarget(smallCards, row, 'forward'));
    expect(place.left).toBeGreaterThanOrEqual(50);
    expect(place.right).toBeLessThanOrEqual(296 - 50);
  });

  it('never moves past either end of the row', () => {
    const atEnd = { scrollLeft: scrollWidth - 1000, clientWidth: 1000, scrollWidth };
    expect(pageTarget(cards, atEnd, 'forward')).toBe(scrollWidth - 1000);
    const nearStart = { scrollLeft: 30, clientWidth: 1000, scrollWidth };
    expect(pageTarget(cards, nearStart, 'back')).toBe(0);
  });

  it('a card wider than the clear space still moves the row most of a screen', () => {
    const wideCards = cardsOf(10, 400);
    const row = { scrollLeft: 0, clientWidth: 358, scrollWidth: (wideCards.at(-1)?.end ?? 0) + 4 };
    expect(pageTarget(wideCards, row, 'forward')).toBeGreaterThan(200);
  });
});
