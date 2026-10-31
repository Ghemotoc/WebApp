/**
 * The Teacher badge in a real browser (story S1-E2-11; board Onboarding 2.5, step 3 for adults,
 * and board AdminSchools 8.9, "Verify teachers").
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first). Emails
 * go to the local mail catcher (Mailpit); nothing reaches a real inbox.
 * What it proves, with throwaway adult accounts:
 * - a new adult gets "Are you a teacher?" as step 3; a personal address is refused, a .edu.ro
 *   address gets a link by email, and opening it gives the badge, which the profile shows
 *   (criteria 1 to 3);
 * - another school address waits for staff; a moderator with the teacher checks permission says
 *   "Not yet" with a reason, which the person reads in Settings (criteria 4 and 5);
 * - a proof is uploaded from Settings; the moderator opens it (logged), approves, and the file is
 *   gone (criteria 4 to 6);
 * - the moderator removes a badge with a reason, and Settings says so (criterion 7);
 * - step 3 and Verify teachers pass axe at 390, 768 and 1440 px, light and night, Romanian and
 *   English.
 * Test data: @example.com accounts and made-up school domains unique to each run, the local
 * signing secret in Vault and a 1 by 1 pixel PNG. Accounts the audit log names keep their profile
 * (audit rows are never deleted).
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { waitForEmail } from './support/mailpit';
import { makeTestClient, signInPersona, useSessionInBrowser } from './support/personas';
import { createTestAccount } from './support/testAccounts';

/** A number unique to this run, so its accounts and domains never meet an earlier run's. */
const stamp = Date.now() % 100_000_000;
const password = 'a long and private passphrase';

/** The accounts: one per way, one for staff's "Not yet", one kept new for axe. */
const accounts = {
  school: { email: `teach-edu-${stamp}@example.com`, handle: `teach_edu_${stamp}` },
  other: { email: `teach-other-${stamp}@example.com`, handle: `teach_other_${stamp}` },
  proof: { email: `teach-proof-${stamp}@example.com`, handle: `teach_proof_${stamp}` },
  axe: { email: `teach-axe-${stamp}@example.com`, handle: `teach_axe_${stamp}` },
};
type Account = (typeof accounts)[keyof typeof accounts];

/** The school addresses: a .edu.ro one, trusted at once, and one staff must check. */
const trustedAddress = `ana.pop@liceul-${stamp}.edu.ro`;
const otherAddress = `ion.ilie@scoala-${stamp}.example.com`;

/** A 1 by 1 pixel PNG, standing in for a photo of a staff card. */
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * Makes an adult account; with isNew, its setup steps are still due, as after sign-up.
 *
 * @param account - its email and username
 * @param isNew - whether onboarding is still to do
 */
function createAdult(account: Account, isNew: boolean) {
  createTestAccount(account.email, password, account.handle);
  if (!isNew) return;
  runSql(`update public.profiles set onboarded_at = null where handle = '${account.handle}';`);
}

/**
 * Opens an address in a new browser signed in as an account, in English.
 *
 * @returns the page
 */
async function openAs(browser: Browser, account: Account, address: string): Promise<Page> {
  const client = makeTestClient();
  const { data, error } = await client.auth.signInWithPassword({ email: account.email, password });
  if (error !== null || data.session === null) throw new Error('Could not sign the account in');
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await useSessionInBrowser(context, data.session);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/**
 * Opens Verify teachers signed in as the moderator (who holds the teacher checks permission in the
 * seed), in English.
 *
 * @returns the page
 */
async function openAsModerator(browser: Browser): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona('moderator')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto('/staff/schools/teachers');
  await expect(page.getByRole('heading', { level: 1, name: 'Verify teachers' })).toBeVisible();
  return page;
}

/** One account's waiting request card on Verify teachers (not its row in the Teachers list). */
function requestCard(page: Page, account: Account) {
  return page
    .getByRole('listitem')
    .filter({ hasText: `@${account.handle}` })
    .filter({ hasText: 'How the school confirmed' });
}

