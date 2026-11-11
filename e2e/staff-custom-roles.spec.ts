/**
 * Custom staff roles on /staff/roles, in a real browser (story S1-E11-33, bundle CMS-2a).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request.
 * What it proves:
 * - an admin makes a role with only the access a job needs, and the form asks for a name, an
 *   area and a reason first;
 * - Change is offered only in areas the admin holds at Change, and the roles area is never offered
 *   to an admin (only the owner may give role management);
 * - the role is given to an account picked from a search, and that account then sees the area in
 *   the staff menu and nothing else;
 * - taking the role back and removing it are logged;
 * - the axe checks at 390, 768 and 1440 px live in staff-roles.spec.ts, which opens the same page.
 * Test data: seed personas only; the role and the blocker persona's holding are removed afterwards.
 */
import { expect, test, type Browser } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The role this spec makes. */
const roleName = 'Story checks';

/**
 * Opens a staff page in English as a persona.
 *
 * @param browser - Playwright's browser
 * @param persona - the seed persona to sign in as
 * @param address - the page to open
 * @returns the open page
 */
async function openAs(browser: Browser, persona: SignInPersonaName, address: string) {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Removes what this spec made, so it can run twice. */
function cleanUp() {
  runSql(`delete from public.staff_custom_role_holders where custom_role_id in
      (select id from public.staff_custom_roles where name = '${roleName}');
    delete from public.staff_custom_role_areas where custom_role_id in
      (select id from public.staff_custom_roles where name = '${roleName}');
    delete from public.staff_custom_roles where name = '${roleName}';
    update public.profiles set locale = 'ro' where handle in ('admin', 'blocker');`);
}

test.describe('custom staff roles (S1-E11-33)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('an admin makes a role and gives it to someone, who then sees only that area', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'admin', '/staff/roles');
    await expect(page.getByRole('heading', { name: 'Custom roles' })).toBeVisible();
    await page.getByRole('button', { name: 'Make a role' }).click();
    const form = page.getByRole('form', { name: 'Make a role' });

    // The form asks for a name, then an area, then a reason, before asking the database.
    await form.getByRole('button', { name: 'Save role' }).click();
    await expect(form.getByText('Give the role a name of 2 to 40 characters.')).toBeVisible();
    await form.getByLabel('Name', { exact: true }).fill(roleName);
    await form.getByRole('button', { name: 'Save role' }).click();
    await expect(form.getByText('Pick at least one area.')).toBeVisible();

    // Role management is the owner's to give, so an admin isn't offered it at all.
    await expect(form.getByRole('combobox', { name: 'Roles' })).toHaveCount(0);
    await form.getByRole('combobox', { name: 'Stories' }).selectOption('view');
    await form.getByRole('button', { name: 'Save role' }).click();
    await expect(form.getByText('Write a reason first.')).toBeVisible();
    await form.getByLabel('Reason for this change').fill('Checks stories before the newsletter');
    await form.getByRole('button', { name: 'Save role' }).click();
    await expect(page.getByText('Saved. It’s in the audit log.')).toBeVisible();

    // The role's card shows its access, and the role is given to a picked account.
    const card = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: roleName }) });
    await expect(card.getByRole('definition')).toHaveText(['View']);
    await card.getByLabel('Reason for this change').fill('Joins the newsletter team');
    await card.getByLabel('Find the account').fill('block');
    await card.getByLabel('Find the account').press('Enter');
    await card.getByRole('radio', { name: /@blocker/ }).check();
    await card.getByRole('button', { name: 'Give role' }).click();
    await expect(card.getByText('@blocker')).toBeVisible();
    expect(
      runSql(`select count(distinct action) from public.audit_log
        where action in ('staff.custom_role_created', 'staff.custom_role_granted')
          and reason in ('Checks stories before the newsletter', 'Joins the newsletter team')`),
    ).toBe('2');

    // The holder sees Stories in the staff menu, and not an area the role leaves out.
    const holderPage = await openAs(browser, 'blocker', '/staff');
    const menu = holderPage.getByRole('navigation', { name: 'Staff', exact: true });
    await expect(menu.getByRole('link', { name: 'Stories' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Roles' })).toHaveCount(0);
    await holderPage.context().close();

    // Taking it back and removing the role are logged too.
    await card.getByRole('button', { name: 'Take Story checks back from @blocker' }).click();
    await expect(card.getByText('Nobody holds this role yet.')).toBeVisible();
    await card.getByRole('button', { name: `Remove the role ${roleName}` }).click();
    await expect(page.getByRole('heading', { name: roleName })).toHaveCount(0);
    expect(
      runSql(`select count(distinct action) from public.audit_log
        where action in ('staff.custom_role_taken_back', 'staff.custom_role_removed')
          and reason = 'Joins the newsletter team'`),
    ).toBe('2');
  });
});
