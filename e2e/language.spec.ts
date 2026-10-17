/**
 * The interface language in a real browser (story S1-E1-04).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (the "e2e" job, which starts the
 * local Supabase first). The signed-in tests use the seed persona adult_writer.
 * What it proves:
 * - a browser set to English still opens in Romanian, and English is one choice away (decided
 *   17 Oct 2026, 11:48);
 * - both drop-downs (top bar and footer) switch the language, and this browser remembers it;
 * - a signed-in person's choice is saved to the account and opens on a second device;
 * - the drop-downs fit at 390, 768 and 1440 px without sideways scroll (CLAUDE.md rule 21).
 */
import { expect, test, type Page } from '@playwright/test';

import { brand } from '../src/config/brand';

import { signInPersona, useSessionInBrowser } from './support/personas';

/** The home heading in each language. */
const romanianHeading = `Bun venit la ${brand.productName}`;
const englishHeading = `Welcome to ${brand.productName}`;

/** The top bar's language drop-down (its label is hidden on screen, as on the board). */
function topBarLanguage(page: Page, label: 'Limbă' | 'Language') {
  return page.getByRole('banner').getByRole('combobox', { name: label });
}

/** The footer's language drop-down (its label is shown). */
function footerLanguage(page: Page, label: 'Limbă' | 'Language') {
  return page.getByRole('contentinfo').getByRole('combobox', { name: label });
}

test.describe('a browser set to English', () => {
  test.use({ locale: 'en-GB' });

  test('still opens in Romanian, with English one choice away in the top bar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(romanianHeading);

    await topBarLanguage(page, 'Limbă').selectOption('en');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(englishHeading);
    await expect(footerLanguage(page, 'Language')).toHaveValue('en');
  });
});

test('the footer drop-down switches the language too, and this browser remembers it', async ({
  page,
}) => {
  await page.goto('/');
  await footerLanguage(page, 'Limbă').selectOption('en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(englishHeading);

  await page.reload();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(englishHeading);
  await footerLanguage(page, 'Language').selectOption('ro');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(romanianHeading);
});

for (const width of [390, 768, 1440]) {
  test(`both language drop-downs are visible and nothing scrolls sideways at ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');

    await expect(topBarLanguage(page, 'Limbă')).toBeVisible();
    await expect(footerLanguage(page, 'Limbă')).toBeVisible();
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

  test('switches to English on one device and sees English on a second device', async ({
    browser,
  }) => {
    // Device 1: signed in as adult_writer, the app opens in Romanian (the account's language).
    const firstDevice = await browser.newContext();
    await useSessionInBrowser(firstDevice, (await signInPersona('adult_writer')).session);
    const firstPage = await firstDevice.newPage();
    await firstPage.goto('/');
    await expect(firstPage.getByRole('heading', { level: 1 })).toHaveText(romanianHeading);

    await topBarLanguage(firstPage, 'Limbă').selectOption('en');
    await expect(firstPage.getByText('Language saved to your account.')).toBeAttached();

    // Device 2: a fresh browser with nothing remembered, signed in again as the same persona.
    const secondDevice = await browser.newContext();
    await useSessionInBrowser(secondDevice, (await signInPersona('adult_writer')).session);
    const secondPage = await secondDevice.newPage();
    await secondPage.goto('/');

    await expect(secondPage.getByRole('heading', { level: 1 })).toHaveText(englishHeading);
    await expect(topBarLanguage(secondPage, 'Language')).toHaveValue('en');

    await firstDevice.close();
    await secondDevice.close();
  });
});
