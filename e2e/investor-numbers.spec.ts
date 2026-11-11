/**
 * The investor numbers in a real browser (story S1-E15-04, bundle ANALYTICS-1a).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request.
 * What it proves:
 * - a signed-in member who opens the app is counted active today, with no history kept: their
 *   one row holds only today (criteria 1 and 2);
 * - the owner sees active members, retention and this month against last month on Metrics, and
 *   downloads both spreadsheets (criterion 5).
 * The page's axe and width checks are in staff-metrics.spec.ts, which covers the whole page.
 * Test data: seed personas; the nightly count is run once by hand.
 */
import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';

test.describe('investor numbers (S1-E15-04)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`update public.profiles set locale = 'ro' where handle = 'owner';`);
  });

  test('a member who opens the app is counted active today, and only today is kept', async ({
    browser,
  }) => {
    runSql(`delete from public.member_last_active where user_id = '${adultWriterId}';`);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    const page = await context.newPage();
    const noted = page.waitForResponse((response) => response.url().includes('note_active_minute'));
    await page.goto('/discover');
    expect((await noted).ok()).toBe(true);
    const row = runSql(`select active_on = (now() at time zone 'Europe/Bucharest')::date
      from public.member_last_active where user_id = '${adultWriterId}';`);
    expect(row.trim()).toBe('t');
    await context.close();
  });

  test('the owner sees the investor numbers and downloads both spreadsheets', async ({
    browser,
  }) => {
    runSql('select public.run_daily_metrics();');
    runSql(`update public.profiles set locale = 'en' where handle = 'owner';`);
    const context = await browser.newContext({ acceptDownloads: true });
    await useSessionInBrowser(context, (await signInPersona('owner')).session);
    await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const page = await context.newPage();
    await page.goto('/staff/metrics');
    const latest = page.getByRole('region', { name: 'Active members and retention' });
    await expect(latest.getByText('Active in the last 30 days')).toBeVisible();
    await expect(latest.getByText('Came back after 7 days')).toBeVisible();
    await expect(
      page
        .getByRole('region', { name: 'This month against last month' })
        .getByText('Sign-ups')
        .first(),
    ).toBeVisible();
    // Both files start with their heading row.
    for (const [button, firstHeading] of [
      ['Download by month', 'Month,Sign-ups'],
      ['Download by day', 'Day,Active members'],
    ] as const) {
      const download = page.waitForEvent('download');
      await latest.getByRole('button', { name: button }).click();
      const text = await readFile(await (await download).path(), 'utf8');
      expect(text.startsWith(firstHeading)).toBe(true);
    }
    await context.close();
  });
});
