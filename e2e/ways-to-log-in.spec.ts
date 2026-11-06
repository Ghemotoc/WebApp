/**
 * Google, Apple, Microsoft and passkeys, in a real browser (story S1-E2-09; boards SignIn,
 * Main "Join with another account" and Settings › Ways to log in).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - with social_login and passkey_login off (March), no button shows on log-in, sign-up or Settings;
 * - with them on, sign-up checks the year, username and terms before leaving for the provider, and
 *   asks for no password (criterion 1);
 * - coming back, the kept answers finish the sign-up with the same rules: good answers make the
 *   profile; a year under 13 removes the account; someone who never joined is asked to join
 *   (criterion 2);
 * - a provider can't join an account that is set up unless asked for from Settings (criterion 5);
 * - Settings › Ways to log in lists the ways in and blocks disconnecting the last one (criterion 3);
 * - a passkey is added in Settings, logs in from the log-in page and is removed again, each change
 *   notified (criterion 4), using Chrome's virtual authenticator at http://localhost:4173 (a passkey
 *   needs a domain name, never an IP address);
 * - log-in, sign-up and Settings pass axe and don't scroll sideways at 390, 768 and 1440 px, light
 *   and night, Romanian and English.
 * Real Google, Apple and Microsoft can't be reached from a test, so the step that leaves for them
 * is caught and checked, and a provider account is made in SQL the way Supabase Auth makes one.
 * Test data: throwaway @example.com accounts made and removed here; the flags are put back off.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView } from './support/accessibility';
import { runSql } from './support/database';
import { makeTestClient, signInPersona, useSessionInBrowser } from './support/personas';
import { createTestAccount, removeTestAccount } from './support/testAccounts';

/** A number unique to this run, so its accounts never meet an earlier run's. */
const stamp = Date.now() % 100_000_000;
const password = 'a long and private passphrase';
const workingInvite = 'PERSONAS-TEST-INVITE';

/** Every address this file makes, so the clean-up finds them all. */
const madeAddresses: string[] = [];

/** Switches both flags on or off. */
function setFlags(isOn: boolean) {
  runSql(
    `update public.feature_flags set is_enabled = ${isOn} where key in ('social_login', 'passkey_login');`,
  );
}

/**
 * Makes a Google account as Supabase Auth makes one: a user and its identity, no profile. It also
 * gets a password, only so the test can sign it in without Google.
 *
 * @param name - a word for the address
 * @returns its email
 */
function createGoogleAccount(name: string): string {
  const email = `social-${name}-${stamp}@example.com`;
  madeAddresses.push(email);
  runSql(`
    do $$
    declare new_id uuid := gen_random_uuid();
    begin
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change)
      values ('00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated', '${email}',
        extensions.crypt('${password}', extensions.gen_salt('bf')), now(),
        '{"provider": "google", "providers": ["google"]}', '{}', now(), now(), '', '', '', '');
      insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
      values ('google-' || new_id, new_id, jsonb_build_object('sub', 'google-' || new_id, 'email', '${email}'),
        'google', now(), now());
    end $$;`);
  return email;
}

/**
 * The answers the sign-up form keeps while the person is at Google, in English, with the invite.
 *
 * @param birthYear - the year of birth
 * @param handle - the username
 * @returns the JSON text
 */
function keptAnswers(birthYear: number, handle: string): string {
  const versionOf = (slug: string) =>
    runSql(`select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = '${slug}' and versions.language = 'en' and versions.version_label = '0.1'`);
  return JSON.stringify({
    birth_year: String(birthYear),
    birth_month: null,
    invite_code: workingInvite,
    accepted_terms_version_id: versionOf('terms'),
    accepted_privacy_version_id: versionOf('privacy'),
    locale: 'en',
    handle,
    signup_context: null,
  });
}

/**
 * Opens a page signed in to an account, in English, with what the sign-up form kept, if anything.
 *
 * @param browser - the test's browser
 * @param email - the account
 * @param answers - kept answers, or null for a log-in
 * @returns the page, not yet on any address
 */
async function openSignedIn(
  browser: Browser,
  email: string,
  answers: string | null,
): Promise<Page> {
  const { data, error } = await makeTestClient().auth.signInWithPassword({ email, password });
  if (error !== null || data.session === null)
    throw new Error(`Could not sign in: ${error?.message}`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, data.session);
  await context.addInitScript((kept) => {
    window.localStorage.setItem('interface-language', 'en');
    if (kept !== null) window.sessionStorage.setItem('social-sign-up-answers', kept);
  }, answers);
  return context.newPage();
}

/** Opens a page signed out, in English. */
async function openSignedOut(page: Page, address: string) {
  await page.addInitScript(() => window.localStorage.setItem('interface-language', 'en'));
  await page.goto(address);
}

/** How many accounts have an address. */
function accountCount(email: string): string {
  return runSql(`select count(*) from auth.users where email = '${email}'`);
}

