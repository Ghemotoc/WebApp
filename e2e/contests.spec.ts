/**
 * Contests in a real browser: setting one up, opening it, entering and withdrawing (story
 * S1-E11-15 criteria 1 to 3; bundle CONTESTS-13b1).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - an admin starts a contest on a contest landing page, fills in every detail in Staff ›
 *   Contests, sees what still stops it from opening, and opens it once nothing does (criteria 1
 *   and 2);
 * - a writer sees "Enter <contest>" in their story's settings while entries are open, enters the
 *   story and withdraws it (criterion 3);
 * - both screens pass axe.
 * Test data: the landing page /c/concurs-e2e (live, with a Rules block linking to the help page
 * regulament-e2e), that help page in Romanian and English, and one published chapter of the seed
 * story, all made by SQL and deleted afterwards (the audit log keeps its rows).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** Removes this spec's contest, pages and chapter. */
const cleanUpSql = `
  delete from public.contests where landing_page_id in (select id from public.landing_pages where slug = 'concurs-e2e');
  delete from public.landing_page_versions where page_id in (select id from public.landing_pages where slug = 'concurs-e2e');
  delete from public.landing_pages where slug = 'concurs-e2e';
  delete from public.cms_versions where content_kind = 'help_page' and entry_key = 'regulament-e2e';
  delete from public.chapters where code = 'ct2e0001';
  update public.stories set rating = 'all_ages' where slug = 'statia-meteo-seed01';`;

/** The live landing page with key dates and the Rules link, and the rules in both languages. */
const setUpSql = `
  with page as (
    insert into public.landing_pages (slug, page_type) values ('concurs-e2e', 'contest') returning id
  )
  insert into public.landing_page_versions (page_id, status, content, show_from, published_at)
  select page.id, 'published', jsonb_build_object('theme', 'gold', 'blocks', jsonb_build_array(
    '{"id": "h", "kind": "hero", "ro": {"title": "Concursul E2E", "intro": ""}, "en": {"title": "The E2E contest", "intro": ""}}'::jsonb,
    jsonb_build_object('id', 'd', 'kind', 'key_dates', 'ro', '{"heading": "Date", "note": ""}'::jsonb,
      'en', '{"heading": "Dates", "note": ""}'::jsonb, 'dates', jsonb_build_object(
        'entries_open', public.romania_today(), 'entries_close', public.romania_today() + 10,
        'results', public.romania_today() + 20)),
    '{"id": "r", "kind": "rules", "ro": {"heading": "Regulament", "body": "", "link_label": "Citește regulamentul"}, "en": {"heading": "Rules", "body": "", "link_label": "Read the rules"}, "link": "/help/regulament-e2e"}'::jsonb)),
    public.romania_today(), now()
  from page;
  insert into public.cms_versions (content_kind, entry_key, market_code, language_code, content, status, show_from, published_at)
  values
    ('help_page', 'regulament-e2e', 'RO', 'ro', '{"title": "Regulament", "section": "Concursuri", "body": "Regulile.", "isLegal": false}', 'published', public.romania_today(), now()),
    ('help_page', 'regulament-e2e', 'RO', 'en', '{"title": "Rules", "section": "Contests", "body": "The rules.", "isLegal": false}', 'published', public.romania_today(), now());
  insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
    status, published_title, published_body, published_word_count, first_published_at)
  values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'ct2e0001',
    1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 900, now());`;

/** Today and a later day as YYYY-MM-DD, for the date fields. */
function dayFromToday(days: number): string {
  const day = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return day.toISOString().slice(0, 10);
}

/** Opens an address in English as a persona. */
async function openAs(browser: Browser, persona: SignInPersonaName, address: string): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Fills in the editor's text fields with a complete contest. */
async function fillDetails(page: Page): Promise<void> {
  await page.getByLabel('Name in Română').fill('Concursul de probă');
  await page.getByLabel('Name in English').fill('The trial contest');
  // Entries open yesterday, so the time zone of the test machine can't push it to tomorrow.
  await page.getByLabel('Entries open').fill(dayFromToday(-1));
  await page.getByLabel('Entries close').fill(dayFromToday(10));
  await page.getByLabel('Results').fill(dayFromToday(20));
  await page.getByRole('checkbox', { name: '18 and over' }).check();
  await page.getByRole('group', { name: 'Markets' }).getByRole('checkbox').first().check();
  await page.getByRole('checkbox', { name: 'Romanian' }).check();
  await page.getByLabel('What counts, in Română').fill('O povestire');
  await page.getByLabel('What counts, in English').fill('A short story');
  await page.getByLabel('Prize, in Română').fill('O carte');
  await page.getByLabel('Prize, in English').fill('A book');
  await page.getByLabel('Who delivers the prize').fill('The organiser');
  await page.getByLabel('Judges').fill('The editorial team');
  await page.getByLabel('Address of the rules help page').fill('regulament-e2e');
}

test.describe('Contests (S1-E11-15)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => runSql(`${cleanUpSql}${setUpSql}`));
  test.afterAll(() => {
    runSql(`${cleanUpSql}
      update public.profiles set locale = 'ro' where handle in ('admin', 'adult_writer');`);
  });

  test('an admin sets a contest up and opens it once the rules are published and linked', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'admin', '/staff/contests');
    // Step 1: a new contest on the contest landing page.
    await page.getByLabel('Landing page').selectOption('concurs-e2e');
    await page.getByRole('button', { name: 'Create contest' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Untitled contest' })).toBeVisible();
    await expect(page.getByText('Before it can open:')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open the contest' })).toBeDisabled();

    // Step 2: every detail, saved; nothing stops it any more.
    await fillDetails(page);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Saved.', { exact: true })).toBeVisible();
    await expect(page.getByText('Everything is in place.', { exact: false })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(results.violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? ''))).toEqual([]);

    // Step 3: open it.
    await page.getByRole('button', { name: 'Open the contest' }).click();
    await expect(page.getByText(/Open since/)).toBeVisible();
    await page.context().close();
  });

  test('a writer enters a story from its settings and withdraws it', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/write/s/statia-meteo-seed01/settings');
    // Step 1: the Contests card offers the open contest.
    await expect(page.getByRole('group', { name: 'Contests' })).toBeVisible();
    await page.getByRole('button', { name: 'Enter The trial contest' }).click();
    await expect(page.getByText('This story is entered.')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    expect(results.violations.filter((issue) => ['serious', 'critical'].includes(issue.impact ?? ''))).toEqual([]);

    // Step 2: withdraw before entries close.
    await page.getByRole('button', { name: 'Withdraw from The trial contest' }).click();
    await expect(page.getByText(/Your entry is withdrawn/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enter The trial contest' })).toBeVisible();
    await page.context().close();
  });
});
