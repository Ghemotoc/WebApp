/**
 * Who may message whom, as a visitor sees it on a profile (story S1-E9-03; board Messages 5.5,
 * "What an adult sees on your profile").
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - an adult sees "<name> isn't taking messages right now" on a 14-year-old's profile and on a
 *   17-year-old's whose "Let adults message me" is off, and nothing on another adult's;
 * - once the 17-year-old turns the switch on and follows the adult, the note is gone;
 * - a signed-out visitor sees no note;
 * - the note never names an age: the same words appear for every reason;
 * - the profile with the note passes axe at 390, 768 and 1440 px, light and night, ro and en.
 * Test data: the seed personas adult_writer, teen_17, kid_14_waiting and teacher (kid_14_ok's
 * profile is hidden by a seeded moderation case); the teen's switch and
 * follow are put back as they were. adults_only is switched off for the run (minors' profiles are
 * hidden while it is on) and put back as it was.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The note, for a display name. */
const noteFor = (name: string) => `${name} isn’t taking messages right now.`;

/**
 * Opens an address in English as a persona, in a fresh browser.
 *
 * @returns the page
 */
async function openAs(browser: Browser, persona: SignInPersonaName, address: string) {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Whether adults_only was on before this file, so it is put back as it was. */
let wasAdultsOnly = 'true';

/** Puts the teen's switch and follow back as the seed made them. */
function resetTeen() {
  runSql(`
    update public.profiles set adults_may_message = false where handle = 'teen_17';
    delete from public.follows_users
      where user_id = (select id from public.profiles where handle = 'teen_17')
        and followed_user_id = (select id from public.profiles where handle = 'adult_writer');
    update public.profiles set locale = 'ro' where handle = 'adult_writer';`);
}

test.describe('who may message whom (S1-E9-03)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    wasAdultsOnly = runSql(
      `select is_enabled from public.feature_flags where key = 'adults_only';`,
    ).trim();
    runSql(`update public.feature_flags set is_enabled = false where key = 'adults_only';`);
    resetTeen();
  });

  test.afterAll(() => {
    resetTeen();
    const isOn = wasAdultsOnly === 't' || wasAdultsOnly === 'true';
    runSql(
      `update public.feature_flags set is_enabled = ${String(isOn)} where key = 'adults_only';`,
    );
  });

  test('an adult sees the neutral note on a 14-year-old’s and a 17-year-old’s profile', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', '/u/kid_14_waiting');
    await expect(page.getByText(noteFor('kid_14_waiting'))).toBeVisible();
    await page.goto('/u/teen_17');
    await expect(page.getByText(noteFor('teen_17'))).toBeVisible();
    // The page says nothing else about why: no age, no setting.
    await expect(page.getByText(/under 16|16 or 17|years old/i)).toHaveCount(0);
    await page.goto('/u/teacher');
    await expect(page.getByText(/isn’t taking messages/)).toHaveCount(0);
  });

  test('the note goes once the 17-year-old lets adults message them', async ({ browser }) => {
    runSql(`
      update public.profiles set adults_may_message = true where handle = 'teen_17';
      insert into public.follows_users (user_id, followed_user_id)
      select teen.id, adult.id from public.profiles as teen, public.profiles as adult
      where teen.handle = 'teen_17' and adult.handle = 'adult_writer' on conflict do nothing;`);
    const page = await openAs(browser, 'adult_writer', '/u/teen_17');
    await expect(page.getByRole('heading', { level: 1, name: 'teen_17' })).toBeVisible();
    await expect(page.getByText(/isn’t taking messages/)).toHaveCount(0);
    resetTeen();
  });

  test('a signed-out visitor sees no note', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.goto('/u/teen_17');
    await expect(page.getByRole('heading', { level: 1, name: 'teen_17' })).toBeVisible();
    await expect(page.getByText(/isn’t taking messages/)).toHaveCount(0);
  });

  for (const view of everyView(['/u/kid_14_waiting'])) {
    test(`axe: the profile with the note at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's own language wins (S1-E1-04), so it is set to the view's.
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
      await checkScreen(page, view);
      await expect(page.getByText(/isn’t taking messages|nu primește mesaje/)).toBeVisible();
    });
  }
});
