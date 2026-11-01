/**
 * Download my stories, end to end (story S1-E13-05; board Settings 6.3, the Download my data tab).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - criterion 1: adult_writer picks one story and gets one Word file with its title in it, then
 *   picks "All my stories" and gets one ZIP with a Word file per story;
 * - the choices (Robert, 1 Nov 2026, 06:27 and 06:29): each story's plan from Story Atlas and a
 *   JSON copy go in when ticked, only chosen chapters go in when chosen, and nothing ticked is
 *   refused with a plain line;
 * - criterion 2: the "ready" notification arrives and its link opens the block in Settings;
 * - criterion 4: asking again for the same unchanged story offers the files already made;
 * - a reader with no stories sees one plain line instead of the drop-down;
 * - axe at 390, 768 and 1440 px, light and night, ro and en, on Settings scrolled to the block,
 *   and no sideways scroll.
 * Test data: the seed personas, their seed stories and two draft chapters made here. Every export, its file, the rate limit's
 * counter and the notifications are removed at the start and the end.
 */
import { readFile } from 'node:fs/promises';

import { expect, test, type Browser } from '@playwright/test';
import JSZip from 'jszip';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** Removes every export, its file, the rate limit's counter and the "ready" notifications. */
function resetExports() {
  runSql(`
    delete from public.exports;
    select set_config('storage.allow_delete_query', 'true', false);
    delete from storage.objects where bucket_id = 'exports';
    delete from public.rate_limit_events where action in ('data_export', 'stories_export');
    delete from public.notifications where kind = 'stories_export_ready';
    delete from public.chapters where code in ('dlst2e01', 'dlst2e02');
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teen_17', 'kid_14_ok');`);
}