/** Removes what the run left that can go. */
function cleanUp() {
  for (const account of Object.values(accounts)) {
    runSql(`
      delete from public.teacher_checks where user_id in (select id from public.profiles where handle = '${account.handle}');
      delete from public.notifications where user_id in (select id from public.profiles where handle = '${account.handle}');
      delete from public.consents where user_id in (select id from auth.users where email = '${account.email}');
      delete from public.profiles where handle = '${account.handle}'
        and id not in (select user_id from public.audit_log where user_id is not null)
        and id not in (select target_user_id from public.audit_log where target_user_id is not null);
      delete from auth.users where email = '${account.email}' and id not in (select id from public.profiles);`);
  }
  runSql(`update public.profiles set locale = 'ro' where handle = 'moderator';`);
}

test.describe('the Teacher badge (S1-E2-11)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    // The link's signing secret, as on staging (ADR 0011's pattern), the same as playwright.config.
    runSql(`
      select vault.create_secret('local-e2e-teacher-secret', 'teacher_check_secret')
        where not exists (select 1 from vault.secrets where name = 'teacher_check_secret');
      select vault.update_secret(id, 'local-e2e-teacher-secret') from vault.secrets where name = 'teacher_check_secret';
      update public.profiles set locale = 'en' where handle = 'moderator';`);
    createAdult(accounts.school, true);
    createAdult(accounts.other, false);
    createAdult(accounts.proof, false);
    createAdult(accounts.axe, true);
  });

  test.afterAll(cleanUp);

  test('a new adult confirms a .edu.ro address in step 3 and gets the badge', async ({
    browser,
  }) => {
    const page = await openAs(browser, accounts.school, '/setup');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Step 3 of 3 · for adults (18+) · optional')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Are you a teacher?' })).toBeFocused();

    // A personal address is refused before anything is sent (criterion 2).
    const field = page.getByRole('textbox', { name: 'School email address' });
    await field.fill('ana.pop@gmail.com');
    await expect(page.getByText(/This looks like a personal address/).first()).toBeVisible();
    await field.fill(trustedAddress);
    await expect(page.getByText('Looks like a school address.')).toBeVisible();
    await page.getByRole('button', { name: 'Send link' }).click();
    await expect(page.getByText(`Link sent to ${trustedAddress}`)).toBeVisible();
    await expect(page.getByText('Teacher badge · pending')).toBeVisible();
    await page.getByRole('button', { name: 'Go to Discover' }).click();
    await expect(page).toHaveURL(/\/discover$/);

    // The emailed link gives the badge at once for .edu.ro (criterion 3); only the domain is kept.
    const email = await waitForEmail(trustedAddress, 15_000);
    const path = /\/teacher-check\/confirm#[A-Za-z0-9_-]+/.exec(email.Text)?.[0];
    if (path === undefined) throw new Error('The email has no confirmation link.');
    await page.goto(path);
    await expect(page.getByText('Done. You have the Teacher badge')).toBeVisible();
    expect(
      runSql(`select school_domain from public.teacher_checks
        where user_id = (select id from public.profiles where handle = '${accounts.school.handle}');`).trim(),
    ).toBe(`liceul-${stamp}.edu.ro`);
    await page.goto(`/u/${accounts.school.handle}`);
    await expect(page.getByText('Teacher', { exact: true })).toBeVisible();
  });

  test('another school address waits for staff, and "Not yet" shows its reason', async ({
    browser,
  }) => {
    const page = await openAs(browser, accounts.other, '/settings#teacher-badge');
    const section = page.getByRole('region', { name: 'Teacher badge' });
    await section.getByRole('textbox', { name: 'School email address' }).fill(otherAddress);
    await expect(section.getByText('We’ll check this address belongs to a school.')).toBeVisible();
    await section.getByRole('button', { name: 'Send link' }).click();
    const email = await waitForEmail(otherAddress, 15_000);
    const path = /\/teacher-check\/confirm#[A-Za-z0-9_-]+/.exec(email.Text)?.[0] ?? '';
    await page.goto(path);
    await expect(page.getByText('Thanks, your address is confirmed.')).toBeVisible();

    const staff = await openAsModerator(browser);
    const card = requestCard(staff, accounts.other);
    await expect(card.getByText(`scoala-${stamp}.example.com`)).toBeVisible();
    await card.getByRole('button', { name: 'Not yet' }).click();
    await card
      .getByRole('textbox', { name: 'Why not yet (they will read it)' })
      .fill('We couldn’t find this school. Please upload a letter instead.');
    await card.getByRole('button', { name: 'Send “Not yet”' }).click();
    await expect(card).toHaveCount(0);

    await page.goto('/settings#teacher-badge');
    await expect(page.getByText(/We couldn’t find this school/)).toBeVisible();
    await expect(page.getByText('You can try again with another school address')).toBeVisible();
  });

  test('a proof is opened by staff, approved, and then deleted', async ({ browser }) => {
    const page = await openAs(browser, accounts.proof, '/settings#teacher-badge');
    const section = page.getByRole('region', { name: 'Teacher badge' });
    await section.getByRole('radio', { name: /Upload proof that you teach/ }).check();
    await section
      .getByLabel('Proof that you teach', { exact: true })
      .setInputFiles({ name: 'staff-card.png', mimeType: 'image/png', buffer: tinyPng });
    await section.getByRole('button', { name: 'Send proof' }).click();
    await expect(section.getByText('Thanks, we’ve got it.', { exact: false })).toBeVisible();

    const staff = await openAsModerator(browser);
    const card = requestCard(staff, accounts.proof);
    // Nobody decides on a file they haven't opened.
    await expect(card.getByRole('button', { name: 'Approve teacher' })).toBeDisabled();
    const popup = staff.waitForEvent('popup');
    await card.getByRole('button', { name: 'Open the proof' }).click();
    await (await popup).close();
    const proofName = runSql(`select proof_path from public.teacher_checks
      where user_id = (select id from public.profiles where handle = '${accounts.proof.handle}')
        and status = 'waiting_for_staff';`).trim();
    await card.getByRole('button', { name: 'Approve teacher' }).click();
    await card
      .getByRole('textbox', { name: 'Note for the teacher (they will read it)' })
      .fill('Your staff card checks out. Welcome!');
    await card.getByRole('button', { name: 'Approve and give the badge' }).click();
    await expect(card).toHaveCount(0);

    // The proof is gone (criterion 6) and the opening was logged as a sensitive read.
    expect(
      runSql(`select count(*) from storage.objects
        where bucket_id = 'teacher-proofs' and name = '${proofName}';`).trim(),
    ).toBe('0');
    expect(
      runSql(`select count(*) from public.audit_log where action = 'sensitive_read.teacher_proof_opened'
        and target_user_id = (select id from public.profiles where handle = '${accounts.proof.handle}');`).trim(),
    ).toBe('1');
    // The person's page is still open on Settings, so it is loaded again to read the decision.
    await page.reload();
    await expect(page.getByText(/You’ve had the Teacher badge since/)).toBeVisible();
  });

  test('a moderator removes a badge and the teacher reads why', async ({ browser }) => {
    const staff = await openAsModerator(browser);
    const teachers = staff.getByRole('region', { name: 'Teachers' });
    const row = teachers.getByRole('listitem').filter({ hasText: `@${accounts.proof.handle}` });
    await row.getByRole('button', { name: 'Remove badge' }).click();
    await row
      .getByRole('textbox', { name: 'Why the badge is removed (the teacher will read it)' })
      .fill('The school told us you no longer teach there.');
    await row.getByRole('button', { name: 'Remove badge' }).click();
    await expect(row).toHaveCount(0);

    const page = await openAs(browser, accounts.proof, '/settings#teacher-badge');
    await expect(page.getByText('Your Teacher badge was removed.')).toBeVisible();
    await page.goto(`/u/${accounts.proof.handle}`);
    await expect(page.getByText('Teacher', { exact: true })).toHaveCount(0);
  });

  for (const view of everyView(['/setup', '/staff/schools/teachers'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
      page,
    }) => {
      if (view.address === '/staff/schools/teachers') {
        runSql(
          `update public.profiles set locale = '${view.language}' where handle = 'moderator';`,
        );
        const context = page.context();
        await useSessionInBrowser(context, (await signInPersona('moderator')).session);
        await checkScreen(page, view);
        runSql(`update public.profiles set locale = 'en' where handle = 'moderator';`);
        return;
      }
      // Step 3 for a new adult: the account's own language wins (S1-E1-04).
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = '${accounts.axe.handle}';`,
      );
      const setup = await openAs(browser, accounts.axe, '/');
      await checkScreen(setup, view, async (screen) => {
        await screen.getByRole('button', { name: /^(Next|Mai departe)$/ }).click();
        await screen.getByRole('button', { name: /^(Next|Mai departe)$/ }).click();
        await expect(screen.getByText(/(Step|Pasul) 3 (of|din) 3/)).toBeVisible();
      });
    });
  }
});
