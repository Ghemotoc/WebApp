/**
 * An account that closed because nobody used it, end to end (bundle INACTIVE-2).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves (Robert, 11 Nov 2026, 19:42 and 19:43 UTC):
 * - the closing email's address (/account-closing) shows the closing page with Download data, and
 *   a closed account can make and download its copy there, its hidden story included as a Word
 *   file;
 * - downloading doesn't keep the account: it is still closing afterwards;
 * - going on to an ordinary page (Discover) keeps the account, and the page opens;
 * - a visitor who isn't logged in is sent to the log-in page, which comes back to that address;
 * - break test: an account that isn't closing is sent to Settings, and an account its owner chose
 *   to delete is not kept by opening a page;
 * - axe at 390, 768 and 1440 px, light and night, ro and en, on the closing page with the
 *   download panel, and no sideways scroll.
 * The emails and the nightly job are proved by database test 369 and server/notification-emails.
 * Test data: the failed_check persona with one story of the spec's own; the account is closed by
 * the job's own close_unused_account() and reopened, with its exports removed, at the start and
 * the end.
 */
import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';
import JSZip from 'jszip';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** failed_check's user ID (supabase/README.md) and the spec's own story. */
const sleeperId = '00000000-0000-4000-8000-000000000006';
const storySlug = 'unused-account-e2e';

/** Reopens failed_check's account and removes what the spec made. */
function reopenAccount() {
  runSql(`
    delete from public.account_deletions where user_id = '${sleeperId}';
    update public.profiles set deleted_at = null, locale = 'ro' where id = '${sleeperId}';
    delete from public.exports where user_id = '${sleeperId}';
    delete from public.rate_limit_events where action = 'data_export';
    delete from public.notifications where user_id = '${sleeperId}'
      and kind in ('account_unused_closed', 'data_export_ready');
    delete from public.chapters where code = 'unuse2e1';
    delete from public.stories where slug = '${storySlug}';`);
}

/** Gives failed_check one draft story, then closes the account the way the nightly job does. */
function closeAsUnused() {
  runSql(`
    insert into public.stories (user_id, slug, title, language_code, category_id,
      completion_status, rating)
    values ('${sleeperId}', '${storySlug}', 'Casa de la capătul liniei', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages');
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count, status)
    values ((select id from public.stories where slug = '${storySlug}'),
      '${sleeperId}', 'unuse2e1', 1, 'Începutul', 'Ș și ț.', 3, 'draft');
    select public.close_unused_account('${sleeperId}');`);
}

/** Whether failed_check's account is closed right now. */
function isClosed(): boolean {
  return (
    runSql(
      `select deleted_at is not null from public.profiles where id = '${sleeperId}';`,
    ).trim() === 't'
  );
}

test.describe('An account closed for not being used', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    expect(runSql(`select handle from public.profiles where id = '${sleeperId}';`).trim()).toBe(
      'failed_check',
    );
    reopenAccount();
    closeAsUnused();
  });
  test.afterAll(() => reopenAccount());

  test('a visitor who isn’t logged in is sent to log in, and comes back to the download page', async ({
    page,
  }) => {
    await page.goto('/account-closing');
    await expect(page).toHaveURL(/\/sign-in\?next=%2Faccount-closing$/);
  });

  for (const view of everyView(['/account-closing'])) {
    test(`axe: the closing page with Download data at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where id = '${sleeperId}';`);
      await useSessionInBrowser(page.context(), (await signInPersona('failed_check')).session);
      await checkScreen(page, view, async (screen) => {
        await expect(screen.locator('#download-my-data')).toBeVisible();
      });
      // Looking at the page keeps nothing: the account is still closing.
      expect(isClosed()).toBe(true);
    });
  }

  test('the closed account downloads its data, which doesn’t keep it; using the site does', async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    // Step 1: failed_check, closed for not being used, opens the email's address in English.
    runSql(`update public.profiles set locale = 'en' where id = '${sleeperId}';`);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    });
    await useSessionInBrowser(context, (await signInPersona('failed_check')).session);
    await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const page = await context.newPage();
    await page.goto('/account-closing');
    await expect(page.getByRole('heading', { name: 'Account closing' })).toBeVisible();
    await expect(page.getByText(/nobody had logged in for 5 years/)).toBeVisible();
    // Step 2: Download data is there, without Download stories, and makes the copy.
    const panel = page.locator('#download-my-data');
    await expect(panel.getByRole('heading', { name: 'Download data' })).toBeVisible();
    await expect(page.locator('#download-my-stories')).toHaveCount(0);
    await panel.getByRole('button', { name: 'Request data' }).click();
    await expect(panel.getByText('The file is ready.')).toBeVisible({ timeout: 30_000 });
    // Step 3: the ZIP holds the story the closing hid, as a Word file.
    const downloadStarted = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Download ZIP' }).click();
    const download = await downloadStarted;
    const zip = await JSZip.loadAsync(await readFile((await download.path()) ?? ''));
    expect(zip.file('data.json')).not.toBeNull();
    expect(zip.file(`stories/${storySlug}.docx`)).not.toBeNull();
    // Step 4: downloading kept nothing.
    expect(isClosed()).toBe(true);
    // Step 5: going on to Discover is using the site again: the account is kept and the page opens.
    await page.goto('/discover');
    await expect(page.getByRole('heading', { name: 'Account closing' })).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect.poll(() => isClosed()).toBe(false);
    expect(
      runSql(
        `select count(*) from public.stories where slug = '${storySlug}' and deleted_at is null;`,
      ).trim(),
    ).toBe('1');
    await context.close();
  });

  test('an account that isn’t closing opens Settings from the email’s address (break test)', async ({
    page,
  }) => {
    // The test before kept the account, so the old link has nothing to close or download here.
    expect(isClosed()).toBe(false);
    await useSessionInBrowser(page.context(), (await signInPersona('failed_check')).session);
    await page.goto('/account-closing');
    await expect(page).toHaveURL(/\/settings#download-my-data$/);
  });

  test('an account its owner chose to delete isn’t kept by opening a page (break test)', async ({
    page,
  }) => {
    // Only a closing for not being used is undone by using the site (Robert, 11 Nov 2026, 19:43
    // UTC); "Delete my account" still needs the Keep button.
    reopenAccount();
    closeAsUnused();
    runSql(
      `update public.account_deletions set reason = 'requested' where user_id = '${sleeperId}';`,
    );
    await useSessionInBrowser(page.context(), (await signInPersona('failed_check')).session);
    await page.goto('/discover');
    await expect(page.locator('#download-my-data')).toBeVisible();
    await page.goto('/account-closing');
    await expect(page.locator('#download-my-data')).toBeVisible();
    expect(isClosed()).toBe(true);
  });
});
