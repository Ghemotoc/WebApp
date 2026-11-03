/**
 * Possible returning users in a real browser (bundle ADMIN-2, part f2; Robert's brief of 2 Nov
 * 2026, section 6: "When a new sign-up shares a scrambled IP with an account banned in the last
 * 30 days, flag it for moderator review. Never block it automatically: schools share IPs.").
 *
 * Who runs it: `npm run test:e2e` (Supabase and the local functions started first).
 * What it proves:
 * - someone signs up through the form from the same connection a banned account signed up from
 *   (the test sends CF-Connecting-IP, standing in for Cloudflare): the sign-up goes ahead, only
 *   the scrambled IP is kept, and a "Possible returning user" case links the new account to the
 *   banned one;
 * - the moderator opens the case, sees the banned account, links another account with a reason
 *   and removes that link again with a reason;
 * - the case page passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: a synthetic @example.com sign-up and a scrambled IP row for the seeded banned_user,
 * both removed afterwards; the ban's start date is put back.
 */
import { createHmac } from 'node:crypto';

import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The seeded invite that works (supabase/seed.sql). */
const workingInvite = 'PERSONAS-TEST-INVITE';
/** A documentation address (RFC 5737), never a real visitor's. */
const sharedAddress = '198.51.100.23';
/** The scramble key playwright.config.ts gives the local functions. */
const scrambleSecret = 'local-e2e-ip-secret';
/** The seeded banned_user persona. */
const bannedUserId = '00000000-0000-4000-8000-000000000014';

/** HMAC-SHA256 in hex, as server/signup-context.ts's hmacHex makes it. */
function hmacHex(text: string, secret: string): string {
  return createHmac('sha256', secret).update(text).digest('hex');
}

/** The address scrambled under this month's key, as server/scrambled-ip.ts does it. */
function scrambledThisMonth(): { value: string; period: string } {
  const now = new Date();
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return { value: hmacHex(sharedAddress, hmacHex(period, scrambleSecret)), period };
}

/** Puts the local test secret in Vault, as Robert does by hand on staging (S1-E2-10). */
function useTestSecret() {
  runSql(`
    select vault.create_secret('local-e2e-signup-secret', 'signup_context_secret')
      where not exists (select 1 from vault.secrets where name = 'signup_context_secret');
    select vault.update_secret(id, 'local-e2e-signup-secret') from vault.secrets where name = 'signup_context_secret';`);
}

/** Fills the sign-up form in English. */
async function fillSignUp(page: Page, address: string) {
  await page.getByLabel('Email', { exact: true }).fill(address);
  await page
    .getByRole('textbox', { name: 'Username' })
    .fill(address.replace(/@.*/, '').replace(/[^a-z0-9]+/g, '.'));
  await page.getByLabel('Password', { exact: true }).fill('a long and private passphrase');
  await page.getByLabel('Confirm password').fill('a long and private passphrase');
  await page.getByRole('combobox', { name: 'Year of birth' }).selectOption('1990');
  await page.getByRole('checkbox').check();
}