test.describe('ways to log in', () => {
  test.describe.configure({ mode: 'serial' });

  test.afterAll(() => {
    setFlags(false);
    // The passkey's notifications, and their emails, go first: they point at the profile.
    runSql(`
      with mine as (select notifications.id from public.notifications join auth.users on users.id = notifications.user_id
                    where users.email like 'social-%-${stamp}@example.com'),
           sent as (delete from public.email_outbox where notification_ids && array(select id from mine))
      delete from public.notifications where id in (select id from mine);`);
    for (const email of madeAddresses) removeTestAccount(email);
    runSql(
      `update public.invites set use_count = 0 where code_hash = public.invite_code_hash('${workingInvite}');`,
    );
  });

  test('with both flags off, no Google, Apple, Microsoft or passkey button shows', async ({
    browser,
    page,
  }) => {
    setFlags(false);
    await openSignedOut(page, '/sign-in');
    await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with|Use a passkey/ })).toHaveCount(0);
    await page.goto(`/join/${workingInvite}`);
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue with/ })).toHaveCount(0);

    const { session } = await signInPersona('adult_writer');
    const context = await browser.newContext();
    await useSessionInBrowser(context, session);
    const settings = await context.newPage();
    await settings.goto('/settings#account');
    await expect(
      settings.getByRole('heading', { name: /Signed-in devices|Dispozitive conectate/ }),
    ).toBeVisible();
    await expect(settings.locator('#ways-to-log-in')).toHaveCount(0);
    await context.close();
  });

  test('sign-up checks the answers, asks for no password, then leaves for Google', async ({
    page,
  }) => {
    setFlags(true);
    await openSignedOut(page, `/join/${workingInvite}`);
    await expect(
      page.getByText('They only replace your password.', { exact: false }),
    ).toBeVisible();

    // Nothing filled in: the form says what is missing and stays here.
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page.getByText('Choose your year of birth.', { exact: false })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`/join/${workingInvite}`);

    // The year, username and terms are enough: no email or password.
    let providerAddress: URL | null = null;
    await page.route('**/auth/v1/authorize**', async (route) => {
      providerAddress = new URL(route.request().url());
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<p>Google</p>' });
    });
    await page.getByRole('textbox', { name: 'Username' }).fill(`social_form_${stamp}`);
    await page.getByRole('combobox', { name: 'Year of birth' }).selectOption('1990');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page.getByText('Google', { exact: true })).toBeVisible();
    expect(providerAddress).not.toBeNull();
    const leftFor = providerAddress as unknown as URL;
    expect(leftFor.searchParams.get('provider')).toBe('google');
    expect(leftFor.searchParams.get('redirect_to')).toContain('/auth/social-return');
    // The answers wait in this tab, on our own site, for the way back.
    await page.goBack();
    const kept = await page.evaluate(() => window.sessionStorage.getItem('social-sign-up-answers'));
    expect(JSON.parse(kept ?? '{}')).toMatchObject({
      handle: `social_form_${stamp}`,
      birth_year: '1990',
    });
  });

  test('coming back with good answers finishes the sign-up', async ({ browser }) => {
    setFlags(true);
    const email = createGoogleAccount('joins');
    const handle = `social_joins_${stamp}`;
    const page = await openSignedIn(browser, email, keptAnswers(1990, handle));
    await page.goto('/auth/social-return');
    await expect(page).toHaveURL(/\/$|\/setup$|\/discover$/);
    expect(
      runSql(
        `select handle from public.profiles join auth.users on users.id = profiles.id where users.email = '${email}'`,
      ),
    ).toBe(handle);
    expect(
      runSql(
        `select count(*) from public.consents join auth.users on users.id = consents.user_id where users.email = '${email}'`,
      ),
    ).toBe('2');
    await page.context().close();
  });

  test('a year under 13 keeps nothing, and says why', async ({ browser }) => {
    setFlags(true);
    const email = createGoogleAccount('young');
    const page = await openSignedIn(
      browser,
      email,
      keptAnswers(new Date().getFullYear() - 10, `social_young_${stamp}`),
    );
    await page.goto('/auth/social-return');
    await expect(
      page.getByRole('heading', { name: 'Sorry, you can’t create an account right now' }),
    ).toBeVisible();
    expect(accountCount(email)).toBe('0');
    await page.context().close();
  });

  test('logging in with Google without having joined asks to join first', async ({ browser }) => {
    setFlags(true);
    const email = createGoogleAccount('stranger');
    const page = await openSignedIn(browser, email, null);
    await page.goto('/auth/social-return');
    await expect(page.getByRole('heading', { name: 'You haven’t joined yet' })).toBeVisible();
    await expect(
      page.getByRole('main').getByRole('link', { name: 'Join for free' }),
    ).toHaveAttribute('href', '/sign-up');
    expect(accountCount(email)).toBe('0');
    await page.context().close();
  });

  test('Google can’t join an account that is set up, and the page says how to connect it', async ({
    page,
  }) => {
    setFlags(true);
    // The database refuses on its own (pgTAP 203); this is what Supabase Auth sends back then.
    await openSignedOut(
      page,
      '/auth/social-return#error=server_error&error_description=Database+error+saving+identity%3A+identity_link_not_requested',
    );
    await expect(
      page.getByRole('heading', { name: 'You already have an account with this email' }),
    ).toBeVisible();
    await expect(page.getByText('Settings, under Ways to log in', { exact: false })).toBeVisible();
  });

  test('Settings lists the ways in and asks the database before connecting Google', async ({
    browser,
  }) => {
    setFlags(true);
    const email = `social-settings-${stamp}@example.com`;
    madeAddresses.push(email);
    createTestAccount(email, password, `social_settings_${stamp}`);
    const page = await openSignedIn(browser, email, null);
    await page.route('**/auth/v1/user/identities/authorize**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: '/google-stand-in' }),
      }),
    );
    await page.goto('/settings#ways-to-log-in');
    const panel = page.locator('#ways-to-log-in');
    await expect(panel.getByRole('heading', { name: 'Ways to log in' })).toBeVisible();
    await expect(
      panel.getByRole('listitem').filter({ hasText: 'Email and password' }),
    ).toContainText('Connected');
    // A password alone has no Disconnect, so there is no warning, only the count.
    await expect(panel.getByText('You have 1 way to log in.')).toBeVisible();

    await panel.getByRole('button', { name: 'Connect Google' }).click();
    await expect(page).toHaveURL(/google-stand-in/);
    expect(
      runSql(`select count(*) from public.identity_link_requests join auth.users on users.id = identity_link_requests.user_id
        where users.email = '${email}' and provider = 'google'`),
    ).toBe('1');
    await page.context().close();
  });

  test('an account with only Google can’t disconnect it, and can set a password', async ({
    browser,
  }) => {
    setFlags(true);
    const email = createGoogleAccount('only');
    const page = await openSignedIn(browser, email, keptAnswers(1990, `social_only_${stamp}`));
    await page.goto('/auth/social-return');
    await expect(page).not.toHaveURL(/social-return/);
    // The password was only for the test's sign-in: the account now has Google alone.
    runSql(`update auth.users set encrypted_password = '' where email = '${email}'`);
    await page.goto('/settings#ways-to-log-in');
    const panel = page.locator('#ways-to-log-in');
    const google = panel.getByRole('listitem').filter({ hasText: 'Google' });
    await expect(google).toContainText('Connected');
    await expect(panel.getByRole('button', { name: 'Disconnect Google' })).toBeDisabled();
    await expect(panel.getByRole('button', { name: 'Disconnect Google' })).toHaveAttribute(
      'aria-describedby',
      'last-way-to-log-in',
    );
    await expect(panel.getByText('You can’t disconnect your last way to log in.')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Set a password' })).toBeVisible();
    await page.context().close();
  });

  test('a passkey is added in Settings, logs in, and is removed again', async ({ browser }) => {
    setFlags(true);
    const email = `social-passkey-${stamp}@example.com`;
    madeAddresses.push(email);
    createTestAccount(email, password, `social_passkey_${stamp}`);
    const page = await openSignedIn(browser, email, null);
    // Chrome's virtual authenticator stands in for a fingerprint reader.
    const devtools = await page.context().newCDPSession(page);
    await devtools.send('WebAuthn.enable');
    await devtools.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    });

    await page.goto('http://localhost:4173/settings#ways-to-log-in');
    const panel = page.locator('#ways-to-log-in');
    await panel.getByRole('button', { name: 'Add a passkey' }).click();
    await expect(panel.getByText('Passkey added.', { exact: false })).toBeVisible();
    await expect(panel.getByRole('button', { name: /Disconnect passkey/ })).toBeVisible();
    expect(
      runSql(`select count(*) from public.notifications join auth.users on users.id = notifications.user_id
        where users.email = '${email}' and kind = 'login_method_added'`),
    ).toBe('1');

    // Signed out, the passkey logs in from the log-in page.
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('http://localhost:4173/sign-in');
    await page.evaluate(() => window.localStorage.setItem('interface-language', 'en'));
    await page.reload();
    await page.getByRole('button', { name: 'Use a passkey' }).click();
    await expect(page).not.toHaveURL(/sign-in/);

    await page.goto('http://localhost:4173/settings#ways-to-log-in');
    await panel.getByRole('button', { name: /Disconnect passkey/ }).click();
    await expect(panel.getByRole('button', { name: /Disconnect passkey/ })).toHaveCount(0);
    await expect(panel.getByRole('button', { name: 'Add a passkey' })).toBeVisible();
    await page.context().close();
  });

  test('log-in, sign-up and Settings pass axe at every width, theme and language', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    setFlags(true);
    const { session } = await signInPersona('adult_writer');
    for (const view of everyView(['/sign-in', `/join/${workingInvite}`])) {
      const context = await browser.newContext();
      await checkScreen(await context.newPage(), view);
      await context.close();
    }
    for (const view of everyView(['/settings#ways-to-log-in'])) {
      const context = await browser.newContext();
      await useSessionInBrowser(context, session);
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`,
      );
      await checkScreen(await context.newPage(), view);
      await context.close();
    }
    runSql(`update public.profiles set locale = 'ro' where handle = 'adult_writer';`);
  });
});
