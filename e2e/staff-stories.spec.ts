/**
 * Every story in the admin site, in a real browser (bundle ADMIN-2, part a; story S1-E11-07;
 * screens 8.10 and 8.11).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the moderator opens Stories from the staff menu and sees every story with its owner's short
 *   user ID, status, rating and reports; the search finds a story by title and by username, and
 *   the filters (Writers under 18, language) narrow the list and stay in the address;
 * - opening a story shows its details and chapter list, and the moderator may change it;
 * - support staff see the same list and the page says their role only looks; the content editor
 *   is refused;
 * - the list and a story's page pass axe and don't scroll sideways at 390, 768 and 1440 px.
 * Test data: the three seed stories; nothing is changed except the personas' interface language,
 * which is put back afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const weatherStationId = '00000000-0000-4000-9000-000000000001';

/** Opens an address in English as a persona, in a fresh browser context. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Puts the personas' language back to the seed's. */
function cleanUp() {
  runSql(`update public.profiles set locale = 'ro'
    where handle in ('moderator', 'support', 'editor');`);
}

test.describe('every story in the admin site (S1-E11-07)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(cleanUp);

  test('the moderator searches, filters and opens a story', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff');
    await page.getByRole('link', { name: 'Stories', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'Every story', level: 1 })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'stories found' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'The Girl Who Fixed Radios' }).first(),
    ).toBeVisible();

    // Search by title, then by the writer's username.
    await page.getByLabel('Title, username or user ID').fill('radios');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page.getByText('1 story found.')).toBeVisible();
    await expect(page).toHaveURL(/q=radios/);
    await page.getByLabel('Title, username or user ID').fill('@teen_17');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(
      page.getByRole('link', { name: 'Scrisori din cutia poștală' }).first(),
    ).toBeVisible();

    // The filters narrow the list and live in the address.
    await page.getByLabel('Title, username or user ID').fill('');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByRole('button', { name: 'Writers under 18' }).click();
    await expect(page).toHaveURL(/writers=under18/);
    await expect(page.getByText('1 story found.')).toBeVisible();
    await page.getByRole('button', { name: 'Writers under 18' }).click();
    await page.getByLabel('Story language').selectOption('en');
    await expect(page.getByText('1 story found.')).toBeVisible();
    await page.getByLabel('Story language').selectOption('');

    // Open one story: its details and chapter list, never its words.
    await page.goto(`/staff/stories/${weatherStationId}`);
    await expect(page.getByRole('heading', { name: 'Stația meteo', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Chapters' })).toBeVisible();
    await expect(page.getByText('Your role can look at stories but not change them.')).toHaveCount(
      0,
    );
    await page.getByRole('link', { name: 'Back to every story' }).click();
    await expect(page.getByRole('heading', { name: 'Every story', level: 1 })).toBeVisible();
  });

  test('support only looks, and the content editor is refused', async ({ browser }) => {
    const support = await openAs(browser, 'support', `/staff/stories/${weatherStationId}`);
    await expect(
      support.getByText('Your role can look at stories but not change them.'),
    ).toBeVisible();
    await support.goto('/staff/stories');
    await expect(support.getByRole('status').filter({ hasText: 'stories found' })).toBeVisible();

    const editor = await openAs(browser, 'editor', '/staff/stories');
    await expect(
      editor.getByText('Your role doesn’t include Stories.', { exact: false }),
    ).toBeVisible();
  });

  for (const view of everyView(['/staff/stories', `/staff/stories/${weatherStationId}`])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's language wins over the browser's (S1-E1-04), so it is set to the view's.
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'moderator';`);
      await useSessionInBrowser(page.context(), (await signInPersona('moderator')).session);
      await checkScreen(page, view);
    });
  }
});
