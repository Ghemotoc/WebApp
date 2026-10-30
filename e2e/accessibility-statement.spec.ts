/**
 * The accessibility statement and the no-cookie check in a real browser (story S1-E14-03; CLAUDE.md
 * rule 7: no tracking, no third-party cookies).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the footer on every page links to the accessibility statement, which opens in the Legal
 *   centre in Romanian and in English;
 * - visiting the main pages, signed out and signed in, sets no cookie at all, and stores nothing
 *   in the browser outside the reviewed keys (the theme, the language, the session, and the
 *   per-tab sort order, read counter and closed notices, and the last website content seen);
 * - the statement passes axe at 390, 768 and 1440 px.
 * Test data: seed personas only.
 */
import { expect, test, type Page } from '@playwright/test';

import { checkScreen, everyView } from './support/accessibility';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The browser storage keys the app may write, each reviewed (src/lib and the features). */
const reviewedStorageKeys = [
  'theme-preference',
  'interface-language',
  'auth-session',
  'story-list-sort',
  'reader-counted-chapters',
  // The website's notices a visitor closed this tab (CMS-1b, S1-E11-10).
  'closed-notices',
];

/**
 * Keys that start with these are reviewed too: the last website content a visitor saw, kept so a
 * page still shows it when a read fails (CMS-1b, S1-E11-06; architecture 1.8.6).
 */
const reviewedStoragePrefixes = ['website-content:'];

/** True when the app may write this storage key. */
function isReviewedKey(key: string): boolean {
  if (reviewedStorageKeys.includes(key)) return true;
  return reviewedStoragePrefixes.some((prefix) => key.startsWith(prefix));
}

/** The pages a visitor and a member usually open. */
const mainPages = ['/', '/discover', '/legal/terms', '/legal/accessibility', '/report'];

/** Every localStorage and sessionStorage key the page holds. */
async function storageKeys(page: Page): Promise<string[]> {
  return page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
}

/** Visits each main page and checks cookies and storage after each. */
async function expectNoCookiesOn(page: Page): Promise<void> {
  for (const address of mainPages) {
    await page.goto(address);
    await page.waitForLoadState('networkidle');
    expect(await page.context().cookies(), `cookies after ${address}`).toEqual([]);
    const unexpected = (await storageKeys(page)).filter((key) => !isReviewedKey(key));
    expect(unexpected, `storage keys after ${address}`).toEqual([]);
  }
}

test('the footer links to the accessibility statement', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Accesibilitate' }).click();
  await expect(page).toHaveURL(/\/legal\/accessibility$/);
  await expect(
    page.getByRole('heading', { level: 2, name: 'Declarație de accesibilitate' }),
  ).toBeVisible();
  await expect(page.getByText(/WCAG 2\.2/).first()).toBeVisible();
});

test('a visitor gets no cookie and nothing unexpected in storage', async ({ page }) => {
  await expectNoCookiesOn(page);
});

test('a signed-in member gets no cookie either', async ({ page }) => {
  await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
  await expectNoCookiesOn(page);
});

for (const view of everyView(['/legal/accessibility'])) {
  test(`axe: the accessibility statement at ${view.width} px, ${view.theme}, ${view.language}`, async ({
    page,
  }) => {
    await checkScreen(page, view);
  });
}
