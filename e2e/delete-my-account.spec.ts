/**
 * Delete my account, end to end (story S1-E13-03; board Settings 6.3, the Delete account tab).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - criterion 1: in Settings, "Delete account" asks to log in again when the last log-in is
 *   old; after logging in again with the password the account closes at once (the closing page
 *   on every page, the profile marked deleted) and "Keep account" brings it back;
 * - criterion 5: /delete-account explains how to delete an account on the website, and opens
 *   Settings › Delete account when signed in;
 * - axe at 390, 768 and 1440 px, light and night, ro and en, on the confirmation, the website
 *   page and the closing page, and no sideways scroll.
 * Deleting for good (criteria 2 to 4) runs in the nightly job and is proved by database test 211;
 * here the account is only closed and kept, so no persona is lost.
 * Test data: the failed_check persona, whose requests are removed and whose profile is reopened
 * at the start and the end; the fresh log-in setting goes back to 10 minutes.
 */
import { expect, test } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** failed_check's user ID and the seed's shared password (supabase/README.md). */
const leaverId = '00000000-0000-4000-8000-000000000006';
const personaPassword = 'Persona-Test-2026!';

/** Sets how many minutes a log-in counts as fresh. */
function setFreshMinutes(minutes: number) {
  runSql(`update public.settings set value = '${minutes}'::jsonb
    where key = 'account_deletion_fresh_sign_in_minutes';`);
}

/** Reopens failed_check's account and forgets its requests. */
function reopenAccount() {
  runSql(`delete from public.account_deletions where user_id = '${leaverId}';
    update public.profiles set deleted_at = null where id = '${leaverId}';`);
  setFreshMinutes(10);
}

/** Closes failed_check's account directly, for the closing page's checks. */
function closeAccount() {
  runSql(`update public.profiles set deleted_at = now() where id = '${leaverId}';
    insert into public.account_deletions (user_id, delete_after)
    values ('${leaverId}', now() + interval '14 days');`);
}

test.describe('Delete account', () => {
  test.beforeAll(() => {
    expect(runSql(`select handle from public.profiles where id = '${leaverId}';`).trim()).toBe(
      'failed_check',
    );
    reopenAccount();
  });
  test.afterAll(() => reopenAccount());

  test('a person logs in again, closes their account and keeps it again', async ({ browser }) => {
    test.setTimeout(60_000);
    // Step 1: failed_check opens Delete account in English with an old log-in.
    runSql(`update public.profiles set locale = 'en' where id = '${leaverId}';`);
    setFreshMinutes(0);
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await useSessionInBrowser(context, (await signInPersona('failed_check')).session);
    await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const page = await context.newPage();
    await page.goto('/settings#delete-account');
    const panel = page.locator('#delete-account');
    await expect(panel.getByRole('heading', { name: 'Delete account?' })).toBeVisible();
    await expect(panel.getByText('Log in again to confirm')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Delete account' })).toHaveCount(0);
    // Step 2: logging in again with the password lets the person delete (criterion 1).
    setFreshMinutes(10);
    await panel.getByLabel('Or the password').fill(personaPassword);
    await panel.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(panel.getByText('You logged in again.')).toBeVisible();
    await panel.getByRole('button', { name: 'Delete account' }).click();
    // Step 3: the account closes at once, and the closing page is on every page.
    await expect(page.getByRole('heading', { name: 'Account closing' })).toBeVisible();
    await expect(page.getByText(/We delete it for good on \d+ \w+ \d{4}/)).toBeVisible();
    expect(runSql(`select account_state('${leaverId}')::text;`).trim()).toBe('deleted');
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Account closing' })).toBeVisible();
    // Step 4: "Keep account" brings everything back.
    await page.getByRole('button', { name: 'Keep account' }).click();
    await expect(page.getByRole('heading', { name: 'Account closing' })).toHaveCount(0);
    expect(
      runSql(`select deleted_at is null from public.profiles where id = '${leaverId}';`).trim(),
    ).toBe('t');
    await context.close();
  });

  test('the website page says how to delete an account, and opens Settings when signed in', async ({
    browser,
  }) => {
    // Step 1: signed out, the steps and a Log in button (criterion 5).
    const visitor = await browser.newPage();
    await visitor.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await visitor.goto('/delete-account');
    await expect(visitor.getByRole('heading', { name: 'Delete account' })).toBeVisible();
    await expect(
      visitor.locator('#main').getByRole('link', { name: 'Log in', exact: true }),
    ).toBeVisible();
    await visitor.close();
    // Step 2: signed in, it opens Settings › Delete account.
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('failed_check')).session);
    const page = await context.newPage();
    await page.goto('/delete-account');
    await expect(page).toHaveURL(/\/settings#delete-account$/);
    await expect(page.locator('#delete-account')).toBeVisible();
    await context.close();
  });

  for (const view of everyView(['/settings#delete-account'])) {
    test(`axe: the confirmation at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's own language wins (S1-E1-04), so it is set to the view's.
      runSql(`update public.profiles set locale = '${view.language}' where id = '${leaverId}';`);
      await useSessionInBrowser(page.context(), (await signInPersona('failed_check')).session);
      await checkScreen(page, view);
      await expect(page.locator('#delete-account')).toBeVisible();
    });
  }

  for (const view of everyView(['/delete-account'])) {
    test(`axe: the website page at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }

  test.describe('the closing page', () => {
    test.describe.configure({ mode: 'serial' });
    test.beforeAll(() => closeAccount());
    test.afterAll(() => reopenAccount());

    for (const view of everyView(['/settings'])) {
      test(`axe: at ${view.width} px, ${view.theme}, ${view.language}`, async ({ page }) => {
        runSql(`update public.profiles set locale = '${view.language}' where id = '${leaverId}';`);
        await useSessionInBrowser(page.context(), (await signInPersona('failed_check')).session);
        await checkScreen(page, view);
        await expect(
          page.getByRole('button', { name: /Keep account|Păstrez contul/ }),
        ).toBeVisible();
      });
    }
  });
});
