/**
 * The country from the connection, in a real browser (story S1-E2-10).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase with Mailpit started first).
 * What it proves:
 * - an invited adult's sign-up stores only the country code from the connection (signed by the
 *   local stand-in of our Pages Function) as the first answer of the country picker, and Settings
 *   shows "Romania" (MARKETS-1);
 * - while invite_only and adults_only are on, an invitation works from a closed country too (Q6);
 * - once sign-up is public, a closed or unknown country sees "We're not open in your country yet",
 *   and an under-16 in a 16-and-over market (Australia, Q19) is refused with nothing kept;
 * - on the "not open" page, "Tell me when you open here" sends a confirm email whose links put the
 *   address on the list and take it off again (bundle G5, part a);
 * - the "not open" page and the confirm page pass axe and don’t scroll sideways at 390, 768 and
 *   1440 px.
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
  // A username from the unique address (S1-E2-04): letters, digits and dots only.
  await page
    .getByRole('textbox', { name: 'Username' })
    .fill(address.replace(/@.*/, '').replace(/[^a-z0-9]+/g, '.'));
  await page.getByLabel('Password', { exact: true }).fill('a long and private passphrase');
  await page.getByLabel('Confirm password').fill('a long and private passphrase');
  await page.getByRole('combobox', { name: 'Year of birth' }).selectOption(birthYear);
  await page.getByRole('checkbox', { name: /I agree to the/ }).check();
}

/** Removes a test account and gives its invite place back. */
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
 * Puts the local signing secret of the public forms in Vault; "Tell me when you open here" signs
 * with it too (bundle G5, part a). The same value as NOTICE_SECRET in playwright.config.ts.
 */
function useNoticeSecret() {
  runSql(`
    select vault.create_secret('local-e2e-notice-secret', 'public_notice_secret')
      where not exists (select 1 from vault.secrets where name = 'public_notice_secret');
    select vault.update_secret(id, 'local-e2e-notice-secret') from vault.secrets where name = 'public_notice_secret';`);
}

/**
 * Finds a link to this site in a plain-text email, as a path the test can open.
 *
 * @param text - the email's text
 * @param path - the start of the path, for example "/open-here/confirm"
 * @returns the path with its "#" part
 * Errors: throws when the email has no such link.
 */
function pathFromTextEmail(text: string, path: string): string {
  const match = new RegExp(`https?://[^/\\s]+(${path}#[0-9a-f]+)`).exec(text);
  if (match?.[1] === undefined) throw new Error(`The email has no ${path} link.`);
  return match[1];
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

      // Confirm, then Settings shows the country.
      await page.goto(appPathFromEmail((await waitForEmail(address)).HTML));
      await page.getByRole('link', { name: 'Continue', exact: true }).click();
      await expect(page).toHaveURL(/\/$/);
      await page.goto('/settings');
      // The country picker started on the connection's country (MARKETS-1).
      await expect(page.getByText('Romania', { exact: true })).toBeVisible();
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
        page.getByRole('heading', { name: 'We’re not open in this country yet' }),
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
    // is_open follows the market's status (S1-E11-05), so open it the way staff would.
    runSql(
      `update public.markets set status = 'open', legal_check = 'done' where country_code = 'AU';`,
    );
    try {
      await openSignUpFrom(page, 'AU', '/sign-up');
      await fillSignUp(page, address, String(new Date().getFullYear() - 14));
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.getByText(/isn’t open to under-16s in Australia yet/)).toBeVisible();
      expect(runSql(`select count(*) from auth.users where email = '${address}'`)).toBe('0');
    } finally {
      setPublicSignUp(false);
      runSql(
        `update public.markets set status = 'closed', legal_check = 'not_started' where country_code = 'AU';`,
      );
    }
  });

  test('"Tell me when you open here" confirms the address by email and the remove link takes it off', async ({
    page,
  }) => {
    const address = `opening-gb-${Date.now()}@example.com`;
    useNoticeSecret();
    setPublicSignUp(true);
    try {
      // The page's clock runs ten seconds behind, so the form doesn't look sent by a bot.
      await page.clock.install({ time: Date.now() - 10_000 });
      await openSignUpFrom(page, 'GB', '/not-open');
      // The connection gave the country, so the form asks only for the address.
      await expect(page.getByRole('combobox', { name: 'Country' })).toHaveCount(0);
      await page.getByLabel('Email address').fill(address);
      await page.getByRole('button', { name: 'Tell me when you open here' }).click();
      await expect(page.getByText(/Check email/)).toBeVisible();
      expect(
        runSql(
          `select country_code || ':' || (confirmed_at is null)::text from public.opening_list where email = '${address}'`,
        ),
      ).toBe('GB:true');

      // The confirm link puts the address on the list.
      const email = await waitForEmail(address);
      await page.goto(pathFromTextEmail(email.Text, '/open-here/confirm'));
      // The page's main heading, so a failure names what the page said instead.
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('You’re on the list');
      // The token leaves the address bar once used.
      await expect(page).toHaveURL(/\/open-here\/confirm$/);
      expect(
        runSql(
          `select (confirmed_at is not null)::text from public.opening_list where email = '${address}'`,
        ),
      ).toBe('true');

      // The remove link takes it off again (GDPR art. 7(3)).
      await page.goto(pathFromTextEmail(email.Text, '/open-here/remove'));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('You’re off the list');
      expect(runSql(`select count(*) from public.opening_list where email = '${address}'`)).toBe(
        '0',
      );
    } finally {
      setPublicSignUp(false);
      runSql(`delete from public.opening_list where email = '${address}';`);
    }
  });

  for (const view of everyView(['/not-open', '/open-here/confirm'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await page.setExtraHTTPHeaders({ 'X-Fake-Country': 'GB' });
      await checkScreen(page, view);
    });
  }
});
