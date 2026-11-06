/**
 * The call log and Staff › Logs in a real browser (bundle LOGS-1, parts c and d; Robert, 6 Nov
 * 2026: "a log where we can see every call that's been made, where it failed").
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a member's calls reach the call log under their own user ID, with the RPC's name and the
 *   page's route pattern, and nothing from the query string;
 * - the admin finds them in Staff › Logs › Calls by username, and the look is in the audit log;
 * - the Failures and Crashes views open;
 * - a moderator has no Logs in the menu and the page says only owner and admin may read it;
 * - the page passes axe and doesn't scroll sideways at 390 px (Romanian) and 1440 px (English).
 * Test data: the seed personas; call log rows are left for the nightly purge, audit rows stay.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { waitForAnimationsToFinish } from './support/animations';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** adult_writer, whose calls the spec looks for. */
const writerId = '00000000-0000-4000-8000-000000000001';

/** Opens an address as a persona, at a width, in a language. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
  view: { width: number; language: 'en' | 'ro' } = { width: 1440, language: 'en' },
): Promise<Page> {
  runSql(`update public.profiles set locale = '${view.language}' where handle = '${persona}';`);
  const context = await browser.newContext({ viewport: { width: view.width, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    view.language,
  ] as const);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
  return page;
}

/** Checks axe and the page width. */
async function expectAccessibleAndFitting(page: Page, width: number) {
  await waitForAnimationsToFinish(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious).toEqual([]);
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(width);
}

test.describe('the call log and Staff › Logs (LOGS-1)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    runSql(`delete from public.call_log where user_id = '${writerId}';`);
  });
  test.afterAll(() => {
    runSql(
      `update public.profiles set locale = 'ro' where handle in ('adult_writer', 'admin', 'moderator');`,
    );
  });

  test('a member’s calls reach the log under their own ID, without the query', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', '/discover');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // The recorder sends every 15 seconds (or 25 calls), so wait a little longer than that.
    await expect
      .poll(
        () =>
          runSql(`select count(*) from public.call_log
            where user_id = '${writerId}' and route_path = '/discover';`).trim(),
        { timeout: 30_000 },
      )
      .not.toBe('0');
    const names = runSql(`select string_agg(distinct call_name, ' ')
      from public.call_log where user_id = '${writerId}';`);
    expect(names).not.toMatch(/[?=&]/);
    await page.context().close();
  });

  test('the admin finds them by username, and the look is audited', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/logs');
    await expect(page.getByRole('heading', { name: 'Logs', level: 1 })).toBeVisible();
    await page.getByLabel('Username', { exact: true }).fill('@adult_writer');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    const calls = page.getByRole('table', { name: 'Calls' });
    await expect(calls.getByRole('cell', { name: /^@adult_writer/ }).first()).toBeVisible();
    expect(
      runSql(`select count(*) from public.audit_log
        where action = 'call_log.viewed_for_account' and target_user_id = '${writerId}'
          and created_at > now() - interval '5 minutes';`).trim(),
    ).not.toBe('0');
    // The other two views open from the chips and keep their place in the address.
    await page.getByRole('radio', { name: 'Failures' }).click();
    await expect(page).toHaveURL(/view=failures/);
    await expect(page.getByText(/Failed calls of the last 7 days/)).toBeVisible();
    await page.getByRole('radio', { name: 'Crashes' }).click();
    await expect(page.getByText(/Errors the browser hit/)).toBeVisible();
    await expectAccessibleAndFitting(page, 1440);
    await page.context().close();
  });

  test('a moderator has no Logs and can’t read them', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/logs');
    await expect(page.getByText('Only an owner or admin can read the logs.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Logs', exact: true })).toHaveCount(0);
    await page.context().close();
  });

  test('axe: Staff › Logs at 390 px, in Romanian', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/logs', { width: 390, language: 'ro' });
    await expect(page.getByRole('heading', { name: 'Jurnale', level: 1 })).toBeVisible();
    await expect(page.getByText('Se încarcă…')).toHaveCount(0);
    await expectAccessibleAndFitting(page, 390);
    await page.context().close();
  });
});
