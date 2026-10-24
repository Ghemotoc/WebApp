/**
 * The admin shell in a real browser (story S1-E11-01).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request.
 * What it proves:
 * - a member at /staff sees "This part is for staff" and no staff menu, and a visitor is sent to
 *   log in; the database gives neither anything (the pgTAP test 040 proves the server side);
 * - each staff persona sees only the areas its role allows (architecture 1.8.3): owner and admin
 *   get Moderation (S1-E10-03a), Roles, Invites (S1-E11-17) and Audit log, the moderator gets
 *   Moderation only, support gets none yet (Users has no page until S1-E11-02), the content
 *   editor gets none;
 * - the owner searches the audit log, exports a CSV file, and the export is itself logged;
 * - every staff screen passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: seed personas only.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

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

test.describe('admin shell (S1-E11-01)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`update public.profiles set locale = 'ro'
      where handle in ('owner', 'admin', 'moderator', 'support', 'editor', 'adult_writer');`);
  });

  test('a member is refused and a visitor is sent to log in', async ({ browser, page }) => {
    const memberPage = await openAs(browser, 'adult_writer', '/staff/audit-log');
    await expect(memberPage.getByRole('heading', { name: 'This part is for staff' })).toBeVisible();
    await expect(memberPage.getByRole('navigation', { name: 'Staff' })).toHaveCount(0);
    await expect(memberPage.getByRole('heading', { name: 'Audit log' })).toHaveCount(0);

    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.goto('/staff');
    await expect(
      page.getByText('Log in with a staff account to open the admin site.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/sign-in');
  });

  test('each staff persona sees only the areas its role allows', async ({ browser }) => {
    const ownerPage = await openAs(browser, 'owner', '/staff');
    expect(await menuLinks(ownerPage)).toEqual(['Moderation', 'Roles', 'Invites', 'Audit log']);
    await expect(ownerPage.getByText('@owner')).toBeVisible();
    await expect(ownerPage.getByText('Owner', { exact: true })).toBeVisible();

    const adminPage = await openAs(browser, 'admin', '/staff');
    expect(await menuLinks(adminPage)).toEqual(['Moderation', 'Roles', 'Invites', 'Audit log']);

    // A moderator gets the queue (S1-E10-03a); Users has no page yet (S1-E11-02).
    const moderatorPage = await openAs(browser, 'moderator', '/staff');
    expect(await menuLinks(moderatorPage)).toEqual(['Moderation']);

    // Support's one area, Users, has no page yet, so the menu is empty for now.
    const supportPage = await openAs(browser, 'support', '/staff');
    expect(await menuLinks(supportPage)).toEqual([]);
    await expect(supportPage.getByText('No area is open to you right now.')).toBeVisible();

    const editorPage = await openAs(browser, 'editor', '/staff/audit-log');
    expect(await menuLinks(editorPage)).toEqual([]);
    await expect(
      editorPage.getByText('Only an owner or admin can see the audit log.'),
    ).toBeVisible();
  });

  test('the owner searches the audit log and exports it, and the export is logged', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'owner', '/staff/audit-log');
    await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible();

    // A sensitive read written by the moderator, so there is a known row to find.
    runSql(`select set_config('request.jwt.claims',
        '{"sub": "00000000-0000-4000-8000-000000000010", "role": "authenticated"}', true),
      public.log_sensitive_read('email_revealed', 'profiles',
        '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001');`);

    const form = page.getByRole('form', { name: 'Search the audit log' });
    await form.getByLabel('Action starts with').fill('sensitive_read.');
    await form.getByLabel('Staff member').fill('@Moderator');
    await form.getByRole('button', { name: 'Search' }).click();
    const firstRow = page.getByRole('row').nth(1);
    await expect(firstRow).toContainText('@moderator');
    await expect(firstRow).toContainText('sensitive_read.email_revealed');
    await expect(firstRow).toContainText('@adult_writer (00000000)');
    // Never the full user ID on the list (architecture 1.6).
    await expect(firstRow).not.toContainText('00000000-0000-4000-8000-000000000001');

    const exportsBefore = Number(
      runSql(`select count(*) from public.audit_log where action = 'audit_log.exported'`),
    );
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = await (await download.createReadStream()).toArray();
    const text = Buffer.concat(csv).toString('utf8');
    expect(text.startsWith('﻿time,staff,action')).toBe(true);
    expect(text).toContain('sensitive_read.email_revealed');
    await expect(page.getByText(/Exported \d+ rows/)).toBeVisible();
    expect(
      Number(runSql(`select count(*) from public.audit_log where action = 'audit_log.exported'`)),
    ).toBe(exportsBefore + 1);
  });

  for (const view of everyView(['/staff', '/staff/audit-log'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's language wins over the browser's (S1-E1-04), and earlier tests here set it
      // to English, so it is set to the view's language first (no race between the two).
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'owner';`);
      await useSessionInBrowser(page.context(), (await signInPersona('owner')).session);
      await checkScreen(page, view);
    });
  }

  for (const view of everyView(['/staff'])) {
    test(`axe, refused: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's language wins over the browser's (S1-E1-04), and earlier tests here set it
      // to English, so it is set to the view's language first (no race between the two).
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
      await checkScreen(page, view);
    });
  }
});
