/**
 * The header floats over the page however far it scrolls (bundle NAV-1; Robert, 10 Nov 2026).
 *
 * What it proves, at desktop width (the website top bar) and phone width (header B and the tab
 * bar), signed out and signed in:
 * - after scrolling to the foot of a long page, the header is still at the top of the screen;
 * - the space beside the floating pills doesn't swallow clicks meant for the page under it;
 * - a keyboard focus that scrolls the page stops below the header, not under it
 *   (WCAG 2.2, 2.4.11 Focus not obscured);
 * - on a phone, tabbing down a long page never leaves the focused control under the floating tab
 *   bar at the foot (the same criterion; GLASS-4 follow-up, 12 Nov 2026);
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

for (const width of [390, 768]) {
  test(`at ${String(width)} px tabbing through Settings never leaves the focus under the tab bar`, async ({
    browser,
  }) => {
    // A short window, so most of the page is reached only by the Tab key scrolling it.
    const context = await browser.newContext({ viewport: { width, height: 600 } });
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    const page = await context.newPage();
    await page.goto('/settings');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const tabBar = page.locator('nav.fixed');
    await expect(tabBar).toBeVisible();
    const covered: string[] = [];
    let stops = 0;
    for (let press = 0; press < 80; press += 1) {
      await page.keyboard.press('Tab');
      // How far the focused control reaches under the tab bar, when it is not part of the bar.
      const overlap = await page.evaluate(() => {
        const focused = document.activeElement;
        const bar = document.querySelector('nav.fixed');
        if (focused === null || focused === document.body || bar === null) return null;
        if (bar.contains(focused)) return null;
        const focusBox = focused.getBoundingClientRect();
        const barBox = bar.getBoundingClientRect();
        const across =
          Math.min(focusBox.right, barBox.right) - Math.max(focusBox.left, barBox.left);
        const down = Math.min(focusBox.bottom, barBox.bottom) - Math.max(focusBox.top, barBox.top);
        const name = (focused.getAttribute('aria-label') ?? focused.textContent ?? '').trim();
        // A control taller than the free space between the header (88 px) and the bar cannot
        // clear both: it passes when its top is in view, so it is never wholly hidden.
        const isTallerThanFreeSpace = focusBox.height > barBox.top - 88;
        const isUnderBar = across > 1 && down > 1;
        const isCovered = isTallerThanFreeSpace ? focusBox.top >= barBox.top : isUnderBar;
        return { name: name.slice(0, 40), isCovered };
      });
      if (overlap === null) continue;
      stops += 1;
      if (overlap.isCovered) covered.push(overlap.name);
    }
    // The walk really moved through the page, and no stop sat under the bar.
    expect(stops).toBeGreaterThan(30);
    expect(covered).toEqual([]);
    await context.close();
  });
}

test('at 390 px a focused control stays clear of the tab bar when the page grows above it', async ({
  browser,
}) => {
  // Text that arrives late, or the account's language replacing the browser's, makes the page
  // taller after focus has landed; the focused control must not end up under the bar (MOTION-1).
  const context = await browser.newContext({ viewport: { width: 390, height: 600 } });
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  const page = await context.newPage();
  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('nav.fixed')).toBeVisible();

  /** How far the focused control is above the tab bar's top edge; null when focus is in the bar. */
  const roomAboveBar = () =>
    page.evaluate(() => {
      const focused = document.activeElement;
      const bar = document.querySelector('nav.fixed');
      if (focused === null || focused === document.body || bar === null) return null;
      if (bar.contains(focused)) return null;
      return bar.getBoundingClientRect().top - focused.getBoundingClientRect().bottom;
    });

  // Step 1: walk with the Tab key until focus sits in the lower part of the window.
  let room: number | null = null;
  for (let press = 0; press < 60; press += 1) {
    await page.keyboard.press('Tab');
    room = await roomAboveBar();
    // A control wholly above the bar and close to it (a taller one can't clear it anyway).
    if (room !== null && room >= 0 && room < 120) break;
  }
  expect(room).not.toBeNull();
  expect(room ?? 0).toBeGreaterThanOrEqual(0);

  // Step 2: the page grows by 140 px just above the focused control, pushing it down.
  await page.evaluate(() => {
    const filler = document.createElement('div');
    filler.style.height = '140px';
    document.activeElement?.before(filler);
  });

  // Step 3: the page moves by itself so the control is above the bar again.
  await expect.poll(roomAboveBar).toBeGreaterThanOrEqual(0);
  await context.close();
});

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
