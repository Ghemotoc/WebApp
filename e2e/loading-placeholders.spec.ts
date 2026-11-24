/**
 * Loading that looks like the page, in a real browser (design books item 15).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves (break test: a slow connection): while Discover's rows wait for the database,
 * grey cover shapes show under each row's heading, marked busy, with no spinner anywhere; when
 * the stories arrive the shapes give way to the covers.
 * Test data: the seed stories; nothing is changed.
 */
import { expect, test } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';

test('a slow Discover shows grey cover shapes, never a spinner, then the covers', async ({
  browser,
}) => {
  const context = await browser.newContext();
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  // Hold every row's read for two seconds, as a slow 3G connection would.
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/rest/v1/rpc/browse_stories', async (route) => {
    await held;
    await route.continue();
  });
  await page.goto('/discover');
  // After 300 ms the waiting rows show: busy, with words for screen readers.
  const waiting = page.locator('section[aria-busy="true"]');
  await expect(waiting.first()).toBeVisible();
  await expect(waiting.first().getByText('Loading the stories…')).toHaveCount(1);
  await expect(page.locator('.animate-spin, [role="progressbar"]')).toHaveCount(0);
  // The page itself never scrolls sideways while it waits (CLAUDE.md rule 21).
  const scrolls = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(scrolls).toBe(false);
  // The stories arrive: the shapes go.
  release();
  await expect(waiting).toHaveCount(0);
  await context.close();
});
