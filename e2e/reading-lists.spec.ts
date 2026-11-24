/**
 * Bookshelves (reading lists) in the Library, in a real browser (bundle GAPS-6; board Library,
 * "Your lists"; called bookshelves and drawn as places since bundle CALM-4).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a reader makes a bookshelf from the Library, lands on its page, and adds a story from the
 *   story page's "Add to a bookshelf" sheet; the Library then says "1 of 10 books · Only you" and
 *   draws the book, nine ghost places and the + that links to Read;
 * - a private list shows "There is no such list" to another account and to a visitor; once its
 *   owner makes it public, a visitor sees its name, whose it is and its story, and another
 *   account gets the Report action, never the owner's tools;
 * - a second list can't take the first one's name; the owner takes a story out and deletes the
 *   list after a second, confirming click;
 * - a list name and a story title that are one long word stay inside a 390 px screen;
 * - "Notification settings" in "What you follow" opens Settings at its notifications part;
 * - the Library with a list, and the list's page, pass axe and never scroll sideways at 390, 768
 *   and 1440 px, in English and Romanian, and draw no doodle.
 * Test data: adult_writer's story "Lista de ploaie" with one chapter; teacher keeps the lists.
 *   All removed afterwards.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY, screenWidths } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const readerId = '00000000-0000-4000-8000-000000000007';
const storySlug = 'reading-lists-e2e';
const listName = 'Rainy day reads';

/** Removes the spec's story and chapter and the reader's lists. */
function cleanUp() {
  runSql(`delete from public.reports where item_type = 'reading_list';
    delete from public.reading_lists where user_id = '${readerId}';
    delete from public.library_entries where user_id = '${readerId}'
      and story_id in (select id from public.stories where slug = '${storySlug}');
    delete from public.chapters where code = 'rdle2e01';
    delete from public.stories where slug = '${storySlug}';
    update public.profiles set locale = 'ro' where handle in ('teacher', 'adult_writer');`);
}

