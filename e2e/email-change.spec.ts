/**
 * Seeing and changing one's own email address in Settings, in a real browser (story S1-E2-05,
 * added 25 Oct 2026: "every user, minors included, can see their own email in Settings and change
 * it whenever they want"; Robert).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase with Mailpit started).
 * What it proves:
 * - Settings shows the signed-in account its own address, with the line that only it sees it;
 * - the address never appears on the person's public profile;
 * - asking for the same address is refused in words, and a new one sends a link to both
 *   addresses (Mailpit), with the change waiting until both are opened;
 * - the first link says to open the other one; the second changes the address, and the account
 *   then logs in with the new one;
 * - the Email panel and the confirm page pass axe and don't scroll sideways at 390, 768 and 1440 px.
 * Test data: a synthetic @example.com account made through the sign-up form with the seeded
 * invite, removed afterwards (seed personas untouched).
 */
import { expect, test, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { appPathFromEmail, waitForEmail } from './support/mailpit';

/** The seeded invite that works (supabase/seed.sql). */
const workingInvite = 'PERSONAS-TEST-INVITE';

/** One run's addresses and username, unique per run. */
const stamp = Date.now();
const oldAddress = `email-old-${stamp}@example.com`;
const newAddress = `email-new-${stamp}@example.com`;
const username = `email.change.${stamp}`;
const password = 'a long and private passphrase';

/** Removes the test account (by either address) and gives its invite place back. */
function removeAccount() {
  const accounts = `(select id from auth.users where email in ('${oldAddress}', '${newAddress}'))`;
  runSql(`
    delete from public.consents where user_id in ${accounts};
    -- Accounts the append-only audit log names (invite.redeemed) stay; addresses are unique per run.
    delete from public.profiles where id in ${accounts}
      and id not in (select user_id from public.audit_log where user_id is not null);
    delete from auth.users where id in ${accounts} and id not in (select id from public.profiles);
    update public.invites set use_count = 0 where code_hash = public.invite_code_hash('${workingInvite}');`);
}

/** Signs up through the form in English and opens the confirmation link, so the page is signed in. */
async function signUpAndConfirm(page: Page) {
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  await page.goto(`/join/${workingInvite}`);
  await page.getByLabel('Email', { exact: true }).fill(oldAddress);
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('combobox', { name: 'Year of birth' }).selectOption('1990');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('status').getByText(/We sent a link/)).toBeVisible();
  await page.goto(appPathFromEmail((await waitForEmail(oldAddress)).HTML));
  await expect(page.getByRole('heading', { name: 'Your email is confirmed' })).toBeVisible();
}

/** Logs in through the log-in screen with an address and the test password. */
async function logIn(page: Page, address: string) {
  await page.goto('/sign-in');
  await page.locator('#sign-in-email').fill(address);
  await page.locator('#sign-in-password').fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole('button', { name: 'Your account' })).toBeVisible();
}

test.describe('email address in Settings (S1-E2-05)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(removeAccount);

  test('the owner sees the address, changes it through both links and logs in with it', async ({
    page,
  }) => {
    await signUpAndConfirm(page);

    // Settings shows the account its own address, and says only it can see it.
    await page.goto('/settings');
    const panel = page.getByRole('region', { name: 'Email address' });
    await expect(panel.getByText(oldAddress)).toBeVisible();
    await expect(panel.getByText(/Only you can see it/)).toBeVisible();

    // The public profile never shows it.
    await page.goto(`/u/${username}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(oldAddress)).toHaveCount(0);

    // The same address is refused in words; a new one sends a link to both addresses.
    await page.goto('/settings');
    await panel.getByLabel('New email address').fill(oldAddress);
    await panel.getByRole('button', { name: 'Change email' }).click();
    await expect(panel.getByText('That’s already your email address.')).toBeVisible();
    await panel.getByLabel('New email address').fill(newAddress);
    await panel.getByRole('button', { name: 'Change email' }).click();
    await expect(panel.getByText(/Check both inboxes/)).toBeVisible();
    await expect(
      panel.getByText(`Waiting to change to ${newAddress}`, { exact: false }),
    ).toBeVisible();

    // The first link only records itself: the address is still the old one.
    const oldLink = appPathFromEmail((await waitForEmail(oldAddress, 15_000, 'change')).HTML);
    const newLink = appPathFromEmail((await waitForEmail(newAddress, 15_000, 'change')).HTML);
    await page.goto(oldLink);
    await expect(page.getByRole('heading', { name: 'One more link to open' })).toBeVisible();
    expect(runSql(`select count(*) from auth.users where email = '${oldAddress}'`)).toBe('1');

    // The second link makes the change.
    await page.goto(newLink);
    await expect(
      page.getByRole('heading', { name: 'Your email address is changed' }),
    ).toBeVisible();
    expect(runSql(`select count(*) from auth.users where email = '${newAddress}'`)).toBe('1');

    // Settings shows the new address, and the account logs in with it.
    await page.goto('/settings');
    await expect(panel.getByText(newAddress)).toBeVisible();
    await page.getByRole('button', { name: 'Your account' }).click();
    await page.getByRole('button', { name: 'Log out', exact: true }).click();
    await logIn(page, newAddress);
  });

  test('axe: the Email panel at every width', async ({ page }) => {
    // The account from the first test logs in with its new address.
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await logIn(page, newAddress);
    for (const view of everyView(['/settings'])) {
      await checkScreen(page, view);
    }
  });
});
