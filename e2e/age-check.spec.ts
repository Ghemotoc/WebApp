/**
 * The age check with Yoti, in a real browser, with the Yoti stand-in (story S1-E2-08, part 08a;
 * ADR 0010).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first). The
 * local server's /api/age-check/… always uses the stand-in, whose check page is our own small
 * page, so nothing leaves the machine.
 * What it proves, for a throwaway adult account whose check hasn't been done:
 * - /age-check explains both methods and what we keep, and "Continue with Yoti" opens the
 *   check page for the 18 line (criteria 1 and 2);
 * - a pass by ID document comes back to /age-check/return, which shows "Age confirmed: 18 or
 *   over", and only the result, its date and its method are stored; the session row is gone
 *   (criteria 4 and 5);
 * - a failure shows "We couldn't confirm your age" with "Try again", and a cancel shows "You
 *   stopped the check" with "Start again", storing nothing (criterion 11);
 * - the start page and the return page pass axe and fit at 390, 768 and 1440 px, in Romanian and
 *   English, light and night.
 * Test data: one @example.com account, removed afterwards, and the local signing secret in Vault.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView } from './support/accessibility';
import { runSql } from './support/database';
import { makeTestClient, useSessionInBrowser } from './support/personas';
import { createTestAccount, removeTestAccount } from './support/testAccounts';

const email = 'age-check-e2e@example.com';
const password = 'a long and private passphrase';

/** The account's stored check, as one line of text: result|method|has a date|session rows. */
function storedCheck(): string {
  return runSql(`
    select concat_ws('|', profiles.age_check_result, coalesce(profiles.age_check_method::text, '-'),
      (profiles.age_checked_at is not null)::text,
      (select count(*) from public.age_check_sessions where user_id = profiles.id)::text)
    from public.profiles join auth.users on users.id = profiles.id
    where users.email = '${email}';`).trim();
}

/** Puts the account's check back to "not done". */
function resetCheck() {
  runSql(`
    delete from public.age_check_sessions
      where user_id in (select id from auth.users where email = '${email}');
    update public.profiles set age_check_result = 'pending', age_checked_at = null,
      age_check_method = null
      where id in (select id from auth.users where email = '${email}');`);
}

/**
 * Opens an address in a new browser signed in as the test account.
 *
 * @returns the page
 */
async function openSignedIn(browser: Browser, address: string): Promise<Page> {
  const client = makeTestClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error !== null || data.session === null)
    throw new Error('Could not sign the test account in');
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await useSessionInBrowser(context, data.session);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Presses "Continue with Yoti" and waits for the stand-in's check page. */
async function openStandIn(page: Page) {
  await page.getByRole('button', { name: 'Continue with Yoti' }).click();
  await expect(
    page.getByRole('heading', { name: 'Yoti stand-in: are you 18 or over?' }),
  ).toBeVisible();
}

test.describe('the age check', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    removeTestAccount(email);
    createTestAccount(email, password, 'age_check_e2e');
    runSql(`select vault.create_secret('local-e2e-age-secret', 'age_check_secret')
      where not exists (select 1 from vault.secrets where name = 'age_check_secret');`);
  });

  test.afterAll(() => {
    resetCheck();
    removeTestAccount(email);
  });

  test.beforeEach(() => resetCheck());

  test('explains both methods and passes with an ID document', async ({ browser }) => {
    const page = await openSignedIn(browser, '/age-check');
    await expect(page.getByRole('heading', { level: 1, name: 'Confirm your age' })).toBeVisible();
    await expect(page.getByText('Quick selfie')).toBeVisible();
    await expect(page.getByText('Use an ID document')).toBeVisible();
    await expect(page.getByText('Never your photo or your document.')).toBeVisible();
    await openStandIn(page);
    await page.getByRole('link', { name: 'Pass with an ID document' }).click();
    await expect(page).toHaveURL(/\/age-check\/return$/);
    await expect(page.getByRole('heading', { name: 'Age confirmed: 18 or over' })).toBeVisible();
    await expect(page.getByText(/· ID document/)).toBeVisible();
    // Only the result, the date and the method; the session row is gone.
    expect(storedCheck()).toBe('18_or_over|id_document|true|0');
    // Back on the start page, the result shows instead of the start button.
    await page.goto('/age-check');
    await expect(page.getByRole('heading', { name: 'Age confirmed: 18 or over' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Yoti' })).toHaveCount(0);
  });

  test('says when the check failed and offers to try again', async ({ browser }) => {
    const page = await openSignedIn(browser, '/age-check');
    await openStandIn(page);
    await page.getByRole('link', { name: 'Fail' }).click();
    await expect(page.getByRole('heading', { name: 'We couldn’t confirm your age' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
    expect(storedCheck()).toBe('failed|facial_estimation|true|0');
  });

  test('keeps nothing when the person cancels', async ({ browser }) => {
    const page = await openSignedIn(browser, '/age-check');
    await openStandIn(page);
    await page.getByRole('link', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'You stopped the check' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start again' })).toBeVisible();
    // The session row stays until it expires or a new check replaces it; nothing is stored.
    expect(storedCheck()).toMatch(/^pending\|-\|false\|/);
  });

  for (const view of everyView(['/age-check', '/age-check/return?cancelled=1'])) {
    test(`${view.address} passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}'
        where id in (select id from auth.users where email = '${email}');`);
      const page = await openSignedIn(browser, '/legal');
      await page.setViewportSize({ width: view.width, height: 1000 });
      await checkScreen(page, view);
    });
  }
});
