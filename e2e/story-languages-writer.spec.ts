/**
 * The writer's side of one story in several languages, in a real browser (bundle TRANSLATE-1c;
 * boards TrSettings and TrEditor; Robert, 16 Nov 2026).
 *
 * Who runs it: `npm run test:e2e`, and CI (Supabase started first).
 * What it proves:
 * - from Story settings the writer opens Languages, adds English with a title and description,
 *   opens the new language, translates a chapter side by side, saves it and publishes it; a
 *   reader then opens that chapter in English, with the paragraph left empty in the original;
 * - the Write page still lists the story once;
 * - a translation of a chapter whose original is a draft is saved but not published;
 * - the writer removes the language again;
 * - axe in all 12 views of the three screens finds nothing serious, nothing scrolls sideways and
 *   no screen has doodles.
 * Test data: two chapters made in SQL on adult_writer's seed story "Stația meteo" (one published,
 * one draft); the edition and its chapters are made through the screens; removed after.
 */
import { type Browser } from '@playwright/test';
import { expect, test } from './support/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000001';
const slug = 'statia-meteo-seed01';
const writerId = '00000000-0000-4000-8000-000000000001';
const threeParagraphs =
  'Bunica notează vremea în fiecare dimineață.\n\nCaietul ei are patruzeci de ani.\n\nAzi a nins.';

/** Removes this spec's edition and chapters, and puts the writer's language back. */
function cleanUp() {
  runSql(`delete from public.chapters where story_id in
      (select id from public.stories where edition_of_story_id = '${storyId}');
    delete from public.chapters where story_id = '${storyId}';
    delete from public.stories where edition_of_story_id = '${storyId}';
    update public.profiles set locale = 'ro' where id = '${writerId}';`);
}

/** The original gets a published chapter of three paragraphs and a draft chapter. */
function seedOriginal() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${writerId}', 'wrlang01', 1, 'Caietul', '${threeParagraphs}', 14,
      'published', 'Caietul', '${threeParagraphs}', 14, '2026-10-09T09:00:00Z'),
     ('${storyId}', '${writerId}', 'wrlang02', 2, 'Ciorna', 'Încă nescris până la capăt.', 5,
      'draft', null, null, 0, null);`);
}

/** Opens a page in English as the writer, in a fresh browser context. */
async function openAsWriter(browser: Browser, path: string) {
  runSql(`update public.profiles set locale = 'en' where id = '${writerId}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

/** Adds English through the database, the way the form does; returns the edition's address. */
async function addEnglish(): Promise<string> {
  const { client } = await signInPersona('adult_writer');
  const { data, error } = await client.rpc('add_story_language', {
    story_slug: slug,
    language_code: 'en',
    title: 'The Weather Station',
    blurb: 'A grandmother notes the weather every morning.',
  });
  if (error !== null) throw new Error(`Could not add the language: ${error.message}`);
  return (data as { slug: string }).slug;
}

