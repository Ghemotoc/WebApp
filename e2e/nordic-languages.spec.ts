/**
 * The Nordic interface languages and the first-visit language by country, in a real browser
 * (bundle MARKETS-2, part a; story S1-E11-31).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a closed language shows in no menu: the footer offers English and Română only;
 * - a first-time visitor from Sweden reads in English while Swedish is closed, one from Moldova in
 *   Romanian, and a choice made in this browser wins over the country (checked on the page's
 *   lang: the home page's own words come from the website content, per market, not the interface);
 * - once staff open Swedish, the footer offers Svenska, and picking it keeps every text readable:
 *   keys not translated yet read in English, never as raw keys;
 * - axe finds nothing serious, and nothing scrolls sideways at 390, 768 and 1440 px.
 * Test data: Swedish is opened by SQL for one test and closed again afterwards (the workers run
 * one at a time, playwright.config.ts, so no other spec sees it open).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY, screenWidths } from './support/accessibility';
import { waitForAnimationsToFinish } from './support/animations';
import { runSql } from './support/database';

/** The footer's language drop-down, named "Language" or "Limbă" (the footer also has the theme one). */
function footerLanguage(page: Page) {
  return page.getByRole('contentinfo').getByRole('combobox', { name: /^(Language|Limbă)$/ });
}

/**
 * Opens the home page as a first-time visitor from a country.
 *
 * @param page - the browser page
 * @param country - the connection's country, faked by the local server (never on Cloudflare)
 */
async function visitFrom(page: Page, country: string) {
  await page.setExtraHTTPHeaders({ 'X-Fake-Country': country });
  await page.goto('/');
}

test.describe('Nordic languages (MARKETS-2a)', () => {
  test.describe.configure({ mode: 'serial' });
  // Swedish starts closed, and is closed again whatever a test did.
  test.afterAll(() => runSql(`update public.languages set status = 'closed' where code = 'sv';`));

  test('a closed language shows in no menu', async ({ page }) => {
    await page.goto('/');
    const options = footerLanguage(page).locator('option');
    await expect(options).toHaveText(['English', 'Română']);
  });

  test('a first-time visitor from Sweden reads in English while Swedish is closed', async ({
    page,
  }) => {
    await visitFrom(page, 'SE');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('a first-time visitor from Moldova reads in Romanian', async ({ page }) => {
    await visitFrom(page, 'MD');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  });

  test('a language chosen in this browser wins over the country', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'ro'), LANGUAGE_STORAGE_KEY);
    await visitFrom(page, 'GB');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  });

  test('once Swedish is open, a Swedish visitor gets it, with English for what is not translated', async ({
    page,
  }) => {
    runSql(`update public.languages set status = 'open' where code = 'sv';`);
    await visitFrom(page, 'SE');

    // The page says it is Swedish, and the footer offers Svenska as the choice made.
    await expect(page.locator('html')).toHaveAttribute('lang', 'sv');
    await expect(footerLanguage(page).locator('option')).toHaveText([
      'English',
      'Română',
      'Svenska',
    ]);
    // No Swedish file has landed yet, so every interface text reads in English, never as a raw
    // key: the footer's own language label is the English one.
    await expect(
      page.getByRole('contentinfo').getByRole('combobox', { name: 'Language' }),
    ).toBeVisible();
    await expect(page.getByText(/^[a-z]+(\.[a-zA-Z]+)+$/)).toHaveCount(0);

    // Let the cards finish fading in, so axe measures their final colours.
    await waitForAnimationsToFinish(page);
    // Reduce motion ends every animation at once, so axe measures the colours the screen
    // settles on, not a fade half-way through (as in e2e/support/accessibility.ts; FINAL-1).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const serious = results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    );
    expect(serious).toEqual([]);
  });

  for (const width of screenWidths) {
    test(`the footer menu with three languages fits at ${width} px`, async ({ page }) => {
      runSql(`update public.languages set status = 'open' where code = 'sv';`);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await expect(footerLanguage(page).locator('option')).toHaveCount(3);
      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(pageWidth).toBeLessThanOrEqual(width);
    });
  }
});
