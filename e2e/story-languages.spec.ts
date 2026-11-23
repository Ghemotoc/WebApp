/**
 * One story in several languages, in a real browser (bundle TRANSLATE-1b; boards TrStory,
 * TrReader and TrMissing; Robert, 16 Nov 2026).
 *
 * Who runs it: `npm run test:e2e`, and CI (Supabase started first).
 * What it proves:
 * - a story with an English edition opens in English on an English page, with "Read in: English",
 *   "4 of 6 in English" on the chapter list and the untranslated chapters marked; choosing Română
 *   opens the original and the choice is remembered for the story;
 * - in the reader the switch keeps the chapter; a chapter the edition doesn't have yet shows
 *   "This chapter isn't in English yet" with a link to the original and to the last translated
 *   chapter;
 * - a story in one language shows no switch at all (Robert, 16 Nov 2026, 12:23 UTC);
 * - axe in all 12 views of the story page and of the missing-chapter notice finds nothing
 *   serious and nothing scrolls sideways; no doodles on the reader's notice.
 * Test data: six chapters made in SQL on adult_writer's seed story "Stația meteo", an English
 * edition made by the writer through add_story_language(), four translated chapters made in SQL;
 * removed after.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { waitForAnimationsToFinish } from './support/animations';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000001';
const slug = 'statia-meteo-seed01';
const oneLanguageSlug = 'the-girl-who-fixed-radios-seed02';
const writerId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';

/** The English edition's address, known once the writer has added the language. */
let editionSlug = '';

/** Removes this spec's edition and chapters, and puts the teacher's language back. */
function cleanUp() {
  runSql(`delete from public.chapters where story_id in
      (select id from public.stories where edition_of_story_id = '${storyId}');
    delete from public.chapters where story_id = '${storyId}';
    delete from public.stories where edition_of_story_id = '${storyId}';
    update public.profiles set locale = 'ro' where id = '${teacherId}';`);
}

/** Six published chapters in Romanian; the first four also in English. */
async function seedEditions() {
  cleanUp();
  // Step 1: the original's six chapters.
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select '${storyId}', '${writerId}', 'langro0' || n, n, 'Capitolul ' || n, 'x', 300,
      'published', 'Capitolul ' || n, 'Bunica notează vremea, ziua ' || n || '.', 300,
      '2026-10-09T09:00:00Z'::timestamptz + n * interval '1 day'
    from generate_series(1, 6) as n;`);
  // Step 2: the writer adds English, the way the app does.
  const { client } = await signInPersona('adult_writer');
  const { data, error } = await client.rpc('add_story_language', {
    story_slug: slug,
    language_code: 'en',
    title: 'The Weather Station',
    blurb: 'A grandmother notes the weather every morning.',
  });
  if (error !== null) throw new Error(`Could not add the language: ${error.message}`);
  editionSlug = (data as { slug: string }).slug;
  // Step 3: chapters one to four in English, each tied to its original.
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count,
      first_published_at, translation_of_chapter_id)
    select edition.id, '${writerId}', 'langen0' || original.position, original.position,
      'Chapter ' || original.position, 'x', 300, 'published', 'Chapter ' || original.position,
      'Grandmother notes the weather, day ' || original.position || '.', 300,
      original.first_published_at, original.id
    from public.chapters as original, public.stories as edition
    where original.story_id = '${storyId}' and original.position <= 4
      and edition.slug = '${editionSlug}';`);
}

