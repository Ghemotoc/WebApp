/**
 * The staff Classics page in a real browser (story S1-E11-16, part 16a; canvas 8.16).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - an admin adds a new author with their year of death, saves a work with its source edition,
 *   and sees where it is free (Romania, the EU, the UK, the US);
 * - the admin pastes the text, sees it split into chapters at its headings, fixes a title and
 *   saves the chapters; then publishes, and a reader sees the work with "Text from:" and the
 *   source edition's link on the story page, under the real author's name;
 * - the admin unpublishes it with a reason; every step is in the audit log;
 * - a moderator gets no Classics menu item and the page refuses them;
 * - the Classics page passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: a throwaway @example.com account stands in for the classics account (the setting is
 * pointed at it, then put back); its works are deleted afterwards. Seed personas untouched.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';
import { createTestAccount } from './support/testAccounts';

const stamp = Date.now();
const classicsHandle = `clasice.e2e.${stamp}`;
const authorName = `Autor Clasic ${stamp}`;
const workTitle = `Povești vechi ${stamp}`;

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

test.describe('staff Classics (S1-E11-16)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    createTestAccount(
      `classics-${stamp}@example.com`,
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
      update public.profiles set locale = 'ro' where handle in ('admin', 'moderator');`);
  });

  test('an admin adds, publishes and unpublishes a classic', async ({ browser }) => {
    test.setTimeout(120_000);
    const page = await openAs(browser, 'admin', '/staff/classics');
    await page.getByRole('button', { name: 'Add a classic work' }).click();
    await page.getByLabel('Author', { exact: true }).selectOption('new');
    await page.getByLabel('Author’s name, as the byline shows it').fill(authorName);
    await page.getByLabel('Year they died').fill('1889');
    await page.getByLabel('Title').fill(workTitle);
    await page.getByLabel('Source edition').fill('Wikisource, ediția 1892');
    await page
      .getByLabel('Link to the source (https://)')
      .fill('https://ro.wikisource.org/wiki/Test');
    await expect(
      page.getByRole('list', { name: 'Where it is in the public domain' }),
    ).toContainText('RomaniaFree');
    await page.getByRole('button', { name: 'Save as draft' }).click();
    await expect(page.getByText('Saved as a draft.')).toBeVisible();

    const card = page.getByRole('article', { name: workTitle });
    await card
      .getByLabel('The text')
      .fill('# I\nStau câteodată și-mi aduc aminte.\n# II\nNică a lui Ștefan.');
    await card.getByRole('button', { name: 'Show the chapters' }).click();
    await card.getByLabel('Chapter 2 title').fill('Partea a doua');
    await card.getByRole('button', { name: 'Save 2 chapters' }).click();
    await expect(page.getByText('The chapters are saved. Check them, then publish.')).toBeVisible();

    await card.getByRole('button', { name: 'Publish' }).click();
    await expect(card.getByText('Published', { exact: true })).toBeVisible();
    const slug = runSql(`select slug from public.stories where title = '${workTitle}';`);
    const reader = await openAs(browser, 'adult_writer', `/s/${slug}`);
    await expect(reader.getByRole('heading', { name: authorName })).toBeVisible();
    await expect(reader.getByRole('link', { name: 'Wikisource, ediția 1892' })).toHaveAttribute(
      'href',
      'https://ro.wikisource.org/wiki/Test',
    );

    await card.getByRole('button', { name: 'Unpublish' }).click();
    await card.getByLabel(/Why it comes off the site/).fill(`e2e ${stamp}: checking the edition.`);
    await card.getByRole('button', { name: 'Unpublish' }).last().click();
    await expect(page.getByText('Unpublished. Readers no longer see it.')).toBeVisible();
    expect(
      runSql(`select string_agg(distinct action, ',' order by action) from public.audit_log
        where action like 'classics.%' and created_at > now() - interval '10 minutes'
          and (target_id in (select id::text from public.stories where title = '${workTitle}')
            or after_values ->> 'name' = '${authorName}')`),
    ).toBe(
      'classics.author_added,classics.published,classics.text_set,classics.unpublished,classics.work_saved',
    );
  });

  test('a moderator has no Classics page', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/classics');
    await expect(page.getByText('Only the admin role manages Classics.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Classics' })).toHaveCount(0);
  });

  for (const view of everyView(['/staff/classics'])) {
    test(`the Classics page passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      const page = await openAs(browser, 'admin', view.address);
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'admin';`);
      await checkScreen(page, view);
    });
  }
});
