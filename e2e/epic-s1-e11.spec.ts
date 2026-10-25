/**
 * Epic check for S1-E11, the admin site (story S1-E11-QA).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase with Mailpit started first).
 * It adds no feature: it walks the epic's main journey across the March stories built so far, in
 * a real browser.
 * - Journey 1 (S1-E11-17 × S1-E2-01 × S1-E11-01): the admin makes a one-use invite link → an
 *   invited adult joins with it in a private window → the link shows "Used up" with no email →
 *   the owner searches the audit log for "invite." and finds the admin's invite.created, the new
 *   account's invite.redeemed (short user ID) and the system's invite.used_up (CTO, 24 Oct) →
 *   the moderator's menu is Moderation only; support's is empty; the content editor is refused.
 * The CMS stories (S1-E11-06, 10, 12), S1-E11-18 and S1-E11-02 are not built yet
 * (docs/epic-reports/S1-E11.md). The axe runs for every screen of the epic live in each story's
 * own spec. Test data: seed personas and one synthetic @example.com account, removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The stamp every synthetic account of this run carries, so clean-up finds it. */
const stamp = Date.now();

/** Opens an address in English as a persona. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The staff menu's link names, in order. */
async function menuLinks(page: Page): Promise<string[]> {
  const navigation = page.getByRole('navigation', { name: 'Staff' }).first();
  await expect(navigation).toBeVisible();
  return navigation.getByRole('link').allInnerTexts();
}

test.describe('epic S1-E11 journeys', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`
      delete from public.consents where user_id in (select id from auth.users where email = 'epic-${stamp}@example.com');
      -- The account stays: the append-only audit log names it (invite.redeemed, S1-E11-17).
      delete from public.profiles where id in (select id from auth.users where email = 'epic-${stamp}@example.com')
        and id not in (select user_id from public.audit_log where user_id is not null);
      delete from auth.users where email = 'epic-${stamp}@example.com' and id not in (select id from public.profiles);
      delete from public.invites where note = 'epic ${stamp}';
      update public.profiles set locale = 'ro' where handle in ('owner', 'admin', 'moderator', 'support', 'editor');`);
  });

  test('journey 1: an invite made in the admin site admits one adult, and the audit log shows it', async ({
    browser,
  }) => {
    // Step 1: the admin makes a one-use link (S1-E11-17).
    const admin = await openAs(browser, 'admin', '/staff/users/invites');
    await admin.getByRole('button', { name: 'Make an invite link' }).click();
    const form = admin.getByRole('form', { name: 'New invite link' });
    await form.getByLabel('Private note').fill(`epic ${stamp}`);
    await form.getByRole('button', { name: 'Make link' }).click();
    const link = await admin.getByLabel('Invite link', { exact: true }).inputValue();
    const localLink = new URL(link).pathname;

    // Step 2: an invited adult joins with it (S1-E2-01).
    const visitor = await browser.newContext();
    await visitor.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const visitorPage = await visitor.newPage();
    await visitorPage.goto(localLink);
    await visitorPage.getByLabel('Email', { exact: true }).fill(`epic-${stamp}@example.com`);
    await visitorPage.getByRole('textbox', { name: 'Username' }).fill(`epic.e11.${stamp}`);
    await visitorPage.getByLabel('Password', { exact: true }).fill('a long enough passphrase');
    await visitorPage.getByLabel('Confirm password').fill('a long enough passphrase');
    await visitorPage.getByRole('combobox', { name: 'Year of birth' }).selectOption('1990');
    await visitorPage.getByRole('checkbox').check();
    await visitorPage.getByRole('button', { name: 'Create account' }).click();
    await expect(visitorPage.getByRole('status').getByText(/We sent a link/)).toBeVisible();

    // Step 3: the link is used up, and the list never shows who used it.
    await admin.reload();
    const row = admin.getByRole('listitem').filter({ hasText: `epic ${stamp}` });
    await expect(row).toContainText('Used up');
    await expect(row).not.toContainText('example.com');

    // Step 4: the owner finds the audit rows (S1-E11-01): the admin made the link, the new account
    // used it (short user ID, never the email) and the system closed it (CTO, 24 Oct 2026).
    const owner = await openAs(browser, 'owner', '/staff/audit-log');
    const search = owner.getByRole('form', { name: 'Search the audit log' });
    await search.getByLabel('Action starts with').fill('invite.');
    await search.getByRole('button', { name: 'Search' }).click();
    const rows = owner.getByRole('row');
    await expect(
      rows.filter({ hasText: `epic ${stamp}` }).filter({ hasText: 'invite.created' }),
    ).toContainText('@admin');
    await expect(
      rows.filter({ hasText: `epic ${stamp}` }).filter({ hasText: 'invite.used_up' }),
    ).toContainText('System');
    // The new account chose its username on the form (S1-E2-04), so the log names it by that.
    await expect(rows.filter({ hasText: `@epic.e11.${stamp}` })).toContainText('invite.redeemed');
    await expect(owner.getByRole('table')).not.toContainText('example.com');

    // Step 5: each role's menu (S1-E11-01 × S1-E2-07a × S1-E10-03a).
    expect(await menuLinks(owner)).toEqual([
      'Moderation',
      'Users',
      'Roles',
      'Metrics',
      'Audit log',
    ]);
    const moderator = await openAs(browser, 'moderator', '/staff');
    expect(await menuLinks(moderator)).toEqual(['Moderation', 'Users', 'Metrics']);
    const support = await openAs(browser, 'support', '/staff');
    expect(await menuLinks(support)).toEqual(['Users']);
    const editor = await openAs(browser, 'editor', '/staff/users/invites');
    await expect(editor.getByText('Only an owner or admin can make invite links.')).toBeVisible();
  });
});
