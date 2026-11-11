/**
 * Sign-ups from a country that isn't open yet, in a real browser (bundle MARKETS-2, part b; story
 * S1-E11-32).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase with Mailpit started first).
 * What it proves:
 * - once sign-up is public and the waiting list is on, someone connecting from Sweden (still closed)
 *   sees the sign-up form with "We're not open in your country yet" instead of the "not open" page,
 *   and their sign-up joins the list with their country;
 * - waiting, their holding page says they wait for Sweden to open;
 * - Staff › Waitlist marks Sweden as not open yet, and letting them in is refused with a plain
 *   reason;
 * - the holding page for a closed country passes axe and doesn't scroll sideways at 390, 768 and
 *   1440 px, light and night, Romanian and English.
 * How the country is faked: the local server reads an X-Fake-Country header (never on Cloudflare).
 * Test data: synthetic @example.com accounts made by this run, removed afterwards; flags and seed
 * personas' languages are put back. The database rules are in
 * supabase/tests/database/357-waitlist-closed-markets.test.sql.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { makeTestClient, signInPersona, useSessionInBrowser } from './support/personas';
import { createTestAccount } from './support/testAccounts';

/** The stamp every synthetic account of this run carries, so clean-up finds them. */
const stamp = Date.now();

/** The password every synthetic account of this run uses. */
const password = 'a long and private passphrase';

/** A confirmed account from Sweden that waits, for the holding page and the staff list. */
const waitingEmail = `closed-market-${stamp}-waits@example.com`;
const waitingHandle = `sweden.${stamp}`;

/** Opens sign-up to the public (after March), or closes it again. */
function setPublicSignUp(isPublic: boolean) {
  runSql(
    `update public.feature_flags set is_enabled = ${String(!isPublic)} where key in ('invite_only', 'adults_only');`,
  );
}

/** Puts the local signing secret of the connection's country in Vault, as in country.spec.ts. */
function useSignUpSecret() {
  runSql(`
    select vault.create_secret('local-e2e-signup-secret', 'signup_context_secret')
      where not exists (select 1 from vault.secrets where name = 'signup_context_secret');
    select vault.update_secret(id, 'local-e2e-signup-secret') from vault.secrets where name = 'signup_context_secret';`);
}

/**
 * Removes every account this run made. Accounts the append-only audit log names keep their profile
 * and login; the addresses are unique per run, so a kept account never gets in the way.
 */
function cleanUp() {
  const ours = `select id from auth.users where email like 'closed-market-${stamp}-%@example.com'`;
  runSql(`
    delete from public.notifications where user_id in (${ours});
    delete from public.consents where user_id in (${ours});
    delete from public.profiles where id in (${ours})
      and id not in (select user_id from public.audit_log where user_id is not null)
      and id not in (select target_user_id from public.audit_log where target_user_id is not null);
    delete from auth.users where email like 'closed-market-${stamp}-%@example.com'
      and id not in (select id from public.profiles);
    update public.profiles set locale = 'ro' where handle = 'admin';`);
}

/** Opens Staff › Waitlist in English as the seeded admin, in a fresh browser context. */
async function openStaffWaitlist(browser: Browser) {
  runSql(`update public.profiles set locale = 'en' where handle = 'admin';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('admin')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto('/staff/waitlist');
  return page;
}

test.describe('sign-ups from a country that isn’t open yet (MARKETS-2b)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    useSignUpSecret();
    setPublicSignUp(true);
  });
  test.afterAll(() => {
    setPublicSignUp(false);
    cleanUp();
  });

  test('someone from Sweden signs up and joins the list with their country', async ({ page }) => {
    const email = `closed-market-${stamp}-joins@example.com`;
    await page.setExtraHTTPHeaders({ 'X-Fake-Country': 'SE' });
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.goto('/sign-up');

    // The form shows, not the "not open" page, and says why they will wait.
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByRole('heading', { name: 'Join the waiting list' })).toBeVisible();
    await expect(
      page.getByText('We’re not open in your country yet.', { exact: false }),
    ).toBeVisible();

    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByRole('textbox', { name: 'Username' }).fill(`joins.${stamp}`);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('combobox', { name: 'Year of birth' }).selectOption('1990');
    await page.getByRole('radio', { name: 'Read' }).click();
    await page.getByRole('checkbox', { name: /I agree to the/ }).check();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: 'You’re on the list' })).toBeVisible();

    // The account waits on the list with Sweden as its country.
    expect(
      runSql(
        `select profiles.country_code || ':' || (entries.admitted_at is null)::text
           from public.waitlist_entries as entries
           join public.profiles on profiles.id = entries.user_id
           join auth.users on users.id = entries.user_id
          where users.email = '${email}'`,
      ),
    ).toBe('SE:true');
  });

  test('a confirmed account from Sweden waits', () => {
    createTestAccount(waitingEmail, password, waitingHandle);
    runSql(`update public.profiles set country_code = 'SE'
        where id = (select id from auth.users where email = '${waitingEmail}');
      insert into public.waitlist_entries (user_id, interest)
        select id, 'read' from auth.users where email = '${waitingEmail}';`);
    expect(runSql(`select account_state(id) from auth.users where email = '${waitingEmail}'`)).toBe(
      'waitlisted',
    );
  });

  test('the holding page says they wait for Sweden to open', async ({ page }) => {
    runSql(`update public.profiles set locale = 'en' where handle = '${waitingHandle}';`);
    const { data } = await makeTestClient().auth.signInWithPassword({
      email: waitingEmail,
      password,
    });
    if (data.session === null) throw new Error('The waiting account could not sign in.');
    await useSessionInBrowser(page.context(), data.session);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'You’re on the list' })).toBeVisible();
    await expect(page.getByText(/We’re not open in Sweden yet/)).toBeVisible();
  });

  test('staff see Sweden is not open, and letting the person in is refused', async ({
    browser,
  }) => {
    const admin = await openStaffWaitlist(browser);
    const country = admin.getByRole('combobox', { name: 'Country' });
    await expect(
      country.getByRole('option', { name: /^Sweden \(\d+\), not open yet$/ }),
    ).toHaveCount(1);
    await country.selectOption('SE');
    await expect(admin.getByRole('cell', { name: 'Sweden, not open yet' }).first()).toBeVisible();
    await admin.getByRole('checkbox', { name: `Choose ${waitingHandle}` }).check();
    await admin.getByRole('button', { name: 'Let in 1 chosen person' }).click();
    await expect(
      admin.getByText(/someone ticked comes from a country that isn’t open yet/),
    ).toBeVisible();
    expect(
      runSql(
        `select (admitted_at is null)::text from public.waitlist_entries
          where user_id = (select id from auth.users where email = '${waitingEmail}')`,
      ),
    ).toBe('true');
    await admin.context().close();
  });

  for (const view of everyView(['/'])) {
    test(`axe, holding page for a closed country: ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's language wins over the browser's (S1-E1-04), so set it to the view's.
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = '${waitingHandle}';`,
      );
      const { data } = await makeTestClient().auth.signInWithPassword({
        email: waitingEmail,
        password,
      });
      if (data.session === null) throw new Error('The waiting account could not sign in.');
      await useSessionInBrowser(page.context(), data.session);
      await checkScreen(page, view);
    });
  }
});
