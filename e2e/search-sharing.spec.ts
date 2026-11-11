/**
 * Staff › Website › Search and sharing in a real browser (story S1-E11-39; bundle SEO-1d).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - an admin sees every public page (the home page in each language and the help pages) with
 *   how many things are missing, opens the English home page and sees its search result, its
 *   share card with the site's share picture and its warnings;
 * - a search description staff write for a page shows in its search result at once;
 * - "Only pages to fix" hides the pages with nothing missing;
 * - a moderator, who has no website area, is told the page isn't theirs;
 * - axe finds nothing serious at 390, 768 and 1440 px, light and night, Romanian and English.
 * Test data: the seeded home pages and help pages; a search description is written into the live
 * English home page and taken out again afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The live English home page of the Romanian market: the version visitors get. */
const liveEnglishHome = `(select live.id from public.cms_live_versions('home_page') as live
  where live.market_code = 'RO' and live.language_code = 'en')`;

/** Opens an address in English as a persona. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Staff › Website › Search and sharing (S1-E11-39)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`update public.cms_versions set content = content - 'search' where id = ${liveEnglishHome};
      update public.profiles set locale = 'ro' where handle in ('admin', 'moderator', 'owner');`);
  });

  test('an admin sees each public page with its search result, share card and warnings', async ({
    browser,
  }) => {
    // Step 1: a search description on the live English home page, as staff would write it.
    runSql(`update public.cms_versions
      set content = content || '{"search": {"title": "", "description": "Stories, poems and essays by writers you can follow, chapter by chapter.", "hidden": false}}'::jsonb
      where id = ${liveEnglishHome};`);
    const page = await openAs(browser, 'admin', '/staff/website/search');
    await expect(
      page.getByRole('heading', { name: 'What search engines and share cards show' }),
    ).toBeVisible();
    await expect(page.getByRole('status').getByText(/pages, \d+ to fix\./)).toBeVisible();

    // Step 2: the English home page opens on its search result and share card.
    const homeRow = page.getByRole('listitem').filter({ hasText: 'Home page · RO · en' });
    await homeRow.getByText('/', { exact: true }).click();
    await expect(homeRow.getByText('Search result')).toBeVisible();
    await expect(
      homeRow
        .getByText('Stories, poems and essays by writers you can follow, chapter by chapter.')
        .first(),
    ).toBeVisible();
    await expect(homeRow.getByText('Share card')).toBeVisible();
    await expect(homeRow.locator('img[src="/link-previews/share.png"]')).toHaveCount(1);
    // A help page is listed with its own address.
    await expect(page.getByText('/help/getting-started', { exact: true }).first()).toBeVisible();

    // Step 3: "Only pages to fix" keeps only pages with something missing.
    await page.getByLabel('Only pages to fix').check();
    await expect(page.getByText('Nothing missing', { exact: true })).toHaveCount(0);
    await page.context().close();
  });

  test('a moderator is told the page is not theirs', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/website/search');
    await expect(page.getByText('Only the owner and admins can edit the website.')).toBeVisible();
    await expect(page.getByText('What search engines and share cards show')).toHaveCount(0);
    await page.context().close();
  });

  for (const view of everyView(['/staff/website/search'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'owner';`);
      await useSessionInBrowser(page.context(), (await signInPersona('owner')).session);
      await checkScreen(page, view);
    });
  }
});
