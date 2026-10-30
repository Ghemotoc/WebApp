/**
 * The classics shelf and the rest of staff Classics work, in a real browser (stories S1-E5-06 and
 * S1-E11-16, part 16b).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - Discover shows the "Public-domain classics" shelf, and "View more" opens every classic at
 *   /discover/all/classics (S1-E5-06 criterion 2);
 * - an admin imports a research list (CSV): the new rows become drafts that say their details need
 *   checking, a repeated row is skipped and a bad row is named with its reason;
 * - the import's author shows under "Newly in the public domain" when their year comes round;
 * - an admin fixes a typo in a published classic with a reason, and readers see the fix;
 * - the Classics page and the classics list pass axe at 390 px, light, ro and en.
 * Test data: two published classics of the spec's own (owned by adult_writer as a stand-in for
 * the classics account, with a made-up author), and the drafts the import makes under the house
 * classics account; all removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';
import { createTestAccount } from './support/testAccounts';

const authorName = 'Autor Raft Clasic';
const importedAuthor = 'Autoare Importată Shelfe';
const typoCode = 'clshf001';

/** Removes the spec's classics, the imported drafts and both authors. */
function cleanUp() {
  runSql(`delete from public.classic_works where story_id in (select id from public.stories
      where classic_author_id in (select id from public.classic_authors where name in ('${authorName}', '${importedAuthor}')));
    delete from public.chapter_revisions where chapter_id in (select id from public.chapters where code like 'clshf%');
    delete from public.chapters where code like 'clshf%';
    delete from public.stories where classic_author_id in
      (select id from public.classic_authors where name in ('${authorName}', '${importedAuthor}'));
    delete from public.classic_authors where name in ('${authorName}', '${importedAuthor}');
    update public.profiles set locale = 'ro' where handle = 'admin';`);
}

/**
 * Two published classics by a made-up author who died in 1901; the first has its details. The
 * import needs the house classics account (made by hand on staging and production), so a local
 * database without it gets a throwaway one, kept for the next run.
 */
function seedClassics() {
  cleanUp();
  const houseAccount = runSql(`select count(*) from public.profiles
    where handle = (select value #>> '{}' from public.settings where key = 'classics_account_handle');`);
  if (houseAccount.trim() === '0') {
    createTestAccount('classics-house-e2e@example.com', 'a long and private passphrase', 'clasice');
  }
  runSql(`insert into public.classic_authors (name, died_year) values ('${authorName}', 1901);
    insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at, classic_author_id)
    select '00000000-0000-4000-8000-000000000001', 'classics-shelf-e2e-' || number,
      'Raft clasic ' || number, 'x', 'ro', (select id from public.categories where slug = 'fiction'),
      'completed', 'all_ages', now(), now(), (select id from public.classic_authors where name = '${authorName}')
    from generate_series(1, 2) as number;
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'clshf00' || right(slug, 1), 1, 'Unu', 'A fost odata un crai.', 5,
      'published', 'Unu', 'A fost odata un crai.', 5, now()
    from public.stories where slug like 'classics-shelf-e2e-%';
    insert into public.classic_works (story_id, kind, original_language, source_title, source_url, added_by_user_id)
    select id, 'fairy_tale', 'ro', 'Wikisource', 'https://ro.wikisource.org/wiki/Raft',
      '00000000-0000-4000-8000-000000000009'
    from public.stories where slug = 'classics-shelf-e2e-1';`);
}

/** Opens a page as the admin persona, in a language. */
async function openAsAdmin(browser: Browser, address: string, language: 'en' | 'ro') {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = '${language}' where handle = 'admin';`);
  await useSessionInBrowser(context, (await signInPersona('admin')).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** A small research list: a new author's work, the same work again, and a row of unknown kind. */
function researchList(): string {
  const year = new Date().getFullYear() - 70;
  return [
    'title,author,author_died,type,language,pd_romania_2026,source_url,notes',
    `Poezii de import,${importedAuthor},${year},poetry,ro,no,https://ro.wikisource.org/wiki/I,`,
    `Poezii de import,${importedAuthor},${year},poetry,ro,no,https://ro.wikisource.org/wiki/I,`,
    `"Ciudat, nu?",${importedAuthor},${year},comic,ro,no,https://ro.wikisource.org/wiki/C,`,
  ].join('\n');
}

/** The Classics page's card for a work. */
function cardOf(page: Page, title: string) {
  return page.getByRole('article', { name: title });
}

test.describe('classics shelf and staff Classics, part 16b (S1-E5-06, S1-E11-16)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedClassics);
  test.afterAll(cleanUp);

  test('Discover shows the classics shelf, and View more lists every classic', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.goto('/discover');
    const shelf = page.getByRole('region', { name: /Public-domain classics/ }).first();
    await expect(shelf.getByRole('link', { name: /Raft clasic 1/ }).first()).toBeVisible();
    await page.goto('/discover/all/classics');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Public-domain classics');
    await expect(page.getByRole('link', { name: /Raft clasic 2/ }).first()).toBeVisible();
  });

  test('an admin imports a research list; new rows wait for a check, bad rows are named', async ({
    browser,
  }) => {
    const page = await openAsAdmin(browser, '/staff/classics', 'en');
    await page.getByLabel('Open a CSV list').setInputFiles({
      name: 'list.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(researchList(), 'utf8'),
    });
    await expect(
      page.getByText('Added 1 draft. Already listed: 1. Not imported: 1.'),
    ).toBeVisible();
    await expect(page.getByRole('list', { name: 'Rows not imported' })).toContainText(
      'Line 3, “Ciudat, nu?”',
    );
    const card = cardOf(page, 'Poezii de import');
    await expect(card).toContainText('Check the details before publishing');
    // The author becomes free next 1 January, so the suggestions list them for next year.
    await expect(page.getByRole('list', { name: /Free from 1 January/ })).toContainText(
      importedAuthor,
    );
  });

  test('an admin fixes a typo in a published classic, and readers see it', async ({ browser }) => {
    const page = await openAsAdmin(browser, '/staff/classics', 'en');
    const card = cardOf(page, 'Raft clasic 1');
    await card.getByRole('button', { name: 'Fix a typo' }).click();
    const text = card.getByLabel('Text of “Unu”');
    await expect(text).toHaveValue('A fost odata un crai.');
    await text.fill('A fost odată un crai.');
    await card.getByLabel('Reason').fill('The source has “odată”.');
    await card.getByRole('button', { name: 'Save the fix' }).click();
    await expect(card.getByText('Fixed. Readers now see the corrected text.')).toBeVisible();
    await expect(card.getByText('1 earlier fix')).toBeVisible();
    expect(
      runSql(`select published_body from public.chapters where code = '${typoCode}';`).trim(),
    ).toBe('A fost odată un crai.');
  });

  for (const language of ['ro', 'en'] as const) {
    test(`axe: the Classics page at 390 px, light, ${language}`, async ({ browser }) => {
      const page = await openAsAdmin(browser, '/staff/classics', language);
      await checkScreen(page, { address: '/staff/classics', width: 390, theme: 'light', language });
    });

    test(`axe: the classics list at 390 px, light, ${language}`, async ({ page }) => {
      await checkScreen(page, {
        address: '/discover/all/classics',
        width: 390,
        theme: 'light',
        language,
      });
    });
  }
});
