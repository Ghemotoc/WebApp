/**
 * Manual age checks in a real browser (story S1-E2-08, part 08b; ADR 0010).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first). The
 * local server's /api/age-check/… always uses the Yoti stand-in, so nothing leaves the machine.
 * What it proves, for a throwaway adult account:
 * - after a failed check, the return page offers "Ask for a manual check"; asking shows "A person
 *   is checking your age." and the account stays read-only (criterion 7);
 * - a moderator sees the request on Users › Manual age checks with the year of birth and the Yoti
 *   attempts, and decides "18 or over" with a reason (criterion 8);
 * - the person then sees "Age confirmed: 18 or over" with the method Manual check, and a
 *   notification that a person checked their age;
 * - support has no tab and is refused by the database (architecture 1.8.3);
 * - the staff page and the member's open request pass axe and fit at 390, 768 and 1440 px, in
 *   Romanian and English, light and night.
 * Test data: one @example.com account per run, and the local signing secret in Vault. The audit
 * log names the account once a moderator decides, so its profile stays (audit rows are never
 * deleted); the address and username are unique per run.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import {
  makeTestClient,
  signInPersona,
  useSessionInBrowser,
  type SignInPersonaName,
} from './support/personas';
import { createTestAccount } from './support/testAccounts';

/** A number unique to this run, so its account never meets an earlier run's. */
const stamp = Date.now() % 100_000_000;
const email = `manual-check-${stamp}@example.com`;
const handle = `manual_check_${stamp}`;
const password = 'a long and private passphrase';

/** The account's stored check, as one line of text: result|method. */
function storedCheck(): string {
  return runSql(`
    select concat_ws('|', profiles.age_check_result, coalesce(profiles.age_check_method::text, '-'))
    from public.profiles where handle = '${handle}';`).trim();
}

/**
 * Opens an address in a new browser signed in as the test account.
 *
 * @returns the page
 */
async function openAsMember(browser: Browser, address: string): Promise<Page> {
  const client = makeTestClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error !== null || data.session === null)
    throw new Error('Could not sign the test account in');
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await useSessionInBrowser(context, data.session);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Opens an address in English as a staff persona. */
async function openAsStaff(browser: Browser, persona: SignInPersonaName, address: string) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Removes what the run left that can go: open requests, attempts, sessions and, if no audit row names it, the account. */
function cleanUp() {
  runSql(`
    delete from public.manual_age_checks where user_id in (select id from public.profiles where handle = '${handle}');
    delete from public.age_check_attempts where user_id in (select id from public.profiles where handle = '${handle}');
    delete from public.age_check_sessions where user_id in (select id from public.profiles where handle = '${handle}');
    delete from public.notifications where user_id in (select id from public.profiles where handle = '${handle}');
    delete from public.consents where user_id in (select id from auth.users where email = '${email}');
    delete from public.profiles where handle = '${handle}'
      and id not in (select user_id from public.audit_log)
      and id not in (select target_user_id from public.audit_log where target_user_id is not null);
    delete from auth.users where email = '${email}' and id not in (select id from public.profiles);
    update public.profiles set locale = 'ro' where handle in ('moderator', 'support');`);
}

test.describe('manual age checks (S1-E2-08b)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    createTestAccount(email, password, handle);
    runSql(`select vault.create_secret('local-e2e-age-secret', 'age_check_secret')
      where not exists (select 1 from vault.secrets where name = 'age_check_secret');`);
  });

  test.afterAll(cleanUp);

  test('after a failed check, the person asks for a manual check', async ({ browser }) => {
    const page = await openAsMember(browser, '/age-check');
    await page.getByRole('button', { name: 'Continue with Yoti' }).click();
    await expect(
      page.getByRole('heading', { name: 'Yoti stand-in: are you 18 or over?' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Fail' }).click();
    await expect(page.getByRole('heading', { name: 'We couldn’t confirm your age' })).toBeVisible();
    await page.getByRole('button', { name: 'Ask for a manual check' }).click();
    await expect(page.getByText('A person is checking your age.')).toBeVisible();
    // Asking changes no result: the account stays read-only until a person decides.
    expect(storedCheck()).toBe('failed|facial_estimation');
    // The start page shows the open request too, and no second "Ask" button.
    await page.goto('/age-check');
    await expect(page.getByText('A person is checking your age.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ask for a manual check' })).toHaveCount(0);
  });

  test('support has no tab and is refused', async ({ browser }) => {
    const page = await openAsStaff(browser, 'support', '/staff/users/age-checks');
    await expect(
      page.getByText('Only the owner, admins and moderators handle manual age checks.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Manual age checks' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: `@${handle}` })).toHaveCount(0);
  });

  test('a moderator sees the request and confirms 18 or over', async ({ browser }) => {
    const page = await openAsStaff(browser, 'moderator', '/staff/users');
    await page.getByRole('link', { name: 'Manual age checks' }).click();
    await expect(page).toHaveURL(/\/staff\/users\/age-checks$/);
    const card = page.getByRole('listitem').filter({
      has: page.getByRole('heading', { name: `@${handle}` }),
    });
    // The year of birth (the one place staff see it) and the Yoti attempt.
    await expect(card.getByText(/1990/)).toBeVisible();
    await expect(card.getByText(/18 line, failed, selfie/)).toBeVisible();
    await card.getByRole('button', { name: 'Decide' }).click();
    await card.getByRole('combobox', { name: 'Decision' }).selectOption('passed_18');
    await card
      .getByRole('textbox', { name: 'Reason (the person reads it)' })
      .fill('Checked against an ID document by hand.');
    await card.getByRole('button', { name: 'Save the decision' }).click();
    await expect(page.getByRole('heading', { name: `@${handle}` })).toHaveCount(0);
    expect(storedCheck()).toBe('18_or_over|manual');
  });

  test('the person sees the result and is told', async ({ browser }) => {
    const page = await openAsMember(browser, '/age-check');
    await expect(page.getByRole('heading', { name: 'Age confirmed: 18 or over' })).toBeVisible();
    await expect(page.getByText(/· Manual check/)).toBeVisible();
    await page.goto('/notifications');
    await expect(page.getByText(/checked your age by hand/)).toBeVisible();
  });

  for (const view of everyView(['/age-check'])) {
    test(`axe: the open request at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      // An open request on a failed check, so the panel shows here and a card on the staff page.
      runSql(`
        update public.profiles set locale = '${view.language}', age_check_result = 'failed',
          age_check_method = 'facial_estimation' where handle = '${handle}';
        insert into public.manual_age_checks (user_id)
          select id from public.profiles where handle = '${handle}'
          on conflict do nothing;`);
      const page = await openAsMember(browser, '/legal');
      await page.setViewportSize({ width: view.width, height: 1000 });
      await checkScreen(page, view);
    });
  }

  for (const view of everyView(['/staff/users/age-checks'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's language wins over the browser's (S1-E1-04), so it is set to the view's.
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'moderator';`);
      await useSessionInBrowser(page.context(), (await signInPersona('moderator')).session);
      await checkScreen(page, view);
    });
  }
});
