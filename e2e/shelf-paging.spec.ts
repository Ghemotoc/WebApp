/**
 * Shelf arrows move one section at a time, in a real browser (bundle FIXES-1, part a; Robert,
 * 5 Nov 2026, 06:53 and 15:02 UTC: "before an item becomes faded, you should have the option of
 * seeing it fully").
 *
 * Who runs it: `npm run test:e2e`.
 * What it proves, on /design's long shelf at 1440 and 390 px wide:
 * - each edge fades while cards are hidden past it: only the right at the start, both in the
 *   middle and only the left at the end (Robert, 6 Nov 2026, 06:25 UTC);
 * - a forward press shows the card that was half faded on the right fully, clear of both fades,
 *   and the card before it is part-shown at the left edge;
 * - a back press does the mirror image: the card under the left fade becomes fully visible;
 * - at the very end, the last card is fully visible.
 * Test data: none; /design draws sample stories.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

/** One card's place on screen, relative to the row. */
interface CardPlace {
  left: number;
  right: number;
}

/** What measureRow() reads: the row's width, its faded edges, the fade width and every card. */
interface RowMeasure {
  width: number;
  /** The row's data-fade attribute: "right", "left right", "left" or "none". */
  edges: string;
  fade: number;
  cards: CardPlace[];
}

/** The row's width, its fades and every card's place, read from the page. */
async function measureRow(row: Locator): Promise<RowMeasure> {
  return row.evaluate((element: HTMLElement) => {
    const rowBox = element.getBoundingClientRect();
    // The Shelf writes which edges fade, and how wide each fade is, on the row itself.
    const edges = element.dataset.fade ?? 'none';
    const fade = Number(element.dataset.fadeWidth ?? '0');
    const cards = Array.from(element.children).map((card) => {
      const box = card.getBoundingClientRect();
      return { left: box.left - rowBox.left, right: box.right - rowBox.left };
    });
    return { width: rowBox.width, edges, fade, cards };
  });
}

/** Opens /design at a width with motion reduced, so a press scrolls at once. */
async function openShelf(page: Page, width: number): Promise<{ row: Locator; shelf: Locator }> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/design');
  const shelf = page.getByTestId('long-shelf');
  return { shelf, row: shelf.getByRole('region', { name: /se derulează lateral/ }) };
}

/**
 * A card by position, failing the test when it isn't there.
 *
 * @returns the card's place
 */
function cardAt(cards: CardPlace[], index: number): CardPlace {
  const card = cards[index];
  if (card === undefined) throw new Error(`No card at position ${index}.`);
  return card;
}

/**
 * Presses an arrow and waits until one card has moved the way the row should.
 *
 * @returns the row measured after the move
 */
async function pressAndMeasure(
  shelf: Locator,
  row: Locator,
  move: { button: string; watchedIndex: number; leftBefore: number; forward: boolean },
): Promise<RowMeasure> {
  await shelf.getByRole('button', { name: move.button }).click();
  // Forward moves cards left; back moves them right.
  const leftNow = async () => cardAt((await measureRow(row)).cards, move.watchedIndex).left;
  if (move.forward) await expect.poll(leftNow).toBeLessThan(move.leftBefore);
  else await expect.poll(leftNow).toBeGreaterThan(move.leftBefore);
  return settledMeasure(row);
}

/**
 * Measures the row once it has stopped moving: the arrows scroll smoothly, so the first reading
 * after the cards start to move can catch them half way. Two readings 150 ms apart must agree.
 *
 * @param row - the scrolling row
 * @returns the measure of the row at rest
 */
async function settledMeasure(row: Locator): Promise<RowMeasure> {
  let previous = JSON.stringify(await measureRow(row));
  await expect
    .poll(
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        const current = JSON.stringify(await measureRow(row));
        const isSettled = current === previous;
        previous = current;
        return isSettled;
      },
      { timeout: 10_000 },
    )
    .toBe(true);
  return measureRow(row);
}

for (const width of [1440, 390]) {
  test(`at ${width} px, the card half faded on the right is fully shown after one press`, async ({
    page,
  }) => {
    const { shelf, row } = await openShelf(page, width);
    // Step 1: the first card the right fade covers.
    const before = await measureRow(row);
    expect(before.fade).toBeGreaterThan(0);
    // At the start only the right edge fades, so the first card is never faded at rest.
    expect(before.edges).toBe('right');
    const fadedIndex = before.cards.findIndex(
      (card) => card.right > before.width - before.fade + 1,
    );
    expect(fadedIndex).toBeGreaterThan(0);

    // Step 2: forward. That card is now clear of the right fade, and the one before peeks in.
    const after = await pressAndMeasure(shelf, row, {
      button: 'Derulează înainte',
      watchedIndex: fadedIndex,
      leftBefore: cardAt(before.cards, fadedIndex).left,
      forward: true,
    });
    const shown = cardAt(after.cards, fadedIndex);
    const peeking = cardAt(after.cards, fadedIndex - 1);
    // In the middle of the row both edges fade, and the card sits clear of both.
    expect(after.edges).toBe('left right');
    expect(shown.left).toBeGreaterThanOrEqual(after.fade - 1);
    expect(shown.right).toBeLessThanOrEqual(after.width - after.fade + 1);
    expect(peeking.right).toBeGreaterThan(0);
    expect(peeking.left).toBeLessThan(0);

    // Step 3: back. The last card the left fade would cover (the rule in shelfPaging.ts) becomes
    // fully visible, clear of that fade, or the row is back at its start.
    const leftIndex = after.cards.findLastIndex((card) => card.left < after.fade - 1);
    const back = await pressAndMeasure(shelf, row, {
      button: 'Derulează înapoi',
      watchedIndex: leftIndex,
      leftBefore: cardAt(after.cards, leftIndex).left,
      forward: false,
    });
    const isAtStart = cardAt(back.cards, 0).left >= 0;
    expect(cardAt(back.cards, leftIndex).left).toBeGreaterThanOrEqual(
      isAtStart ? 0 : back.fade - 1,
    );
  });
}

test('at the very end, the last card is fully visible', async ({ page }) => {
  const { shelf, row } = await openShelf(page, 1440);
  const forward = shelf.getByRole('button', { name: 'Derulează înainte' });
  // Press forward until the arrow is disabled at the end. After each press, wait until the row
  // has moved and the arrow agrees with where the row now is: the arrow's state follows the
  // row's scroll event, so reading it straight after the click saw the old state and pressed a
  // button that was about to be disabled (QA-3: this failed on every run, on main too).
  const scrollLeft = () => row.evaluate((element) => element.scrollLeft);
  const isAtEnd = () =>
    row.evaluate((element) => element.scrollLeft + element.clientWidth >= element.scrollWidth - 1);
  for (let press = 0; press < 30 && (await forward.isEnabled()); press += 1) {
    const leftBefore = await scrollLeft();
    await forward.click();
    await expect.poll(scrollLeft).toBeGreaterThan(leftBefore);
    await expect.poll(async () => (await isAtEnd()) === (await forward.isDisabled())).toBe(true);
  }
  await expect(forward).toBeDisabled();
  const end = await measureRow(row);
  const last = end.cards.at(-1);
  expect(last?.right).toBeLessThanOrEqual(end.width + 1);
  // At the end only the left edge fades, so the last card sits clear of it.
  expect(end.edges).toBe('left');
  expect(last?.left).toBeGreaterThanOrEqual(end.fade - 1);
});
