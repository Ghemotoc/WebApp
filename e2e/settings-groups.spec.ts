/**
 * Settings split into groups with a side menu, in a real browser (bundle PROFILE-1, 6 Nov 2026;
 * Robert, 11:21 UTC: Settings was "very long, you need to scroll a lot").
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - Settings opens on Profile, and the menu marks the open group;
 * - picking a group shows only its panels, changes the address and moves the focus to them;
 *   Back goes to the group before;
 * - an older link to one panel (/settings#teacher-badge, /settings#download-my-stories) opens the
 *   group that holds it;
 * - the menu links to My reports;
 * - the Account and Help and support groups pass axe and nothing scrolls sideways at 390, 768
 *   and 1440 px (Profile is checked by avatar-builder.spec.ts and usernames.spec.ts, the other
 *   groups by the specs that link to them: downloads-and-privacy, epic-s1-e13, epic-s1-e9 and
 *   delete-my-account).
 * Test data: the seed persona adult_writer, read only.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** Opens an address in English as adult_writer. */
async function openAsWriter(browser: Browser, address: string): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = 'adult_writer';`);
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Settings groups (PROFILE-1)', () => {
  test.afterAll(() => {
    runSql(`update public.profiles set locale = 'ro' where handle = 'adult_writer';`);
  });

  test('the menu opens one group at a time and the address follows', async ({ browser }) => {
    const page = await openAsWriter(browser, '/settings');
    const menu = page.getByRole('navigation', { name: 'Settings sections' });

    // Profile is open first: the avatar is there, Privacy isn't.
    await expect(menu.getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(page.getByRole('region', { name: 'Avatar' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Privacy' })).toHaveCount(0);

    // Picking Privacy shows only its panels and moves the focus to them.
    await menu.getByRole('link', { name: 'Privacy' }).click();
    await expect(page).toHaveURL(/\/settings#privacy$/);
    await expect(menu.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(page.getByRole('region', { name: 'Privacy' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Blocked accounts' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Avatar' })).toHaveCount(0);
    await expect(page.locator('#settings-panel')).toBeFocused();

    // Back returns to Profile.
    await page.goBack();
    await expect(page.getByRole('region', { name: 'Avatar' })).toBeVisible();

    // The menu also leads to the reports and the certificates pages (G11b).
    await expect(menu.getByRole('link', { name: 'Reports sent' })).toHaveAttribute(
      'href',
      '/my-reports',
    );
    await expect(menu.getByRole('link', { name: 'Certificates' })).toHaveAttribute(
      'href',
      '/certificates',
    );
  });

  test('older links to one panel open the group that holds it', async ({ browser }) => {
    const page = await openAsWriter(browser, '/settings#teacher-badge');
    const menu = page.getByRole('navigation', { name: 'Settings sections' });
    await expect(menu.getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(page.locator('#teacher-badge')).toBeVisible();

    await page.goto('/settings#download-my-stories');
    await expect(menu.getByRole('link', { name: 'Download data' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(page.locator('#download-my-stories')).toBeVisible();
  });

  for (const view of everyView(['/settings#account', '/settings#support'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
      await checkScreen(page, view);
    });
  }
});
