/**
 * Epic check S1-E13-QA: the privacy and data rights stories tested together, end to end
 * (S1-E13-01 to S1-E13-05; board Settings 6.3).
 *
 * Who runs it: `npm run test:e2e`, and CI after every merge to main (Supabase started first).
 * The journeys, with the seed personas only (CLAUDE.md, Safety while building):
 * 1. privacy settings × Download my data: kid_14_ok, an under-16, finds every setting on its most
 *    private value, shows their library to people they follow, then downloads their data and
 *    the data file holds that choice and their own user ID;
 * 2. rights don't wait for a parent: kid_14_waiting, read-only until a parent agrees, still gets
 *    their data file;
 * 3. Download my stories × the EPUB × the clean-ups: adult_writer downloads a completed story as a
 *    Word file and makes its EPUB from the same block; once the Word copy's seven days are over
 *    the nightly clean-up removes it and the block no longer offers it;
 * 4. Delete my account × Download my data: teen_17 closes their account, the closing page stands
 *    in front of Settings, and after "Keep my account" Download my data works again;
 * 5. Settings at 390, 768 and 1440 px, at night, in Romanian, as kid_14_ok, scrolled to each of the
 *    epic's four sections: no serious axe issue and nothing scrolls sideways.
 * Test data: everything this file makes is removed at the start and the end; adults_only is
 * switched off for the run and put back as it was.
 */
import { readFile } from 'node:fs/promises';

import { expect, test, type Browser, type Page } from '@playwright/test';
import JSZip from 'jszip';

import { checkScreen, LANGUAGE_STORAGE_KEY, screenWidths } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The personas' user IDs (supabase/seed.sql). */
const adultWriterId = '00000000-0000-4000-8000-000000000001';
const teenId = '00000000-0000-4000-8000-000000000002';
const kidOkId = '00000000-0000-4000-8000-000000000003';
const kidWaitingId = '00000000-0000-4000-8000-000000000004';

/** adult_writer's "Stația meteo", made Completed for journey 3. */
const storyId = '00000000-0000-4000-9000-000000000001';

/** Whether adults_only was on before this file, so it is put back as it was. */
let wasAdultsOnly = 'true';

/** Removes what the journeys make and puts the seed back as it was. */
function cleanUp() {
  runSql(`
    delete from public.exports;
    select set_config('storage.allow_delete_query', 'true', false);
    delete from storage.objects where bucket_id = 'exports';
    delete from public.rate_limit_events where action in ('data_export', 'stories_export');
    delete from public.notifications where kind in ('data_export_ready', 'stories_export_ready');
    delete from public.account_deletions where user_id = '${teenId}';
    update public.profiles set deleted_at = null where id = '${teenId}';
    update public.profiles set library_visible_to = 'only_me' where id = '${kidOkId}';
    delete from public.chapters where code = 'epice131';
    update public.stories set completion_status = 'ongoing' where id = '${storyId}';
    update public.profiles set locale = 'ro'
      where handle in ('adult_writer', 'teen_17', 'kid_14_ok', 'kid_14_waiting');`);
}

/** One published chapter on Stația meteo, which is then Completed, so it can be an EPUB. */
function completeStory() {
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${adultWriterId}', 'epice131', 1, 'Unu', 'x', 3, 'published', 'Dimineața',
            'Bunica a deschis caietul.', 4, now());
    update public.stories set completion_status = 'completed' where id = '${storyId}';`);
}

/**
 * Opens Settings at a section as a persona, in English, at 1440 px, with downloads allowed.
 *
 * @returns the browser context and the page
 */
async function openSettings(browser: Browser, persona: SignInPersonaName, section: string) {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(`/settings#${section}`);
  return { context, page };
}

/**
 * Asks for the person's data in the open Settings page and reads back its data file.
 *
 * @returns the parsed data.json from the downloaded ZIP
 */
async function downloadMyData(page: Page) {
  const panel = page.locator('#download-my-data');
  await panel.getByRole('button', { name: 'Request my data' }).click();
  await expect(panel.getByText('Your file is ready.')).toBeVisible({ timeout: 30_000 });
  const downloadStarted = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Download ZIP' }).click();
  const download = await downloadStarted;
  const zip = await JSZip.loadAsync(await readFile((await download.path()) ?? ''));
  return JSON.parse((await zip.file('data.json')?.async('string')) ?? '{}');
}

