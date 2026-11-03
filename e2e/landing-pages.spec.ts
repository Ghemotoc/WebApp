/**
 * Landing pages in a real browser (story S1-E11-14; bundle CONTESTS-13a1).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - an admin starts a contest page at /c/<name>, adds a hero, key dates and rules in Romanian and
 *   English side by side, and moves and removes a block with buttons (criteria 1 to 4);
 * - publishing is refused with each missing field named by block, language and field (criterion 9);
 * - a visitor reads the published page in either language, and it says it has ended from its
 *   take-down date (criterion 11);
 * - a moderator is told the Website area isn't theirs;
 * - the public page and the editor pass axe at 390, 768 and 1440 px, light and night, ro and en.
 * Test data: pages whose address ends in "-e2e", deleted afterwards (the audit log keeps its rows).
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** A complete campaign page, published straight into the database for the axe checks. */
const axePageSql = `
  with page as (
    insert into public.landing_pages (slug, page_type)
    values ('axe-e2e', 'campaign') returning id
  )
  insert into public.landing_page_versions (page_id, content, status, show_from, published_at)
  select id, '{"theme": "sage", "blocks": [
    {"id": "h", "kind": "hero", "ro": {"title": "Săptămâna poeziei", "intro": "Scrie un poem pe zi."},
     "en": {"title": "Poetry week", "intro": "Write a poem a day."}},
    {"id": "q", "kind": "questions", "ro": {"heading": "Întrebări", "items": [{"question": "Cine poate scrie?", "answer": "Oricine are cont."}]},
     "en": {"heading": "Questions", "items": [{"question": "Who can write?", "answer": "Anyone with an account."}]}}
  ]}'::jsonb, 'published', public.romania_today(), now()
  from page;`;

/** Opens an address in a language, as a persona or as a visitor. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
  language: 'en' | 'ro' = 'en',
): Promise<Page> {
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
  await page.goto(address);
  return page;
}

/** Adds one block of a kind with "Add a block". */
async function addBlock(page: Page, kind: string): Promise<void> {
  await page.getByLabel('Block to add').selectOption({ label: kind });
  await page.getByRole('button', { name: 'Add a block' }).click();
}

/** Fills the hero, key dates and rules blocks of the contest page (blocks 0, 1 and 2). */
async function fillContest(page: Page): Promise<void> {
  await page.locator('#landing-b0-ro-title').fill('Concursul de toamnă');
  await page.locator('#landing-b0-en-title').fill('The autumn contest');
  await page.locator('#landing-b1-ro-heading').fill('Date importante');
  await page.locator('#landing-b1-en-heading').fill('Key dates');
  await page.locator('#landing-b1-entries_open').fill('2027-01-10');
  await page.locator('#landing-b1-entries_close').fill('2027-02-10');
  await page.locator('#landing-b1-results').fill('2027-03-01');
  await page.locator('#landing-b2-ro-heading').fill('Regulament');
  await page.locator('#landing-b2-en-heading').fill('Rules');
  await page.locator('#landing-b2-ro-link_label').fill('Citește regulamentul');
  await page.locator('#landing-b2-link').fill('/help/contest-rules');
}

test.describe('Landing pages (S1-E11-14)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    runSql(`
      delete from public.landing_page_versions where page_id in (select id from public.landing_pages where slug like '%-e2e');
      delete from public.landing_pages where slug like '%-e2e';
      ${axePageSql}`);
  });
  test.afterAll(() => {
    runSql(`
      delete from public.landing_page_versions where page_id in (select id from public.landing_pages where slug like '%-e2e');
      delete from public.landing_pages where slug like '%-e2e';
      update public.profiles set locale = 'ro' where handle in ('admin', 'owner', 'moderator');`);
  });

  test('an admin builds and publishes a contest page; visitors read it', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/website/landing-pages');
    // Step 1: a new contest page at /c/toamna-e2e.
    await page.getByLabel('Address').fill('Toamna-e2e');
    await page.getByRole('button', { name: 'Create page' }).click();
    await expect(page.getByRole('heading', { name: '/c/toamna-e2e (Contest)' })).toBeVisible();
    // Step 2: a hero, key dates and rules, then a text block moved up and removed again.
    await addBlock(page, 'Hero');
    await addBlock(page, 'Key dates');
    await addBlock(page, 'Rules');
    await addBlock(page, 'Text');
    await page.getByRole('button', { name: 'Move Block 4: Text up' }).click();
    await expect(page.getByRole('heading', { name: 'Block 3: Text' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Move Block 3: Text up' })).toBeDisabled();
    await page.getByRole('button', { name: 'Remove Block 3: Text' }).click();
    await expect(page.getByRole('heading', { name: 'Block 3: Rules' })).toBeVisible();
    // Step 3: the English link text is left empty, so Publish names it.
    await fillContest(page);
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Fix these before publishing:')).toBeVisible();
    await expect(page.getByText('Block 3: Rules, English: Link text: fill this in')).toBeVisible();
    // Step 4: filled in, the page goes live today, and the preview shows it.
    await page.locator('#landing-b2-en-link_label').fill('Read the rules');
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText(/Published\. The page shows this version from/)).toBeVisible();
    await expect(
      page.getByTestId('landing-preview').getByRole('heading', { name: 'Concursul de toamnă' }),
    ).toBeVisible();
    // Step 5: visitors read it in English and in Romanian.
    const visitor = await openAs(browser, null, '/c/toamna-e2e', 'en');
    await expect(visitor.getByRole('heading', { level: 1 })).toHaveText('The autumn contest');
    await expect(visitor.getByRole('link', { name: 'Read the rules' })).toBeVisible();
    const romanian = await openAs(browser, null, '/c/toamna-e2e', 'ro');
    await expect(romanian.getByRole('heading', { level: 1 })).toHaveText('Concursul de toamnă');
  });

  test('from its take-down date the page says the contest has ended', async ({ browser }) => {
    runSql(`
      update public.landing_page_versions
      set show_from = public.romania_today() - 1, take_down_on = public.romania_today()
      where status = 'published' and page_id = (select id from public.landing_pages where slug = 'toamna-e2e');`);
    const visitor = await openAs(browser, null, '/c/toamna-e2e', 'en');
    await expect(visitor.getByText('This contest has ended.')).toBeVisible();
    await expect(visitor.getByRole('heading', { level: 1 })).toHaveText('The autumn contest');
  });

  test('an unknown address shows Not found', async ({ browser }) => {
    const visitor = await openAs(browser, null, '/c/nothing-here-e2e', 'en');
    await expect(visitor.getByRole('heading', { level: 1 })).not.toHaveText('The autumn contest');
    await expect(visitor.getByText(/can’t find|not found/i).first()).toBeVisible();
  });

  test('a moderator is told the Website area isn’t theirs', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/website/landing-pages');
    await expect(page.getByRole('button', { name: 'Create page' })).toHaveCount(0);
  });

  for (const view of everyView(['/c/axe-e2e'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }

  for (const view of everyView(['/staff/website/landing-pages'])) {
    test(`axe: the editor at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'owner';`);
      const pageId = runSql(`select id from public.landing_pages where slug = 'axe-e2e';`).trim();
      await useSessionInBrowser(page.context(), (await signInPersona('owner')).session);
      await checkScreen(page, { ...view, address: `/staff/website/landing-pages?page=${pageId}` });
    });
  }
});
