/**
 * Staff › Website › Genre and tag pages in a real browser (bundle G12b; the canvas's StaffWebsite
 * board, "Genre and tag pages").
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - an admin gives Poetry the Sky band everywhere, and a visitor's Poetry page shows it;
 * - an admin gives the Fantasy tag a band, and its tag page, plain before, shows it;
 * - "Use the default" takes Poetry back to its own accent (gold);
 * - an unknown tag is refused in words; a moderator is told the page isn't theirs;
 * - axe finds nothing serious at 390, 768 and 1440 px, light and night, Romanian and English.
 * Test data: list_page_backgrounds, emptied before and after (the audit log keeps its rows).
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** Forgets every choice, so each run starts from the defaults. */
const cleanUpSql = 'delete from public.list_page_backgrounds;';

/** Opens an address in English, as a persona or signed out (null). */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The band tone a visitor's list page draws, or null when it has no band. */
// The band shows the genre's own accent until the chosen colour arrives from the database, so a
// read can land before the swap; each check therefore asks again until the colour settles
// (expect.poll), instead of reading once (GLASS-3: a CI run read "gold" where "sky" was saved).
async function bandToneAt(browser: Browser, address: string): Promise<string | null> {
  const visitor = await openAs(browser, null, address);
  await expect(visitor.getByRole('heading', { level: 1 })).toBeVisible();
  const tone = await visitor
    .locator('header[data-band-tone]')
    .getAttribute('data-band-tone', {
      timeout: 3000,
    })
    .catch(() => null);
  await visitor.context().close();
  return tone;
}

test.describe('Staff › Website › Genre and tag pages (G12b)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => runSql(cleanUpSql));
  test.afterAll(() => {
    runSql(`${cleanUpSql}
      update public.profiles set locale = 'ro' where handle in ('admin', 'moderator', 'owner');`);
  });

  test('an admin chooses bands for a genre and a tag, then goes back to the default', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'admin', '/staff/website/list-pages');
    const genres = page.getByRole('region', { name: 'Genre page backgrounds' });
    await expect(genres.getByText('Default: Gold')).toBeVisible();

    // Step 1: Poetry gets Sky everywhere, and a visitor's Poetry page shows it.
    await genres.getByRole('button', { name: 'Edit the background of Poetry' }).click();
    const editor = page.getByRole('region', { name: 'Editing Poetry' });
    await editor.getByRole('radio', { name: 'Sky' }).click();
    await editor.getByRole('button', { name: 'Save background' }).click();
    await expect(page.getByText('Saved. The page shows the new background.')).toBeVisible();
    await expect(genres.getByText('Sky · set by @admin')).toBeVisible();
    await expect
      .poll(() => bandToneAt(browser, '/discover/c/poetry'), { timeout: 15_000 })
      .toBe('sky');

    // Step 2: an unknown tag is refused in words.
    const tags = page.getByRole('region', { name: 'Tag page backgrounds' });
    await tags.getByLabel('Tag', { exact: true }).fill('no-such-tag-anywhere');
    await tags.getByRole('button', { name: 'Add a tag background' }).click();
    await page
      .getByRole('region', { name: 'Editing #no-such-tag-anywhere' })
      .getByRole('button', { name: 'Save background' })
      .click();
    await expect(
      page.getByText('There is no approved tag with that name. Check the spelling.'),
    ).toBeVisible();

    // Step 3: the Fantasy tag page, plain before, gets a Sage band.
    await expect
      .poll(() => bandToneAt(browser, '/discover/t/Fantasy'), { timeout: 15_000 })
      .toBeNull();
    await tags.getByLabel('Tag', { exact: true }).fill('#Fantasy');
    await tags.getByRole('button', { name: 'Add a tag background' }).click();
    const tagEditor = page.getByRole('region', { name: 'Editing #Fantasy' });
    await tagEditor.getByRole('radio', { name: 'Sage' }).click();
    await tagEditor.getByRole('button', { name: 'Save background' }).click();
    await expect(tags.getByText('#Fantasy')).toBeVisible();
    await expect
      .poll(() => bandToneAt(browser, '/discover/t/Fantasy'), { timeout: 15_000 })
      .toBe('sage');

    // Step 4: "Use the default" takes Poetry back to its own gold.
    await genres.getByRole('button', { name: 'Edit the background of Poetry' }).click();
    await page
      .getByRole('region', { name: 'Editing Poetry' })
      .getByRole('button', { name: 'Use the default' })
      .click();
    await expect(page.getByText('The page is back to its default background.')).toBeVisible();
    await expect
      .poll(() => bandToneAt(browser, '/discover/c/poetry'), { timeout: 15_000 })
      .toBe('gold');
    await page.context().close();
  });

  test('a moderator is told the page is not theirs', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/website/list-pages');
    await expect(page.getByText('Only the owner and admins can edit the website.')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Genre page backgrounds' })).toHaveCount(0);
    await page.context().close();
  });

  for (const view of everyView(['/staff/website/list-pages'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'owner';`);
      await useSessionInBrowser(page.context(), (await signInPersona('owner')).session);
      await checkScreen(page, view);
    });
  }
});
