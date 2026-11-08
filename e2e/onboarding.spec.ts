/**
 * Onboarding, "Set up your profile", in a real browser (story S1-E2-06; board Onboarding 2.5).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a new adult sees "Finish setting up your profile" on every page, goes through three steps
 *   (name and language with the optional county, likes, then the optional "Are you a teacher?",
 *   S1-E2-11) and lands on Discover, where "Picked for you" shows stories in what they picked
 *   (criteria 1 and 2);
 * - a 17-year-old gets a third step, "Staying safe here", with "Let adults message me" off until
 *   they tick it (criterion 3);
 * - Settings › What you like changes the county and the likes later;
 * - setup (every step) and Settings pass axe and don't scroll sideways at 390, 768 and 1440 px,
 *   light and night, Romanian and English.
 * Test data: throwaway @example.com accounts and two stories by adult_writer, made and removed
 * here; adults_only is switched off
 * for the run (so a 17-year-old can join) and put back as it was.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { makeTestClient, useSessionInBrowser } from './support/personas';
import { createTestAccount } from './support/testAccounts';

/** A number unique to this run, so its accounts never meet an earlier run's. */
const stamp = Date.now() % 100_000_000;
const password = 'a long and private passphrase';

/** The accounts: an adult who goes through setup, a 17-year-old, and one kept new for axe. */
const accounts = {
  adult: { email: `setup-adult-${stamp}@example.com`, handle: `setup_adult_${stamp}` },
  teen: { email: `setup-teen-${stamp}@example.com`, handle: `setup_teen_${stamp}` },
  axe: { email: `setup-axe-${stamp}@example.com`, handle: `setup_axe_${stamp}` },
};
type Account = (typeof accounts)[keyof typeof accounts];

/** Whether adults_only was on before this file, so it is put back as it was. */
let wasAdultsOnly = 'true';

/**
 * Makes an adult whose age check passed and whose setup steps are still due (onboarded_at empty,
 * as a new sign-up has once past the age check).
 *
 * @param account - its email and username
 */
function createNewAccount(account: Account) {
  createTestAccount(account.email, password, account.handle);
  // The age check columns are the database's to set (S1-E2-08), so this set-up switches the
  // profile's triggers off for its own statement only.
  runSql(`
    set session_replication_role = replica;
    update public.profiles set onboarded_at = null, age_check_result = '18_or_over',
      age_check_method = 'facial_estimation', age_checked_at = now()
      where handle = '${account.handle}';`);
}

/**
 * Makes a 17-year-old whose age check passed and whose setup is due.
 *
 * @param account - its email and username
 */
function createTeen(account: Account) {
  createNewAccount(account);
  // The year of birth is fixed once set (S1-E2-12), so this set-up switches the profile's triggers
  // off for its own statement only, as a fresh sign-up of a 17-year-old would have stored it.
  runSql(`
    set session_replication_role = replica;
    update public.profiles set birth_year = extract(year from now())::int - 17,
      age_check_result = '13_or_over', age_check_method = 'facial_estimation',
      age_checked_at = now() where handle = '${account.handle}';`);
}

/** Reads one column of an account's profile, as text. */
function profileValue(account: Account, column: string): string {
  return runSql(`select ${column} from public.profiles where handle = '${account.handle}';`).trim();
}

/**
 * Opens an address in a new browser signed in as an account.
 *
 * @returns the page
 */
