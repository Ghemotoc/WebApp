/**
 * Sign-up in a real browser (story S1-E2-01).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase with Mailpit started first).
 * What it proves:
 * - with the waiting list off, sign-up without an invite code explains the test is by invitation
 *   and stores nothing (with it on, e2e/waitlist-1.spec.ts);
 * - with the seeded invite link, an adult signs up, gets the confirmation email (Mailpit), opens
 *   it and is confirmed; the profile, the consents and the invite place are in the database; then
 *   the username chosen on the form (S1-E2-04) is saved with it, so it is active at once;
 * - a 9-character password is refused and a mismatched confirmation is shown before sending;
 * - pasting into the password fields works (WCAG 2.2, 3.3.8);
 * - a throwaway email address is refused before anything is sent (bundle ADMIN-2, part f1);
 * - the sign-up screens pass axe and don't scroll sideways at 390, 768 and 1440 px.
 * Test data: synthetic @example.com addresses, removed after each test (seed personas untouched).
 */
import { expect, test, type Page } from '@playwright/test';

import { checkScreen, everyView } from './support/accessibility';
import { runSql } from './support/database';
import { appPathFromEmail, waitForEmail } from './support/mailpit';

/** The seeded invite that works (supabase/seed.sql, supabase/README.md). */
const workingInvite = 'PERSONAS-TEST-INVITE';

/** A fresh synthetic address for one test. */
function newAddress(): string {
  return `sign-up-${Date.now()}@example.com`;
}

/** The username a test account chooses: made from its unique address. */
function usernameFor(address: string): string {
  return address.replace(/@.*/, '').replace('sign-up-', 'new.writer.');
}

/**
 * Removes an account made by a test, and gives its invite place back.
 *
 * @param address - the account's email
 */
function removeAccount(address: string) {
  runSql(`
    delete from public.consents where user_id in (select id from auth.users where email = '${address}');
    -- Accounts the append-only audit log names (invite.redeemed, S1-E11-17) stay; addresses are unique per run.
    delete from public.profiles where id in (select id from auth.users where email = '${address}')
      and id not in (select user_id from public.audit_log where user_id is not null);
    delete from auth.users where email = '${address}' and id not in (select id from public.profiles);
    update public.invites set use_count = 0 where code_hash = public.invite_code_hash('${workingInvite}');`);
}

/**
 * Fills the sign-up form in English.
 *
 * @param page - the page on /join/<code>
 * @param address - the email to sign up with
 * @param password - typed into both password fields
 */
async function fillSignUp(page: Page, address: string, password: string) {
  await page.getByLabel('Email', { exact: true }).fill(address);
  await page.getByRole('textbox', { name: 'Username' }).fill(usernameFor(address));
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('combobox', { name: 'Year of birth' }).selectOption('1990');
  await page.getByRole('checkbox').check();
}

/** Opens a page in English. */
async function openInEnglish(page: Page, path: string) {
  await page.addInitScript(() => localStorage.setItem('interface-language', 'en'));
  await page.goto(path);
}

test('with the waiting list off, sign-up without a code explains it is by invitation', async ({
  page,
}) => {
  // The waiting list is on from its migration (WAITLIST-1; e2e/waitlist-1.spec.ts), so the old gate is
  // checked with it off.
  runSql(`update public.feature_flags set is_enabled = false where key = 'waitlist';`);
  try {
    await openInEnglish(page, '/');
    await page.getByRole('link', { name: 'Join for free' }).click();
    await expect(page.getByRole('heading', { name: 'The test is by invitation' })).toBeVisible();
    await expect(page.getByRole('form', { name: 'Join with email' })).toHaveCount(0);

    await page.getByLabel('Invitation code').fill('not-a-real-code');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText(/We don’t recognise this invitation code/)).toBeVisible();
  } finally {
    runSql(`update public.feature_flags set is_enabled = true where key = 'waitlist';`);
  }
});

test('an ended invitation says so', async ({ page }) => {
  await openInEnglish(page, '/join/EXPIRED-TEST-INVITE');
  await expect(
    page.getByText(/This invitation has ended, ask the person who invited you/),
  ).toBeVisible();
});

test('an invited adult signs up, confirms the email from Mailpit and is confirmed', async ({
  page,
}) => {
  const address = newAddress();
  try {
    await openInEnglish(page, `/join/${workingInvite}`);
    await expect(page.getByText('Invitation accepted. Create your account below.')).toBeVisible();

    // A 9-character password and a mismatch are caught before anything is sent.
    await fillSignUp(page, address, '123456789');
    await page.getByLabel('Confirm password').fill('12345678');
    await expect(page.getByText('The passwords don’t match yet.')).toBeVisible();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Use at least 10 characters.')).toBeVisible();

    // A good password, pasted into both fields (pasting is allowed).
    await fillSignUp(page, address, 'a long and private passphrase');
    await expect(page.getByText('The passwords match.')).toBeVisible();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(
      page.getByRole('status').getByText(new RegExp(`We sent a link to ${address}`)),
    ).toBeVisible();

    // Until the link is opened the account can't write.
    expect(runSql(`select account_state(id) from auth.users where email = '${address}'`)).toBe(
      'email_unconfirmed',
    );
    expect(
      runSql(
        `select count(*) from public.consents join auth.users on users.id = consents.user_id where users.email = '${address}'`,
      ),
    ).toBe('2');

    // The confirmation email is in English, the language the form was in.
    const email = await waitForEmail(address);
    expect(email.HTML).toContain('Confirm your email address');
    await page.goto(appPathFromEmail(email.HTML));
    await expect(page.getByRole('heading', { name: 'Your email is confirmed' })).toBeVisible();
    // The username came with the form (S1-E2-04), so the confirmed account is active at once.
    expect(
      runSql(
        `select handle from public.profiles join auth.users using (id) where email = '${address}'`,
      ),
    ).toBe(usernameFor(address));
    expect(runSql(`select account_state(id) from auth.users where email = '${address}'`)).toBe(
      'active',
    );

    // "Continue" goes to the home page, with no "Choose a username" notice; the rest of setup
    // is offered instead (S1-E2-06).
    await page.getByRole('link', { name: 'Continue', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Choose a username' })).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Finish setting up your profile' }),
    ).toBeVisible();
  } finally {
    removeAccount(address);
  }
});

test('a leaked password is refused (the check answers from a fixed list in tests)', async ({
  page,
}) => {
  const address = newAddress();
  await openInEnglish(page, `/join/${workingInvite}`);
  await fillSignUp(page, address, 'Password1234');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(/so someone could guess it/)).toBeVisible();
  expect(runSql(`select count(*) from auth.users where email = '${address}'`)).toBe('0');
});

test('a throwaway email address is refused in plain words (ADMIN-2f1)', async ({ page }) => {
  const address = `sign-up-${Date.now()}@mailinator.com`;
  await openInEnglish(page, `/join/${workingInvite}`);
  await fillSignUp(page, address, 'a long and private passphrase');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText(/hands out throwaway addresses/)).toBeVisible();
  expect(runSql(`select count(*) from auth.users where email = '${address}'`)).toBe('0');
});

for (const view of everyView(['/sign-up', `/join/${workingInvite}`])) {
  test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
    page,
  }) => {
    await checkScreen(page, view);
  });
}
