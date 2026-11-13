/**
 * Remind me on a landing page in a real browser (story S1-E11-14 criterion 8; bundle
 * CONTESTS-13a2b).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a visitor who isn't signed in is asked to log in;
 * - a signed-in reader taps Remind me, sees when they will be reminded, and can cancel;
 * - on the day entries open the hourly job sends one notification, which names the page and
 *   leads to it;
 * - the block passes axe at 390, 768 and 1440 px, light and night, ro and en.
 * Test data: the page /c/remind-e2e, published straight into the database, and its reminders
 * and notifications, deleted afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The page's content, with entries opening on a day given as SQL. */
function contentSql(opensOnSql: string): string {
  return `jsonb_build_object('theme', 'sky', 'blocks', jsonb_build_array(
    '{"id": "h", "kind": "hero", "ro": {"title": "Concursul de iarnă"}, "en": {"title": "The winter contest"}}'::jsonb,
    jsonb_build_object('id', 'd', 'kind', 'key_dates', 'ro', jsonb_build_object('heading', 'Date importante'),
      'en', jsonb_build_object('heading', 'Key dates'),
      'dates', jsonb_build_object('entries_open', (${opensOnSql})::text,
        'entries_close', (${opensOnSql} + 30)::text, 'results', (${opensOnSql} + 40)::text)),
    '{"id": "r", "kind": "remind_me", "ro": {"heading": "Nu rata începutul"}, "en": {"heading": "Don’t miss the start"}}'::jsonb))`;
}

/** Removes this spec's page, its reminders and its notifications. */
const cleanUpSql = `
  delete from public.notifications where landing_page_id in (select id from public.landing_pages where slug = 'remind-e2e');
  delete from public.landing_page_versions where page_id in (select id from public.landing_pages where slug = 'remind-e2e');
  delete from public.landing_pages where slug = 'remind-e2e';`;

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

test.describe('Remind me on landing pages (S1-E11-14)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    // Entries open in three days, so a reminder can still be asked for.
    runSql(`${cleanUpSql}
      with page as (
        insert into public.landing_pages (slug, page_type) values ('remind-e2e', 'campaign') returning id
      )
      insert into public.landing_page_versions (page_id, content, status, show_from, published_at)
      select id, ${contentSql('public.romania_today() + 3')}, 'published', public.romania_today(), now()
      from page;`);
  });
  test.afterAll(() => {
    runSql(`${cleanUpSql}
      update public.profiles set locale = 'ro' where handle = 'adult_writer';`);
  });

  test('a visitor who isn’t signed in is asked to log in', async ({ browser }) => {
    const visitor = await openAs(browser, null, '/c/remind-e2e');
    await expect(visitor.getByRole('heading', { name: 'Don’t miss the start' })).toBeVisible();
    await expect(visitor.getByText(/Log in and we’ll remind you that day/)).toBeVisible();
    await expect(visitor.getByRole('link', { name: 'Get in' }).last()).toHaveAttribute(
      'href',
      '/sign-in',
    );
    await visitor.context().close();
  });

  test('a reader asks to be reminded, cancels, asks again and gets one notification', async ({
    browser,
  }) => {
    // Step 1: ask, cancel, ask again.
    const reader = await openAs(browser, 'adult_writer', '/c/remind-e2e');
    await reader.getByRole('button', { name: 'Remind me' }).click();
    await expect(reader.getByText(/We’ll remind you on/)).toBeVisible();
    await reader.getByRole('button', { name: 'Don’t remind me' }).click();
    await expect(reader.getByRole('button', { name: 'Remind me' })).toBeVisible();
    await reader.getByRole('button', { name: 'Remind me' }).click();
    await expect(reader.getByText(/We’ll remind you on/)).toBeVisible();

    // Step 2: entries open today, and the hourly job runs.
    runSql(`
      update public.landing_page_versions set content = ${contentSql('public.romania_today()')}
      where page_id = (select id from public.landing_pages where slug = 'remind-e2e');
      select public.send_landing_reminders();`);

    // Step 3: the page now says entries are open; the notification names the page and leads there.
    await reader.reload();
    await expect(reader.getByText('Entries are open.')).toBeVisible();
    await reader.goto('/notifications');
    await expect(reader.getByText('entries are open for “The winter contest”.')).toBeVisible();
    await reader.getByRole('link', { name: 'Open the page' }).first().click();
    await expect(reader).toHaveURL(/\/c\/remind-e2e$/);
    await reader.context().close();
  });

  for (const view of everyView(['/c/remind-e2e'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }
});
