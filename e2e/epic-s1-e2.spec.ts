/**
 * Epic check for S1-E2, Accounts, age gate and onboarding (story S1-E2-QA).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase with Mailpit started first).
 * It adds no feature: it walks the epic's main journeys across its March stories, in a real browser.
 * - Journey 1, an invited adult (S1-E14-01 × S1-E2-01 × S1-E2-02 × S1-E2-10 × S1-E2-04 × S1-E2-05):
 *   signs up from Romania with an invite code and a year of birth, confirms the email, chooses a
 *   username and pen name, logs out, logs back in through the log-in screen, sees the country "from
 *   your connection" and this device in Settings, resets the password by email and logs in with
 *   the new one.
 * - Journey 2, the personas the story names (S1-E2-05 × S1-E2-04): adult_writer, teen_17, kid_14_ok
 *   and kid_14_waiting log in through the log-in screen and see their own username in Settings.
 *   Their read-only state in March is proved in supabase/tests/database/091-epic-s1-e2.test.sql.
 * - Journey 3, staff on the normal login (S1-E2-05 × S1-E2-07a): the admin persona logs in and
 *   manages roles; the moderator persona logs in and is told the page is for owners and admins.
 * - Fixes from Robert's staging check (17 Oct 2026): the invite field's empty-code and wrong-code
 *   errors (kept code, focus, aria-invalid, aria-describedby); a refused legal read fails at once
 *   instead of after ~7 seconds of retries; an unknown address says "We can't find that page".
 * The axe runs for every screen of the epic, at 390, 768 and 1440 px, live in each story's own
 * spec (the new "page not found" screen's axe is here); docs/epic-reports/S1-E2.md lists them.
 * Test data: seed personas and one synthetic @example.com account, removed afterwards.
 */
import { expect, test, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { appPathFromEmail, waitForEmail } from './support/mailpit';

/** The seeded invite that works (supabase/seed.sql). */
const workingInvite = 'PERSONAS-TEST-INVITE';

/** The seed personas' shared password (supabase/README.md). */
const personaPassword = 'Persona-Test-2026!';

/** The account menu's name in either language: personas open in their account's language. */
const accountButton = /Your account|Contul tău/;

/** Logs in through the log-in screen. */
async function logInWithScreen(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  await page.locator('#sign-in-email').fill(email);
  await page.locator('#sign-in-password').fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole('button', { name: accountButton })).toBeVisible();
}

