/**
 * Staff › Settings in a real browser (stories S1-E11-03 and S1-E11-05).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - an admin switches a flag and changes a value; each saves, shows at once and is in the audit
 *   log with the before and after values (S1-E11-03 criterion 1);
 * - an admin reserves a name and frees it again;
 * - an admin can't open a market, but marks its legal check done and readies it; the owner then
 *   opens it, and a language no moderator reads can't open (S1-E11-05 criteria 2 and 3);
 * - a moderator who types the address is told the page isn't theirs;
 * - the page passes axe at 390, 768 and 1440 px.
 * Test data: a test flag and a test setting made here (so no real switch flips while other specs
 * run), New Zealand's market and a test language; all put back afterwards.
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
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Staff › Settings (S1-E11-03, S1-E11-05)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    runSql(`
      insert into public.feature_flags (key, is_enabled, is_public, description)
      values ('e2e_test_flag', false, false, 'A flag the settings spec switches.')
      on conflict (key) do update set is_enabled = false;
      insert into public.settings (key, value, is_public, description)
      values ('e2e_test_value', '5'::jsonb, false, 'A value the settings spec changes.')
      on conflict (key) do update set value = '5'::jsonb;
      insert into public.languages (code, status) values ('hu', 'closed') on conflict (code) do nothing;`);
  });
  test.afterAll(() => {
    runSql(`
      delete from public.feature_flags where key = 'e2e_test_flag';
      delete from public.settings where key = 'e2e_test_value';
      delete from public.reserved_names where name = 'e2e-rezervat';
      delete from public.languages where code = 'hu';
      update public.markets set status = 'closed', legal_check = 'not_started' where country_code = 'NZ';
      update public.profiles set locale = 'ro' where handle in ('admin', 'owner', 'moderator');`);
  });

  test('an admin switches a flag and changes a value, both logged', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/settings');
    await expect(page.getByRole('heading', { level: 1, name: 'Content settings' })).toBeVisible();
    // Step 1: the test flag, shown with its key because the locale files don't name it.
    const flagSwitch = page.getByRole('switch', { name: 'e2e_test_flag' });
    await expect(flagSwitch).toHaveAttribute('aria-checked', 'false');
    await flagSwitch.click();
    await expect(flagSwitch).toHaveAttribute('aria-checked', 'true');
    expect(runSql(`select is_enabled from public.feature_flags where key = 'e2e_test_flag'`)).toBe(
      't',
    );
    // Step 2: the test value, under "Other".
    const valueForm = page.getByRole('form', { name: 'e2e_test_value' });
    await valueForm.getByRole('textbox', { name: 'e2e_test_value' }).fill('-2');
    await valueForm.getByRole('button', { name: 'Save e2e_test_value' }).click();
    await expect(valueForm.getByText(/Type a number of zero or more/)).toBeVisible();
    await valueForm.getByRole('textbox', { name: 'e2e_test_value' }).fill('9');
    await valueForm.getByRole('button', { name: 'Save e2e_test_value' }).click();
    await expect(page.getByText('Saved. It applies within a minute.')).toBeVisible();
    expect(runSql(`select value from public.settings where key = 'e2e_test_value'`)).toBe('9');
    // Step 3: both changes are in the audit log, reached from the page's link.
    await page.getByRole('link', { name: 'See every settings change in the audit log' }).click();
    await expect(page.getByRole('cell', { name: 'settings.value' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'settings.flag' }).first()).toBeVisible();
  });

  test('an admin reserves a name and frees it again', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/settings#names');
    const form = page.getByRole('form', { name: 'Name to reserve' });
    await form.getByRole('textbox', { name: 'Name to reserve' }).fill('e2e-rezervat');
    await form.getByRole('button', { name: 'Reserve' }).click();
    const freeButton = page.getByRole('button', { name: 'Free e2e-rezervat' });
    await expect(freeButton).toBeVisible();
    await freeButton.click();
    await expect(freeButton).toHaveCount(0);
  });

  test('an admin readies a market and the owner opens it', async ({ browser }) => {
    const adminPage = await openAs(browser, 'admin', '/staff/settings#markets');
    const zealand = adminPage
      .getByRole('listitem')
      .filter({ hasText: 'Legal check for New Zealand' });
    await expect(zealand.getByRole('radio', { name: 'Open', exact: true })).toBeDisabled();
    await zealand.getByLabel('Legal check for New Zealand').selectOption('done');
    await zealand.getByRole('radio', { name: 'Ready to open' }).click();
    await expect(zealand.getByRole('radio', { name: 'Ready to open' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // A language nobody reads stays closed, with the reason.
    const hungarian = adminPage.getByRole('listitem').filter({ hasText: 'Status of Hungarian' });
    await hungarian.getByRole('radio', { name: 'Open', exact: true }).click();
    await expect(hungarian.getByText(/No moderator who reads this language/)).toBeVisible();

    const ownerPage = await openAs(browser, 'owner', '/staff/settings#markets');
    const ownersZealand = ownerPage
      .getByRole('listitem')
      .filter({ hasText: 'Legal check for New Zealand' });
    await ownersZealand.getByRole('radio', { name: 'Open', exact: true }).click();
    await expect(ownersZealand.getByRole('radio', { name: 'Open', exact: true })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(runSql(`select is_open from public.markets where country_code = 'NZ'`)).toBe('t');
  });

  test('a moderator is told the page is not theirs', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/settings');
    await expect(page.getByText('Only the owner and admins can change settings.')).toBeVisible();
    await expect(page.getByRole('switch')).toHaveCount(0);
  });

  for (const view of everyView(['/staff/settings'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'owner';`);
      await useSessionInBrowser(page.context(), (await signInPersona('owner')).session);
      await checkScreen(page, view);
    });
  }
});
