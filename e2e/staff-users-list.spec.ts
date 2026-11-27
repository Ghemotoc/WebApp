/**
 * The Members list in Staff › Users in a real browser (S1-E11-02 follow-up; Robert, 26 Nov 2026,
 * 20:17 UTC: deleted accounts out of the list, a status filter, 5 a page with a choice of more).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the owner's list opens on 5 accounts a page, with no deleted account in it;
 * - the Status filter shows only banned accounts, keeps the choice in the address and survives a
 *   reload; "Any status" brings the rest back;
 * - Per page 10 shows up to 10 accounts and goes back to page 1;
 * - the filtered list passes axe.
 * Deleted accounts found through the Deleted filter are proved in the database test
 * (supabase/tests/database/415-staff-users-list.test.sql), so no seed account is deleted here.
 * Test data: seed personas; only the owner's language is changed, and put back afterwards.
 */
import AxeBuilder from '@axe-core/playwright';
import { type Browser, type Page } from '@playwright/test';
import { expect, test } from './support/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** Opens the Users page in English as the owner, at desktop width (staff screens). */
async function openAsOwner(browser: Browser, address: string): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await useSessionInBrowser(context, (await signInPersona('owner')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = 'owner';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The body rows of the Members table. */
function memberRows(page: Page) {
  return page.getByRole('table', { name: 'Members' }).locator('tbody tr');
}

test.describe('the Members list (S1-E11-02 follow-up)', () => {
  test.afterAll(() => runSql(`update public.profiles set locale = 'ro' where handle = 'owner';`));

  test('opens on 5 a page without deleted accounts, and filters by status', async ({ browser }) => {
    const page = await openAsOwner(browser, '/staff/users');
    const members = page.getByRole('region', { name: 'Members' });
    await expect(memberRows(page).first()).toBeVisible();

    // Five accounts a page by default, none of them deleted.
    await expect(memberRows(page)).toHaveCount(5);
    await expect(members.getByLabel('Per page')).toHaveValue('5');
    await expect(memberRows(page).filter({ hasText: 'Deleted' })).toHaveCount(0);

    // Status: Banned shows banned accounts only, and the choice is in the address.
    await members.getByLabel('Status').selectOption({ label: 'Banned' });
    await expect(page).toHaveURL(/status=banned/);
    await expect(memberRows(page).filter({ hasText: '@banned_user' })).toHaveCount(1);
    const bannedCount = await memberRows(page).count();
    await expect(memberRows(page).filter({ hasText: 'Banned' })).toHaveCount(bannedCount);

    // A reload keeps the filter.
    await page.reload();
    await expect(members.getByLabel('Status')).toHaveValue('banned');
    await expect(memberRows(page).filter({ hasText: '@banned_user' })).toHaveCount(1);

    // The filtered list passes axe.
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const serious = axe.violations.filter((issue) =>
      ['serious', 'critical'].includes(issue.impact ?? ''),
    );
    expect(serious).toEqual([]);

    // Any status brings the others back.
    await members.getByLabel('Status').selectOption({ label: 'Any status' });
    await expect(page).not.toHaveURL(/status=/);
    await expect(memberRows(page)).toHaveCount(5);
  });

  test('Per page 10 shows up to 10 accounts from page 1', async ({ browser }) => {
    const page = await openAsOwner(browser, '/staff/users?page=2');
    const members = page.getByRole('region', { name: 'Members' });
    await expect(members.getByText(/Page 2 of/)).toBeVisible();

    await members.getByLabel('Per page').selectOption('10');
    await expect(page).toHaveURL(/perPage=10/);
    await expect(page).not.toHaveURL(/page=2/);
    await expect(memberRows(page)).toHaveCount(10);
    await expect(members.getByText(/Page 1 of/)).toBeVisible();
  });
});
