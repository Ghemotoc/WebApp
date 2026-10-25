/**
 * Invite links in a real browser (story S1-E11-17).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase with Mailpit started first).
 * What it proves:
 * - the admin makes a one-use link, sees the code once with a Copy button, and a new adult signs
 *   up with it in a private window; the same link then says the invitation has ended and the
 *   sign-up form stays closed;
 * - the admin makes a second link and revokes it with a reason; the list shows Revoked;
 * - the race for the last place: two sign-ups at the same moment on a one-use link, and exactly
 *   one account is created (the database's one conditional UPDATE, S1-E2-01);
 * - a moderator is refused; the screen passes axe and doesn't scroll sideways at 390, 768 and
 *   1440 px.
 * Test data: seed personas and synthetic @example.com accounts, removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import {
  makeTestClient,
  signInPersona,
  useSessionInBrowser,
  type SignInPersonaName,
} from './support/personas';

/** The stamp every synthetic account of this run carries, so clean-up finds them. */
const stamp = Date.now();

/** Opens an address in English as a persona. */
async function openAs(browser: Browser, persona: SignInPersonaName, address: string) {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Fills the sign-up form on an invite link and submits it. */
async function signUpWith(page: Page, link: string, email: string) {
  await page.goto(link);
  await page.getByLabel('Email', { exact: true }).fill(email);
  // A username made from the unique address (S1-E2-04): letters, digits and dots only.
  await page
    .getByRole('textbox', { name: 'Username' })
    .fill(email.replace(/@.*/, '').replace(/[^a-z0-9]+/g, '.'));
  await page.getByLabel('Password', { exact: true }).fill('a long enough passphrase');
  await page.getByLabel('Confirm password').fill('a long enough passphrase');
  await page.getByRole('combobox', { name: 'Year of birth' }).selectOption('1990');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('status').getByText(/We sent a link/)).toBeVisible();
}

/** Removes every account this run made and the links it made. */
function cleanUp() {
  runSql(`
    delete from public.consents where user_id in (select id from auth.users where email like 'invite-${stamp}-%@example.com');
    -- Accounts the append-only audit log names (invite.redeemed, S1-E11-17) stay; addresses are unique per run.
    delete from public.profiles where id in (select id from auth.users where email like 'invite-${stamp}-%@example.com')
      and id not in (select user_id from public.audit_log where user_id is not null);
    delete from auth.users where email like 'invite-${stamp}-%@example.com' and id not in (select id from public.profiles);
    delete from public.invites where note like 'e2e ${stamp}%';
    update public.profiles set locale = 'ro' where handle in ('admin', 'moderator');`);
}

