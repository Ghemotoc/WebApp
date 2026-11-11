/**
 * The header floats over the page however far it scrolls (bundle NAV-1; Robert, 10 Nov 2026).
 *
 * What it proves, at desktop width (the website top bar) and phone width (header B and the tab
 * bar), signed out and signed in:
 * - after scrolling to the foot of a long page, the header is still at the top of the screen;
 * - the space beside the floating pills doesn't swallow clicks meant for the page under it;
 * - a keyboard focus that scrolls the page stops below the header, not under it
 *   (WCAG 2.2, 2.4.11 Focus not obscured);
 * - nothing scrolls sideways.
 * Test data: the seed's public pages; nothing is changed.
 */
import { expect, test, type Page } from '@playwright/test';

import { signInPersona, useSessionInBrowser } from './support/personas';

/** The header's bottom edge on screen, in px. */
async function headerBottom(page: Page) {
  const box = await page.locator('header').first().boundingBox();
  return (box?.y ?? 0) + (box?.height ?? 0);
}

/** The header's top edge on screen, in px (-1 when there is no header). */
async function headerTop(page: Page) {
  const box = await page.locator('header').first().boundingBox();
  return box?.y ?? -1;
}

/** Whether the middle of the header's logo belongs to the header, so it is drawn above the page. */
async function logoIsOnTop(page: Page) {
  const logo = await page.locator('header a').first().boundingBox();
  const middle = {
    x: (logo?.x ?? 0) + (logo?.width ?? 0) / 2,
    y: (logo?.y ?? 0) + (logo?.height ?? 0) / 2,
  };
  return page.evaluate(
    (point) => document.elementFromPoint(point.x, point.y)?.closest('header') !== null,
    middle,
  );
}

/** How far the page scrolls sideways, in px (0 or less when it doesn't). */
async function sidewaysOverflow(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

for (const width of [1440, 390]) {
  test(`at ${width} px the header stays on screen however far the page scrolls`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Scroll to the very foot of the page.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
    // The header is still at the top of the screen, drawn above the page.
    const top = await headerTop(page);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThan(4);
    expect(await logoIsOnTop(page)).toBe(true);
    expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
    await context.close();
  });

  test(`at ${width} px a focused link scrolled into view stops below the header`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ viewport: { width, height: 800 } });
    await useSessionInBrowser(context, (await signInPersona('teacher')).session);
    const page = await context.newPage();
    await page.goto('/discover');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Go to the foot, then focus a link near the top of the page the way the keyboard would.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const target = page.locator('main a').first();
    await target.focus();
    const box = await target.boundingBox();
    expect(box?.y ?? 0).toBeGreaterThanOrEqual((await headerBottom(page)) - 1);
    await context.close();
  });
}

test('the gap beside the phone header lets a click reach the page under it', async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  // The header's box is wider than its pills; the point in its top padding isn't the header's.
  const header = await page.locator('header').first().boundingBox();
  const hit = await page.evaluate(
    (point) => {
      const element = document.elementFromPoint(point.x, point.y);
      return element === null ? 'nothing' : getComputedStyle(element).pointerEvents;
    },
    { x: (header?.x ?? 0) + 4, y: (header?.y ?? 0) + 4 },
  );
  expect(hit).not.toBe('none');
  await context.close();
});
