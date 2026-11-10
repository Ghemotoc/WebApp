/**
 * The Writers' hub and the Resources page in a real browser (bundle G9 WRITING, part a; Robert,
 * 9 Nov 2026, 12:09 and 12:11 UTC).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - signed in, the logo leads to /hub, the signed-in home: its heading, the contests block, the
 *   how-to guides two at a time with arrows (Previous off at the start) and the tools;
 * - the avatar menu has Resources, which lists the fifteen how-to guides from the CMS and the
 *   writers' rights page, and a guide opens as its help page;
 * - signed out, /hub asks the visitor to log in;
 * - both pages have no serious axe issue and no sideways scroll at 390, 768 and 1440 px, in light
 *   and night, Romanian and English (CLAUDE.md rules 9 and 21), and no doodle is drawn.
 * Test data: a throwaway account of its own, because the axe views change the account's language
 * and other specs rely on the seed personas' languages; removed afterwards. The guides are the
 * help pages the G9a migration publishes. Which contests are open depends on what other specs
 * set up, so this spec checks the contests block is there, not what it lists (the database test
 * 317-writers-hub covers the list).
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { makeTestClient, useSessionInBrowser } from './support/personas';
import { createTestAccount, removeTestAccount } from './support/testAccounts';

const password = 'writers hub secret passphrase';
const stamp = Date.now();
const account = { email: `writers-hub-${stamp}@example.com`, handle: `hub.${stamp}` };

/** A browser signed in as the throwaway account. */
async function openSignedIn(browser: Browser): Promise<Page> {
  // Step 1: sign in through the API, as the other specs do, so no form is involved.
  const client = makeTestClient();
  const { data, error } = await client.auth.signInWithPassword({ email: account.email, password });
  if (error !== null || data.session === null)
    throw new Error(`Could not sign in: ${error?.message}`);
  // Step 2: hand the session to a fresh browser context.
  const context = await browser.newContext();
  await useSessionInBrowser(context, data.session);
  return context.newPage();
}

test.describe('the Writers’ hub and Resources (G9a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => createTestAccount(account.email, password, account.handle));
  test.afterAll(() => removeTestAccount(account.email));

  test('signed in, the logo opens the hub with contests, guides and tools', async ({ browser }) => {
    const page = await openSignedIn(browser);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/discover');
    // Step 1: the logo in the top bar leads to the signed-in home.
    await page.getByRole('banner').getByRole('link').first().click();
    await expect(page).toHaveURL(/\/hub$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Everything for the next chapter.' }),
    ).toBeVisible();
    // Step 2: the two buttons under the heading.
    await expect(page.getByRole('link', { name: 'Start writing' })).toHaveAttribute(
      'href',
      '/write/new',
    );
    // Step 3: the contests block is there, whatever other specs left open.
    await expect(page.getByRole('heading', { level: 2, name: /^Contest/ }).first()).toBeVisible();
    // Step 4: the guides come two at a time; Previous is off at the start, Next moves on.
    const guides = page.getByRole('region', { name: 'How-to guides' });
    await expect(guides.getByRole('link')).toHaveCount(3);
    const previous = guides.getByRole('button', { name: 'Previous guides' });
    await expect(previous).toBeDisabled();
    await guides.getByRole('button', { name: 'Next guides' }).click();
    await expect(previous).toBeEnabled();
    await expect(guides.getByText('Guides 3 to 4 of 15')).toBeAttached();
    // Step 5: the tools.
    await expect(page.getByRole('link', { name: /Story Atlas/ })).toHaveAttribute('href', '/plan');
    await expectNoDoodles(page);
    await page.context().close();
  });

  test('the avatar menu opens Resources, which lists every guide and opens one', async ({
    browser,
  }) => {
    const page = await openSignedIn(browser);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/hub');
    // Step 1: Resources sits in the avatar menu.
    await page.getByRole('button', { name: /^Account, / }).click();
    await page.locator('#account-menu-panel').getByRole('link', { name: 'Resources' }).click();
    await expect(page).toHaveURL(/\/resources$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Resources' })).toBeVisible();
    // Step 2: writers' rights links to its own page; the guides list holds all fifteen.
    await expect(page.getByRole('link', { name: 'Read writers’ rights in full' })).toHaveAttribute(
      'href',
      '/help/writers-rights',
    );
    const guideLinks = page.locator('a[href^="/help/how-to-"]');
    await expect(guideLinks).toHaveCount(15);
    // Step 3: a guide opens as its help page, with numbered steps.
    await page.getByRole('link', { name: /Block someone/ }).click();
    await expect(page).toHaveURL(/\/help\/how-to-block-someone$/);
    await expect(page.getByRole('main').locator('ol li').first()).toBeVisible();
    await expectNoDoodles(page);
    await page.context().close();
  });

  test('signed out, the hub asks the visitor to log in', async ({ page }) => {
    // The interface opens in Romanian for everyone (decided 17 Oct 2026, 11:48).
    await page.goto('/hub');
    await expect(
      page.getByText('Conectează-te ca să vezi concursurile, ghidurile și instrumentele de scris.'),
    ).toBeVisible();
  });

  for (const view of everyView(['/hub', '/resources'])) {
    test(`no serious axe issue on ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      // The account's language wins over the browser's once the page reads it, so the view's
      // language goes on the account too; otherwise a Romanian view could switch to English.
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = '${account.handle}';`,
      );
      const page = await openSignedIn(browser);
      await checkScreen(page, view);
      await page.context().close();
    });
  }
});
