/**
 * Hiding a story in chosen countries, in a real browser (bundle COUNTRY-1; Robert, 21 Nov 2026;
 * boards D07 Where it shows and B11 the reader's page).
 *
 * What it proves:
 * - the writer finds "Where it shows" in the story's settings, adds Moldova from "Add a country",
 *   sees it as a pressed chip and saves;
 * - a reader connecting from Moldova gets "This page isn't available here" on the story page and
 *   on a chapter, with the way home and to search, and no part of the story;
 * - the same reader connecting from Sweden reads the chapter;
 * - the page has no serious axe issue at phone and desktop width, by day and at night.
 * The database rules (who may set it, lists, the Library, old or forged tokens, classics) are in
 * supabase/tests/database/393-hide-in-countries.test.sql.
 * How the country is faked: the local Pages Functions read the X-Fake-Country header
 * (server/pages-functions-plugin.ts) and sign it with the e2e secret, which this spec puts in Vault.
 * Test data: the seed's adult_writer and teacher, reading in English, and one chapter this spec
 * adds to the seed story "Stația meteo" and removes afterwards; the story's countries are put back.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const seedStoryId = '00000000-0000-4000-9000-000000000001';
const writerId = '00000000-0000-4000-8000-000000000001';
const storySlug = 'statia-meteo-seed01';
const chapterCode = 'countrye';
const chapterText = 'Trenul de noapte trece granița fără să oprească.';

/** Puts back what this spec changed: the chapter and the story's countries. */
function cleanUp() {
  runSql(`delete from public.chapters where code = '${chapterCode}';
    update public.stories set hidden_in_countries = '{}' where id = '${seedStoryId}';`);
}

/** Adds a published chapter to the seed story, and the local signing secret (as 028 does). */
function setUp() {
  runSql(`select vault.create_secret('local-e2e-signup-secret', 'signup_context_secret')
      where not exists (select 1 from vault.secrets where name = 'signup_context_secret');
    select vault.update_secret(id, 'local-e2e-signup-secret') from vault.secrets where name = 'signup_context_secret';
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${seedStoryId}', '${writerId}', '${chapterCode}', 92, 'Granița', 'x', 8, 'published',
      'Granița', '${chapterText}', 8, now());
    update public.stories set first_published_at = now()
    where id = '${seedStoryId}' and first_published_at is null;`);
}

/** Opens a page as a seed persona reading in English, connecting from a country. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  path: string,
  options: { country: string; width?: number },
) {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext({
    viewport: { width: options.width ?? 1440, height: 900 },
    extraHTTPHeaders: { 'X-Fake-Country': options.country },
  });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('hide a story in chosen countries (COUNTRY-1)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    setUp();
  });
  test.afterAll(cleanUp);

  test('the writer hides the story in Moldova from Where it shows', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', `/write/s/${storySlug}/settings`, {
      country: 'RO',
    });
    await expect(page.getByRole('group', { name: 'Where it shows' })).toBeVisible();
    await page.getByLabel('Add a country').selectOption('MD');
    const chosen = page.getByRole('group', { name: 'Countries where this story is hidden' });
    await expect(chosen.getByRole('button', { name: 'Moldova' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await page.context().close();
  });

  test('a reader connecting from Moldova is told the page is not available here', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher', `/s/${storySlug}/${chapterCode}`, {
      country: 'MD',
      width: 390,
    });
    await expect(
      page.getByRole('heading', { name: 'This page isn’t available here' }),
    ).toBeVisible();
    await expect(
      page.getByText('Unfortunately, this page is not yet available in your country.'),
    ).toBeVisible();
    await expect(page.getByText(chapterText)).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Search stories' })).toBeVisible();
    await page.goto(`/s/${storySlug}`);
    await expect(
      page.getByRole('heading', { name: 'This page isn’t available here' }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();
  });

  test('the same reader connecting from Sweden reads the chapter', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', `/s/${storySlug}/${chapterCode}`, {
      country: 'SE',
    });
    await expect(page.getByText(chapterText)).toBeVisible();
    await page.context().close();
  });

  for (const view of [
    { address: `/s/${storySlug}/${chapterCode}`, width: 390, theme: 'night' },
    { address: `/s/${storySlug}`, width: 1440, theme: 'light' },
  ] as const) {
    test(`no serious axe issue on the B11 page at ${view.width} px, ${view.theme}`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ extraHTTPHeaders: { 'X-Fake-Country': 'MD' } });
      await useSessionInBrowser(context, (await signInPersona('teacher')).session);
      const page = await context.newPage();
      await checkScreen(page, { ...view, language: 'en' });
      await expect(
        page.getByRole('heading', { name: 'This page isn’t available here' }),
      ).toBeVisible();
      await context.close();
    });
  }
});