/** Opens a page in English as the teacher (a reader), in a fresh browser context. */
async function openAsReader(browser: Browser, path: string) {
  runSql(`update public.profiles set locale = 'en' where id = '${teacherId}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('teacher')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('one story in several languages (TRANSLATE-1b)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(seedEditions);
  test.afterAll(cleanUp);

  test('the story opens in the page language and the reader can change it', async ({ browser }) => {
    // The Romanian address on an English page opens the English edition.
    const page = await openAsReader(browser, `/s/${slug}`);
    await expect(page).toHaveURL(`/s/${editionSlug}`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'The Weather Station' }),
    ).toBeVisible();
    await expect(page.getByText('4 of 6 in English')).toBeVisible();
    await expect(page.getByText('Română only for now').first()).toBeVisible();

    // The switch lists both languages; Română opens the original.
    await page.getByRole('button', { name: 'Read in: English' }).click();
    const list = page.getByRole('navigation', { name: 'Read in' });
    await expect(list.getByRole('link')).toHaveCount(2);
    // The list fades in; axe read the half-faded "Original" as low contrast now and then (#561),
    // so wait until it has stopped moving before checking it.
    await waitForAnimationsToFinish(page);
    // The open list on its own passes axe (the whole page is checked closed, in the last test).
    const listIssues = await new AxeBuilder({ page })
      .include('nav[aria-label="Read in"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(listIssues.violations).toEqual([]);
    await list.getByRole('link', { name: /Română/ }).click();
    await expect(page).toHaveURL(`/s/${slug}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Stația meteo' })).toBeVisible();

    // The choice is remembered: the English address now opens the Romanian original.
    await page.goto(`/s/${editionSlug}`);
    await expect(page).toHaveURL(`/s/${slug}`);
  });

  test('changing language in the reader keeps the chapter', async ({ browser }) => {
    const page = await openAsReader(browser, `/s/${editionSlug}/langen02`);
    await expect(page.getByRole('heading', { level: 1, name: 'Chapter 2' })).toBeVisible();
    await expect(page.locator('.tmc-chapter-text')).toHaveAttribute('lang', 'en');
    await page.getByRole('button', { name: 'Read in: English' }).click();
    await expect(page.getByText('You stay on chapter 2.')).toBeVisible();
    await page
      .getByRole('navigation', { name: 'Read in' })
      .getByRole('link', { name: /Română/ })
      .click();
    await expect(page).toHaveURL(`/s/${slug}/langro02`);
    await expect(page.getByRole('heading', { level: 1, name: 'Capitolul 2' })).toBeVisible();
    await expect(page.locator('.tmc-chapter-text')).toHaveAttribute('lang', 'ro');
  });

  test('a chapter that is not translated yet points to the original', async ({ browser }) => {
    // From chapter 5 in Romanian, the switch leads to English, which stops at chapter 4.
    const page = await openAsReader(browser, `/s/${slug}/langro05`);
    await page.getByRole('button', { name: 'Read in: Română' }).click();
    await page
      .getByRole('navigation', { name: 'Read in' })
      .getByRole('link', { name: /English/ })
      .click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'This chapter isn’t in English yet' }),
    ).toBeVisible();
    await expect(page.getByText(/Lia Scrie has translated chapters 1 to 4\./)).toBeVisible();
    await expect(page.locator('.tmc-chapter-text')).toHaveCount(0);
    await expectNoDoodles(page);
    await expect(page.getByRole('link', { name: 'Back to chapter 4' })).toHaveAttribute(
      'href',
      `/s/${editionSlug}/langen04`,
    );
    await page.getByRole('link', { name: 'Read chapter 5 in Română' }).click();
    await expect(page).toHaveURL(`/s/${slug}/langro05`);
  });

  test('a story in one language shows no switch', async ({ browser }) => {
    runSql(`delete from public.chapters where story_id =
      (select id from public.stories where slug = '${oneLanguageSlug}');`);
    const page = await openAsReader(browser, `/s/${oneLanguageSlug}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /Read in/ })).toHaveCount(0);
    await expect(page.getByText('About this edition')).toHaveCount(0);
  });

  test('the story page and the notice pass axe in all 12 views', async ({ browser }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('teacher')).session);
    const addresses = [`/s/${editionSlug}`, `/s/${editionSlug}/langro05`];
    for (const view of everyView(addresses)) {
      runSql(`update public.profiles set locale = '${view.language}' where id = '${teacherId}';`);
      const page = await context.newPage();
      // The remembered language keeps the English edition on screen on a Romanian page too.
      await page.addInitScript(
        ([firstSlug]) => {
          localStorage.setItem('story-reading-language', JSON.stringify({ [firstSlug]: 'en' }));
        },
        [slug] as const,
      );
      await test.step(`axe at ${view.width} px, ${view.theme}, ${view.language}`, async () => {
        await checkScreen(page, view);
        await expect(page.getByRole('button', { name: /English/ }).first()).toBeVisible();
      });
      await page.close();
    }
  });
});
