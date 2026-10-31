/**
 * Parental consent in a real browser (story S1-E2-03; ADR 0011; GDPR art. 8).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first). Emails
 * go to the local mail catcher (Mailpit); nothing reaches a real inbox.
 * What it proves, with throwaway 14-year-old accounts (adults_only is off for this file, as it
 * will be when minors join):
 * - the writer sees "Ask a parent or guardian", gives an email and sees the deadline (criterion 1);
 * - the parent opens the emailed link signed out, can't agree without ticking the guardian box,
 *   agrees, and gets a confirmation email; the account becomes active and the writer is told
 *   (criterion 2);
 * - the parent withdraws from the same link; the account is read-only again (criterion 5);
 * - a parent who says no gets "Thank you", the account is erased and the writer is emailed
 *   (criterion 3);
 * - a moderator withdraws a consent from the account page when a parent asks by email;
 * - both pages pass axe and fit at 390, 768 and 1440 px, in Romanian and English, light and night.
 * Test data: @example.com accounts unique to each run and the local signing secret in Vault. An
 * account the audit log names keeps its profile (audit rows are never deleted).
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { waitForEmail } from './support/mailpit';
import { makeTestClient, signInPersona, useSessionInBrowser } from './support/personas';
import { createTestAccount } from './support/testAccounts';

/** A number unique to this run, so its accounts never meet an earlier run's. */
const stamp = Date.now() % 100_000_000;
const password = 'a long and private passphrase';

/** The three writers: one who asks through the page, one whose parent says no, one for staff. */
const writers = {
  asking: { email: `consent-ask-${stamp}@example.com`, handle: `consent_ask_${stamp}` },
  refused: { email: `consent-no-${stamp}@example.com`, handle: `consent_no_${stamp}` },
  staff: { email: `consent-staff-${stamp}@example.com`, handle: `consent_staff_${stamp}` },
};
type Writer = (typeof writers)[keyof typeof writers];

const parentEmail = `parent-${stamp}@example.com`;

/** A link token made here for the accounts whose request is inserted straight into the database. */
const refusedToken = `e2e-refuse-${stamp}-abcdefghijklmnop`;
const axeToken = `e2e-axe-${stamp}-abcdefghijklmnopqrs`;

/** Whether adults_only was on before this file, so it is put back as it was. */
let wasAdultsOnly = 'true';

/**
 * Makes a 14-year-old whose age check passed, so the account waits for a parent.
 *
 * @param writer - the account's email and username
 */
function createKid(writer: Writer) {
  createTestAccount(writer.email, password, writer.handle);
  // The year of birth is fixed once set (S1-E2-12), so this set-up switches the profile's triggers
  // off for its own statement only, as a fresh sign-up of a 14-year-old would have stored it.
  runSql(`
    set session_replication_role = replica;
    update public.profiles set birth_year = extract(year from now())::int - 14,
      age_check_result = '13_or_over', age_check_method = 'facial_estimation',
      age_checked_at = now() where handle = '${writer.handle}';`);
}

/**
 * Gives an account a request waiting for a parent, with a token this file knows.
 *
 * @param writer - the account
 * @param token - the link's token
 * @param status - waiting or agreed
 */
function insertRequest(writer: Writer, token: string, status: 'waiting' | 'agreed') {
  runSql(`
    delete from public.parental_consents
      where user_id = (select id from public.profiles where handle = '${writer.handle}');
    insert into public.parental_consents (user_id, parent_email, language, token_hash, status,
      is_guardian_confirmed, decided_at)
    select id, '${parentEmail}', 'en', encode(extensions.digest('${token}', 'sha256'), 'hex'),
      '${status}', ${String(status === 'agreed')}, ${status === 'agreed' ? 'now()' : 'null'}
    from public.profiles where handle = '${writer.handle}';`);
}

/** The account's state, as account_state() says it. */
function accountState(writer: Writer): string {
  return runSql(`
    select public.account_state(id) from public.profiles where handle = '${writer.handle}';`).trim();
}

/**
 * Opens an address in a new browser signed in as a writer, in English.
 *
 * @returns the page
 */