test.describe('invite links (S1-E11-17)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(cleanUp);

  test('the admin makes a one-use link, an adult joins with it, and the link ends', async ({
    browser,
  }) => {
    const admin = await openAs(browser, 'admin', '/staff/users/invites');
    await expect(admin.getByRole('heading', { name: 'Invite links' })).toBeVisible();
    await admin.getByRole('button', { name: 'Make an invite link' }).click();
    const form = admin.getByRole('form', { name: 'New invite link' });
    await expect(form.getByLabel('How many people')).toHaveValue('1');
    await form.getByLabel('Private note').fill(`e2e ${stamp} one use`);
    await form.getByRole('button', { name: 'Make link' }).click();

    // The link is shown once, as <site>/join/<code>, with a Copy button.
    const linkField = admin.getByLabel('Invite link', { exact: true });
    const link = await linkField.inputValue();
    expect(link).toMatch(/\/join\/[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    await expect(admin.getByRole('button', { name: 'Copy' })).toBeVisible();
    await expect(admin.getByText('We won’t show this link again.')).toBeVisible();
    const localLink = `/join/${link.split('/join/')[1]}`;

    // A new adult signs up with it in a private window.
    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();
    await visitorPage.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await signUpWith(visitorPage, localLink, `invite-${stamp}-first@example.com`);

    // The same link has ended: a kind message, no form, nothing stored.
    const second = await (await browser.newContext()).newPage();
    await second.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await second.goto(localLink);
    await expect(
      second.getByText('This invitation has ended, ask the person who invited you for a new one.'),
    ).toBeVisible();
    await expect(second.getByLabel('Email', { exact: true })).toHaveCount(0);

    // The admin's list shows it used up, by note, uses and maker, never by who used it.
    await admin.reload();
    const row = admin.getByRole('listitem').filter({ hasText: `e2e ${stamp} one use` });
    await expect(row).toContainText('1 of 1');
    await expect(row).toContainText('Used up');
    await expect(row).toContainText('@admin');
    await expect(row).not.toContainText('example.com');
    // The log: the admin made it, the new account used it (by user ID, never by email) and the
    // system closed it (CTO, 24 Oct 2026: nothing on behalf of the admin).
    const inviteId = runSql(`select id from public.invites where note = 'e2e ${stamp} one use'`);
    const firstAccountId = runSql(
      `select id from auth.users where email = 'invite-${stamp}-first@example.com'`,
    );
    expect(
      runSql(`select action || ' ' || actor || ' ' || coalesce(user_id::text, '-')
        from public.audit_log where target_id = '${inviteId}' order by action`),
    ).toBe(
      [
        'invite.created person 00000000-0000-4000-8000-000000000009',
        `invite.redeemed person ${firstAccountId}`,
        'invite.used_up system -',
      ].join('\n'),
    );
    expect(
      runSql(`select count(*) from public.audit_log where target_id = '${inviteId}'
        and (after_values::text like '%example.com%' or coalesce(reason, '') like '%example.com%')`),
    ).toBe('0');

    // The Audit log screen names the system as who closed the invite.
    await admin.goto('/staff/audit-log');
    const search = admin.getByRole('form', { name: 'Search the audit log' });
    await search.getByLabel('Action starts with').fill('invite.used_up');
    await search.getByRole('button', { name: 'Search' }).click();
    await expect(admin.getByRole('row').nth(1)).toContainText('System');
  });

  test('the admin makes a second link and revokes it with a reason', async ({ browser }) => {
    const admin = await openAs(browser, 'admin', '/staff/users/invites');
    await admin.getByRole('button', { name: 'Make an invite link' }).click();
    const form = admin.getByRole('form', { name: 'New invite link' });
    await form.getByLabel('How many people').fill('5');
    await form.getByLabel('Private note').fill(`e2e ${stamp} workshop`);
    await form.getByRole('button', { name: 'Make link' }).click();
    await expect(admin.getByLabel('Invite link', { exact: true })).toBeVisible();

    const row = admin.getByRole('listitem').filter({ hasText: `e2e ${stamp} workshop` });
    await expect(row).toContainText('0 of 5');
    await expect(row).toContainText('Active');
    await row.getByRole('button', { name: `Revoke the link “e2e ${stamp} workshop”` }).click();
    await row
      .getByRole('button', { name: /^Revoke/ })
      .last()
      .click();
    await expect(row.getByText('Write a reason first.')).toBeVisible();
    await row.getByLabel('Reason').fill('Workshop cancelled');
    await row
      .getByRole('button', { name: /^Revoke/ })
      .last()
      .click();
    await expect(row).toContainText('Revoked');
    expect(
      runSql(`select reason from public.audit_log where action = 'invite.revoked'
        and after_values ->> 'note' = 'e2e ${stamp} workshop'`),
    ).toBe('Workshop cancelled');
  });

  test('two sign-ups at the same moment on a one-use link: exactly one account', async () => {
    // A one-use link made straight in the database, with a known code.
    const code = `E2E${stamp}`.slice(0, 12);
    runSql(`insert into public.invites (user_id, code_hash, max_uses, expires_at, note)
      values ('00000000-0000-4000-8000-000000000009', public.invite_code_hash('${code}'), 1,
        now() + interval '1 day', 'e2e ${stamp} race');`);
    const [termsVersion, privacyVersion] = runSql(`
      select string_agg(versions.id::text, ' ' order by documents.slug desc)
      from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug in ('terms', 'privacy') and versions.language = 'en'
        and versions.published_at = (select max(published_at) from public.legal_document_versions as v
          where v.document_id = versions.document_id and v.published_at <= now());`).split(' ');

    // The same data the sign-up form sends (src/features/auth/api/signUp.ts).
    const signUp = (suffix: string) =>
      makeTestClient().auth.signUp({
        email: `invite-${stamp}-race-${suffix}@example.com`,
        password: 'a long enough passphrase',
        options: {
          data: {
            birth_year: 1990,
            invite_code: code,
            accepted_terms_version_id: termsVersion,
            accepted_privacy_version_id: privacyVersion,
            locale: 'en',
          },
        },
      });
    const results = await Promise.all([signUp('a'), signUp('b')]);
    const succeeded = results.filter((result) => result.error === null).length;
    expect(succeeded).toBe(1);
    expect(
      runSql(
        `select count(*) from auth.users where email like 'invite-${stamp}-race-%@example.com'`,
      ),
    ).toBe('1');
    expect(runSql(`select use_count from public.invites where note = 'e2e ${stamp} race'`)).toBe(
      '1',
    );
  });

  test('a moderator is refused', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/users/invites');
    await expect(page.getByText('Only an owner or admin can make invite links.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Make an invite link' })).toHaveCount(0);
  });

  for (const view of everyView(['/staff/users/invites'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's language wins over the browser's (S1-E1-04), and earlier tests here set it
      // to English, so it is set to the view's language first (no race between the two).
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'admin';`);
      await useSessionInBrowser(page.context(), (await signInPersona('admin')).session);
      await checkScreen(page, view);
    });
  }
});
