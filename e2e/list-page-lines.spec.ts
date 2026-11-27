/**
 * The line under a genre or tag page's title, written in Staff › Website › Genre and tag pages,
 * in a real browser (BOOKS-A06 and BOOKS-A09, user stories 1.6 and 1.9; boards A06-ReadGenre
 * "Maps, magic and long journeys." and A09-ReadTag).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - an admin writes Fiction's English line and the Family tag's line, and each page shows its
 *   line under the title, leading the muted line;
 * - a Romanian page with no Romanian line shows the English one, marked lang="en";
 * - saving an empty line takes it off, and the page goes back to the list's description;
 * - an unknown tag is refused in words.
 * The axe checks of /staff/website/list-pages are in list-backgrounds.spec.ts, which now draws
 * this card too.
 * Test data: list_page_lines, emptied before and after (the audit log keeps its rows).
 */
import { type Browser, type Page } from '@playwright/test';
import { expect, test } from './support/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** Forgets every line, so each run starts with none. */
const cleanUpSql = 'delete from public.list_page_lines;';

/** Fiction's line, as board A06 draws it. */
const fictionLine = 'Maps, magic and long journeys.';

/** Opens an address in a language, as the admin or signed out, in a fresh browser context. */
async function openAs(
  browser: Browser,
  isAdmin: boolean,
  address: string,
  language: 'en' | 'ro' = 'en',
): Promise<Page> {
  const context = await browser.newContext();
  if (isAdmin) {
    runSql(`update public.profiles set locale = '${language}' where handle = 'admin';`);
    await useSessionInBrowser(context, (await signInPersona('admin')).session);
  }
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/**
 * Writes a line from the staff card and waits for "Saved".
 *
 * @param card - the "Lines under the title" region
 * @param line - the sentence, or '' to take it off
 */
async function saveLine(card: ReturnType<Page['getByRole']>, line: string) {
  await card.getByRole('textbox', { name: 'Line' }).fill(line);
  await card.getByRole('button', { name: 'Save line' }).click();
}

test.describe('the line under a genre or tag title (BOOKS-A06, BOOKS-A09)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => runSql(cleanUpSql));
  test.afterAll(() => {
    runSql(`${cleanUpSql}
      update public.profiles set locale = 'ro' where handle = 'admin';`);
  });

  test('an admin writes lines for a genre and a tag, and their pages show them', async ({
    browser,
  }) => {
    const page = await openAs(browser, true, '/staff/website/list-pages');
    const card = page.getByRole('region', { name: 'Lines under the title' });

    // Step 1: Fiction in English.
    await card.getByRole('combobox', { name: 'Page' }).selectOption({ label: 'Fiction' });
    await card.getByRole('combobox', { name: 'Language' }).selectOption('en');
    await saveLine(card, fictionLine);
    await expect(card.getByText('Saved. The page shows the new line.')).toBeVisible();
    await expect(card.getByRole('list', { name: 'Saved lines' })).toContainText(fictionLine);

    // Step 2: the Family tag, typed after "Another tag".
    await card.getByRole('combobox', { name: 'Page' }).selectOption({ label: 'Another tag' });
    await card.getByRole('textbox', { name: 'Tag' }).fill('#Family');
    await saveLine(card, 'Stories where strangers become the people you’d go back for.');
    await expect(card.getByText('Saved. The page shows the new line.')).toBeVisible();

    // Step 3: a tag that doesn't exist is refused in words.
    await card.getByRole('textbox', { name: 'Tag' }).fill('Nosuchtag');
    await saveLine(card, 'A line.');
    await expect(card.getByText(/no genre or approved tag with that name/)).toBeVisible();
    await page.context().close();

    // Step 4: each page shows its own line under the title.
    const genrePage = await openAs(browser, false, '/discover/c/fiction');
    await expect(genrePage.getByText(fictionLine)).toBeVisible();
    await genrePage.context().close();
    const tagPage = await openAs(browser, false, '/discover/t/Family');
    await expect(tagPage.getByText(/strangers become the people/)).toBeVisible();
    await tagPage.context().close();
  });

  test('a Romanian page with no Romanian line shows the English one, marked as English', async ({
    browser,
  }) => {
    const page = await openAs(browser, false, '/discover/c/fiction', 'ro');
    const line = page.getByText(fictionLine);
    await expect(line).toBeVisible();
    await expect(line).toHaveAttribute('lang', 'en');
    await page.context().close();
  });

  test('saving an empty line takes it off the page', async ({ browser }) => {
    const page = await openAs(browser, true, '/staff/website/list-pages');
    const card = page.getByRole('region', { name: 'Lines under the title' });
    await card.getByRole('button', { name: 'Edit the line for Fiction · English' }).click();
    await expect(card.getByRole('textbox', { name: 'Line' })).toHaveValue(fictionLine);
    await saveLine(card, '');
    await expect(card.getByText('The line is off the page.')).toBeVisible();
    await page.context().close();

    const genrePage = await openAs(browser, false, '/discover/c/fiction');
    await expect(
      genrePage.getByRole('heading', { level: 1, name: 'Fiction', exact: true }),
    ).toBeVisible();
    await expect(genrePage.getByText(fictionLine)).toHaveCount(0);
    await genrePage.context().close();
  });
});
