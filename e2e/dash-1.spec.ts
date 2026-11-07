/**
 * The admin front page's numbers, the grouped side menu and "Sign in again", in a real browser
 * (bundle DASH-1; Robert, 6 Nov 2026, 18:32 to 18:34 UTC).
 *
 * Who runs it: `npm run test:e2e`.
 * What it proves:
 * - each role sees only the numbers of its own areas: a moderator the moderation tiles, support
 *   the support and data request tiles, the content editor none (pgTAP test 309 proves the
 *   counts and the server's refusals);
 * - a tile opens the area that lists what it counts;
 * - the side menu shows the areas in the five groups on a wide screen, and behind a "Menu"
 *   button on a phone, which closes again once a link opens a page;
 * - a staff session older than 12 hours gets "Your staff session has ended" instead of an empty
 *   admin site, and "Sign in again" logs the person back in to /staff;
 * - the new screens pass axe and don't scroll sideways at 390, 768 and 1440 px.
 * Test data: seed personas only.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The staff personas this file sets to English, and back to Romanian at the end. */
const staffPersonas = ['owner', 'moderator', 'support', 'editor', 'admin'];

/**
 * Makes a session's staff session look 13 hours old, past staff_session_hours (12).
 *
 * @param accessToken - the session's access token, whose session_id names its auth.sessions row
 */
function ageStaffSession(accessToken: string): void {
  const payload = JSON.parse(
    Buffer.from(accessToken.split('.')[1] ?? '', 'base64url').toString('utf8'),
  ) as { session_id?: string };
  const sessionId = payload.session_id ?? '';
  expect(sessionId).not.toBe('');
  runSql(
    `update auth.sessions set created_at = now() - interval '13 hours' where id = '${sessionId}';`,
  );
}

/**
 * Opens an address in English as a persona, optionally with a staff session that has run out.
 *
 * @param browser - the test's browser
 * @param persona - which seed persona
 * @param address - the page to open
 * @param options.sessionEnded - true to age the session past 12 hours first
 * @returns the open page
 */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
  options: { sessionEnded?: boolean } = {},
): Promise<Page> {
  const context = await browser.newContext();
  const { session } = await signInPersona(persona);
  if (options.sessionEnded === true) ageStaffSession(session.access_token);
  await useSessionInBrowser(context, session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The "At a glance" section of the front page. */
function glance(page: Page) {
  return page.getByRole('region', { name: 'At a glance' });
}

test.describe('staff dashboard and side menu (DASH-1)', () => {
  test.afterAll(() => {
    const handles = staffPersonas.map((handle) => `'${handle}'`).join(', ');
    runSql(`update public.profiles set locale = 'ro' where handle in (${handles});`);
  });

  test('each role sees only the numbers of its own areas', async ({ browser }) => {
    // A moderator gets the moderation and appeals numbers, never support's.
    const moderator = await openAs(browser, 'moderator', '/staff');
    await expect(glance(moderator).getByRole('link', { name: /Reports waiting/ })).toBeVisible();
    await expect(glance(moderator).getByRole('link', { name: /Open appeals/ })).toBeVisible();
    await expect(glance(moderator).getByRole('link', { name: /support tickets/ })).toHaveCount(0);

    // Support gets tickets and data requests, never how many reports wait for moderators.
    const support = await openAs(browser, 'support', '/staff');
    await expect(glance(support).getByRole('link', { name: /Open support tickets/ })).toBeVisible();
    await expect(glance(support).getByRole('link', { name: /Open data requests/ })).toBeVisible();
    await expect(glance(support).getByRole('link', { name: /Reports/ })).toHaveCount(0);

    // The owner also sees the failed calls of the last day (LOGS-1).
    const owner = await openAs(browser, 'owner', '/staff');
    await expect(glance(owner).getByRole('link', { name: /Failed calls/ })).toBeVisible();

    // The content editor has no area, so no numbers and no empty section.
    const editor = await openAs(browser, 'editor', '/staff');
    await expect(editor.getByRole('heading', { name: 'Admin site' })).toBeVisible();
    await expect(editor.getByText('No area is open to your role yet.').first()).toBeVisible();
    await expect(glance(editor)).toHaveCount(0);
  });

  test('a tile opens the area that lists what it counts', async ({ browser }) => {
    const moderator = await openAs(browser, 'moderator', '/staff');
    await glance(moderator)
      .getByRole('link', { name: /Reports waiting/ })
      .click();
    await expect(moderator).toHaveURL(/\/staff\/moderation$/);
  });

  test('the side menu groups the areas, and folds behind "Menu" on a phone', async ({
    browser,
  }) => {
    // Wide screen: the five group headings, Safety first, and no Menu button.
    const owner = await openAs(browser, 'owner', '/staff');
    const menu = owner.getByRole('navigation', { name: 'Staff' });
    await expect(menu.getByRole('heading')).toHaveText([
      'Safety',
      'People',
      'Content',
      'Website',
      'System',
    ]);
    await expect(menu.getByRole('button', { name: 'Menu' })).toBeHidden();

    // Phone: the links wait behind the button, which opens them and closes after a link.
    await owner.setViewportSize({ width: 390, height: 844 });
    const toggle = menu.getByRole('button', { name: 'Menu' });
    await expect(menu.getByRole('link', { name: 'Users' })).toBeHidden();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await menu.getByRole('link', { name: 'Users' }).click();
    await expect(owner.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(menu.getByRole('link', { name: 'Users' })).toBeHidden();
  });

  test('an ended staff session asks to sign in again, and signing in returns to /staff', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'admin', '/staff', { sessionEnded: true });
    await expect(page.getByRole('heading', { name: 'Your staff session has ended' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Staff' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Sign in again' }).click();
    await expect(page).toHaveURL(/\/sign-in\?next=\/staff$/);
    await page.getByLabel('Email', { exact: true }).fill('admin@personas.test');
    await page.getByLabel('Password', { exact: true }).fill('Persona-Test-2026!');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();

    await expect(page).toHaveURL(/\/staff$/);
    await expect(page.getByRole('heading', { name: 'Admin site' })).toBeVisible();
    await expect(glance(page)).toBeVisible();
  });

  test('the log-in page never follows `next` to another website', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const page = await context.newPage();
    await page.goto('/sign-in?next=//example.com');
    await page.getByLabel('Email', { exact: true }).fill('support@personas.test');
    await page.getByLabel('Password', { exact: true }).fill('Persona-Test-2026!');
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL(/^http:\/\/[^/]+\/$/);
  });

  for (const view of everyView(['/staff'])) {
    test(`axe, session ended: ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's language wins over the browser's (S1-E1-04), so set it to the view's.
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'admin';`);
      const { session } = await signInPersona('admin');
      ageStaffSession(session.access_token);
      await useSessionInBrowser(page.context(), session);
      await checkScreen(page, view);
    });
  }

  for (const view of everyView(['/staff'])) {
    test(`axe, moderator front page: ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'moderator';`);
      await useSessionInBrowser(page.context(), (await signInPersona('moderator')).session);
      await checkScreen(page, view, async (opened) => {
        // On a phone, open the side menu too, so axe checks its links.
        const toggle = opened.getByRole('button', {
          name: view.language === 'ro' ? 'Meniu' : 'Menu',
        });
        if (await toggle.isVisible()) await toggle.click();
      });
    });
  }
});
