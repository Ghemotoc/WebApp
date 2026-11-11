/**
 * The easier page builder in a real browser (story S1-E11-34; bundle CMS-2b).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a moderator finds Page builder in the staff menu, starts a page and adds a Cards block from
 *   the grouped list, with a one-line hint for the kind picked (criteria 1 and 2);
 * - a Cards block starts with two cards in both languages, and Add a card adds a third to both;
 * - a support person is told the page builder isn't part of their role (criterion 6);
 * - a visitor sees cards, steps, a quote and a call to action as real headings, lists and a link;
 * - the public page passes axe at 390, 768 and 1440 px, light and night, ro and en.
 * Test data: pages whose address ends in "-builder-e2e", deleted afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** Both languages of one builder block, as JSON text for the published page below. */
function words(ro: Record<string, unknown>, en: Record<string, unknown>): string {
  return `"ro": ${JSON.stringify(ro)}, "en": ${JSON.stringify(en)}`;
}

/** A published page with the hero and four of the five new blocks. */
const builderPageSql = `
  with page as (
    insert into public.landing_pages (slug, page_type)
    values ('shown-builder-e2e', 'campaign') returning id
  )
  insert into public.landing_page_versions (page_id, content, status, show_from, published_at)
  select id, '{"theme": "sage", "blocks": [
    {"id": "h", "kind": "hero", ${words({ title: 'Atelier de poezie', intro: 'O săptămână.' }, { title: 'Poetry workshop', intro: 'One week.' })}},
    {"id": "c", "kind": "cards", ${words(
      {
        heading: 'Ce primești',
        entries: [
          { title: 'Sfaturi', body: 'De la scriitori.' },
          { title: 'Prieteni', body: 'Care citesc.' },
        ],
      },
      {
        heading: 'What you get',
        entries: [
          { title: 'Tips', body: 'From writers.' },
          { title: 'Friends', body: 'Who read.' },
        ],
      },
    )}},
    {"id": "s", "kind": "steps", ${words(
      {
        heading: 'Cum începi',
        entries: [
          { title: 'Alege', body: 'O temă.' },
          { title: 'Scrie', body: 'Zece rânduri.' },
        ],
      },
      {
        heading: 'How to start',
        entries: [
          { title: 'Pick', body: 'A theme.' },
          { title: 'Write', body: 'Ten lines.' },
        ],
      },
    )}},
    {"id": "q", "kind": "quote", ${words({ quote: 'Scrie zilnic.', source: 'O scriitoare' }, { quote: 'Write daily.', source: 'A writer' })}},
    {"id": "a", "kind": "call_to_action", "link": "/discover", ${words(
      { heading: 'Gata?', body: 'Intră acum.', button_label: 'Începe' },
      { heading: 'Ready?', body: 'Come in now.', button_label: 'Start' },
    )}}
  ]}'::jsonb, 'published', public.romania_today(), now()
  from page;`;

/** Removes this spec's pages. */
const cleanUpSql = `
  delete from public.landing_page_versions where page_id in (select id from public.landing_pages where slug like '%-builder-e2e');
  delete from public.landing_pages where slug like '%-builder-e2e';`;

/** Opens an address in English, as a persona or as a visitor. */
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

test.describe('Page builder (S1-E11-34)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => runSql(`${cleanUpSql} ${builderPageSql}`));
  test.afterAll(() =>
    runSql(`${cleanUpSql}
      update public.profiles set locale = 'ro' where handle in ('moderator', 'support');`),
  );

  test('a moderator starts a page and adds cards from the grouped list', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff');
    // Step 1: Page builder is in the menu, though Website isn't.
    await page.getByRole('link', { name: 'Page builder' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Page builder' })).toBeVisible();
    // Step 2: a new page, then a Cards block, whose hint says what it shows.
    await page.getByLabel('Address').fill('atelier-builder-e2e');
    await page.getByRole('button', { name: 'Create page' }).click();
    await expect(page.getByRole('heading', { name: /\/c\/atelier-builder-e2e/ })).toBeVisible();
    await page.getByLabel('Block to add').selectOption({ label: 'Cards' });
    await expect(page.getByText('Two to four cards side by side')).toBeVisible();
    await page.getByRole('button', { name: 'Add a block' }).click();
    // Step 3: two cards in each language to start, and Add a card adds one to both.
    await expect(page.getByRole('group', { name: 'Card 2, English' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Card 3, English' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Add a card' }).click();
    await expect(page.getByRole('group', { name: 'Card 3, English' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Card 3, Română' })).toBeVisible();
  });

  test('a support person is told the page builder isn’t theirs', async ({ browser }) => {
    const page = await openAs(browser, 'support', '/staff/landing-pages');
    await expect(
      page.getByText('Building landing pages isn’t part of your staff role.'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create page' })).toHaveCount(0);
  });

  test('a visitor sees cards, steps, a quote and a call to action', async ({ browser }) => {
    const page = await openAs(browser, null, '/c/shown-builder-e2e');
    await expect(page.getByRole('heading', { level: 2, name: 'What you get' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Tips' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'How to start' })).toBeVisible();
    await expect(page.getByText('Write daily.')).toBeVisible();
    await expect(page.getByText('A writer')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start' })).toHaveAttribute('href', '/discover');
  });

  for (const view of everyView(['/c/shown-builder-e2e'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }
});
