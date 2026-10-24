/**
 * Logging in, the pause after wrong tries, signed-in devices and the password reset, in a real
 * browser (story S1-E2-05).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase with Mailpit started first).
 * What it proves:
 * - a wrong password and an unknown email get the same message, so nothing is revealed;
 * - five wrong tries pause logging in, and even the right password waits out the pause;
 * - a person logs in, sees their devices in Settings (this one marked) and logs every other device
 *   out; the account menu logs this device out;
 * - "Forgot your password?" emails a link (Mailpit); the new password logs every other device out
 *   and a "password changed" email arrives; the new password works;
 * - the log-in and password screens pass axe and don't scroll sideways at 390, 768 and 1440 px.
 * Test data: throwaway @example.com accounts made and removed by e2e/support/testAccounts.ts.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { appPathFromEmail, waitForEmail } from './support/mailpit';
import { createTestAccount, removeTestAccount } from './support/testAccounts';

/** The throwaway account's first password. */
const firstPassword = 'first secret passphrase';

/** A fresh synthetic address and username for one test. */
function newAccount() {
  const stamp = Date.now();
  return { email: `sign-in-${stamp}@example.com`, handle: `sign.in.${stamp}` };
}

/** Opens /sign-in in English in a fresh browser context (one "device"). */
async function openSignIn(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto('/sign-in');
  return page;
}

/** Types the details and presses "Log in". */
async function logIn(page: Page, email: string, password: string) {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
}

/** How many sessions Supabase holds for an address. */
function sessionCount(email: string): string {
  return runSql(
    `select count(*) from auth.sessions join auth.users on users.id = sessions.user_id where users.email = '${email}'`,
  );
}

test('a wrong password and an unknown email get the same message', async ({ browser }) => {
  const account = newAccount();
  createTestAccount(account.email, firstPassword, account.handle);
  try {
    const page = await openSignIn(browser);
    await logIn(page, account.email, 'not the password');
    const message = page.getByRole('alert');
    await expect(message).toContainText('That email and password don’t match.');
    const wrongPasswordText = await message.textContent();

    await logIn(page, 'nobody.here@example.com', 'not the password');
    await expect(message).toHaveText(wrongPasswordText ?? '');
  } finally {
    removeTestAccount(account.email);
    runSql(
      `delete from public.sign_in_failures where email_hash = public.hash_email('nobody.here@example.com');`,
    );
  }
});

test('five wrong tries pause logging in, even with the right password', async ({ browser }) => {
  const account = newAccount();
  createTestAccount(account.email, firstPassword, account.handle);
  try {
    const page = await openSignIn(browser);
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await logIn(page, account.email, `wrong ${attempt}`);
      await expect(page.getByRole('alert')).toContainText('don’t match');
    }
    await logIn(page, account.email, 'wrong 5');
    await expect(page.getByRole('alert')).toContainText('Logging in is paused for 15 minutes.');

    // The sixth try, with the right password, still waits.
    await logIn(page, account.email, firstPassword);
    await expect(page.getByRole('alert')).toContainText('Logging in is paused');
    expect(sessionCount(account.email)).toBe('0');
    expect(
      runSql(
        `select count(*) from public.sign_in_failures where email_hash = public.hash_email('${account.email}')`,
      ),
    ).toBe('5');
  } finally {
    removeTestAccount(account.email);
  }
});

test('a person logs in, sees their devices and logs the others out', async ({ browser }) => {
  const account = newAccount();
  createTestAccount(account.email, firstPassword, account.handle);
  try {
    // Two devices log in.
    const phone = await openSignIn(browser);
    await logIn(phone, account.email, firstPassword);
    await expect(phone.getByRole('button', { name: 'Your account' })).toBeVisible();
    const laptop = await openSignIn(browser);
    await logIn(laptop, account.email, firstPassword);
    await expect(laptop.getByRole('button', { name: 'Your account' })).toBeVisible();
    expect(sessionCount(account.email)).toBe('2');

    // The laptop opens Settings through the account menu.
    await laptop.getByRole('button', { name: 'Your account' }).click();
    await laptop.getByRole('link', { name: 'Settings' }).click();
    const devices = laptop.getByRole('region', { name: 'Signed-in devices' });
    await expect(devices.getByText('This device')).toBeVisible();
    await expect(devices.getByRole('listitem')).toHaveCount(2);
    await expect(devices.getByText(/IP address/)).toBeVisible();

    // Every other device is logged out.
    await devices.getByRole('button', { name: 'Log out of all other devices' }).click();
    await expect(devices.getByText('Your other devices are logged out.')).toBeVisible();
    await expect(devices.getByRole('listitem')).toHaveCount(1);
    expect(sessionCount(account.email)).toBe('1');

    // The account menu logs this device out too.
    await laptop.getByRole('button', { name: 'Your account' }).click();
    await laptop.getByRole('button', { name: 'Log out' }).click();
    await expect(laptop.getByRole('link', { name: 'Log in' })).toBeVisible();
  } finally {
    removeTestAccount(account.email);
  }
});

test('a password reset by email logs other devices out and sends a "password changed" email', async ({
  browser,
}) => {
  const account = newAccount();
  const newPassword = 'second secret passphrase';
  createTestAccount(account.email, firstPassword, account.handle);
  try {
    // Another device is logged in before the reset.
    const otherDevice = await openSignIn(browser);
    await logIn(otherDevice, account.email, firstPassword);
    await expect(otherDevice.getByRole('button', { name: 'Your account' })).toBeVisible();

    // "Forgot your password?" sends the link, with the same words for any address.
    const page = await openSignIn(browser);
    await page.getByRole('link', { name: 'Forgot your password?' }).click();
    // The log-in form has an "Email" field too, so wait until the reset form has replaced it;
    // otherwise the address lands in a field that is about to disappear and the reset form
    // opens empty ("Type the email you joined with.").
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
    const emailField = page.getByLabel('Email', { exact: true });
    await emailField.fill(account.email);
    await expect(emailField).toHaveValue(account.email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
    await expect(page.getByText(`If there’s an account for ${account.email}`)).toBeVisible();

    // The link opens the new password form; a short password is refused first.
    const resetEmail = await waitForEmail(account.email, 15_000, 'Reset');
    expect(resetEmail.HTML).toContain('Choose a new password');
    await page.goto(appPathFromEmail(resetEmail.HTML));
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
    await page.getByLabel('New password', { exact: true }).fill('short');
    await page.getByLabel('Confirm new password').fill('short');
    await page.getByRole('button', { name: 'Save new password' }).click();
    await expect(page.getByText('Use at least 10 characters.')).toBeVisible();

    await page.getByLabel('New password', { exact: true }).fill(newPassword);
    await page.getByLabel('Confirm new password').fill(newPassword);
    await page.getByRole('button', { name: 'Save new password' }).click();
    await expect(page.getByRole('heading', { name: 'Your new password is saved.' })).toBeVisible();

    // Every other device is logged out, and the "password changed" email arrives.
    expect(sessionCount(account.email)).toBe('1');
    const changedEmail = await waitForEmail(account.email, 15_000, 'changed');
    expect(changedEmail.HTML).toContain('Your password was changed');

    // The new password works on a fresh device.
    const fresh = await openSignIn(browser);
    await logIn(fresh, account.email, newPassword);
    await expect(fresh.getByRole('button', { name: 'Your account' })).toBeVisible();
  } finally {
    removeTestAccount(account.email);
  }
});

for (const view of everyView(['/sign-in', '/forgot-password', '/reset-password'])) {
  test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
    page,
  }) => {
    await checkScreen(page, view);
  });
}
