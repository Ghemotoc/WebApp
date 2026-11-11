/**
 * Usernames and pen names in a real browser (story S1-E2-04).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a signed-in person without a username sees "Choose a username" on every page and can't write
 *   until they choose one in setup;
 * - the setup form checks the name as it is typed: staff look-alikes, taken look-alikes and free
 *   names, with a way to ask for a review of a false hit;
 * - Settings shows "Signed in as <pen name> · @<username>", saves a new username, refuses a second
 *   change within 30 days and keeps the old name in the audit log;
 * - the setup and Settings screens pass axe and don't scroll sideways at 390, 768 and 1440 px.
 * Test data: the seed persona teacher, put back to its seed state after the tests.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { homeAddressPattern } from './support/homeAddress';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The persona these tests change; no other test file uses it. */
const persona = 'teacher';

/** The teacher persona's user ID (supabase/seed.sql). Used only in SQL, never on screen. */
const personaId = '00000000-0000-4000-8000-000000000007';

/** Puts the persona back as the seed made it. */
function resetPersona() {
  runSql(`update public.profiles set handle = 'teacher', pen_name = null, handle_changed_at = null,
    pen_name_changed_at = null, locale = 'ro' where id = '${personaId}';`);
}

/**
 * Saves the persona's account language. The account's language wins over the browser's on every
 * device (S1-E1-04), so a check in one language must save that language first.
 *
 * @param language - the locale code to save, 'ro' or 'en'
 */
function setPersonaLanguage(language: string) {
  runSql(`update public.profiles set locale = '${language}' where id = '${personaId}';`);
}

/** Opens the app in English as the persona, in a fresh browser context. */
async function openAsPersona(browser: Browser, path: string) {
  // The account's own language wins on every device (S1-E1-04), so it is set to English too.
  setPersonaLanguage('en');
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('usernames and pen names (S1-E2-04)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(resetPersona);

  test('without a username the person is asked to choose one, and setup checks it', async ({
    browser,
  }) => {
    runSql(`update public.profiles set handle = null where id = '${personaId}';`);
    expect(runSql(`select account_state('${personaId}')`)).toBe('handle_missing');
    const page = await openAsPersona(browser, '/');

    // The notice is on every page until a username is chosen.
    await expect(page.getByRole('heading', { name: 'Choose a username' })).toBeVisible();
    await page.getByRole('link', { name: 'Set up profile' }).click();
    await expect(page.getByRole('heading', { name: 'Set up profile' })).toBeVisible();

    // A staff look-alike (Cyrillic а) is refused, with a way to ask for a review. The "Choose a
    // username" notice is labelled with the word too, so ask for the text box by role.
    const username = page.getByRole('textbox', { name: 'Username' });
    await username.fill('\u0430dmin');
    await expect(
      page.getByText('This username looks like a staff name. Try another one.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ask a moderator to check it' })).toBeVisible();

    // A look-alike of someone else's name is taken; spaces are refused at once.
    await username.fill('TEEN_I7');
    await expect(page.getByText(/Someone already has this username/)).toBeVisible();
    await username.fill('ms teacher');
    await expect(page.getByText(/A username can’t have spaces/)).toBeVisible();

    // A free name, a pen name, and the account can write.
    await username.fill('ms.popescu');
    await expect(page.getByText('@ms.popescu is free.')).toBeVisible();
    await page.getByLabel('Pen name (optional)').fill('Doamna Popescu');
    await page.getByRole('button', { name: 'Save and continue' }).click();
    await expect(page).toHaveURL(homeAddressPattern);
    await expect(page.getByRole('heading', { name: 'Choose a username' })).toHaveCount(0);
    expect(runSql(`select account_state('${personaId}')`)).toBe('active');
    expect(runSql(`select pen_name from public.profiles where id = '${personaId}'`)).toBe(
      'Doamna Popescu',
    );
  });

  test('Settings changes the username once, then asks to wait 30 days', async ({ browser }) => {
    const page = await openAsPersona(browser, '/');
    await page.getByRole('button', { name: 'Account' }).click();
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByText('Signed in as Doamna Popescu · @ms.popescu')).toBeVisible();

    // The first change after setup is allowed straight away.
    const username = page.getByRole('textbox', { name: 'Username' });
    await username.fill('ms.popescu.writes');
    await expect(page.getByText('@ms.popescu.writes is free.')).toBeVisible();
    await page.getByRole('button', { name: 'Save' }).first().click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await expect(page.getByText(/You can change it again on/)).toBeVisible();
    expect(
      runSql(
        `select before_values ->> 'handle' from public.audit_log where target_user_id = '${personaId}' and action = 'profile.handle_changed' order by created_at desc limit 1`,
      ),
    ).toBe('ms.popescu');

    // A second change within 30 days is refused.
    await username.fill('ms.popescu.again');
    await page.getByRole('button', { name: 'Save' }).first().click();
    await expect(page.getByText('You can change your username once every 30 days.')).toBeVisible();

    // The Legal centre is one click away (Q8), in the "Help and support" group (PROFILE-1).
    await page.getByRole('link', { name: 'Help and support' }).click();
    await expect(page.getByRole('link', { name: 'Open the Legal centre' })).toHaveAttribute(
      'href',
      '/legal/terms',
    );
  });

  test.describe('accessibility', () => {
    test.beforeAll(() => {
      // Setup is shown only to someone without a username.
      runSql(`update public.profiles set handle = null where id = '${personaId}';`);
    });

    for (const view of everyView(['/setup'])) {
      test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
        page,
      }) => {
        // The account's own language wins over the device's (S1-E1-04). The tests above leave it
        // on English, so a Romanian view could flip to English mid-check; set it to the view's.
        setPersonaLanguage(view.language);
        await useSessionInBrowser(page.context(), (await signInPersona(persona)).session);
        await checkScreen(page, view);
      });
    }
  });

  test.describe('accessibility with a username', () => {
    test.beforeAll(resetPersona);

    for (const view of everyView(['/settings'])) {
      test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
        page,
      }) => {
        // The same race as above: resetPersona saved Romanian, so English views set it first.
        setPersonaLanguage(view.language);
        await useSessionInBrowser(page.context(), (await signInPersona(persona)).session);
        await checkScreen(page, view);
      });
    }
  });
});
