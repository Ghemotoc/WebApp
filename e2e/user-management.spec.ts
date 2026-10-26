/**
 * The Users area of the admin site in a real browser (story S1-E11-02; architecture 1.8.3 and
 * 1.8.4, screen 8.5).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the moderator searches by username and by short user ID and sees status, age check,
 *   sanctions and open cases; the account page shows the short user ID with Copy, the age group
 *   (never the year of birth), the sanctions history, the open cases and the private messages
 *   line;
 * - the moderator warns an account, resets a pen name and signs an account out everywhere, each
 *   with a reason, and each lands in the audit log;
 * - support finds accounts and shows an email (logged), but sees no sanctions, no cases and no
 *   actions; the owner sees the staff actions on the account and the Invites tab, the moderator
 *   doesn't; /staff/invites now opens the Invites tab; the content editor is refused;
 * - the Users page and an account page pass axe and don't scroll sideways at 390, 768 and
 *   1440 px.
 * Test data: seed personas; the sanction and the pen name changed here are put back afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const teacherId = '00000000-0000-4000-8000-000000000007';
const adultWriterId = '00000000-0000-4000-8000-000000000001';
const suspendedUserId = '00000000-0000-4000-8000-000000000013';
const stamp = `e2e users ${Date.now()}`;

/** Opens an address in English as a persona, in a fresh browser context. */
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

/** Puts back the seed state this spec changes. */
function cleanUp() {
  runSql(`delete from public.sanctions where user_id = '${teacherId}' and note like '${stamp}%';
    update public.profiles set pen_name = 'Lia Scrie', pen_name_changed_at = null
      where id = '${adultWriterId}';
    update public.profiles set locale = 'ro'
      where handle in ('owner', 'moderator', 'support', 'editor');`);
}

test.describe('user management (S1-E11-02)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(cleanUp);

  test('the moderator finds accounts and reads one', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff');
    await page
      .getByRole('navigation', { name: 'Staff' })
      .getByRole('link', { name: 'Users' })
      .click();
    await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();
    // The moderator has no Invites area, so there are no tabs.
    await expect(page.getByRole('navigation', { name: 'Users' })).toHaveCount(0);

    await page.getByLabel('Username, pen name, email or user ID').fill('suspended');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('1 account found.')).toBeVisible();
    const row = page.getByRole('row').filter({ hasText: '@suspended_user' });
    await expect(row).toContainText('Suspended');
    await expect(row).toContainText('Suspension');

    // The short user ID finds the same account.
    await page.getByLabel('Username, pen name, email or user ID').fill(suspendedUserId.slice(0, 8));
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'accounts found.' })).toBeVisible();

    await page.goto(`/staff/users/${suspendedUserId}`);
    await expect(page.getByRole('heading', { name: '@suspended_user', level: 1 })).toBeVisible();
    await expect(page.getByText('00000000', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy user ID' })).toBeVisible();
    await expect(page.getByText('18 or over').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sanctions history' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Open cases' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open case R-000010' })).toBeVisible();
    await expect(page.getByText('Private messages are hidden.', { exact: false })).toBeVisible();
    // Only owner and admin read the audit log.
    await expect(page.getByRole('heading', { name: /^Staff actions on/ })).toHaveCount(0);
  });

  test('the moderator warns, resets a pen name and signs an account out, each logged', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'moderator', `/staff/users/${teacherId}`);
    const actions = page.getByRole('region', { name: 'Actions' });
    await actions.getByRole('button', { name: 'Warn' }).click();
    // A warning needs a reason.
    await actions.getByRole('button', { name: 'Warn' }).last().click();
    await expect(actions.getByText('Say why first.')).toBeVisible();
    await actions.getByLabel('Reason (required)').fill(`${stamp}: spam links in the bio.`);
    await actions.getByRole('button', { name: 'Warn' }).last().click();
    await expect(page.getByText('Done. The warning is on the account.')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Sanctions history' })).toContainText(
      `${stamp}: spam links in the bio.`,
    );

    await actions.getByRole('button', { name: 'Sign out everywhere' }).click();
    await actions.getByLabel('Reason (required)').fill('They say someone else used the account.');
    await actions.getByRole('button', { name: 'Sign out everywhere' }).last().click();
    await expect(page.getByText('Done. Every session ended.')).toBeVisible();

    await page.goto(`/staff/users/${adultWriterId}`);
    const writerActions = page.getByRole('region', { name: 'Actions' });
    await writerActions.getByRole('button', { name: 'Reset pen name' }).click();
    await writerActions
      .getByLabel('Reason (required)')
      .fill('The pen name insults another writer.');
    await writerActions.getByRole('button', { name: 'Reset the pen name' }).click();
    await expect(page.getByText('Done. The pen name was reset.')).toBeVisible();
    await expect(page.getByText('No pen name')).toBeVisible();

    expect(
      runSql(`select string_agg(distinct action, ',' order by action) from public.audit_log
        where created_at > now() - interval '5 minutes'
          and action in ('sanction.applied', 'account.signed_out_everywhere', 'account.pen_name_reset')`),
    ).toBe('account.pen_name_reset,account.signed_out_everywhere,sanction.applied');
  });

  test('support finds accounts and shows an email, but sees no sanctions, cases or actions', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'support', '/staff/users?q=teacher');
    const row = page.getByRole('row').filter({ hasText: '@teacher' });
    await expect(row).toContainText('Not shown to your role');
    await row.getByRole('link', { name: 'Open the account @teacher' }).click();
    await expect(page.getByRole('heading', { name: '@teacher', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Actions' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Sanctions history' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Open cases' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Show (logged)' }).click();
    await expect(page.getByText('teacher@personas.test')).toBeVisible();
    expect(
      runSql(`select count(*) from public.audit_log where action = 'sensitive_read.email_revealed'
        and target_user_id = '${teacherId}' and created_at > now() - interval '5 minutes'`),
    ).not.toBe('0');
  });

  test('the owner sees the staff actions and the Invites tab; the editor is refused', async ({
    browser,
  }) => {
    const owner = await openAs(browser, 'owner', `/staff/users/${teacherId}`);
    await expect(owner.getByRole('heading', { name: 'Staff actions on @teacher' })).toBeVisible();
    await expect(owner.getByText(/@moderator · sanction\.applied/).first()).toBeVisible();

    await owner.goto('/staff/invites');
    await expect(owner).toHaveURL(/\/staff\/users\/invites$/);
    const tabs = owner.getByRole('navigation', { name: 'Users' });
    await expect(tabs.getByRole('link', { name: 'Invites' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await tabs.getByRole('link', { name: 'Accounts' }).click();
    await expect(owner.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();

    const editor = await openAs(browser, 'editor', '/staff/users?q=teacher');
    await expect(
      editor.getByText('Only owners, admins, moderators and support can look up accounts.'),
    ).toBeVisible();
  });

  for (const view of everyView(['/staff/users?q=user', `/staff/users/${suspendedUserId}`])) {
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
