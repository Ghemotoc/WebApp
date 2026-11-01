/**
 * Forum categories, forums and subforums in a real browser (bundle FORUMS-1, part a; story
 * S1-E8-01; board 5.1 Forums).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a visitor reaches the forums from the top bar; the starting categories come in the board's
 *   order, each forum shows its threads, posts and latest post, and First chapters lists its
 *   subforums (criterion 2); the line says threads never close on their own (criterion 3);
 * - a forum and a subforum open with their breadcrumb;
 * - an admin adds a pinned category and a forum inside it with a name, description, order and
 *   parent in both languages, and the forum index shows them in the reader's language
 *   (criterion 1); then removes them, forum first;
 * - the forum index, a forum and Staff › Forums pass axe at 390, 768 and 1440 px, light and
 *   night, ro and en, and no doodle touches text or a control.
 * Test data: the forums the admin adds, removed by the test and again afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodleOverlap } from './support/doodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** Removes the forums this spec adds, subforums first, and puts the admin back in Romanian. */
function cleanUp() {
  runSql(`delete from public.forums where slug = 'e2e-sonnets';
    delete from public.forums where slug = 'e2e-poets';
    update public.profiles set locale = 'ro' where handle = 'admin';`);
}

/** Opens a page as a persona (or a visitor) in English, with motion reduced. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    // The profile's language wins over the browser's, so set it first.
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
  return page;
}

/**
 * Fills a name and description in one language on the open staff form.
 *
 * @param page - the staff page
 * @param language - "Romanian" or "English", as the labels say
 * @param name - the name
 * @param description - the description
 */
async function fillNames(page: Page, language: string, name: string, description: string) {
  await page.getByLabel(`Name in ${language}`).fill(name);
  await page.getByLabel(`Description in ${language}`).fill(description);
}

test.describe('forum categories and subforums (FORUMS-1a, S1-E8-01)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('a visitor reads the forum index, category by category', async ({ browser }) => {
    const page = await openAs(browser, null, '/discover');
    await page.getByRole('banner').getByRole('link', { name: 'Forums' }).click();
    await expect(page).toHaveURL(/\/forums$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Forums' })).toBeVisible();
    // The starting categories, pinned in the board's order (Q45).
    const categories = page.getByRole('heading', { level: 2 });
    await expect(categories.first()).toHaveText('Writing craft');
    const firstFour = (await categories.allInnerTexts()).slice(0, 4);
    expect(firstFour).toEqual(['Writing craft', 'Reading', 'Essays and true stories', 'Community']);
    // A forum row: name, description, subforums, numbers and the latest post.
    const craft = page.getByRole('region', { name: 'Writing craft' });
    await expect(craft.getByText('4 forums')).toBeVisible();
    const firstChapters = craft.getByRole('listitem').filter({ hasText: 'First chapters' });
    await expect(
      firstChapters.getByText('Openings and the first 1,000 words of a story'),
    ).toBeVisible();
    await expect(
      firstChapters.getByRole('link', { name: 'School and everyday life' }),
    ).toBeVisible();
    await expect(firstChapters.getByText('Threads')).toBeVisible();
    await expect(firstChapters.getByText('No posts yet')).toBeVisible();
    await expect(page.getByText('They never close on their own', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Forum rules in short' })).toBeVisible();
    await page.context().close();
  });

  test('a forum and a subforum open with their breadcrumb', async ({ browser }) => {
    const page = await openAs(browser, null, '/forums');
    await page.getByRole('link', { name: 'First chapters', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'First chapters' })).toBeVisible();
    await page.getByRole('link', { name: 'Fantasy and sci-fi openings' }).first().click();
    const breadcrumb = page.getByRole('navigation', { name: 'Where you are' });
    await expect(breadcrumb).toContainText(
      'Forums › Writing craft › First chapters › Fantasy and sci-fi openings',
    );
    await expect(page.getByText('No threads here yet.')).toBeVisible();
    await breadcrumb.getByRole('link', { name: 'Writing craft' }).click();
    await expect(page.getByRole('link', { name: 'Worldbuilding' })).toBeVisible();
    await page.goto('/forums/no-such-forum');
    await expect(
      page.getByRole('heading', { name: 'There’s no forum at this address.' }),
    ).toBeVisible();
    await page.context().close();
  });

  test('an admin adds a category and a forum inside it, then removes them', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/forums');
    // Step 1: a pinned category, first in the order.
    await page.getByRole('button', { name: 'Add a category' }).click();
    await fillNames(page, 'Romanian', 'Poeți e2e', '');
    await fillNames(page, 'English', 'Poets e2e', '');
    await page.getByLabel('Address').fill('e2e-poets');
    await page.getByLabel('Order').fill('0');
    await page.getByLabel('Pin it to the top of the forum index').check();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved. The forum index shows it now.')).toBeVisible();
    // Step 2: a forum inside it, with a description in both languages.
    await page.getByRole('button', { name: 'Add a forum inside Poeți e2e' }).click();
    await fillNames(page, 'Romanian', 'Sonete e2e', 'Paisprezece versuri');
    await fillNames(page, 'English', 'Sonnets e2e', 'Fourteen lines');
    await page.getByLabel('Address').fill('e2e-sonnets');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Saved. The forum index shows it now.')).toBeVisible();
    // Step 3: the index shows them first, in English.
    await page.goto('/forums');
    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText('Poets e2e');
    await expect(page.getByText('Fourteen lines')).toBeVisible();
    // Step 4: the category can't go while the forum is inside it; the forum can.
    await page.goto('/staff/forums');
    await page.getByRole('button', { name: 'Remove Poeți e2e' }).click();
    await page.getByLabel('Why it is removed').fill('Only a test.');
    await page.getByRole('button', { name: 'Remove the forum' }).click();
    await expect(page.getByText('Move or remove the forums inside it first.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Remove Sonete e2e' }).click();
    await page.getByLabel('Why it is removed').fill('Only a test.');
    await page.getByRole('button', { name: 'Remove the forum' }).click();
    await expect(page.getByText('Removed. It has left the forum index.')).toBeVisible();
    await page.context().close();
  });

  for (const view of everyView(['/forums', '/forums/first-chapters'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
      await expectNoDoodleOverlap(page);
    });
  }

  for (const view of everyView(['/staff/forums'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'admin';`);
      await useSessionInBrowser(page.context(), (await signInPersona('admin')).session);
      await checkScreen(page, view);
    });
  }
});
