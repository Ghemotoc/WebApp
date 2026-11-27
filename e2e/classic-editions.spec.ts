/**
 * A classic in several languages on the staff Classics page, in a real browser (bundle
 * TRANSLATE-1d; board TrStaff; Robert, 16 Nov 2026).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - an admin publishes a Romanian classic, opens "Editions" and adds an English edition with its
 *   translator; the edition is a draft inside the same card, not a second card;
 * - the admin adds the edition's text; publishing is refused until the translation rights are
 *   chosen (a translation has its own copyright), then it goes live;
 * - a reader opening the English edition sees "Translated by" with the translator's name and
 *   the "Rights" line; the table on the staff page shows the rights and "2 of 2" chapters;
 * - the open Editions panel passes axe and doesn't scroll sideways at 390, 768 and 1440 px, in
 *   light and night mode, in Romanian and English.
 * Test data: a throwaway @example.com account stands in for the classics account (the setting is
 * pointed at it, then put back); its works are deleted afterwards. Seed personas untouched.
 */
import { type Browser, type Page } from '@playwright/test';
import { expect, test } from './support/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';
import { createTestAccount } from './support/testAccounts';

const stamp = Date.now();
const classicsHandle = `clasice.ed.${stamp}`;
const authorName = `Autor Ediții ${stamp}`;
const workTitle = `Amintiri vechi ${stamp}`;
const editionTitle = `Old memories ${stamp}`;

/** Opens an address in a language as a persona, in a fresh browser context. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
  language = 'en',
): Promise<Page> {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: LANGUAGE_STORAGE_KEY,
    value: language,
  });
  runSql(`update public.profiles set locale = '${language}' where handle = '${persona}';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Adds the Romanian classic with two chapters and publishes it. */
async function publishTheOriginal(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Add a classic work' }).click();
  await page.getByLabel('Author', { exact: true }).selectOption('new');
  await page.getByLabel('Author’s name, as the byline shows it').fill(authorName);
  await page.getByLabel('Year they died').fill('1889');
  await page.getByLabel('Title').fill(workTitle);
  await page.getByLabel('Source edition').fill('Wikisource, ediția 1892');
  await page.getByLabel('Link to the source (https://)').fill('https://ro.wikisource.org/wiki/T');
  await page.getByRole('button', { name: 'Save as draft' }).click();
  await expect(page.getByText('Saved as a draft.')).toBeVisible();
  const card = page.getByRole('article', { name: workTitle });
  await card.getByLabel('The text').fill('# I\nStau câteodată.\n# II\nNică a lui Ștefan.');
  await card.getByRole('button', { name: 'Show the chapters' }).click();
  await card.getByRole('button', { name: 'Save 2 chapters' }).click();
  await expect(page.getByText('The chapters are saved. Check them, then publish.')).toBeVisible();
  await card.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(card.getByText('Published', { exact: true }).first()).toBeVisible();
}

test.describe('editions of a classic (TRANSLATE-1d)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    createTestAccount(
      `classic-editions-${stamp}@example.com`,
      'a long and private passphrase',
      classicsHandle,
    );
    runSql(`update public.settings set value = to_jsonb('${classicsHandle}'::text)
      where key = 'classics_account_handle';`);
  });

  test.afterAll(() => {
    // The works leave the site with their chapters; the setting goes back to the house account.
    runSql(`update public.chapters set deleted_at = now() where story_id in
        (select id from public.stories where title like '%${stamp}');
      update public.stories set deleted_at = now() where title like '%${stamp}';
      update public.settings set value = '"clasice"'::jsonb where key = 'classics_account_handle';
      update public.profiles set locale = 'ro' where handle = 'admin';`);
  });

  test('an admin adds an English edition and publishes it once its rights are chosen', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    const page = await openAs(browser, 'admin', '/staff/classics');
    await publishTheOriginal(page);
    const card = page.getByRole('article', { name: workTitle });

    // A new edition: a language, a title and the translator; saved as a draft of the same classic.
    await card.getByRole('button', { name: 'Editions' }).click();
    const table = card.getByRole('table', { name: `Languages of ${workTitle}` });
    await expect(table.getByRole('row', { name: /Română/ })).toContainText(
      'Public domain (author died 1889)',
    );
    await card.getByRole('button', { name: 'Add an edition' }).click();
    await card.getByLabel('Language', { exact: true }).selectOption('en');
    await card.getByLabel('Title', { exact: true }).fill(editionTitle);
    await card.getByLabel('Translator', { exact: true }).fill('Ana Vlad');
    await card.getByRole('button', { name: 'Save as draft' }).click();
    const englishRow = table.getByRole('row', { name: /English/ });
    await expect(englishRow).toContainText('Not checked');
    await expect(englishRow).toContainText('0 of 2');
    // One card per classic: the edition has no card of its own.
    await expect(page.getByRole('article', { name: editionTitle })).toHaveCount(0);

    // The edition opens by itself for its text.
    const tools = card.getByRole('region', { name: 'The English edition' });
    await tools.getByLabel('The text').fill('# I\nI sometimes sit.\n# II\nNică, son of Ștefan.');
    await tools.getByRole('button', { name: 'Show the chapters' }).click();
    await tools.getByRole('button', { name: 'Save 2 chapters' }).click();
    await expect(page.getByText('The chapters are saved. Check them, then publish.')).toBeVisible();

    // No rights chosen: the database refuses to publish a translation.
    await tools.getByRole('button', { name: 'Publish edition' }).click();
    await expect(page.getByText('Choose the translation rights first.')).toBeVisible();
    await tools.getByLabel('Translation rights').selectOption('made_for_platform');
    await tools.getByRole('button', { name: 'Save as draft' }).click();
    await expect(englishRow).toContainText(/Made for /);
    await tools.getByRole('button', { name: 'Publish edition' }).click();
    await expect(englishRow).toContainText('2 of 2');
    await expect(englishRow).toContainText('Published');

    // A reader of the English edition sees who translated it and why it may be shown.
    const slug = runSql(`select slug from public.stories where title = '${editionTitle}';`);
    const reader = await openAs(browser, 'adult_writer', `/s/${slug}`);
    await expect(reader.getByText(/Translated from .* by Ana Vlad/)).toBeVisible();
    const about = reader.getByRole('heading', { name: 'About this edition' }).locator('..');
    await expect(about).toContainText('Ana Vlad');
    await expect(about).toContainText(/Translated for /);
  });

  test('the open Editions panel passes axe in all 12 views', async ({ browser }) => {
    test.setTimeout(240_000);
    for (const view of everyView(['/staff/classics'])) {
      const page = await openAs(browser, 'admin', view.address, view.language);
      await checkScreen(page, view, async () => {
        const card = page.getByRole('article', { name: workTitle });
        await card.getByRole('button', { name: /^(Editions|Ediții)$/ }).click();
        await card.getByRole('table').getByRole('button').click();
        await expect(card.getByRole('table')).toBeVisible();
      });
      await page.context().close();
    }
  });
});