test.describe('epic S1-E2 journeys', () => {
  test.describe.configure({ mode: 'serial' });

  test('journey 1: an invited adult joins, sets up, logs out and in, and resets the password', async ({
    page,
  }) => {
    const stamp = Date.now();
    const address = `epic-${stamp}@example.com`;
    const firstPassword = 'first long passphrase';
    const newPassword = 'second long passphrase';
    // The country token's secret, as on staging (S1-E2-10), so the country is kept.
    runSql(`
      select vault.create_secret('local-e2e-signup-secret', 'signup_context_secret')
        where not exists (select 1 from vault.secrets where name = 'signup_context_secret');
      select vault.update_secret(id, 'local-e2e-signup-secret') from vault.secrets where name = 'signup_context_secret';`);
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    try {
      // Sign up with the invite link (S1-E2-01, S1-E2-02, S1-E14-01, S1-E2-10).
      await page.goto(`/join/${workingInvite}`);
      await page.getByLabel('Email', { exact: true }).fill(address);
      await page.getByLabel('Password', { exact: true }).fill(firstPassword);
      await page.getByLabel('Confirm password').fill(firstPassword);
      await page.getByRole('combobox', { name: 'Year of birth' }).selectOption('1990');
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.getByRole('status').getByText(/We sent a link/)).toBeVisible();

      // Confirm, then choose a username and pen name (S1-E2-04).
      await page.goto(appPathFromEmail((await waitForEmail(address)).HTML));
      await page.getByRole('link', { name: 'Continue' }).click();
      await page.getByLabel('Username').fill(`epic.${stamp}`);
      await expect(page.getByText(`@epic.${stamp} is free.`)).toBeVisible();
      await page.getByLabel('Pen name (optional)').fill('Epic Writer');
      await page.getByRole('button', { name: 'Save and continue' }).click();
      await expect(page).toHaveURL(/\/$/);
      expect(runSql(`select account_state(id) from auth.users where email = '${address}'`)).toBe(
        'active',
      );

      // Log out, then back in through the log-in screen (S1-E2-05).
      await page.getByRole('button', { name: 'Your account' }).click();
      await page.getByRole('button', { name: 'Log out' }).click();
      await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
      await logInWithScreen(page, address, firstPassword);

      // Settings: names, country and this device (S1-E2-04, S1-E2-10, S1-E2-05).
      await page.getByRole('button', { name: 'Your account' }).click();
      await page.getByRole('link', { name: 'Settings' }).click();
      await expect(page.getByText(`Signed in as Epic Writer · @epic.${stamp}`)).toBeVisible();
      await expect(page.getByText('Romania · From your connection')).toBeVisible();
      await expect(
        page.getByRole('region', { name: 'Signed-in devices' }).getByText('This device'),
      ).toBeVisible();

      // Reset the password by email and log in with the new one (S1-E2-05).
      await page.getByRole('button', { name: 'Your account' }).click();
      await page.getByRole('button', { name: 'Log out' }).click();
      await page.goto('/forgot-password');
      await page.getByLabel('Email', { exact: true }).fill(address);
      await page.getByRole('button', { name: 'Send reset link' }).click();
      await page.goto(appPathFromEmail((await waitForEmail(address, 15_000, 'Reset')).HTML));
      await page.getByLabel('New password', { exact: true }).fill(newPassword);
      await page.getByLabel('Confirm new password').fill(newPassword);
      await page.getByRole('button', { name: 'Save new password' }).click();
      await expect(
        page.getByRole('heading', { name: 'Your new password is saved.' }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Your account' }).click();
      await page.getByRole('button', { name: 'Log out' }).click();
      await logInWithScreen(page, address, newPassword);
    } finally {
      runSql(`
        delete from public.consents where user_id in (select id from auth.users where email = '${address}');
        delete from public.profiles where id in (select id from auth.users where email = '${address}');
        delete from auth.users where email = '${address}';
        update public.invites set use_count = 0 where code_hash = public.invite_code_hash('${workingInvite}');`);
    }
  });

  for (const persona of ['adult_writer', 'teen_17', 'kid_14_ok', 'kid_14_waiting']) {
    test(`journey 2: ${persona} logs in through the log-in screen and sees their own username`, async ({
      page,
    }) => {
      await logInWithScreen(page, `${persona}@personas.test`, personaPassword);
      await page.goto('/settings');
      await expect(page.getByText(new RegExp(`@${persona}$`))).toBeVisible();
    });
  }

  test('journey 3: the admin logs in normally and manages roles; the moderator is told no', async ({
    browser,
  }) => {
    const admin = await (await browser.newContext()).newPage();
    await logInWithScreen(admin, 'admin@personas.test', personaPassword);
    await admin.goto('/staff/roles');
    await expect(admin.getByRole('heading', { name: '@owner' })).toBeVisible();

    const moderator = await (await browser.newContext()).newPage();
    await logInWithScreen(moderator, 'moderator@personas.test', personaPassword);
    await moderator.goto('/staff/roles');
    await expect(
      moderator.getByText(
        /Only an owner or admin can see this page|Doar un proprietar sau un administrator/,
      ),
    ).toBeVisible();
  });
});

test.describe('fixes from the staging check (17 Oct 2026)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  });

  test('an empty invite code says what to enter and keeps the focus on the field', async ({
    page,
  }) => {
    await page.goto('/sign-up');
    await page.getByRole('button', { name: 'Continue' }).click();
    const field = page.getByLabel('Invitation code');
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription(/Enter the code from your invitation\./);
  });

  test('a wrong invite code keeps the typed code, the focus and a linked error', async ({
    page,
  }) => {
    await page.goto('/sign-up');
    await page.getByLabel('Invitation code').fill('not-a-real-code');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/join\/not-a-real-code$/);
    const field = page.getByLabel('Invitation code');
    await expect(field).toHaveValue('not-a-real-code');
    await expect(field).toBeFocused();
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveAccessibleDescription(/We don’t recognise this invitation code/);
  });

  test('a refused legal read shows the error at once, without retrying', async ({ page }) => {
    let requestCount = 0;
    // The same refusal staging gave before the grants fix: 401, permission denied.
    await page.route('**/rest/v1/legal_document_versions*', async (route) => {
      requestCount += 1;
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          code: '42501',
          message: 'permission denied',
          details: null,
          hint: null,
        }),
      });
    });
    await page.goto('/legal/terms');
    await expect(page.getByText('We couldn’t load this page')).toBeVisible({
      timeout: 3_000,
    });
    expect(requestCount).toBe(1);
  });

  test('an unknown address says the page can’t be found and offers the way home', async ({
    page,
  }) => {
    await page.goto('/some/page/that/does/not/exist');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('We can’t find that page');
    await page.getByRole('link', { name: 'Go to Home' }).click();
    await expect(page).toHaveURL('/');
  });
});

for (const view of everyView(['/some/page/that/does/not/exist'])) {
  test(`axe: page not found at ${view.width} px, ${view.theme}, ${view.language}`, async ({
    page,
  }) => {
    await checkScreen(page, view);
  });
}
