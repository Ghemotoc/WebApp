/**
 * Floating navigation bar: the page column sits 10 px inside the bar (GLASS-4; Robert, 12 Nov 2026).
 *
 * What this proves, in a real browser:
 * - from 1024 px (the website top bar) the page column (PageContainer) starts 10 px after the
 *   bar's left edge and ends 10 px before its right edge, so the bar reads as floating;
 * - under 1024 px (the phone header's floating pills) the column stays at least 10 px inside them;
 * - on the narrowest phones (320 px) the Write and Legal pages still fit: nothing pushes the page
 *   sideways (CLAUDE.md rule 21). Before GLASS-4's fit fixes the "Write chapter one" button and
 *   the legal draft pill spilled past the screen edge.
 * Who runs it: `npm run test:e2e`. What it calls: the seed persona adult_writer (who has stories).
 */
import { expect, test, type Page } from '@playwright/test';

import { signInPersona, useSessionInBrowser } from './support/personas';

/** How far inside the bar the column starts and ends, in px. */
interface ColumnInset {
  left: number;
  right: number;
}

/** Measures the first page column's content box against the bar (the element at barSelector). */
async function measureInset(page: Page, barSelector: string): Promise<ColumnInset> {
  return page.evaluate((selector) => {
    const bar = document.querySelector(selector);
    const column = document.querySelector('main [data-page-column], [data-page-column]');
    if (bar === null || column === null) throw new Error('The bar or the page column is missing.');
    const barBox = bar.getBoundingClientRect();
    const columnBox = column.getBoundingClientRect();
    const style = getComputedStyle(column);
    // The column's padding is its side space, so its content starts after the padding.
    const contentLeft = columnBox.left + parseFloat(style.paddingLeft);
    const contentRight = columnBox.right - parseFloat(style.paddingRight);
    return { left: contentLeft - barBox.left, right: barBox.right - contentRight };
  }, barSelector);
}

for (const width of [1920, 1440, 1024]) {
  test(`at ${String(width)} px the page column sits 10 px inside the navigation bar on each side`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto('/discover');
    await expect(page.locator('.top-bar-pill')).toBeVisible();
    const inset = await measureInset(page, '.top-bar-pill');
    // Half a pixel of rounding is allowed; a missing inset (0) or a doubled one (20) is not.
    expect(Math.abs(inset.left - 10)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(inset.right - 10)).toBeLessThanOrEqual(0.5);
    await context.close();
  });
}

// Under 1024 px the bar is the phone header: two floating pills 14 px from the screen edges
// (PhoneHeader). The column's side space there is at least 26 px, so it stays inside the pills.
for (const width of [768, 390]) {
  test(`at ${String(width)} px the page column sits at least 10 px inside the phone header`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.goto('/discover');
    await expect(page.locator('header').first()).toBeVisible();
    const inset = await measureInset(page, 'header');
    // The header's own 14 px side padding is where its pills start and end.
    expect(inset.left - 14).toBeGreaterThanOrEqual(10);
    expect(inset.right - 14).toBeGreaterThanOrEqual(10);
    await context.close();
  });
}

test('on a 320 px phone the Write and Legal pages do not scroll sideways', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 700 } });
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  const page = await context.newPage();
  for (const address of ['/write', '/legal']) {
    await page.goto(address);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const spill = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(spill, `${address} is wider than the screen`).toBeLessThanOrEqual(0);
  }
  await context.close();
});
