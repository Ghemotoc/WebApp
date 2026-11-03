/**
 * Download my data, end to end (story S1-E13-02; board Settings 6.3, the Download my data tab).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - criterion 1: adult_writer asks for their data in Settings; the browser builds one ZIP with
 *   data.json and a Word file and a PDF per story, and Settings says the file is ready;
 * - criterion 2: the downloaded ZIP's data file holds the user ID and the account's email;
 * - IDEAS-1f: it holds the library shelves with titles and full links, and library.csv;
 * - criterion 3: the person gets the "ready" notification, the line says when the link stops
 *   working, and nobody else can download the file (Storage refuses teen_17's address);
 * - axe at 390, 768 and 1440 px, light and night, ro and en, on Settings scrolled to the panel,
 *   and no sideways scroll.
 * Test data: the seed personas and one draft story by adult_writer. Every export, its file and
 * the rate limit's counter are removed at the start and the end.
 */
import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';
import JSZip from 'jszip';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The spec's own story, so the ZIP always has a Word file to look for. */
const storySlug = 'download-data-e2e';

/** Removes every export, its file, the rate limit's counter and the spec's story. */
function resetExports() {
  runSql(`
    delete from public.exports;
    select set_config('storage.allow_delete_query', 'true', false);
    delete from storage.objects where bucket_id = 'exports';
    delete from public.rate_limit_events where action = 'data_export';
    delete from public.notifications where kind = 'data_export_ready';
    delete from public.chapters where code = 'dlde2e01';
    delete from public.library_entries where user_id = '00000000-0000-4000-8000-000000000001'
      and story_id = '00000000-0000-4000-9000-000000000003';
    delete from public.stories where slug = '${storySlug}';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teen_17');`);
}

/**
 * One draft story by adult_writer with Romanian letters in it, and teen_17's seed story on
 * adult_writer's "Saved for later" shelf (IDEAS-1f).
 */
function seedStory() {
  runSql(`insert into public.stories (user_id, slug, title, language_code, category_id,
      completion_status, rating)
    values ('00000000-0000-4000-8000-000000000001', '${storySlug}', 'Țara de sub ape', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages');
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count, status)
    values ((select id from public.stories where slug = '${storySlug}'),
      '00000000-0000-4000-8000-000000000001', 'dlde2e01', 1, 'Începutul', 'Ș și ț.', 3, 'draft');
    insert into public.library_entries (user_id, story_id, shelf)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-9000-000000000003', 'saved');`);
}

/** The first five bytes of a file inside the ZIP, as text ("%PDF-" for a PDF). */
async function firstBytesOf(zip: JSZip, path: string): Promise<string> {
  const bytes = await zip.file(path)?.async('uint8array');
  if (bytes === undefined) return '';
  return new TextDecoder('latin1').decode(bytes.subarray(0, 5));
}

test.describe('Download my data', () => {
  test.beforeAll(() => {
    resetExports();
    seedStory();
  });
  test.afterAll(() => resetExports());

  test('a writer asks for their data and downloads one ZIP with the data file and Word files', async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    // Step 1: adult_writer opens the panel in English.
    runSql(`update public.profiles set locale = 'en' where handle = 'adult_writer';`);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    });
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const page = await context.newPage();
    await page.goto('/settings#download-my-data');
    const panel = page.locator('#download-my-data');
    await expect(panel.getByRole('heading', { name: 'Download my data' })).toBeVisible();
    // Step 2: ask; the browser builds the copy and the panel says it is ready.
    await panel.getByRole('button', { name: 'Request my data' }).click();
    await expect(panel.getByText('Your file is ready.')).toBeVisible({ timeout: 30_000 });
    await expect(panel.getByText(/stops working on \d+ \w+ \d{4}/)).toBeVisible();
    // Step 3: the notification was sent (criterion 3).
    expect(
      runSql(`select count(*) from public.notifications where kind = 'data_export_ready'
      and user_id = '00000000-0000-4000-8000-000000000001';`).trim(),
    ).toBe('1');
    // Step 4: download it and read it back.
    const downloadStarted = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Download ZIP' }).click();
    const download = await downloadStarted;
    expect(download.suggestedFilename()).toMatch(/^my-data-\d{4}-\d{2}-\d{2}\.zip$/);
    const zip = await JSZip.loadAsync(await readFile((await download.path()) ?? ''));
    const data = JSON.parse((await zip.file('data.json')?.async('string')) ?? '{}');
    expect(data.user_id).toBe('00000000-0000-4000-8000-000000000001');
    expect(data.account.email).toBe('adult_writer@personas.test');
    expect(zip.file(`stories/${storySlug}.docx`)).not.toBeNull();
    const word = await JSZip.loadAsync(
      (await zip.file(`stories/${storySlug}.docx`)?.async('uint8array')) ?? new Uint8Array(),
    );
    expect(await word.file('word/document.xml')?.async('string')).toContain('Țara de sub ape');
    // The same story as a PDF beside it (ADMIN-2d).
    expect(await firstBytesOf(zip, `stories/${storySlug}.pdf`)).toBe('%PDF-');
    // Step 5 (IDEAS-1f): the library shelves, with titles and full links, also as a spreadsheet.
    const saved = data.library.find(
      (entry: { title: string }) => entry.title === 'Scrisori din cutia poștală',
    );
    expect(saved.shelf).toBe('saved');
    expect(saved.link).toMatch(/^https:\/\/.+\/s\/scrisori-din-cutia-postala-seed03$/);
    const csv = (await zip.file('library.csv')?.async('string')) ?? '';
    expect(csv).toContain(`Saved for later,Scrisori din cutia poștală,`);
    expect(csv).toContain(saved.link);
    await context.close();
  });

  test('nobody else can download someone’s copy', async () => {
    // Step 1: a ready copy of adult_writer's, made here so this test stands alone.
    const fileName = '0d0d0d0d-0000-4000-8000-0000000000e2.zip';
    runSql(`insert into public.exports (user_id, kind, state, file_name, file_size, story_count, ready_at, expires_at)
      values ('00000000-0000-4000-8000-000000000001', 'all_my_data', 'building', '${fileName}', null, null, null, null);
      insert into storage.objects (bucket_id, name, owner_id, metadata)
      values ('exports', '${fileName}', '00000000-0000-4000-8000-000000000001', '{"size": 10}');
      update public.exports set state = 'ready', file_size = 10, story_count = 0, ready_at = now(),
        expires_at = now() + interval '7 days' where file_name = '${fileName}';`);
    // Step 2: the owner gets a download address; teen_17 doesn't.
    const owner = await signInPersona('adult_writer');
    expect(
      (await owner.client.storage.from('exports').createSignedUrl(fileName, 60)).error,
    ).toBeNull();
    const teen = await signInPersona('teen_17');
    expect(
      (await teen.client.storage.from('exports').createSignedUrl(fileName, 60)).error,
    ).not.toBeNull();
  });

  for (const view of everyView(['/settings#download-my-data'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's own language wins (S1-E1-04), so it is set to the view's.
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'teen_17';`);
      await useSessionInBrowser(page.context(), (await signInPersona('teen_17')).session);
      await checkScreen(page, view);
      await expect(page.locator('#download-my-data')).toBeVisible();
    });
  }
});
