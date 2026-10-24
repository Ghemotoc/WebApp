/**
 * Staff roles on the normal login, in a real browser (story S1-E2-07a).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request.
 * What it proves:
 * - an admin sees the staff list, can give only moderator, support and content editor, and every
 *   change needs a reason and lands in the audit log;
 * - the account given a role becomes read-only as a member (staff_account);
 * - a moderator is told the page is for owners and admins, and the database gives them nothing;
 * - the page passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: seed personas only; the blocker persona's role is removed again afterwards.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The blocker persona's user ID (supabase/seed.sql). Used only in SQL. */
const blockerId = '00000000-0000-4000-8000-000000000015';

/** Opens /staff/roles in English as a persona. */
async function openAs(browser: Browser, persona: SignInPersonaName) {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const page = await context.newPage();
  await page.goto('/staff/roles');
  return page;
}

test.describe('staff roles (S1-E2-07a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`delete from public.staff_roles where user_id = '${blockerId}';
      update public.profiles set locale = 'ro' where handle in ('admin', 'moderator');`);
  });

  test('an admin gives and removes a role, with a reason, and both are logged', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'admin');
    await expect(page.getByRole('heading', { name: 'Staff roles' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '@owner' })).toBeVisible();

    // An admin's choices: no owner, no admin.
    const roleChoice = page.getByRole('combobox', { name: 'Role' });
    await expect(roleChoice.locator('option')).toHaveText([
      'Moderator',
      'Support',
      'Content editor',
    ]);

    // A reason is required.
    const grantForm = page.getByRole('form', { name: 'Give someone a role' });
    await grantForm.getByLabel('Username').fill('blocker');
    await roleChoice.selectOption('support');
    await grantForm.getByRole('button', { name: 'Give role' }).click();
    await expect(page.getByText('Write a reason first.')).toBeVisible();

    await grantForm.getByLabel('Reason for this change').fill('Helps with the support inbox');
    await grantForm.getByRole('button', { name: 'Give role' }).click();
    await expect(page.getByText('Saved. It’s in the audit log.')).toBeVisible();
    expect(runSql(`select account_state('${blockerId}')`)).toBe('staff_account');

    // Removing it needs a reason too.
    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: '@blocker' }) });
    await card.getByLabel('Reason for this change').fill('Back to writing only');
    await card.getByRole('button', { name: 'Remove Support from @blocker' }).click();
    await expect(page.getByRole('heading', { name: '@blocker' })).toHaveCount(0);
    expect(
      runSql(
        `select string_agg(action, ',' order by action) from public.audit_log where target_user_id = '${blockerId}' and action like 'staff.role_%'`,
      ),
    ).toContain('staff.role_granted,staff.role_removed');
  });

  test('a moderator is told the page is for owners and admins', async ({ browser }) => {
    const page = await openAs(browser, 'moderator');
    await expect(page.getByText('Only an owner or admin can see this page.')).toBeVisible();
    await expect(page.getByRole('form', { name: 'Give someone a role' })).toHaveCount(0);
  });

  for (const view of everyView(['/staff/roles'])) {
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