/** Two draft chapters of The Girl Who Fixed Radios, so one can be chosen. */
function seedChapters() {
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count, status)
    values ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001',
            'dlst2e01', 1, 'The first station', 'Static.', 1, 'draft'),
           ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001',
            'dlst2e02', 2, 'The second station', 'A voice.', 2, 'draft');`);
}

/** Opens Settings at the block as a persona, in English, with downloads allowed. */
async function openBlock(browser: Browser, persona: SignInPersonaName) {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto('/settings#download-my-stories');
  const block = page.locator('#download-my-stories');
  await expect(block.getByRole('heading', { name: 'Download my stories' })).toBeVisible();
  return { context, page, block };
}

test.describe('Download my stories', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => resetExports());
  test.afterAll(() => resetExports());

  test('a writer downloads one story’s chapters as a Word file, and the same request again offers it back', async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const { context, page, block } = await openBlock(browser, 'adult_writer');
    // Step 1: pick one story, leave only the chapters ticked and ask.
    await block
      .getByLabel('Story', { exact: true })
      .selectOption('00000000-0000-4000-9000-000000000002');
    await block.getByLabel('The plan from Story Atlas, as a Word file').uncheck();
    await block.getByRole('button', { name: 'Get my files' }).click();
    await expect(block.getByText('Your files are ready.')).toBeVisible({ timeout: 30_000 });
    await expect(
      block.getByText('“The Girl Who Fixed Radios”: the chapters as a Word file'),
    ).toBeVisible();
    // Step 2: download it and read the title back from the Word file.
    const downloadStarted = page.waitForEvent('download');
    await block.getByRole('button', { name: 'Download Word file' }).click();
    const download = await downloadStarted;
    expect(download.suggestedFilename()).toBe('the-girl-who-fixed-radios-seed02.docx');
    const word = await JSZip.loadAsync(await readFile((await download.path()) ?? ''));
    expect(await word.file('word/document.xml')?.async('string')).toContain(
      'The Girl Who Fixed Radios',
    );
    // Step 3: the same choice again, unchanged, offers the files already made (criterion 4).
    await block.getByRole('button', { name: 'Get my files' }).click();
    await expect(block.getByText(/Nothing has changed since you made these/)).toBeVisible();
    expect(runSql(`select count(*) from public.exports where kind = 'my_stories';`).trim()).toBe(
      '1',
    );
    await context.close();
  });

  test('a writer downloads all their stories with their plans and a JSON copy in one ZIP', async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const { context, page, block } = await openBlock(browser, 'adult_writer');
    // Step 1: "All my stories" is the first choice; add the JSON copy to the chapters and plans.
    await block.getByLabel('Story', { exact: true }).selectOption({ index: 0 });
    await block.getByLabel('A machine-readable copy (JSON)').check();
    await block.getByRole('button', { name: 'Get my files' }).click();
    await expect(block.getByText(/2 stories: .* in one ZIP/)).toBeVisible({ timeout: 30_000 });
    // Step 2: the ZIP holds each story's Word file and plan, and the JSON copy.
    const downloadStarted = page.waitForEvent('download');
    await block.getByRole('button', { name: 'Download ZIP' }).click();
    const download = await downloadStarted;
    expect(download.suggestedFilename()).toMatch(/^my-stories-\d{4}-\d{2}-\d{2}\.zip$/);
    const zip = await JSZip.loadAsync(await readFile((await download.path()) ?? ''));
    expect(Object.keys(zip.files).sort()).toEqual([
      'my-stories.json',
      'statia-meteo-seed01-plan.docx',
      'statia-meteo-seed01.docx',
      'the-girl-who-fixed-radios-seed02-plan.docx',
      'the-girl-who-fixed-radios-seed02.docx',
    ]);
    const copy = JSON.parse((await zip.file('my-stories.json')?.async('string')) ?? '{}');
    expect(copy.tables.story_plans).toHaveLength(2);
    await context.close();
  });

  test('a writer downloads only the chapters they choose', async ({ browser }) => {
    test.setTimeout(60_000);
    seedChapters();
    const { context, page, block } = await openBlock(browser, 'adult_writer');
    // Step 1: one story, chapters only, and only its second chapter.
    await block
      .getByLabel('Story', { exact: true })
      .selectOption('00000000-0000-4000-9000-000000000002');
    await block.getByLabel('The plan from Story Atlas, as a Word file').uncheck();
    await block.getByLabel('Only the chapters I choose').check();
    await block.getByRole('button', { name: 'Get my files' }).click();
    await expect(
      block.getByText('Choose at least one chapter, or pick All chapters.'),
    ).toBeVisible();
    await block.getByLabel('Chapter 2: The second station (draft)').check();
    await block.getByRole('button', { name: 'Get my files' }).click();
    await expect(block.getByText(/1 chosen chapter as a Word file/)).toBeVisible({
      timeout: 30_000,
    });
    // Step 2: the Word file has that chapter and not the first.
    const downloadStarted = page.waitForEvent('download');
    await block.getByRole('button', { name: 'Download Word file' }).click();
    const word = await JSZip.loadAsync(
      await readFile((await (await downloadStarted).path()) ?? ''),
    );
    const text = (await word.file('word/document.xml')?.async('string')) ?? '';
    expect(text).toContain('The second station');
    expect(text).not.toContain('The first station');
    await context.close();
  });

  test('a writer who ticks nothing is asked to tick something', async ({ browser }) => {
    const { context, block } = await openBlock(browser, 'adult_writer');
    await block.getByLabel('The chapters, as a Word file').uncheck();
    await block.getByLabel('The plan from Story Atlas, as a Word file').uncheck();
    await block.getByRole('button', { name: 'Get my files' }).click();
    await expect(block.getByText('Tick at least one thing to include.')).toBeVisible();
    await context.close();
  });

  test('the "ready" notification opens the block in Settings', async ({ browser }) => {
    // The three downloads above each sent one.
    expect(
      runSql(`select count(*) from public.notifications where kind = 'stories_export_ready'
        and user_id = '00000000-0000-4000-8000-000000000001';`).trim(),
    ).toBe('3');
    const { context, page } = await openBlock(browser, 'adult_writer');
    await page.goto('/notifications');
    await page.getByRole('link', { name: 'Download your stories' }).first().click();
    await expect(page).toHaveURL(/\/settings#download-my-stories$/);
    await expect(page.locator('#download-my-stories')).toBeInViewport();
    await context.close();
  });

  test('a reader with no stories is told there is nothing to download yet', async ({ browser }) => {
    const { context, block } = await openBlock(browser, 'kid_14_ok');
    await expect(block.getByText(/You haven’t started a story yet/)).toBeVisible();
    await expect(block.getByRole('button', { name: 'Get my files' })).toHaveCount(0);
    await context.close();
  });

  for (const view of everyView(['/settings#download-my-stories'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's own language wins (S1-E1-04), so it is set to the view's.
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'teen_17';`);
      await useSessionInBrowser(page.context(), (await signInPersona('teen_17')).session);
      await checkScreen(page, view);
      await expect(page.locator('#download-my-stories')).toBeVisible();
    });
  }
});
