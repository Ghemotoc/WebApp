/**
 * Website pages at "/<country>/<language>/…" in a real browser (bundle LOCALISE-1; Robert,
 * 11 Nov 2026: one page per item, translated in the admin, at addresses with the country and the
 * language).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - an address without a place ("/", "/help") forwards to the visitor's place, and links inside
 *   the website keep it;
 * - the footer's language menu moves the address to the same page in the new language;
 * - a first-time visitor reads an address in its language, and nothing is saved in the browser;
 *   a visitor who has chosen a language keeps it and the address follows;
 * - a place that isn't a market, or a language the market doesn't offer, is "page not found";
 * - an admin picks Svenska at the side, publishes a page with one field filled, and a visitor at
 *   "/se/sv" still reads the whole English page, because the translation is not finished
 *   (LOCALISE-2, Robert, 12 Nov 2026);
 * - before any JavaScript runs, a page names its own address as canonical with one alternate
 *   per open language, and a place that isn't a market is noindex.
 * Test data: the seeded version 1 (Romania open, in ro and en; Sweden a market, not open yet).
 * What this spec publishes is deleted afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The home heading in each seeded language. */
const romanianHeading = 'Scrie povești. Fii citit.';
const englishHeading = 'Write stories. Get read.';

/**
 * Opens an address as a signed-out visitor who has chosen a language in this browser.
 *
 * @param browser - the test's browser
 * @param address - where to go
 * @param language - the language stored as this browser's choice
 * @returns the open page
 */
async function openWithChoice(browser: Browser, address: string, language: string): Promise<Page> {
  const context = await browser.newContext();
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Website pages by country and language (LOCALISE-1)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`
      delete from public.cms_versions where user_id is not null or is_removal;
      update public.profiles set locale = 'ro' where handle = 'admin';`);
  });

  test('an address without a place forwards to the visitor’s place, and links keep it', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/ro\/ro$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(romanianHeading);

    await page.goto('/help');
    await expect(page).toHaveURL(/\/ro\/ro\/help$/);
    await page.getByRole('link', { name: 'Raportări și siguranță' }).first().click();
    await expect(page).toHaveURL(/\/ro\/ro\/help\/[a-z-]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('a link clicked while the address is still forwarding opens its page, not the home page', async ({
    page,
  }) => {
    // The forward waits for the list of places, and the legal centre's code takes a moment to
    // load: both are slowed here so the click lands in between, as it can on a slow connection.
    await page.route('**/rest/v1/rpc/website_places', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    await page.route(/LegalCentrePage.*\.js/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.continue();
    });
    await page.goto('/');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Termeni' }).click();
    await expect(page).toHaveURL(/\/legal\/terms$/);
    await expect(page.getByRole('navigation', { name: 'Documente legale' })).toBeVisible();
  });

  test('the language menu moves the address to the same page in that language', async ({
    page,
  }) => {
    await page.goto('/ro/ro');
    await page.getByRole('contentinfo').getByRole('combobox', { name: 'Limbă' }).selectOption('en');
    await expect(page).toHaveURL(/\/ro\/en$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(englishHeading);
  });

  test('a first-time visitor reads an address in its language, and nothing is saved', async ({
    page,
  }) => {
    await page.goto('/ro/en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(englishHeading);
    await expect(page).toHaveURL(/\/ro\/en$/);
    // A link is not a choice: this browser still has no language of its own.
    const stored = await page.evaluate((key) => localStorage.getItem(key), LANGUAGE_STORAGE_KEY);
    expect(stored).toBeNull();
  });

  test('a visitor who chose a language keeps it, and the address follows', async ({ browser }) => {
    const page = await openWithChoice(browser, '/ro/en/help', 'ro');
    await expect(page).toHaveURL(/\/ro\/ro\/help$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  });

  test('a place that is not a market, or not one of its languages, is "page not found"', async ({
    browser,
  }) => {
    for (const address of ['/fr/en', '/se/ro', '/ro/en/no-such-page']) {
      const page = await openWithChoice(browser, address, 'en');
      await expect(
        page.getByRole('heading', { level: 1, name: 'We can’t find that page' }),
      ).toBeVisible();
      await page.context().close();
    }
  });

  test('an admin publishes a Swedish page with one field, and visitors keep the whole English page', async ({
    browser,
  }) => {
    // Step 1: the admin picks Svenska at the side and fills the first headline line only.
    const context = await browser.newContext();
    runSql(`update public.profiles set locale = 'en' where handle = 'admin';`);
    await useSessionInBrowser(context, (await signInPersona('admin')).session);
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
      LANGUAGE_STORAGE_KEY,
      'en',
    ] as const);
    const staff = await context.newPage();
    await staff.goto('/staff/website');
    await staff.getByRole('radio', { name: 'Svenska' }).check();
    const headline = staff.getByRole('textbox', { name: 'Headline, first line' });
    await expect(headline).toHaveValue('');
    await headline.fill('Skriv berättelser.');
    await staff.getByRole('button', { name: 'Publish' }).click();
    await expect(staff.getByText(/Published\. It goes live on/)).toBeVisible();

    // Step 2: a visitor at Sweden's Swedish address reads the English page, with nothing Swedish
    // mixed in, until every field of the translation is filled.
    const visitorContext = await browser.newContext();
    const visitor = await visitorContext.newPage();
    await visitor.goto('/se/sv');
    await expect(visitor.getByRole('heading', { level: 1 })).toHaveText(englishHeading);
    await expect(visitor.getByRole('heading', { level: 1 })).not.toContainText(
      'Skriv berättelser.',
    );
    await expect(visitor.getByText(/Post your stories/)).toBeVisible();
    await expect(visitor).toHaveURL(/\/se\/sv$/);
  });

  test('a page names its own address for search engines, with one alternate per open language', async ({
    request,
  }) => {
    const html = await (await request.get('/ro/en/help/getting-started')).text();
    expect(html).toMatch(
      /<link rel="canonical" href="http:\/\/[^"]+\/ro\/en\/help\/getting-started">/,
    );
    expect(html).toMatch(
      /<link rel="alternate" hreflang="ro-RO" href="http:\/\/[^"]+\/ro\/ro\/help\/getting-started">/,
    );
    // Sweden is not open yet: no alternate points there.
    expect(html).not.toContain('hreflang="sv-SE"');
    expect(html).toContain('<meta property="og:title" content="Getting started">');
    // A place that isn't a market is not for search engines.
    const unknown = await request.get('/fr/en');
    expect(unknown.headers()['x-robots-tag']).toBe('noindex');
  });
});
