/**
 * A sample EPUB for beta readers and the "About the writer" page, end to end (bundle IDEAS-2,
 * part b; ideas IDEA-20261101-3 and -4; Robert, 2 Nov 2026, 22:00: any chapters, as many or as
 * few as the writer likes).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - an ongoing story, with "Only the chapters I choose" and two chapters ticked, offers "A sample
 *   EPUB for beta readers"; with none ticked it doesn't;
 * - the book holds only the ticked chapters with their numbers in the story, is saved as
 *   "<slug>-sample.epub", and its title and copyright pages say "Fragment" (the story is in
 *   Romanian) and list the chapters;
 * - "Add an About the writer page" adds the public bio and a link to the public profile at the
 *   back; left unticked, there is no such page;
 * - axe on the dialog and no sideways scroll at 390, 768 and 1440 px.
 * Test data: three published chapters of adult_writer's seed story "Stația meteo" (Ongoing) and a
 * bio, made here; the chapters are removed and the seed's bio put back at the start and the end.
 */
import { readFile } from 'node:fs/promises';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';
import JSZip from 'jszip';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000001';
const writerId = '00000000-0000-4000-8000-000000000001';

/** adult_writer's own bio from the seed, read once so it is put back as it was. */
let seededBio: string | null = null;

/** Removes the chapters made here and puts the bio and language back. */
function cleanUp() {
  seededBio ??= runSql(
    `select quote_literal(bio) from public.profiles where handle = 'adult_writer';`,
  ).trim();
  runSql(`
    delete from public.chapters where code in ('smpl0001', 'smpl0002', 'smpl0003');
    update public.profiles set locale = 'ro', bio = ${seededBio} where handle = 'adult_writer';`);
}

/** Three published chapters of the ongoing seed story, and a public bio. */
function seedStory() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${writerId}', 'smpl0001', 1, 'Dimineața', 'x', 1, 'published', 'Dimineața',
            'Bunica a deschis caietul.', 4, now()),
           ('${storyId}', '${writerId}', 'smpl0002', 2, 'Ploaia', 'x', 1, 'published', 'Ploaia',
            'A plouat toată noaptea.', 4, now()),
           ('${storyId}', '${writerId}', 'smpl0003', 3, 'Furtuna', 'x', 1, 'published', 'Furtuna',
            'Vântul a smuls antena.', 4, now());
    update public.profiles set bio = 'Scriu despre vreme și bunici.' where handle = 'adult_writer';`);
}

/**
 * Opens Download my stories in English, picks the seed story with chapters 1 and 3 ticked.
 *
 * @returns the page and the block
 */
async function chooseChapters(browser: Browser): Promise<Page> {
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
  await block.getByLabel('Story', { exact: true }).selectOption(storyId);
  await block.getByLabel('Only the chapters I choose').check();
  await expect(block.getByRole('heading', { name: 'A sample EPUB for beta readers' })).toHaveCount(
    0,
  );
  await block.getByLabel('Chapter 1: Dimineața').check();
  await block.getByLabel('Chapter 3: Furtuna').check();
  return page;
}

/**
 * Makes the sample, ticking About the writer or not, and reads the book back.
 *
 * @returns the downloaded file's name and the book
 */
async function makeSample(page: Page, withAbout: boolean) {
  await page.getByRole('button', { name: 'Make a sample EPUB' }).click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByRole('heading', { name: 'A sample EPUB of Stația meteo' }),
  ).toBeVisible();
  if (withAbout) await dialog.getByLabel('Add an About the writer page').check();
  const downloadStarted = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Make EPUB' }).click();
  const download = await downloadStarted;
  const book = await JSZip.loadAsync(await readFile((await download.path()) ?? ''));
  return { fileName: download.suggestedFilename(), book };
}

test.describe('Sample EPUB and About the writer (IDEAS-2b)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => seedStory());
  test.afterAll(() => cleanUp());

  test('a sample of the ticked chapters says Sample and ends with About the writer', async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await chooseChapters(browser);
    const { fileName, book } = await makeSample(page, true);
    // Step 1: only chapters 1 and 3, keeping their numbers.
    expect(fileName).toBe('statia-meteo-seed01-sample.epub');
    const nav = (await book.file('OEBPS/nav.xhtml')?.async('string')) ?? '';
    expect(nav).toContain('Capitolul 1: Dimineața');
    expect(nav).toContain('Capitolul 3: Furtuna');
    expect(nav).not.toContain('Ploaia');
    // Step 2: both front pages say it is a sample and list the chapters.
    for (const pageName of ['OEBPS/title.xhtml', 'OEBPS/copyright.xhtml']) {
      const text = (await book.file(pageName)?.async('string')) ?? '';
      expect(text).toContain('<p class="sample">Fragment</p>');
      expect(text).toContain('<li>Capitolul 3: Furtuna</li>');
    }
    // Step 3: the public bio and the profile link at the back.
    const about = (await book.file('OEBPS/about.xhtml')?.async('string')) ?? '';
    expect(about).toContain('Despre autor');
    expect(about).toContain('Scriu despre vreme și bunici.');
    expect(about).toMatch(/href="https:\/\/[^"]+\/u\/adult_writer"/);
    await page.context().close();
  });

  test('left unticked, the book has no About the writer page', async ({ browser }) => {
    test.setTimeout(60_000);
    const page = await chooseChapters(browser);
    const { book } = await makeSample(page, false);
    expect(book.file('OEBPS/about.xhtml')).toBeNull();
    await page.context().close();
  });

  for (const width of [390, 768, 1440]) {
    test(`the sample dialog passes axe at ${width} px and never scrolls sideways`, async ({
      browser,
    }) => {
      const page = await chooseChapters(browser);
      await page.setViewportSize({ width, height: 900 });
      await page.getByRole('button', { name: 'Make a sample EPUB' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('dialog')
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze();
      const serious = results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      );
      expect(serious).toEqual([]);
      const isWider = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(isWider).toBe(false);
      await page.context().close();
    });
  }
});
