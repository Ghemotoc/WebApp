/**
 * The EPUB of a completed story, end to end (story S1-E13-05, PRIVACY part f; Robert, 1 Nov
 * 2026, 06:31 to 06:40).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a Completed story offers "An EPUB for e-readers" and an Ongoing one doesn't;
 * - the form is filled in with the pen name and the title, refuses an empty name with a plain
 *   line, and "Make EPUB" saves "<slug>.epub" straight to the device, with nothing stored;
 * - the book: "mimetype" first, a real cover picture drawn in the browser, the table of contents
 *   with the published chapters in order (the draft left out), the typed name and the Romanian
 *   copyright lines (the story is in Romanian);
 * - axe at 390, 768 and 1440 px, light and night, ro and en, with the dialog open, and no
 *   sideways scroll.
 * Test data: adult_writer's seed story "Stația meteo", marked Completed here, with two published
 * chapters and a draft made here. Everything is put back at the start and the end.
 */
import { readFile } from 'node:fs/promises';

import { expect, test, type Browser, type Page } from '@playwright/test';
import JSZip from 'jszip';

import englishDataExport from '../src/locales/en/dataExport.json';
import romanianDataExport from '../src/locales/ro/dataExport.json';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000001';
const otherStoryId = '00000000-0000-4000-9000-000000000002';
const writerId = '00000000-0000-4000-8000-000000000001';

/** Puts the story back as the seed has it, without the chapters made here. */
function cleanUp() {
  runSql(`
    delete from public.chapters where code in ('epub0001', 'epub0002', 'epub0003');
    update public.stories set completion_status = 'ongoing' where id = '${storyId}';
    update public.profiles set locale = 'ro' where handle = 'adult_writer';`);
}

/** Two published chapters (made in the wrong order on purpose) and a draft, then Completed. */
function seedBook() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${writerId}', 'epub0002', 2, 'Doi', 'x', 3, 'published', 'Ploaia',
            'A plouat **toată** noaptea.', 4, now()),
           ('${storyId}', '${writerId}', 'epub0001', 1, 'Unu', 'x', 3, 'published', 'Dimineața',
            'Bunica a deschis caietul.', 4, now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status)
    values ('${storyId}', '${writerId}', 'epub0003', 3, 'Ciornă secretă', 'Încă nu.', 2, 'draft');
    update public.stories set completion_status = 'completed' where id = '${storyId}';`);
}

/** Opens Settings at Download my stories as adult_writer, in English, with downloads allowed. */
async function openBlock(browser: Browser) {
  runSql(`update public.profiles set locale = 'en' where handle = 'adult_writer';`);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto('/settings#download-my-stories');
  const block = page.locator('#download-my-stories');
  await expect(block.getByRole('heading', { name: 'Download my stories' })).toBeVisible();
  return { context, page, block };
}

/** Picks a story and opens the EPUB dialog, in whichever language the page is in. */
async function openDialog(page: Page, language: 'ro' | 'en') {
  const words = language === 'ro' ? romanianDataExport : englishDataExport;
  await page.locator('#download-story').selectOption(storyId);
  await page.getByRole('button', { name: words.epub.open }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test.describe('EPUB of a completed story', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => seedBook());
  test.afterAll(() => cleanUp());

  test('an ongoing story offers no EPUB, a completed one does', async ({ browser }) => {
    const { context, block } = await openBlock(browser);
    await block.getByLabel('Story', { exact: true }).selectOption(otherStoryId);
    await expect(block.getByRole('heading', { name: 'An EPUB for e-readers' })).toHaveCount(0);
    await block.getByLabel('Story', { exact: true }).selectOption(storyId);
    await expect(block.getByRole('heading', { name: 'An EPUB for e-readers' })).toBeVisible();
    await context.close();
  });

  test('the form refuses an empty name with a plain line', async ({ browser }) => {
    const { context, page } = await openBlock(browser);
    await openDialog(page, 'en');
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Title')).toHaveValue('Stația meteo');
    await dialog.getByLabel('Name on the book').fill('');
    await dialog.getByRole('button', { name: 'Make EPUB' }).click();
    await expect(dialog.getByText('Type the name to print on the book.')).toBeVisible();
    await expect(dialog.getByLabel('Name on the book')).toHaveAttribute('aria-invalid', 'true');
    await context.close();
  });

  test('"Make EPUB" saves a book with the cover, the published chapters in order and the typed name', async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const { context, page } = await openBlock(browser);
    await openDialog(page, 'en');
    const dialog = page.getByRole('dialog');
    // Step 1: any name, typed here, then make the book.
    await dialog.getByLabel('Name on the book').fill('Maria Test');
    const downloadStarted = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Make EPUB' }).click();
    const download = await downloadStarted;
    expect(download.suggestedFilename()).toBe('statia-meteo-seed01.epub');
    await expect(page.getByText('Your EPUB is saved as statia-meteo-seed01.epub.')).toBeVisible();
    // Step 2: read the book back.
    const bytes = await readFile((await download.path()) ?? '');
    expect(bytes.subarray(30, 38).toString()).toBe('mimetype');
    const book = await JSZip.loadAsync(bytes);
    const cover =
      (await book.file('OEBPS/images/cover.jpg')?.async('uint8array')) ?? new Uint8Array();
    expect(cover.length).toBeGreaterThan(1000);
    const nav = (await book.file('OEBPS/nav.xhtml')?.async('string')) ?? '';
    const chapters = [...nav.matchAll(/>(Capitolul [^<]+)</g)].map((match) => match[1]);
    expect(chapters).toEqual(['Capitolul 1: Dimineața', 'Capitolul 2: Ploaia']);
    expect(nav).not.toContain('Ciornă secretă');
    const year = new Date().getFullYear();
    const copyright = (await book.file('OEBPS/copyright.xhtml')?.async('string')) ?? '';
    expect(copyright).toContain(`© ${year} Maria Test. Toate drepturile rezervate.`);
    // Step 3: the name was never stored: it is nowhere in the writer's profile.
    expect(
      runSql(`select count(*) from public.profiles where pen_name = 'Maria Test';`).trim(),
    ).toBe('0');
    await context.close();
  });

  for (const view of everyView(['/settings#download-my-stories'])) {
    test(`axe with the dialog open: ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
      await checkScreen(page, view, (reached) => openDialog(reached, view.language));
    });
  }
});