/** Opens an address in English as the moderator. */
async function openAsModerator(browser: Browser, address: string): Promise<Page> {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('moderator')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = 'moderator';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('possible returning users (ADMIN-2f2)', () => {
  test.describe.configure({ mode: 'serial' });
  const address = `returning-${Date.now()}@example.com`;
  /** The ban's real start, put back afterwards. */
  let banStartedAt = '';
  /** The flagged case, found after the sign-up. */
  let caseId = '';

  test.beforeAll(() => {
    useTestSecret();
    // banned_user signed up from the shared address, and was banned two days ago.
    const scrambled = scrambledThisMonth();
    banStartedAt = runSql(
      `select created_at from public.sanctions where user_id = '${bannedUserId}' and kind = 'ban' and lifted_at is null`,
    );
    runSql(`
      insert into public.sign_up_ips (user_id, ip_scrambled, ip_period)
        values ('${bannedUserId}', '${scrambled.value}', '${scrambled.period}') on conflict do nothing;
      update public.sanctions set created_at = now() - interval '2 days'
        where user_id = '${bannedUserId}' and kind = 'ban' and lifted_at is null;`);
  });

  test.afterAll(() => {
    runSql(`
      delete from public.case_account_links where case_id in
        (select id from public.cases where item_id in (select id from auth.users where email = '${address}'));
      delete from public.case_actions where case_id in
        (select id from public.cases where item_id in (select id from auth.users where email = '${address}'));
      delete from public.cases where item_id in (select id from auth.users where email = '${address}');
      delete from public.sign_up_ips where user_id = '${bannedUserId}'
        or user_id in (select id from auth.users where email = '${address}');
      update public.sanctions set created_at = '${banStartedAt}'
        where user_id = '${bannedUserId}' and kind = 'ban' and lifted_at is null;
      delete from public.consents where user_id in (select id from auth.users where email = '${address}');
      -- Accounts the append-only audit log names stay; addresses are unique per run.
      delete from public.profiles where id in (select id from auth.users where email = '${address}')
        and id not in (select user_id from public.audit_log where user_id is not null)
        and id not in (select target_user_id from public.audit_log where target_user_id is not null);
      delete from auth.users where email = '${address}' and id not in (select id from public.profiles);
      update public.invites set use_count = 0 where code_hash = public.invite_code_hash('${workingInvite}');
      update public.profiles set locale = 'ro' where handle = 'moderator';`);
  });

  test('a sign-up from a banned account’s connection goes ahead and is flagged', async ({
    page,
  }) => {
    // Step 1: sign up from the shared address, as Cloudflare would pass it on.
    await page.setExtraHTTPHeaders({ 'CF-Connecting-IP': sharedAddress });
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.goto(`/join/${workingInvite}`);
    await fillSignUp(page, address);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('status').getByText(/We sent a link to/)).toBeVisible();

    // Step 2: never a block; only the scrambled values are kept, never the address.
    const newUser = `(select id from auth.users where email = '${address}')`;
    expect(runSql(`select count(*) from public.profiles where id = ${newUser}`)).toBe('1');
    expect(runSql(`select count(*) from public.sign_up_ips where user_id = ${newUser}`)).toBe('2');
    expect(
      runSql(
        `select count(*) from public.sign_up_ips where ip_scrambled like '%${sharedAddress}%'`,
      ),
    ).toBe('0');

    // Step 3: a "Possible returning user" case, linked to the banned account.
    expect(
      runSql(
        `select source || ' ' || tier from public.cases where item_type = 'profile' and item_id = ${newUser}`,
      ),
    ).toBe('returning_user two_days');
    expect(
      runSql(`select linked_user_id from public.case_account_links where user_id = ${newUser}`),
    ).toBe(bannedUserId);
    caseId = runSql(`select id from public.cases where item_id = ${newUser}`);
  });

  test('the moderator sees the link, links another account and removes it', async ({ browser }) => {
    const page = await openAsModerator(browser, `/staff/moderation/cases/${caseId}`);
    const panel = page.getByRole('region', { name: 'Possible returning user' });
    await expect(panel.getByRole('link', { name: '@banned_user' })).toBeVisible();
    await expect(panel.getByText(/Banned since/)).toBeVisible();
    await expect(panel.getByText(/Found by the sign-up check/)).toBeVisible();

    // A reason is needed before anything is linked.
    await panel.getByRole('button', { name: 'Link another account' }).click();
    await panel.getByLabel('The other account’s username').fill('@blocker');
    await panel.getByRole('button', { name: 'Link account' }).click();
    await expect(panel.getByText('Say why first.')).toBeVisible();
    await panel
      .getByLabel('Why do you think it is the same person? (required)')
      .fill('Same pen name and writing style');
    await panel.getByRole('button', { name: 'Link account' }).click();
    await expect(panel.getByRole('link', { name: '@blocker' })).toBeVisible();
    await expect(panel.getByText(/Linked by @moderator/)).toBeVisible();

    // Removing the wrong link needs a reason too, and is logged.
    await panel.getByRole('button', { name: 'Remove the link to @blocker' }).click();
    await panel.getByLabel('Why is this link wrong? (required)').fill('Different person after all');
    await panel.getByRole('button', { name: 'Remove link' }).click();
    await expect(panel.getByRole('link', { name: '@blocker' })).toHaveCount(0);
    expect(
      runSql(`select count(*) from public.audit_log where action in
        ('moderation.returning_user_linked', 'moderation.returning_user_unlinked')
        and target_id in (select id::text from public.case_account_links where case_id = '${caseId}')`),
    ).toBe('2');
  });

  for (const view of everyView(['/staff/moderation/cases/flagged'])) {
    test(`axe: the case page at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'moderator';`);
      await useSessionInBrowser(page.context(), (await signInPersona('moderator')).session);
      await checkScreen(page, { ...view, address: view.address.replace('flagged', caseId) });
    });
  }
});
