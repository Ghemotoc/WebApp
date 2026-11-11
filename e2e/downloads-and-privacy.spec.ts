/**
 * Downloads and privacy, end to end (bundle IDEAS-2, part a; ideas IDEA-20261101-1, -2 and -5).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - idea 1: the Download my data ZIP starts with "READ ME FIRST.txt" in the person's language,
 *   naming the files and every group of the data file;
 * - idea 2: a writer on the Delete your account step gets "Download stories first", makes
 *   their files there and stays on the same step; someone without stories doesn't see it;
 * - idea 5: Settings › Privacy › "How long we keep things" shows each period from the settings,
 *   and a period staff change shows the next time it is opened;
 * - axe and no sideways scroll on the Privacy panel at 390, 768 and 1440 px.
 * Test data: the seed personas; every export, its file and its rate limit counter are removed at
 * the start and the end, and the one setting changed here is put back.
 */
import { readFile } from 'node:fs/promises';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';
import JSZip from 'jszip';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** Removes every copy, its file, the counters and the notifications, and puts the setting back. */
function resetExports() {
  runSql(`
    delete from public.exports;
    select set_config('storage.allow_delete_query', 'true', false);
    delete from storage.objects where bucket_id = 'exports';
    delete from public.rate_limit_events where action in ('data_export', 'stories_export');
    delete from public.notifications where kind in ('data_export_ready', 'stories_export_ready');
    update public.settings set value = '90'::jsonb where key = 'notifications_keep_days';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'failed_check');`);
}

/**
 * Opens Settings at a panel, in a language, signed in as a persona.
 *
 * @returns the page
 */
async function openSettings(
  browser: Browser,
  persona: SignInPersonaName,
  hash: string,
  language: 'en' | 'ro' = 'en',
): Promise<Page> {
  runSql(`update public.profiles set locale = '${language}' where handle = '${persona}';`);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(`/settings#${hash}`);
  return page;
}

test.describe('Downloads and privacy (IDEAS-2a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => resetExports());
  test.afterAll(() => resetExports());

  test('the data ZIP starts with a READ ME FIRST guide in the person’s language', async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    // Step 1: adult_writer asks for their data in Romanian.
    const page = await openSettings(browser, 'adult_writer', 'download-my-data', 'ro');
    const panel = page.locator('#download-my-data');
    await panel.getByRole('button', { name: 'Cere datele' }).click();
    await expect(panel.getByText('Fișierul e gata.')).toBeVisible({ timeout: 30_000 });
    // Step 2: download it; the guide is the first file and explains the rest.
    const downloadStarted = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Descarcă ZIP-ul' }).click();
    const zip = await JSZip.loadAsync(await readFile(await (await downloadStarted).path()));
    expect(Object.keys(zip.files)[0]).toBe('CITEȘTE ÎNTÂI.txt');
    const guide = (await zip.file('CITEȘTE ÎNTÂI.txt')?.async('string')) ?? '';
    expect(guide).toContain('Datele, pe înțeles');
    expect(guide).toContain('data.json:');
    expect(guide).toContain('- stories: Povești și setările lor.');
    expect(guide).toContain('- support_tickets:');
    await page.context().close();
  });

  test('a writer can download their stories first and stays on the delete step', async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    const page = await openSettings(browser, 'adult_writer', 'delete-account');
    const panel = page.locator('#delete-account');
    await expect(panel.getByRole('heading', { name: 'Delete account?' })).toBeVisible();
    // Step 1: the step is above the delete controls; it makes the files in place.
    await panel.getByRole('button', { name: 'Download stories first' }).click();
    await expect(panel.getByText('The files are ready.')).toBeVisible({ timeout: 30_000 });
    await expect(panel.getByRole('button', { name: 'Download ZIP' })).toBeVisible();
    // Step 2: nothing was lost: the same step, and the account is still open.
    await expect(panel.getByRole('heading', { name: 'Delete account?' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Keep account' })).toBeVisible();
    expect(
      runSql(
        `select deleted_at is null from public.profiles where handle = 'adult_writer';`,
      ).trim(),
    ).toBe('t');
    await page.context().close();
  });

  test('someone without stories doesn’t get the step', async ({ browser }) => {
    const page = await openSettings(browser, 'failed_check', 'delete-account');
    const panel = page.locator('#delete-account');
    await expect(panel.getByRole('heading', { name: 'Delete account?' })).toBeVisible();
    await expect(panel.getByText('Download data first')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Download stories first' })).toHaveCount(0);
    await page.context().close();
  });

  test('Privacy shows how long each kind of data is kept, and follows a staff change', async ({
    browser,
  }) => {
    const page = await openSettings(browser, 'adult_writer', 'privacy');
    const panel = page.locator('#privacy');
    // Step 1: open the list; each period comes from the settings.
    await panel.getByText('How long we keep things').click();
    await expect(
      panel.getByText('Notifications: 90 days after the latest activity.'),
    ).toBeVisible();
    await expect(panel.getByText(/Your messages to support: 2 years/)).toBeVisible();
    await expect(
      panel.getByText('Private messages: until both people delete the chat.'),
    ).toBeVisible();
    // Step 2: staff change a period; opening the list again shows the new one.
    runSql(
      `update public.settings set value = '120'::jsonb where key = 'notifications_keep_days';`,
    );
    await page.reload();
    await panel.getByText('How long we keep things').click();
    await expect(
      panel.getByText('Notifications: 120 days after the latest activity.'),
    ).toBeVisible();
    await page.context().close();
  });

  for (const width of [390, 768, 1440]) {
    test(`the Privacy panel passes axe at ${width} px and never scrolls sideways`, async ({
      browser,
    }) => {
      const page = await openSettings(browser, 'adult_writer', 'privacy');
      await page.setViewportSize({ width, height: 900 });
      const panel = page.locator('#privacy');
      await panel.getByText('How long we keep things').click();
      await expect(panel.getByText(/Notifications:/)).toBeVisible();
      // Reduce motion ends every animation at once, so axe measures the colours the screen
      // settles on, not a fade half-way through (as in e2e/support/accessibility.ts; FINAL-1).
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const results = await new AxeBuilder({ page })
        .include('#privacy')
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