/** The story: one published chapter, open to all ages. */
function seedStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('00000000-0000-4000-8000-000000000001', '${storySlug}', 'Lista de ploaie', 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select stories.id, stories.user_id, 'rdle2e01', 1, 'Capitol', 'x', 10, 'published',
      'Capitolul 1', 'Un text scurt.', 10, now()
    from public.stories where stories.slug = '${storySlug}';`);
}

/** The ID of the reader's list with this name. */
function listIdOf(name: string): string {
  return runSql(
    `select id from public.reading_lists where user_id = '${readerId}' and name = '${name}';`,
  ).trim();
}

/** Opens a page in a fresh browser context, as a persona or a visitor. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  path: string,
  language: 'en' | 'ro' = 'en',
) {
  const context = await browser.newContext();
  if (persona !== null) {
    runSql(`update public.profiles set locale = '${language}' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('reading lists (GAPS-6)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('a reader makes a list and adds a story from the story page', async ({ browser }) => {
    // Step 1: "New list" in the Library, a name, and the list's own page opens.
    const page = await openAs(browser, 'teacher', '/library');
    await expect(page.getByRole('heading', { level: 2, name: 'Bookshelves' })).toBeVisible();
    await expect(
      page.getByText('0 of 3 bookshelves · 10 books each on the free plan'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'New bookshelf' }).click();
    await expect(page.getByLabel('Bookshelf name')).toBeFocused();
    await page.getByLabel('Bookshelf name').fill(listName);
    await page.getByRole('button', { name: 'Create bookshelf' }).click();
    await expect(page.getByRole('heading', { level: 1, name: listName })).toBeVisible();
    await expect(page).toHaveURL(/\/library\/lists\/[0-9a-f-]{36}$/);
    await expect(page.getByText('0 stories')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No stories yet' })).toBeVisible();
    // Step 2: the story page's "Add to a bookshelf" sheet puts the story on it.
    await page.goto(`/s/${storySlug}`);
    await page.getByRole('button', { name: /^(Add to|In) library$/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Add to a bookshelf' });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText('0 of 10', { exact: true })).toBeVisible();
    await expect(
      sheet.getByText('On the free plan: 3 bookshelves, 10 books on each.'),
    ).toBeVisible();
    await sheet.getByRole('button', { name: `Add to ${listName}` }).click();
    await expect(sheet.getByRole('button', { name: `Take off ${listName}` })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect
      .poll(() =>
        runSql(
          `select count(*) from public.reading_list_stories where user_id = '${readerId}';`,
        ).trim(),
      )
      .toBe('1');
    // Step 3: the Library counts it, says who sees the bookshelf and offers the + to Read.
    await page.goto('/library');
    await expect(page.getByText('1 of 10 books · Only you')).toBeVisible();
    await expect(page.getByRole('link', { name: `Find stories for ${listName}` })).toHaveAttribute(
      'href',
      '/discover',
    );
    await page.getByRole('link', { name: listName, exact: true }).click();
    await expect(page.getByRole('link', { name: /Lista de ploaie/ }).first()).toBeVisible();
    await page.context().close();
  });

  test('a private list is nobody else’s to see; a public one opens with Report', async ({
    browser,
  }) => {
    const address = `/library/lists/${listIdOf(listName)}`;
    // Step 1: private: another account and a visitor both get "no such list".
    const other = await openAs(browser, 'adult_writer', address);
    await expect(other.getByRole('heading', { name: 'There is no such bookshelf' })).toBeVisible();
    const visitor = await openAs(browser, null, address);
    await expect(
      visitor.getByRole('heading', { name: 'There is no such bookshelf' }),
    ).toBeVisible();
    // Step 2: the owner makes it public.
    const owner = await openAs(browser, 'teacher', address);
    await owner.getByLabel('Who sees it').selectOption('public');
    await expect
      .poll(() =>
        runSql(`select is_public from public.reading_lists where user_id = '${readerId}';`).trim(),
      )
      .toBe('t');
    // Step 3: a visitor sees the list, whose it is and its story, with no owner's tools.
    await visitor.reload();
    await expect(visitor.getByRole('heading', { level: 1, name: listName })).toBeVisible();
    await expect(visitor.getByText('A bookshelf by')).toBeVisible();
    await expect(visitor.getByRole('link', { name: /Lista de ploaie/ }).first()).toBeVisible();
    await expect(visitor.getByRole('heading', { name: 'Manage bookshelf' })).toHaveCount(0);
    // Step 4: another account can report it, and has no owner's tools either.
    await other.reload();
    await expect(
      other.getByRole('button', { name: `Report the bookshelf “${listName}”` }),
    ).toBeVisible();
    await expect(other.getByRole('button', { name: 'Delete bookshelf' })).toHaveCount(0);
    for (const page of [other, visitor, owner]) await page.context().close();
  });

  test('a name is used once; the owner takes a story out and deletes the list', async ({
    browser,
  }) => {
    // Step 1: a second list can't take the first one's name, capitals aside.
    const page = await openAs(browser, 'teacher', '/library');
    await page.getByRole('button', { name: 'New bookshelf' }).click();
    await page.getByLabel('Bookshelf name').fill(listName.toUpperCase());
    await page.getByRole('button', { name: 'Create bookshelf' }).click();
    await expect(
      page.getByText('Another bookshelf has that name. Choose a different one.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    // Step 2: on the list's page, "Remove" takes the story out at once and Undo puts it back
    // (design books item 14); a second Remove keeps it out.
    await page.getByRole('link', { name: listName, exact: true }).click();
    const remove = page.getByRole('button', { name: 'Remove Lista de ploaie from this bookshelf' });
    await remove.click();
    await expect(page.getByText('0 stories')).toBeVisible();
    await page
      .locator('[aria-live]')
      .filter({ hasText: 'Lista de ploaie is off the bookshelf.' })
      .getByRole('button', { name: 'Undo' })
      .click();
    await expect(page.getByText('1 story')).toBeVisible();
    await remove.click();
    await expect(page.getByText('0 stories')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No stories yet' })).toBeVisible();
    // Step 3: "Delete list" asks once more, then the Library no longer shows it.
    await page.getByRole('button', { name: 'Delete bookshelf' }).click();
    await expect(
      page.getByText(`Delete “${listName}”? The stories stay where they are.`),
    ).toBeFocused();
    await page.getByRole('button', { name: 'Yes, delete' }).click();
    await expect(page).toHaveURL(/\/library$/);
    await expect(page.getByText('No bookshelves yet.')).toBeVisible();
    expect(
      runSql(`select count(*) from public.reading_lists where user_id = '${readerId}';`).trim(),
    ).toBe('0');
    await page.context().close();
  });

  test('"Notification settings" opens Settings at its notifications part', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/library');
    await page.getByRole('link', { name: 'Notification settings' }).click();
    await expect(page).toHaveURL(/\/settings#notifications$/);
    await page.context().close();
  });

  test('a name and a title that are one long word stay inside a 390 px screen', async ({
    browser,
  }) => {
    // Break test, 10 Nov 2026: a 60-letter name ran past the phone's edge in the list page's
    // breadcrumb and in "Add to a bookshelf", and a one-word story title ran over the next card.
    const longName = 'Supercalifragilisticexpialidociousandthensomemorelettersxyza';
    runSql(`update public.stories set title = 'Pneumonoultramicroscopicsilicovolcanoconiosisstory'
        where slug = '${storySlug}';
      insert into public.reading_lists (user_id, name) values ('${readerId}', '${longName}');
      insert into public.reading_list_stories (list_id, user_id, story_id)
        select reading_lists.id, '${readerId}', stories.id
        from public.reading_lists, public.stories
        where reading_lists.user_id = '${readerId}' and stories.slug = '${storySlug}';`);
    const page = await openAs(browser, 'teacher', `/library/lists/${listIdOf(longName)}`);
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(page.getByRole('heading', { level: 1, name: longName })).toBeVisible();
    await expect(page.getByRole('link', { name: /Pneumonoultra/ }).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    await page.goto(`/s/${storySlug}`);
    await page.getByRole('button', { name: /^(Add to|In) library$/ }).click();
    await expect(page.getByRole('button', { name: `Take off ${longName}` })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    // Back to how the other tests expect things.
    runSql(`delete from public.reading_lists where user_id = '${readerId}';
      update public.stories set title = 'Lista de ploaie' where slug = '${storySlug}';`);
    await page.context().close();
  });

  test('the Library with a list and the list’s page pass axe at every width', async ({
    browser,
  }) => {
    // A list with the story in it, made straight in the database.
    runSql(`insert into public.reading_lists (user_id, name) values ('${readerId}', '${listName}');
      insert into public.reading_list_stories (list_id, user_id, story_id)
        select reading_lists.id, '${readerId}', stories.id
        from public.reading_lists, public.stories
        where reading_lists.user_id = '${readerId}' and stories.slug = '${storySlug}';`);
    const listAddress = `/library/lists/${listIdOf(listName)}`;
    for (const language of ['en', 'ro'] as const) {
      const page = await openAs(browser, 'teacher', '/library', language);
      for (const address of ['/library', listAddress]) {
        for (const width of screenWidths) {
          await checkScreen(page, { address, width, theme: 'light', language });
          await expectNoDoodles(page);
        }
      }
      await checkScreen(page, { address: listAddress, width: 390, theme: 'night', language });
      await page.context().close();
    }
  });
});
