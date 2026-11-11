/**
 * Ready-made layouts and copying in a real browser (story S1-E11-35; bundle CMS-2c).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a moderator starts a page from the Event layout and finds its blocks and starter words in both
 *   languages (criterion 1);
 * - Copy block puts a copy below the block and opens it (criterion 2);
 * - Copy page makes a draft at its own address and opens it (criterion 3);
 * - the editor with a layout's blocks passes axe at 390, 768 and 1440 px.
 * Test data: pages whose address ends in "-layout-e2e" or "-layout-e2e-copy", deleted afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** Removes this spec's pages. */
const cleanUpSql = `
  delete from public.landing_page_versions where page_id in (select id from public.landing_pages where slug like '%-layout-e2e%');
  delete from public.landing_pages where slug like '%-layout-e2e%';`;

/** Opens the page builder in English as the moderator. */
async function openAsModerator(browser: Browser, address: string): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = 'moderator';`);
  await useSessionInBrowser(context, (await signInPersona('moderator')).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Landing page layouts and copying (S1-E11-35)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => runSql(cleanUpSql));
  test.afterAll(() =>
    runSql(`${cleanUpSql} update public.profiles set locale = 'ro' where handle = 'moderator';`),
  );

  test('a moderator starts an event page from its layout, then copies a block and the page', async ({
    browser,
  }) => {
    const page = await openAsModerator(browser, '/staff/landing-pages');
    // Step 1: the Event layout says which blocks it starts with and sets the type.
    await page.getByLabel('Address').fill('reading-layout-e2e');
    await page.getByLabel('Layout').selectOption({ label: 'Event' });
    await expect(page.getByText('Hero, text, cards, a quote and a call to action.')).toBeVisible();
    await expect(page.getByLabel('Type')).toHaveValue('campaign');
    await page.getByRole('button', { name: 'Create page' }).click();
    // Step 2: the blocks are there, with starter words in both languages.
    await expect(page.getByRole('heading', { name: /\/c\/reading-layout-e2e/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Block 5: Call to action' })).toBeVisible();
    await expect(page.locator('#landing-b0-en-title')).toHaveValue('Event');
    await expect(page.locator('#landing-b0-ro-title')).toHaveValue('Eveniment');
    // Step 3: Copy block puts the copy below and opens it; the hero has no Copy button.
    await expect(page.getByRole('button', { name: 'Copy Block 1: Hero' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Copy Block 3: Cards' }).click();
    await expect(page.getByRole('heading', { name: 'Block 4: Cards' })).toBeVisible();
    await expect(page.getByText('Editing block 4 of 6')).toBeVisible();
    // Step 4: Copy page makes a draft at its own address and opens it.
    await page.getByLabel('Address of the copy').fill('reading-layout-e2e-copy');
    await page.getByRole('button', { name: 'Copy page' }).click();
    await expect(page.getByRole('heading', { name: /\/c\/reading-layout-e2e-copy/ })).toBeVisible();
    await expect(page.locator('#landing-b0-en-title')).toHaveValue('Event');
  });

  for (const view of everyView(['/staff/landing-pages'])) {
    test(`axe: the editor at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'moderator';`);
      const pageId = runSql(
        `select id from public.landing_pages where slug = 'reading-layout-e2e';`,
      ).trim();
      await useSessionInBrowser(page.context(), (await signInPersona('moderator')).session);
      await checkScreen(page, { ...view, address: `/staff/landing-pages?page=${pageId}` });
    });
  }
});
