/**
 * The staff Google Workspace sign-in page in a real browser (story S1-E2-07b; bundle 17 CHECK).
 *
 * Who runs it: `npm run test:e2e`.
 * What it proves:
 * - while the server says a staff member must sign in with Google (my_staff_sign_in()), every
 *   /staff address shows the "Sign in with a Google Workspace account" page instead of the
 *   staff frame, naming the staff domain;
 * - an account not connected yet is asked to connect first; a connected one only to sign in;
 * - when Google sign-in can't start, the page says so plainly and the button works again;
 * - the page passes axe and doesn't scroll sideways at 390, 768 and 1440 px, light and night,
 *   Romanian and English.
 * Why the answer is faked: the real rule is switched on by the Vault secret staff_email_domain,
 * which would lock every other staff test out while it is set. The database test
 * 291-staff-workspace-sign-in proves the server side; here only my_staff_sign_in()'s answer is
 * replaced, with the same shape the function returns.
 * Test data: seed personas only; example.com is a test domain, never the real one.
 */
import { expect, test, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The test staff domain. */
const testDomain = 'example.com';

/**
 * Makes my_staff_sign_in() answer that this staff member must sign in with Google.
 *
 * @param page - the page whose requests are answered
 * @param isConnected - whether the account is already linked to a Google account on the domain
 */
async function askForWorkspace(page: Page, isConnected: boolean): Promise<void> {
  await page.route('**/rest/v1/rpc/my_staff_sign_in', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ needs_workspace: true, domain: testDomain, connected: isConnected }),
    }),
  );
}

/** Signs the admin persona in, in English (the account's language wins over the browser's). */
async function signInAdmin(page: Page): Promise<void> {
  runSql(`update public.profiles set locale = 'en' where handle = 'admin';`);
  await useSessionInBrowser(page.context(), (await signInPersona('admin')).session);
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
}

test.describe('the staff Google Workspace sign-in page (S1-E2-07b)', () => {
  test('a staff member not connected yet is asked to connect their Workspace account, with no staff frame', async ({
    page,
  }) => {
    await signInAdmin(page);
    await askForWorkspace(page, false);
    await page.goto('/staff/roles');
    await expect(page.getByRole('heading', { level: 1, name: /Google Workspace/ })).toBeVisible();
    await expect(page.getByText(`@${testDomain}`).first()).toBeVisible();
    await expect(page.getByText(/connect your @example\.com Google account/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Google/ })).toBeVisible();
    // No staff menu: the page stands in for the whole staff frame.
    await expect(page.getByRole('navigation', { name: 'Staff' })).toHaveCount(0);
  });

  test('a connected staff member is only asked to sign in with Google', async ({ page }) => {
    await signInAdmin(page);
    await askForWorkspace(page, true);
    await page.goto('/staff');
    await expect(page.getByText(/Google account is connected/)).toBeVisible();
  });

  test('when Google sign-in can’t start, the page says so and the button works again', async ({
    page,
  }) => {
    await signInAdmin(page);
    await askForWorkspace(page, false);
    // Step 1: preparing the link works; Supabase Auth then refuses to start it, as it does while
    // Google sign-in isn't set up (GO-LIVE step 5).
    await page.route('**/auth/v1/user/identities/authorize**', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 400,
          error_code: 'provider_disabled',
          msg: 'Unsupported provider',
        }),
      }),
    );
    await page.goto('/staff');
    const button = page.getByRole('button', { name: /Google/ });
    await button.click();
    // Step 2: one plain line, and the person can press again.
    await expect(page.getByRole('alert')).toContainText(/Google/);
    await expect(button).toBeEnabled();
  });

  for (const view of everyView(['/staff'])) {
    test(`axe: the Workspace sign-in page at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's language wins over the browser's (S1-E1-04), so it is set to the view's.
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'admin';`);
      await useSessionInBrowser(page.context(), (await signInPersona('admin')).session);
      await askForWorkspace(page, false);
      await checkScreen(page, view, async (reached) => {
        await expect(
          reached.getByRole('heading', { level: 1, name: /Google Workspace/ }),
        ).toBeVisible();
      });
    });
  }
});
