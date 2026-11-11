/**
 * The interface language in a real browser (story S1-E1-04).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (the "e2e" job, which starts the
 * local Supabase first). The signed-in tests use the seed persona adult_writer.
 * What it proves:
 * - a browser set to English still opens in Romanian, and English is one choice away (decided
 *   17 Oct 2026, 11:48);
 * - the footer's drop-down switches the language, and this browser remembers it;
 * - the top bar has no language menu at any width (Robert, 9 Nov 2026, 12:20 UTC; bundle FIX-3);
 * - a signed-in person's choice in Settings is saved to the account and opens on a second device;
 * - nothing scrolls sideways at 390, 768 and 1440 px (CLAUDE.md rule 21).
 */
import { expect, test, type Page } from '@playwright/test';

import { signInPersona, useSessionInBrowser } from './support/personas';

/** The home heading in each language. */
const romanianHeading = 'Scrie povești. Fii citit.';
const englishHeading = 'Write stories. Get read.';

/** The footer's language drop-down (its label is shown). */
function footerLanguage(page: Page, label: 'Limbă' | 'Language') {
  return page.getByRole('contentinfo').getByRole('combobox', { name: label });
}

test.describe('a browser set to English', () => {
  test.use({ locale: 'en-GB' });

  test('still opens in Romanian, with English one choice away in the footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(romanianHeading);

    await footerLanguage(page, 'Limbă').selectOption('en');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(englishHeading);
    await expect(footerLanguage(page, 'Language')).toHaveValue('en');
  });
});

test('this browser remembers the language chosen in the footer', async ({ page }) => {
  await page.goto('/');
  await footerLanguage(page, 'Limbă').selectOption('en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(englishHeading);

  await page.reload();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(englishHeading);
  await footerLanguage(page, 'Language').selectOption('ro');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(romanianHeading);
});

for (const width of [390, 768, 1440]) {
  test(`the language menu is in the footer only and nothing scrolls sideways at ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');

    // The footer has the drop-down; the header has none at any width (bundle FIX-3).
    await expect(footerLanguage(page, 'Limbă')).toBeVisible();
    await expect(page.getByRole('banner').getByRole('combobox', { name: 'Limbă' })).toHaveCount(0);
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(width);
  });
}

test.describe('a signed-in person', () => {
  // These tests change adult_writer's saved language, so they run one after another.
  test.describe.configure({ mode: 'serial' });

  test.afterEach(async () => {
    // Put adult_writer back on Romanian, so every other test starts from the seed state.
    const { client } = await signInPersona('adult_writer');
    const { error } = await client.rpc('set_my_locale', { new_locale: 'ro' });
    expect(error).toBeNull();
  });

  test('switches to English in Settings on one device and sees English on a second device', async ({
    browser,
  }) => {
    // Device 1: signed in as adult_writer, Settings opens in Romanian (the account's language).
    const firstDevice = await browser.newContext();
    await useSessionInBrowser(firstDevice, (await signInPersona('adult_writer')).session);
    const firstPage = await firstDevice.newPage();
    await firstPage.goto('/settings#language');
    const panel = firstPage.getByRole('region', { name: 'Limbă' });
    await expect(panel.getByRole('radio', { name: 'Română' })).toBeChecked();

    // The Language panel's radio buttons (bundle FIX-3) save to the account.
    await panel.getByText('English', { exact: true }).click();
    await expect(firstPage.getByRole('region', { name: 'Language', exact: true })).toContainText(
      'Language saved to the account.',
    );

    // Device 2: a fresh browser with nothing remembered, signed in again as the same persona.
    const secondDevice = await browser.newContext();
    await useSessionInBrowser(secondDevice, (await signInPersona('adult_writer')).session);
    const secondPage = await secondDevice.newPage();
    await secondPage.goto('/');

    await expect(secondPage.getByRole('heading', { level: 1 })).toHaveText(englishHeading);
    await expect(footerLanguage(secondPage, 'Language')).toHaveValue('en');

    await firstDevice.close();
    await secondDevice.close();
  });
});
