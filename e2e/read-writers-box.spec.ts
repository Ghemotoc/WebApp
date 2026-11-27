/**
 * The Writers box on the Read page and its staff side, in a real browser (user story 1.4, board
 * A04; Robert, 25 Nov 2026: every widget the boards draw, editable from the admin site).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - an admin picks a writer for "To follow this week" in Stories › Featured, with a reason, and
 *   the screen lists the pick;
 * - a member then sees the box "Writers" on Read with that writer under "To follow this week";
 * - an unknown username is refused with a plain sentence;
 * - the staff section passes axe at 390 px by day, in English and Romanian.
 * Test data: one story with a chapter out for adult_writer; the picks are cleared after.
 */
import { type Browser } from '@playwright/test';
import { expect, test } from './support/test';

import { checkScreen, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** Removes the spec's story and every pick, so other specs see the automatic list. */
function cleanUp() {
  runSql(`delete from public.chapters where code like 'rwbe2e%';
    delete from public.stories where slug = 'read-writers-e2e';
    delete from public.writer_follow_picks;
    update public.profiles set locale = 'ro' where handle in ('admin', 'teacher');`);
}

/** One story with a chapter out for adult_writer, so the writer can be suggested. */
function seedStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      rating, first_published_at, last_chapter_published_at)
    values ('00000000-0000-4000-8000-000000000001', 'read-writers-e2e', 'Scrisori din gară',
      'Scrisori lăsate într-o gară.', 'ro', (select id from public.categories where slug = 'fiction'),
      'all_ages', now() - interval '2 days', now() - interval '2 days');
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
      status, published_title, published_body, published_word_count, first_published_at)
    select stories.id, stories.user_id, 'rwbe2e01', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1,
      now() - interval '2 days'
    from public.stories where slug = 'read-writers-e2e';`);
}

/**
 * Opens an address as a persona, in a language, at desktop width.
 *
 * @returns the page
 */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
  language: 'en' | 'ro',
) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  runSql(`update public.profiles set locale = '${language}' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** adult_writer's name as rows show it: the pen name, else the username. */
function adultWriterName(): string {
  return runSql(
    `select coalesce(nullif(pen_name, ''), handle) from public.profiles where handle = 'adult_writer';`,
  ).trim();
}

test.describe('The Writers box on Read (user story 1.4)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('an unknown username is refused with a plain sentence', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/featured', 'en');
    const section = page.getByRole('region', { name: 'To follow this week on Read' });
    await section.getByLabel('Usernames, in order').fill('@nobody_by_this_name');
    await section.getByLabel('Why are you changing the writers to follow?').fill('A try');
    await section.getByRole('button', { name: 'Save writers' }).click();
    await expect(section.getByText('One of the usernames doesn’t match an account.')).toBeVisible();
    await page.context().close();
  });

  test('an admin picks a writer, and a member sees them under To follow this week', async ({
    browser,
  }) => {
    // Step 1: the admin saves the pick with a reason.
    const staffPage = await openAs(browser, 'admin', '/staff/featured', 'en');
    const section = staffPage.getByRole('region', { name: 'To follow this week on Read' });
    await expect(section.getByText(/None picked/)).toBeVisible();
    await section.getByLabel('Usernames, in order').fill('@adult_writer');
    await section.getByLabel('Why are you changing the writers to follow?').fill('Week 48');
    await section.getByRole('button', { name: 'Save writers' }).click();
    await expect(section.getByText('Saved. The Read page shows the new list.')).toBeVisible();
    await expect(
      section.getByRole('list', { name: 'Writers picked now' }).getByText('@adult_writer'),
    ).toBeVisible();
    await staffPage.context().close();
    // Step 2: a member opens Read and finds the writer in the box.
    const page = await openAs(browser, 'teacher', '/discover', 'en');
    const box = page.getByRole('region', { name: 'Writers', exact: true });
    const toFollow = box.getByRole('list', { name: 'To follow this week' });
    await expect(toFollow.getByRole('link', { name: adultWriterName() })).toBeVisible();
    await page.context().close();
  });

  for (const language of ['en', 'ro'] as const) {
    test(`axe: the staff section at 390 px, light, ${language}`, async ({ browser }) => {
      const page = await openAs(browser, 'admin', '/', language);
      await checkScreen(page, { address: '/staff/featured', width: 390, theme: 'light', language });
      await page.context().close();
    });
  }
});