async function openAs(browser: Browser, account: Account, address: string): Promise<Page> {
  const client = makeTestClient();
  const { data, error } = await client.auth.signInWithPassword({ email: account.email, password });
  if (error !== null || data.session === null) throw new Error('Could not sign the account in');
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await useSessionInBrowser(context, data.session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Fails the test when axe finds a serious or critical issue on the page as it is now. */
async function expectNoSeriousIssues(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious).toEqual([]);
}

/** adult_writer's user ID (supabase/seed.sql), who "writes" the two stories below. SQL only. */
const adultWriterId = '00000000-0000-4000-8000-000000000001';

/** Removes this file's two stories and their chapters. */
function removeStories() {
  runSql(`delete from public.chapters where code like 'onbrd%';
    delete from public.stories where slug like 'onb-e2e-%';`);
}

/** A poem and a piece of fiction, each with one published chapter, for "Picked for you". */
function seedStories() {
  removeStories();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('${adultWriterId}', 'onb-e2e-poem', 'Salt Hours', 'x', 'en',
        (select id from public.categories where slug = 'poetry'), 'completed', 'all_ages', now(), now()),
      ('${adultWriterId}', 'onb-e2e-tale', 'The Ferryman', 'x', 'en',
        (select id from public.categories where slug = 'fiction'), 'completed', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'onbrd' || substr(md5(slug), 1, 3), 1, 'Unu', 'x', 1, 'published', 'Unu',
      'Text.', 1, now() from public.stories where slug like 'onb-e2e-%';`);
}

/** Removes what the run left. */
function cleanUp() {
  for (const account of Object.values(accounts)) {
    runSql(`
      delete from public.reading_preferences where user_id in (select id from public.profiles where handle = '${account.handle}');
      delete from public.consents where user_id in (select id from auth.users where email = '${account.email}');
      delete from public.profiles where handle = '${account.handle}'
        and id not in (select user_id from public.audit_log where user_id is not null);
      delete from auth.users where email = '${account.email}' and id not in (select id from public.profiles);`);
  }
}

test.describe('onboarding (S1-E2-06)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    wasAdultsOnly = runSql(
      `select is_enabled from public.feature_flags where key = 'adults_only';`,
    ).trim();
    runSql(`update public.feature_flags set is_enabled = false where key = 'adults_only';`);
    createNewAccount(accounts.adult);
    createTeen(accounts.teen);
    createNewAccount(accounts.axe);
    seedStories();
    // Since LOOK-4b Discover shows the board's five shelves; staff can add "Picked for you" back
    // in Settings, as this test does, and it is taken out again afterwards.
    runSql(`update public.settings set value = value || '["picked"]'::jsonb
      where key = 'discover_shelves' and not value ? 'picked';`);
  });

  test.afterAll(() => {
    runSql(`update public.feature_flags set is_enabled = ${wasAdultsOnly === 't' || wasAdultsOnly === 'true'}
      where key = 'adults_only';`);
    cleanUp();
    removeStories();
    runSql(`update public.settings set value = value - 'picked' where key = 'discover_shelves';`);
  });

  test('a new adult goes through three steps and lands on Discover with their picks', async ({
    browser,
  }) => {
    const page = await openAs(browser, accounts.adult, '/');

    // The notice is on every page until setup is finished.
    await expect(
      page.getByRole('heading', { name: 'Finish setting up your profile' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Continue setting up' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Set up your profile' }),
    ).toBeVisible();

    // Step 1: the language and the optional county; the country is never asked.
    await expect(page.getByText('Step 1 of 3')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your name and language' })).toBeVisible();
    await page.getByLabel('County (optional)').selectOption('RO-CJ');
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 2: the likes. Focus moves to the new step's heading.
    await expect(page.getByText('Step 2 of 3')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What do you like?' })).toBeFocused();
    const reading = page.getByRole('group', { name: 'I like to read' });
    await reading.getByRole('button', { name: 'Poetry' }).click();
    await expect(reading.getByRole('button', { name: 'Poetry' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('status').filter({ hasText: '1 picked' })).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();

    // Step 3, for adults only and optional: "Are you a teacher?" (S1-E2-11).
    await expect(page.getByText('Step 3 of 3 · for adults (18+) · optional')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Are you a teacher?' })).toBeFocused();
    await page.getByRole('button', { name: 'Go to Discover' }).click();

    // Discover, with "Picked for you"; setup is done and the notice is gone.
    await expect(page).toHaveURL(/\/discover$/);
    const picked = page.getByRole('region', { name: 'Picked for you', exact: true });
    await expect(picked.getByRole('link', { name: /Salt Hours/ })).toBeVisible();
    await expect(picked.getByRole('link', { name: /The Ferryman/ })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Finish setting up your profile' })).toHaveCount(
      0,
    );
    expect(profileValue(accounts.adult, 'region_code')).toBe('RO-CJ');
    expect(profileValue(accounts.adult, 'onboarded_at is not null')).toBe('t');
  });

  test('Settings changes the county and the likes later', async ({ browser }) => {
    const page = await openAs(browser, accounts.adult, '/settings');
    const section = page.getByRole('region', { name: 'What you like' });
    await expect(section.getByLabel('County (optional)')).toHaveValue('RO-CJ');
    await expect(
      section
        .getByRole('group', { name: 'I like to read' })
        .getByRole('button', { name: 'Poetry' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await section.getByLabel('County (optional)').selectOption('');
    await section
      .getByRole('group', { name: 'I want to write' })
      .getByRole('button', { name: 'Fiction' })
      .click();
    await section.getByRole('button', { name: 'Save' }).click();
    await expect(section.getByText('Saved.')).toBeVisible();
    expect(profileValue(accounts.adult, 'region_code')).toBe('');
    expect(
      runSql(`select count(*) from public.reading_preferences where preference_kind = 'write'
        and user_id = (select id from public.profiles where handle = '${accounts.adult.handle}');`).trim(),
    ).toBe('1');
    // An adult has no "Let adults message me" switch.
    await expect(page.getByLabel('Let adults message me')).toHaveCount(0);
  });

  test('a 17-year-old gets "Staying safe here", with adult messages off until ticked', async ({
    browser,
  }) => {
    const page = await openAs(browser, accounts.teen, '/setup');
    await expect(page.getByText('Step 1 of 3')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Step 2 of 3')).toBeVisible();
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByText('Step 3 of 3 · for under-18s')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Staying safe here' })).toBeFocused();
    await expect(page.getByRole('link', { name: 'Read the full guidelines' })).toBeVisible();
    await expectNoSeriousIssues(page);
    const adultMessages = page.getByLabel('Let adults message me');
    await expect(adultMessages).not.toBeChecked();
    await adultMessages.check();
    await expect(adultMessages).toBeChecked();
    await expect.poll(() => profileValue(accounts.teen, 'adults_may_message')).toBe('t');

    // "Skip" finishes setup too.
    await page.getByRole('button', { name: 'Skip' }).click();
    await expect(page).toHaveURL(/\/discover$/);
    expect(profileValue(accounts.teen, 'onboarded_at is not null')).toBe('t');

    // The switch is in Settings as well, as the step promised.
    await page.goto('/settings#messages');
    await expect(page.getByLabel('Let adults message me')).toBeChecked();
  });

  test('step 2 passes axe', async ({ browser }) => {
    const page = await openAs(browser, accounts.axe, '/setup');
    // Reduce motion, as checkScreen does: otherwise axe can run while the step still fades in and
    // read the half-faded text as low contrast (CI shard 3 on PR #402).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'What do you like?' })).toBeVisible();
    await expectNoSeriousIssues(page);
  });

  for (const view of everyView(['/setup', '/settings'])) {
    test(`${view.address} passes axe at ${view.width}px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      // The account's own language wins on every device (S1-E1-04), so it is set to the view's.
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = '${accounts.axe.handle}';`,
      );
      const page = await openAs(browser, accounts.axe, '/');
      await checkScreen(page, view);
    });
  }
});
