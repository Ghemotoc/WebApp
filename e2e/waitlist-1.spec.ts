/**
 * The waiting list in a real browser (bundle WAITLIST-1, story S1-E2-24).
 *
 * Who runs it: `npm run test:e2e` (Supabase with Mailpit started first). The `waitlist` flag is
 * on from its migration, so nothing is switched here.
 * What it proves:
 * - without an invite code, the same form asks "write, read or both", the email says "You're on
 *   the list", and once confirmed the account waits ('waitlisted') behind the holding page, while
 *   Settings stays open;
 * - an admin ticks the person in Staff › Waitlist and lets them in: the account becomes active,
 *   the "You're in" notice and email are queued and the holding page goes away;
 * - a moderator is refused the list;
 * - the holding page and Staff › Waitlist pass axe and don't scroll sideways at 390, 768 and
 *   1440 px, light and night, Romanian and English.
 * Test data: synthetic @example.com accounts made by this run, removed afterwards; seed personas
 * only get their language set back.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { appPathFromEmail, waitForEmail } from './support/mailpit';
import {
  makeTestClient,
  signInPersona,
  useSessionInBrowser,
  type SignInPersonaName,
} from './support/personas';
import { createTestAccount } from './support/testAccounts';

/** The stamp every synthetic account of this run carries, so clean-up finds them. */
const stamp = Date.now();

/** The password every synthetic account of this run uses. */
const password = 'a long and private passphrase';

/** The account that waits for the holding page's accessibility checks. */
const waitingEmail = `waitlist-${stamp}-holding@example.com`;
const waitingHandle = `waiting.${stamp}`;

/**
 * Removes every account this run made. Accounts the append-only audit log names (waitlist.admitted)
 * keep their profile and login, because audit rows can never be deleted; the addresses are unique
 * per run, so a kept account never gets in the way of the next run.
 */
function cleanUp() {
  const ours = `select id from auth.users where email like 'waitlist-${stamp}-%@example.com'`;
  runSql(`
    delete from public.notifications where user_id in (${ours});
    delete from public.consents where user_id in (${ours});
    delete from public.profiles where id in (${ours})
      and id not in (select user_id from public.audit_log where user_id is not null)
      and id not in (select target_user_id from public.audit_log where target_user_id is not null);
    delete from auth.users where email like 'waitlist-${stamp}-%@example.com'
      and id not in (select id from public.profiles);
    update public.profiles set locale = 'ro' where handle in ('admin', 'moderator');`);
}

/** Opens an address in English as a seed persona, in a fresh browser context. */
async function openAsPersona(browser: Browser, persona: SignInPersonaName, address: string) {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/**
 * Signs a synthetic account in and hands its session to the page's browser context.
 *
 * @param page - the page whose context gets the session
 * @param email - the account's address
 */
async function signInSynthetic(page: Page, email: string) {
  const { data, error } = await makeTestClient().auth.signInWithPassword({ email, password });
  if (error !== null || data.session === null) {
    throw new Error(`Could not sign ${email} in: ${error?.message ?? 'no session returned'}`);
  }
  await useSessionInBrowser(page.context(), data.session);
}

/**
 * Fills the sign-up form without a code, answering the waiting list's question.
 *
 * @param page - the page on /sign-up
 * @param email - the address to sign up with
 * @param handle - the username to choose
 */
async function fillWaitlistSignUp(page: Page, email: string, handle: string) {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('textbox', { name: 'Username' }).fill(handle);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('combobox', { name: 'Country you live in' }).selectOption('RO');
  await page.getByRole('combobox', { name: 'Year of birth' }).selectOption('1990');
  await page.getByRole('radio', { name: 'Write' }).click();
  await page.getByRole('checkbox', { name: /I agree to the/ }).check();
}

test.describe('the waiting list (WAITLIST-1)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(cleanUp);

  test('someone without a code joins the list, waits, and an admin lets them in', async ({
    browser,
    page,
  }) => {
    const email = `waitlist-${stamp}-joins@example.com`;
    const handle = `joins.${stamp}`;

    // Step 1: the same form, headed "Join the waiting list", with the one question.
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.goto('/sign-up');
    await expect(page.getByRole('heading', { name: 'Join the waiting list' })).toBeVisible();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Choose write, read or both.')).toBeVisible();
    await fillWaitlistSignUp(page, email, handle);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: 'You’re on the list' })).toBeVisible();

    // Step 2: the confirmation email is the waiting list's, and confirming leaves them waiting.
    const confirmation = await waitForEmail(email);
    expect(confirmation.HTML).toContain('You’re on the waiting list');
    await page.goto(appPathFromEmail(confirmation.HTML));
    await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeVisible();
    expect(runSql(`select account_state(id) from auth.users where email = '${email}'`)).toBe(
      'waitlisted',
    );

    // Step 3: every page but the open ones shows the holding page; Settings stays reachable.
    await page.goto('/write');
    await expect(page.getByRole('heading', { name: 'You’re on the list' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Write' })).toBeChecked();
    await page.getByRole('link', { name: /Settings: emails, news and account/ }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { name: 'You’re on the list' })).toHaveCount(0);

    // Step 4: an admin ticks them in Staff › Waitlist and lets them in.
    const admin = await openAsPersona(browser, 'admin', '/staff/waitlist');
    await expect(admin.getByRole('heading', { name: 'Waitlist', exact: true })).toBeVisible();
    await admin.getByRole('checkbox', { name: `Choose ${handle}` }).check();
    await admin.getByRole('button', { name: 'Let in 1 chosen person' }).click();
    await expect(admin.getByText('1 person let in. They have been emailed.')).toBeVisible();
    await admin.context().close();

    // Step 5: they are a member now, told in the app and by email, and the holding page is gone.
    expect(runSql(`select account_state(id) from auth.users where email = '${email}'`)).toBe(
      'active',
    );
    expect(
      runSql(
        `select count(*) from public.notifications join auth.users on users.id = notifications.user_id
          where users.email = '${email}' and kind = 'waitlist_admitted'`,
      ),
    ).toBe('1');
    expect(
      runSql(
        `select delivery from public.email_outbox join auth.users on users.id = email_outbox.user_id
          where users.email = '${email}'`,
      ),
    ).toBe('required');
    await page.goto('/write');
    await expect(page.getByRole('heading', { name: 'You’re on the list' })).toHaveCount(0);
  });

  test('a moderator is refused the waiting list', async ({ browser }) => {
    const moderator = await openAsPersona(browser, 'moderator', '/staff/waitlist');
    await expect(
      moderator.getByText('Only owners and admins can see the waiting list.'),
    ).toBeVisible();
    await moderator.context().close();
  });

  test('an account waiting for the accessibility checks', () => {
    // A confirmed account with a waiting entry, so the holding page and the staff list have one.
    createTestAccount(waitingEmail, password, waitingHandle);
    runSql(`insert into public.waitlist_entries (user_id, interest)
      select id, 'read' from auth.users where email = '${waitingEmail}';`);
    expect(runSql(`select account_state(id) from auth.users where email = '${waitingEmail}'`)).toBe(
      'waitlisted',
    );
  });

  for (const view of everyView(['/'])) {
    test(`axe, holding page: ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's language wins over the browser's (S1-E1-04), so set it to the view's.
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = '${waitingHandle}';`,
      );
      await signInSynthetic(page, waitingEmail);
      await checkScreen(page, view);
    });
  }

  for (const view of everyView(['/staff/waitlist'])) {
    test(`axe, Staff › Waitlist: ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'admin';`);
      await useSessionInBrowser(page.context(), (await signInPersona('admin')).session);
      await checkScreen(page, view);
    });
  }
});