test.describe('the writer adds and translates a language (TRANSLATE-1c)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(seedOriginal);
  test.afterAll(cleanUp);

  test('add a language, translate a chapter side by side and publish it', async ({ browser }) => {
    // Story settings leads to Languages; the original is the only row.
    const page = await openAsWriter(browser, `/write/s/${slug}/settings`);
    await page.getByRole('link', { name: 'Languages', exact: true }).click();
    await expect(page).toHaveURL(`/write/s/${slug}/languages`);
    await expect(page.getByRole('heading', { level: 1, name: 'Languages' })).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(2);
    await expect(page.getByRole('row').nth(1)).toContainText('Original');

    // A language needs a title: the form says so, then takes the answers.
    // The footer has a "Language" menu too (the interface's), so the form's is asked for by its card.
    const form = page.getByRole('region', { name: 'Add a language' });
    await form.getByLabel('Language', { exact: true }).selectOption('en');
    await page.getByRole('button', { name: 'Add the language' }).click();
    await expect(page.getByText('Add a title in that language.')).toBeVisible();
    await page.getByLabel('Title in that language').fill('The Weather Station');
    await page.getByLabel('Blurb in that language').fill('A grandmother notes the weather.');
    await page.getByRole('button', { name: 'Add the language' }).click();
    const englishRow = page.getByRole('row').filter({ hasText: 'The Weather Station' });
    await expect(englishRow).toContainText('0 of 2');
    await expect(englishRow).toContainText('Draft');

    // The language's own page lists the original's chapters.
    await englishRow.getByRole('link', { name: 'Translate into English' }).click();
    await expect(page).toHaveURL(/\/write\/s\/[^/]+\/translate$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'The Weather Station' }),
    ).toBeVisible();
    await expect(page.getByText('Not started')).toHaveCount(2);
    await expect(page.getByText('Original not published')).toHaveCount(1);

    // Chapter 1 side by side: two of three paragraphs translated.
    await page.getByRole('button', { name: 'Translate chapter 1' }).click();
    await expect(page).toHaveURL(/\/translate\/[a-z0-9]{8}$/);
    await expect(page.getByText('Chapter 1 · Caietul')).toBeVisible();
    await expect(page.getByText('Caietul ei are patruzeci de ani.')).toBeVisible();
    await page.getByLabel('Chapter title in English').fill('The notebook');
    await page
      .getByRole('textbox', { name: 'Translate paragraph 1' })
      .fill('Grandmother notes the weather every morning.');
    await page
      .getByRole('textbox', { name: 'Translate paragraph 2' })
      .fill('Her notebook is forty years old.');
    // 12 of the original's 15 words are translated (CALM-9, D09: words, not paragraphs).
    await expect(page.getByText('12 of 15 words so far')).toBeVisible();
    await page.getByRole('button', { name: 'Save draft' }).click();
    await expect(page.getByText('Draft saved.')).toBeVisible();
    await page.getByRole('button', { name: 'Publish in English' }).click();
    await expect(page.getByText('Published in English.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish changes' })).toBeVisible();
    const chapterCode = page.url().split('/').pop() ?? '';

    // Reopened, the editor shows the translated paragraphs and the third one empty again.
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Translate paragraph 2' })).toHaveValue(
      'Her notebook is forty years old.',
    );
    await expect(page.getByRole('textbox', { name: 'Translate paragraph 3' })).toHaveValue('');

    // Back on the language's page the chapter is published; a reader opens it in English, the
    // untranslated paragraph in the original.
    await page.getByRole('link', { name: 'The Weather Station' }).click();
    await expect(page.getByText('Published', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue chapter 1' })).toBeVisible();
    const editionSlug = page.url().split('/').at(-2) ?? '';
    await page.goto(`/s/${editionSlug}/${chapterCode}`);
    await expect(page.getByText('Her notebook is forty years old.')).toBeVisible();
    await expect(page.getByText('Azi a nins.')).toBeVisible();

    // The Write page lists the story once, under its original title.
    await page.goto('/write');
    await expect(page.getByText('Stația meteo').first()).toBeVisible();
    await expect(page.getByText('The Weather Station')).toHaveCount(0);
  });

  test('a translation waits for its original, and a language can be removed', async ({
    browser,
  }) => {
    const editionSlug = await addEnglish();
    const page = await openAsWriter(browser, `/write/s/${editionSlug}/translate`);

    // Chapter 2's original is a draft: the translation is saved, not published.
    await page.getByRole('button', { name: 'Translate chapter 2' }).click();
    await page.getByRole('textbox', { name: 'Translate paragraph 1' }).fill('Not written yet.');
    await page.getByRole('button', { name: 'Publish in English' }).click();
    await expect(page.getByText(/Publish the original chapter first\./)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish in English' })).toBeVisible();

    // The title in this language can be changed on the language's page.
    await page.getByRole('link', { name: 'The Weather Station' }).click();
    // Exact: the editor being left has a "Chapter title in English" field.
    await expect(page).toHaveURL(`/write/s/${editionSlug}/translate`);
    await page.getByLabel('Title in English', { exact: true }).fill('The Weather Hut');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'The Weather Hut' })).toBeVisible();

    // Removing asks first, then goes back to the story's languages: one row left.
    await page.getByRole('button', { name: 'Remove English' }).click();
    await page.getByRole('button', { name: 'Keep it' }).click();
    await page.getByRole('button', { name: 'Remove English' }).click();
    await page.getByRole('button', { name: 'Yes, remove' }).click();
    await expect(page).toHaveURL(`/write/s/${slug}/languages`);
    await expect(page.getByRole('row')).toHaveCount(2);
  });

  test('the three screens pass axe in all 12 views', async ({ browser }) => {
    test.setTimeout(400_000);
    const editionSlug = await addEnglish();
    const { client } = await signInPersona('adult_writer');
    const { data } = await client.rpc('start_chapter_translation', {
      story_slug: editionSlug,
      original_chapter_code: 'wrlang01',
    });
    const chapterCode = (data as { code: string }).code;
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    const addresses = [
      `/write/s/${slug}/languages`,
      `/write/s/${editionSlug}/translate`,
      `/write/s/${editionSlug}/translate/${chapterCode}`,
    ];
    for (const view of everyView(addresses)) {
      runSql(`update public.profiles set locale = '${view.language}' where id = '${writerId}';`);
      const page = await context.newPage();
      await test.step(`${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async () => {
        await checkScreen(page, view);
        await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
        await expectNoDoodles(page);
      });
      await page.close();
    }
  });
});