test.describe('epic S1-E13 journeys', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    wasAdultsOnly = runSql(
      `select is_enabled from public.feature_flags where key = 'adults_only';`,
    ).trim();
    runSql(`update public.feature_flags set is_enabled = false where key = 'adults_only';`);
    cleanUp();
  });

  test.afterAll(() => {
    cleanUp();
    const isOn = wasAdultsOnly === 't' || wasAdultsOnly === 'true';
    runSql(
      `update public.feature_flags set is_enabled = ${String(isOn)} where key = 'adults_only';`,
    );
  });

  test('journey 1: an under-16 changes a privacy setting and finds it in their data', async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    // Step 1: every setting starts on its most private value (S1-E13-01, criterion 2).
    const { context, page } = await openSettings(browser, 'kid_14_ok', 'privacy');
    const section = page.getByRole('region', { name: 'Privacy' });
    await expect(
      section.getByText(
        'You’re under 18, so every setting here started at its most private choice.',
        {
          exact: false,
        },
      ),
    ).toBeVisible();
    await expect(section.getByRole('radio', { name: /Only people I follow/ })).toBeChecked();
    await expect(section.getByLabel('Show when I’m online')).not.toBeChecked();
    // Step 2: kid_14_ok shows their library to people they follow, saved at once.
    const library = section.getByRole('group', { name: 'Who can see your library' });
    await library.getByRole('radio', { name: 'People I follow' }).check();
    await expect
      .poll(() =>
        runSql(`select library_visible_to from public.profiles where id = '${kidOkId}';`).trim(),
      )
      .toBe('people_i_follow');
    // Step 3: the data file holds the new choice and is kid_14_ok's own (S1-E13-02).
    await page.goto('/settings#download-my-data');
    const data = await downloadMyData(page);
    expect(data.user_id).toBe(kidOkId);
    expect(data.account.profile.library_visible_to).toBe('people_i_follow');
    await context.close();
  });

  test('journey 2: someone waiting for a parent’s consent still gets their data', async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const { context, page } = await openSettings(browser, 'kid_14_waiting', 'download-my-data');
    const data = await downloadMyData(page);
    expect(data.user_id).toBe(kidWaitingId);
    await context.close();
  });

  test('journey 3: a completed story as a Word file and an EPUB, and the copy goes after seven days', async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    completeStory();
    const { context, page } = await openSettings(browser, 'adult_writer', 'download-my-stories');
    const block = page.locator('#download-my-stories');
    // Step 1: the story's chapters as a Word file (S1-E13-05, criterion 1).
    await block.getByLabel('Story', { exact: true }).selectOption(storyId);
    await block.getByLabel('The plan from Story Atlas, as a Word file').uncheck();
    await block.getByRole('button', { name: 'Get my files' }).click();
    await expect(block.getByText('Your files are ready.')).toBeVisible({ timeout: 30_000 });
    // Step 2: the EPUB from the same block, saved straight to the device (PRIVACY part f).
    await block.getByRole('button', { name: 'Make an EPUB' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByLabel('Name on the book', { exact: false })).not.toHaveValue('');
    const epubStarted = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Make EPUB' }).click();
    expect((await epubStarted).suggestedFilename()).toBe('statia-meteo-seed01.epub');
    await expect(block.getByText(/Your EPUB is saved as statia-meteo-seed01\.epub/)).toBeVisible();
    // Step 3: seven days on, the nightly clean-up removes the Word copy (S1-E13-04).
    runSql(`update public.exports set ready_at = now() - interval '8 days',
        expires_at = now() - interval '1 day' where user_id = '${adultWriterId}';
      select public.run_retention_jobs();`);
    expect(
      runSql(`select count(*) from public.exports where user_id = '${adultWriterId}';`).trim(),
    ).toBe('0');
    // Step 4: the block no longer offers it; asking again makes a new one.
    await page.reload();
    await expect(block.getByRole('heading', { name: 'Download my stories' })).toBeVisible();
    await expect(block.getByText('Your files are ready.')).toHaveCount(0);
    await context.close();
  });

  test('journey 4: a closing account keeps nothing open until the person keeps it, then downloads work again', async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    // Step 1: teen_17 has just logged in, so Delete my account is offered straight away.
    const { context, page } = await openSettings(browser, 'teen_17', 'delete-account');
    const panel = page.locator('#delete-account');
    await panel.getByRole('button', { name: 'Delete my account' }).click();
    // Step 2: the closing page stands in front of Settings and its downloads (S1-E13-03).
    await expect(page.getByRole('heading', { name: 'Your account is closing' })).toBeVisible();
    await page.goto('/settings#download-my-data');
    await expect(page.getByRole('heading', { name: 'Your account is closing' })).toBeVisible();
    await expect(page.locator('#download-my-data')).toHaveCount(0);
    // Step 3: "Keep my account", and Download my data works again (S1-E13-02).
    await page.getByRole('button', { name: 'Keep my account' }).click();
    await expect(page.getByRole('heading', { name: 'Your account is closing' })).toHaveCount(0);
    await page.goto('/settings#download-my-data');
    const data = await downloadMyData(page);
    expect(data.user_id).toBe(teenId);
    await context.close();
  });

  for (const width of screenWidths) {
    for (const section of [
      'privacy',
      'download-my-data',
      'download-my-stories',
      'delete-account',
    ]) {
      test(`journey 5: Settings › ${section} at ${width} px, at night, in Romanian`, async ({
        page,
      }) => {
        runSql(`update public.profiles set locale = 'ro' where handle = 'kid_14_ok';`);
        await useSessionInBrowser(page.context(), (await signInPersona('kid_14_ok')).session);
        await checkScreen(page, {
          address: `/settings#${section}`,
          width,
          theme: 'night',
          language: 'ro',
        });
        await expect(page.locator(`#${section}`)).toBeVisible();
      });
    }
  }
});