async function openAsWriter(browser: Browser, writer: Writer, address: string): Promise<Page> {
  const client = makeTestClient();
  const { data, error } = await client.auth.signInWithPassword({ email: writer.email, password });
  if (error !== null || data.session === null) throw new Error('Could not sign the writer in');
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await useSessionInBrowser(context, data.session);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/**
 * Opens a consent link in a new browser that nobody is signed in to.
 *
 * @returns the page
 */
async function openAsParent(browser: Browser, address: string): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Removes what the run left that can go. */
function cleanUp() {
  for (const writer of Object.values(writers)) {
    runSql(`
      delete from public.parental_consents where user_id in (select id from public.profiles where handle = '${writer.handle}');
      delete from public.notifications where user_id in (select id from public.profiles where handle = '${writer.handle}');
      delete from public.consents where user_id in (select id from auth.users where email = '${writer.email}')
        or user_id in (select id from public.profiles where handle = '${writer.handle}');
      delete from public.profiles where handle = '${writer.handle}'
        and id not in (select user_id from public.audit_log)
        and id not in (select target_user_id from public.audit_log where target_user_id is not null);
      delete from auth.users where (email = '${writer.email}' or email like '%@deleted.invalid')
        and id not in (select id from public.profiles);`);
  }
  runSql(`update public.profiles set locale = 'ro' where handle = 'moderator';`);
}

test.describe('parental consent (S1-E2-03)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    wasAdultsOnly = runSql(
      `select is_enabled from public.feature_flags where key = 'adults_only';`,
    ).trim();
    runSql(`
      update public.feature_flags set is_enabled = false where key = 'adults_only';
      select vault.create_secret('local-e2e-consent-secret', 'parental_consent_secret')
        where not exists (select 1 from vault.secrets where name = 'parental_consent_secret');`);
    Object.values(writers).forEach(createKid);
  });

  test.afterAll(() => {
    cleanUp();
    const isOn = wasAdultsOnly === 't' || wasAdultsOnly === 'true';
    runSql(
      `update public.feature_flags set is_enabled = ${String(isOn)} where key = 'adults_only';`,
    );
  });

  test('the writer asks a parent or guardian', async ({ browser }) => {
    expect(accountState(writers.asking)).toBe('awaiting_parental_consent');
    const page = await openAsWriter(browser, writers.asking, '/legal');
    await page.getByRole('link', { name: 'Ask them' }).click();
    await expect(page).toHaveURL(/\/parent-consent$/);
    await page.getByRole('textbox', { name: 'Their email' }).fill(writers.asking.email);
    await page.getByRole('button', { name: 'Send the email' }).click();
    // The writer's own email is refused, so a child can't agree for themselves.
    await expect(page.getByText('That’s your own email.', { exact: false })).toBeVisible();
    await page.getByRole('textbox', { name: 'Their email' }).fill(parentEmail);
    await page.getByRole('button', { name: 'Send the email' }).click();
    await expect(page.getByText('We emailed your parent or guardian')).toBeVisible();
    await expect(page.getByText(/If nobody says yes by/)).toBeVisible();
  });

  test('the parent agrees from the emailed link', async ({ browser }) => {
    const email = await waitForEmail(parentEmail, 15_000, 'asked');
    const path = /\/parent-consent\/answer#[A-Za-z0-9_-]+/.exec(email.Text)?.[0];
    if (path === undefined) throw new Error('The email has no consent link.');
    const page = await openAsParent(browser, path);
    await expect(page.getByRole('heading', { name: /Your child wants to join/ })).toBeVisible();
    await expect(page.getByText(`@${writers.asking.handle}`, { exact: false })).toBeVisible();
    // A yes needs the guardian box.
    await page.getByRole('button', { name: 'I agree' }).click();
    await expect(
      page.getByText('Tick that you’re the parent or legal guardian first.'),
    ).toBeVisible();
    await page
      .getByRole('checkbox', { name: 'I’m this child’s parent or legal guardian.' })
      .check();
    await page.getByRole('button', { name: 'I agree' }).click();
    await expect(page.getByText(/Thank you\. You agreed on/)).toBeVisible();
    expect(accountState(writers.asking)).toBe('active');
    const confirmation = await waitForEmail(parentEmail, 15_000, 'agreed');
    expect(confirmation.Text).toContain(path);
  });

  test('the writer sees the account is ready and is told', async ({ browser }) => {
    const page = await openAsWriter(browser, writers.asking, '/parent-consent');
    await expect(page.getByText('Your account is ready')).toBeVisible();
    await page.goto('/notifications');
    await expect(page.getByText(/agreed/).first()).toBeVisible();
  });

  test('the parent withdraws from the same link', async ({ browser }) => {
    const email = await waitForEmail(parentEmail, 15_000, 'agreed');
    const path = /\/parent-consent\/answer#[A-Za-z0-9_-]+/.exec(email.Text)?.[0] ?? '';
    const page = await openAsParent(browser, path);
    await page.getByRole('button', { name: 'Withdraw my consent' }).click();
    await page.getByRole('button', { name: 'Yes, withdraw it' }).click();
    await expect(page.getByText('You withdrew your consent')).toBeVisible();
    expect(accountState(writers.asking)).not.toBe('active');
    const writerPage = await openAsWriter(browser, writers.asking, '/parent-consent');
    await expect(
      writerPage.getByText('Your parent or guardian withdrew their consent'),
    ).toBeVisible();
  });

  test('a parent who says no gets a thank you and the account is erased', async ({ browser }) => {
    insertRequest(writers.refused, refusedToken, 'waiting');
    const userId = runSql(
      `select id from public.profiles where handle = '${writers.refused.handle}';`,
    ).trim();
    const page = await openAsParent(browser, `/parent-consent/answer#${refusedToken}`);
    await page.getByRole('button', { name: 'I don’t agree' }).click();
    await expect(page.getByText('We won’t activate this account', { exact: false })).toBeVisible();
    expect(
      runSql(`select deleted_at is not null from public.profiles where id = '${userId}';`).trim(),
    ).toBe('t');
    const told = await waitForEmail(writers.refused.email, 15_000, 'activated');
    expect(told.Subject).toBe('Your account won’t be activated');
  });

  test('a moderator withdraws a consent when a parent asks by email', async ({ browser }) => {
    insertRequest(writers.staff, `e2e-staff-${stamp}-abcdefghijklmnopq`, 'agreed');
    expect(accountState(writers.staff)).toBe('active');
    const userId = runSql(
      `select id from public.profiles where handle = '${writers.staff.handle}';`,
    ).trim();
    runSql(`update public.profiles set locale = 'en' where handle = 'moderator';`);
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await useSessionInBrowser(context, (await signInPersona('moderator')).session);
    await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const page = await context.newPage();
    await page.goto(`/staff/users/${userId}`);
    await page.getByRole('button', { name: 'Withdraw parental consent' }).click();
    await page
      .getByRole('textbox', { name: 'Reason (required)' })
      .fill('The parent asked by email on 31 October.');
    await page.getByRole('button', { name: 'Withdraw the consent' }).click();
    await expect(page.getByText('Done. The consent is withdrawn')).toBeVisible();
    expect(accountState(writers.staff)).not.toBe('active');
  });

  for (const view of everyView(['/parent-consent/answer'])) {
    test(`axe: the parent's page at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      insertRequest(writers.staff, axeToken, 'waiting');
      runSql(`update public.parental_consents set language = '${view.language}'
        where token_hash = encode(extensions.digest('${axeToken}', 'sha256'), 'hex');`);
      await checkScreen(page, { ...view, address: `/parent-consent/answer#${axeToken}` });
      await expect(
        page.getByRole('button', { name: /agree|sunt de acord/i }).first(),
      ).toBeVisible();
    });
  }

  for (const view of everyView(['/parent-consent'])) {
    test(`axe: the writer's page at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      insertRequest(writers.staff, axeToken, 'waiting');
      runSql(`update public.profiles set locale = '${view.language}'
        where handle = '${writers.staff.handle}';`);
      const page = await openAsWriter(browser, writers.staff, '/legal');
      await page.setViewportSize({ width: view.width, height: 1000 });
      await checkScreen(page, view);
    });
  }
});
