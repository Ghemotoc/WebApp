/**
 * The footer's "About the apps" and "For partners" in a real browser (Robert, 25 Nov 2026,
 * 09:50 UTC: no widget missing between the canvas and the live site, and editable from the back
 * end).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a visitor opens "About the apps" from the footer and reads the page staff write at /c/apps;
 * - "For partners" opens /c/partners, whose last button leads to Contact us;
 * - both pages pass axe at 390, 768 and 1440 px, light and night, ro and en.
 * Test data: the two pages the migration seeds; nothing is written.
 */
import { expect, test, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';

/**
 * Opens the home page in English, signed out.
 *
 * @param page - the browser page
 */
async function openHomeInEnglish(page: Page): Promise<void> {
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  await page.goto('/');
}

test.describe('footer pages', () => {
  test('a visitor opens About the apps from the footer', async ({ page }) => {
    await openHomeInEnglish(page);
    await page.getByRole('contentinfo').getByRole('link', { name: 'About the apps' }).click();
    await expect(page).toHaveURL(/\/c\/apps$/);
    await expect(page.getByRole('heading', { level: 1, name: 'The apps' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start reading' })).toHaveAttribute(
      'href',
      '/discover',
    );
  });

  test('For partners opens its page, which ends with a button to Contact us', async ({ page }) => {
    await openHomeInEnglish(page);
    await page.getByRole('contentinfo').getByRole('link', { name: 'For partners' }).click();
    await expect(page).toHaveURL(/\/c\/partners$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Work with us' })).toBeVisible();
    await page.getByRole('main').getByRole('link', { name: 'Contact us' }).click();
    await expect(page).toHaveURL(/\/contact$/);
  });

  for (const view of everyView(['/c/apps', '/c/partners'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }
});
