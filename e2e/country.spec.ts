/**
 * The country from the connection, in a real browser (story S1-E2-10).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase with Mailpit started first).
 * What it proves:
 * - an invited adult's sign-up stores only the country code from the connection (signed by the
 *   local stand-in of our Pages Function), and Settings shows "Romania · From your connection";
 * - while invite_only and adults_only are on, an invitation works from a closed country too (Q6);
 * - once sign-up is public, a closed or unknown country sees "We're not open in your country yet",
 *   and an under-16 in a 16-and-over market (Australia, Q19) is refused with nothing kept;
 * - the "not open" page passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * How the country is faked: the local server reads an X-Fake-Country header (never on Cloudflare).
 * Test data: synthetic @example.com addresses, removed afterwards; flags and markets are put back.
 */
import { expect, test, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { appPathFromEmail, waitForEmail } from './support/mailpit';

/** The seeded invite that works (supabase/seed.sql). */
const workingInvite = 'PERSONAS-TEST-INVITE';

/** Puts the local test secret in Vault, as Robert does by hand on staging (S1-E2-10). */
function useTestSecret() {
  runSql(`
    select vault.create_secret('local-e2e-signup-secret', 'signup_context_secret')
      where not exists (select 1 from vault.secrets where name = 'signup_context_secret');
    select vault.update_secret(id, 'local-e2e-signup-secret') from vault.secrets where name = 'signup_context_secret';`);
}

/** Opens sign-up in English, as if connecting from a country. */
async function openSignUpFrom(page: Page, country: string, path = `/join/${workingInvite}`) {
  await page.setExtraHTTPHeaders({ 'X-Fake-Country': country });
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  await page.goto(path);
}

/** Fills the sign-up form. */
async function fillSignUp(page: Page, address: string, birthYear: string) {
  await page.getByLabel('Email', { exact: true }).fill(address);
  await page.getByLabel('Password', { exact: true }).fill('a long and private passphrase');
  await page.getByLabel('Confirm password').fill('a long and private passphrase');
  await page.getByRole('combobox', { name: 'Year of birth' }).selectOption(birthYear);
  await page.getByRole('checkbox').check();
}

/** Removes a test account and gives its invite place back. */
function removeAccount(address: string) {
  runSql(`
    delete from public.consents where user_id in (select id from auth.users where email = '${address}');
    delete from public.profiles where id in (select id from auth.users where email = '${address}');
    delete from auth.users where email = '${address}';
    update public.invites set use_count = 0 where code_hash = public.invite_code_hash('${workingInvite}');`);
}

/** Opens sign-up to the public (after March), or closes it again. */
function setPublicSignUp(isPublic: boolean) {
  runSql(
    `update public.feature_flags set is_enabled = ${String(!isPublic)} where key in ('invite_only', 'adults_only');`,
  );
}

test.describe('country from the connection (S1-E2-10)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(useTestSecret);
  test.afterAll(() => {
    setPublicSignUp(false);
    runSql(`update public.markets set is_open = false where country_code = 'AU';`);
  });

  test('an invited adult from Romania signs up and only the country code is kept', async ({
    page,
  }) => {
    const address = `country-ro-${Date.now()}@example.com`;
    try {
      await openSignUpFrom(page, 'RO');
      await fillSignUp(page, address, '1990');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.getByRole('status').getByText(/We sent a link/)).toBeVisible();
      expect(
        runSql(
          `select country_code from public.profiles join auth.users on users.id = profiles.id where users.email = '${address}'`,
        ),
      ).toBe('RO');

      // Confirm, choose a username, then Settings shows the country.
      await page.goto(appPathFromEmail((await waitForEmail(address)).HTML));
      await page.getByRole('link', { name: 'Continue' }).click();
      // The "Choose a username" notice is labelled with the word too, so ask for the text box by
      // role, and only once the setup form is on the page.
      await expect(page.getByRole('heading', { name: 'Set up your profile' })).toBeVisible();
      const handle = `from.ro.${Date.now()}`;
      const usernameField = page.getByRole('textbox', { name: 'Username' });
      await usernameField.fill(handle);
      await expect(usernameField).toHaveValue(handle);
      await page.getByRole('button', { name: 'Save and continue' }).click();
      await expect(page).toHaveURL(/\/$/);
      await page.goto('/settings');
      await expect(page.getByText('Romania · From your connection')).toBeVisible();
    } finally {
      removeAccount(address);
    }
  });

  test('while the test is invited adults only, an invitation works from a closed country', async ({
    page,
  }) => {
    const address = `country-gb-${Date.now()}@example.com`;
    try {
      await openSignUpFrom(page, 'GB');
      await fillSignUp(page, address, '1990');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.getByRole('status').getByText(/We sent a link/)).toBeVisible();
      expect(
        runSql(
          `select country_code from public.profiles join auth.users on users.id = profiles.id where users.email = '${address}'`,
        ),
      ).toBe('GB');
    } finally {
      removeAccount(address);
    }
  });

  test('once sign-up is public, a closed or unknown country sees the "not open yet" page', async ({
    page,
  }) => {
    setPublicSignUp(true);
    try {
      await openSignUpFrom(page, 'GB', '/sign-up');
      await expect(page).toHaveURL(/\/not-open$/);
      await expect(
        page.getByRole('heading', { name: 'We’re not open in your country yet' }),
      ).toBeVisible();
      await expect(page.getByText(/We’ll open in United Kingdom later/)).toBeVisible();

      await openSignUpFrom(page, 'XX', '/sign-up');
      await expect(page).toHaveURL(/\/not-open$/);
      await expect(page.getByText(/we couldn’t tell which country you’re in/)).toBeVisible();
    } finally {
      setPublicSignUp(false);
    }
  });

  test('once public, an under-16 in Australia is refused and nothing is kept (Q19)', async ({
    page,
  }) => {
    const address = `country-au-${Date.now()}@example.com`;
    setPublicSignUp(true);
    runSql(`update public.markets set is_open = true where country_code = 'AU';`);
    try {
      await openSignUpFrom(page, 'AU', '/sign-up');
      await fillSignUp(page, address, String(new Date().getFullYear() - 14));
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.getByText(/isn’t open to under-16s in Australia yet/)).toBeVisible();
      expect(runSql(`select count(*) from auth.users where email = '${address}'`)).toBe('0');
    } finally {
      setPublicSignUp(false);
      runSql(`update public.markets set is_open = false where country_code = 'AU';`);
    }
  });

  for (const view of everyView(['/not-open'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await page.setExtraHTTPHeaders({ 'X-Fake-Country': 'GB' });
      await checkScreen(page, view);
    });
  }
});
