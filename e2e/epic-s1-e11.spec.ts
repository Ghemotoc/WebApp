/**
 * Epic check for S1-E11, the admin site (story S1-E11-QA).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase with Mailpit started first).
 * It adds no feature: it walks the epic's main journeys across its stories, in a real browser.
 * - Journey 1 (S1-E11-17 × S1-E2-01 × S1-E11-01): the admin makes a one-use invite link → an
 *   invited adult joins with it in a private window → the link shows "Used up" with no email →
 *   the owner searches the audit log for "invite." and finds the admin's invite.created, the new
 *   account's invite.redeemed (short user ID) and the system's invite.used_up (CTO, 24 Oct) →
 *   the moderator's menu is Moderation only; support's is empty; the content editor is refused.
 * - Journey 2 (S1-E11-06 × S1-E11-10 × S1-E2-10; CMS-1d): the admin changes the Romanian home
 *   page with a "show from" date of tomorrow → a visitor still sees the old line → once the date
 *   comes it goes live; the admin publishes a notice and a visitor sees it; a visitor from a
 *   country with no page of its own (US) gets the Romanian market's English page.
 * - Journey 3 (S1-E11-18 × S1-E1-04): the admin overrides the footer's Help label, a visitor sees
 *   it, and Reset to default brings the file text back.
 * - Journey 4 (S1-E11-06, 10, 12, 18, 19, 11 × S1-E2-07a): a moderator and a content editor are
 *   refused on every Website tab (decided 17 Oct 2026, 19:19: admin role only).
 * The axe runs for every screen of the epic live in each story's own spec. Test data: seed
 * personas, one synthetic @example.com account, and the content these journeys publish, removed
 * afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The stamp every synthetic account of this run carries, so clean-up finds it. */
const stamp = Date.now();

/** Opens an address as a visitor, in a language, optionally as if from another country. */
async function openAsVisitor(
  browser: Browser,
  address: string,
  language: 'en' | 'ro',
  country?: string,
): Promise<Page> {
  const context = await browser.newContext();
  // The local server reads X-Fake-Country as the country from the connection (S1-E2-10).
  if (country !== undefined) await context.setExtraHTTPHeaders({ 'X-Fake-Country': country });
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Opens an address in English as a persona. */
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

/** The staff menu's link names, in order. */
async function menuLinks(page: Page): Promise<string[]> {
  const navigation = page.getByRole('navigation', { name: 'Staff' }).first();
  await expect(navigation).toBeVisible();
  return navigation.getByRole('link').allInnerTexts();
}

test.describe('epic S1-E11 journeys', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`
      delete from public.consents where user_id in (select id from auth.users where email = 'epic-${stamp}@example.com');
      -- The account stays: the append-only audit log names it (invite.redeemed, S1-E11-17).
      delete from public.profiles where id in (select id from auth.users where email = 'epic-${stamp}@example.com')
        and id not in (select user_id from public.audit_log where user_id is not null);
      delete from auth.users where email = 'epic-${stamp}@example.com' and id not in (select id from public.profiles);
      delete from public.invites where note = 'epic ${stamp}';
      delete from public.cms_versions where user_id is not null or is_removal;
      delete from public.interface_text_overrides;
      update public.profiles set locale = 'ro' where handle in ('owner', 'admin', 'moderator', 'support', 'editor');`);
  });

  test('journey 1: an invite made in the admin site admits one adult, and the audit log shows it', async ({
    browser,
  }) => {
    // Step 1: the admin makes a one-use link (S1-E11-17).
    const admin = await openAs(browser, 'admin', '/staff/users/invites');
    await admin.getByRole('button', { name: 'Make an invite link' }).click();
    const form = admin.getByRole('form', { name: 'New invite link' });
    await form.getByLabel('Private note').fill(`epic ${stamp}`);
    await form.getByRole('button', { name: 'Make link' }).click();
    const link = await admin.getByLabel('Invite link', { exact: true }).inputValue();
    const localLink = new URL(link).pathname;

    // Step 2: an invited adult joins with it (S1-E2-01).
    const visitor = await browser.newContext();
    await visitor.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const visitorPage = await visitor.newPage();
    await visitorPage.goto(localLink);
    await visitorPage.getByLabel('Email', { exact: true }).fill(`epic-${stamp}@example.com`);
    await visitorPage.getByRole('textbox', { name: 'Username' }).fill(`epic.e11.${stamp}`);
    await visitorPage.getByLabel('Password', { exact: true }).fill('a long enough passphrase');
    await visitorPage.getByLabel('Confirm password').fill('a long enough passphrase');
    await visitorPage.getByRole('combobox', { name: 'Year of birth' }).selectOption('1990');
    await visitorPage.getByRole('checkbox').check();
    await visitorPage.getByRole('button', { name: 'Create account' }).click();
    await expect(visitorPage.getByRole('status').getByText(/We sent a link/)).toBeVisible();

    // Step 3: the link is used up, and the list never shows who used it.
    await admin.reload();
    const row = admin.getByRole('listitem').filter({ hasText: `epic ${stamp}` });
    await expect(row).toContainText('Used up');
    await expect(row).not.toContainText('example.com');

    // Step 4: the owner finds the audit rows (S1-E11-01): the admin made the link, the new account
    // used it (short user ID, never the email) and the system closed it (CTO, 24 Oct 2026).
    const owner = await openAs(browser, 'owner', '/staff/audit-log');
    const search = owner.getByRole('form', { name: 'Search the audit log' });
    await search.getByLabel('Action starts with').fill('invite.');
    await search.getByRole('button', { name: 'Search' }).click();
    const rows = owner.getByRole('row');
    await expect(
      rows.filter({ hasText: `epic ${stamp}` }).filter({ hasText: 'invite.created' }),
    ).toContainText('@admin');
    await expect(
      rows.filter({ hasText: `epic ${stamp}` }).filter({ hasText: 'invite.used_up' }),
    ).toContainText('System');
    // The new account chose its username on the form (S1-E2-04), so the log names it by that.
    await expect(rows.filter({ hasText: `@epic.e11.${stamp}` })).toContainText('invite.redeemed');
    await expect(owner.getByRole('table')).not.toContainText('example.com');

    // Step 5: each role's menu (S1-E11-01 × S1-E2-07a × S1-E10-03a; SAFE-4 added moderator mail,
    // appeals and the safety contacts; CMS-1a added Settings; CMS-1b added Website; ADMIN-2a added
    // Stories, ADMIN-2c1 Data requests and ADMIN-2e1b Pictures to check; WAITLIST-1 added Waitlist;
    // GAPS-12c added Writers’ hub).
    expect(await menuLinks(owner)).toEqual([
      'Moderation',
      'Pictures to check',
      'Moderator mail',
      'Appeals',
      'Safety contacts',
      'On call',
      'Users',
      'Waitlist',
      'Support tickets',
      'Data requests',
      'Schools',
      'Roles',
      'Stories',
      'Featured',
      'Classics',
      'Tags',
      'Contests',
      'Writers’ hub',
      'Website',
      'Sponsors',
      'Settings',
      'Forums',
      'Metrics',
      'Logs',
      'Audit log',
    ]);
    const moderator = await openAs(browser, 'moderator', '/staff');
    expect(await menuLinks(moderator)).toEqual([
      'Moderation',
      'Pictures to check',
      'Moderator mail',
      'Appeals',
      'Safety contacts',
      'On call',
      'Users',
      'Schools',
      'Stories',
      'Tags',
      'Metrics',
    ]);
    const support = await openAs(browser, 'support', '/staff');
    expect(await menuLinks(support)).toEqual([
      'Safety contacts',
      'On call',
      'Users',
      'Support tickets',
      'Data requests',
      'Stories',
    ]);
    const editor = await openAs(browser, 'editor', '/staff/users/invites');
    await expect(editor.getByText('Only an owner or admin can make invite links.')).toBeVisible();
  });

  test('journey 2: a home page line waits for its date, a notice shows, and a US visitor gets English', async ({
    browser,
  }) => {
    const newLine = `O linie nouă pentru epic ${String(stamp)}.`;
    // Step 1: the admin changes the Romanian line with a "show from" date of tomorrow.
    const admin = await openAs(browser, 'admin', '/staff/website');
    const lede = admin.getByRole('textbox', { name: 'Line under the headline' });
    await expect(lede).toHaveValue(/Publică povești/);
    await lede.fill(newLine);
    const tomorrow = runSql('select (public.romania_today() + 1)::text;');
    await admin.getByLabel('Show from').fill(tomorrow);
    // A future date turns Publish into Schedule.
    await admin.getByRole('button', { name: 'Schedule' }).click();
    await expect(admin.getByText(/Published\. It goes live on/)).toBeVisible();
    // Step 2: until then a visitor keeps the line that is live.
    const early = await openAsVisitor(browser, '/', 'ro');
    await expect(early.getByText(/Publică povești/)).toBeVisible();
    await expect(early.getByText(newLine)).toHaveCount(0);
    // Step 3: when the date comes (moved to today here), the new line is live.
    runSql(`update public.cms_versions set show_from = public.romania_today()
            where content ->> 'lede' = '${newLine}';`);
    const onTheDay = await openAsVisitor(browser, '/', 'ro');
    await expect(onTheDay.getByText(newLine)).toBeVisible();
    // Step 4: a notice in both languages shows to visitors (S1-E11-10).
    const notices = await openAs(browser, 'admin', '/staff/website/notices');
    await notices.getByRole('button', { name: 'New notice' }).click();
    await notices
      .getByRole('textbox', { name: 'Text in Română' })
      .fill(`Anunț epic ${String(stamp)}.`);
    await notices
      .getByRole('textbox', { name: 'Text in English' })
      .fill(`Epic notice ${String(stamp)}.`);
    await notices.getByRole('button', { name: 'Publish' }).click();
    await expect(notices.getByText(/Published\. It goes live on/)).toBeVisible();
    const reader = await openAsVisitor(browser, '/discover', 'en');
    await expect(reader.getByRole('region', { name: 'Notice' })).toContainText(
      `Epic notice ${String(stamp)}.`,
    );
    // Step 5: a visitor from a country with no page of its own gets Romania's English page,
    // whatever their interface language (decided 17 Oct 2026, 19:16).
    const american = await openAsVisitor(browser, '/', 'ro', 'US');
    await expect(american.getByRole('heading', { level: 1 })).toHaveText(
      'Write stories. Get read.',
    );
  });

  test('journey 3: an admin overrides a button label, a visitor sees it, and Reset brings it back', async ({
    browser,
  }) => {
    const admin = await openAs(browser, 'admin', '/staff/website/interface-text');
    await admin.getByRole('searchbox', { name: 'Find a text' }).fill('common:nav.help');
    await admin.getByRole('button', { name: 'Edit common:nav.help' }).click();
    const english = admin.getByRole('region', { name: 'English' });
    await english.getByRole('textbox', { name: 'Text in English' }).fill('Help desk');
    await english.getByRole('button', { name: 'Publish' }).click();
    await expect(english.getByText(/Published\. It goes live on/)).toBeVisible();
    const visitor = await openAsVisitor(browser, '/contact', 'en');
    await expect(
      visitor.getByRole('contentinfo').getByRole('link', { name: 'Help desk' }),
    ).toBeVisible();
    await english.getByRole('button', { name: 'Reset to default' }).click();
    await expect(admin.getByText('Back to the default text from today.')).toBeVisible();
    const later = await openAsVisitor(browser, '/contact', 'en');
    await expect(
      later.getByRole('contentinfo').getByRole('link', { name: 'Help', exact: true }),
    ).toBeVisible();
  });

  test('journey 4: a moderator and a content editor are refused on every Website tab', async ({
    browser,
  }) => {
    const tabs = ['', '/notices', '/help', '/interface-text', '/emails', '/seasonal'];
    for (const persona of ['moderator', 'editor'] as const) {
      const page = await openAs(browser, persona, '/staff/website');
      for (const tab of tabs) {
        await page.goto(`/staff/website${tab}`);
        await expect(
          page.getByText('Only the owner and admins can edit the website.'),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: /Publish|Save|Add an occasion/ }),
        ).toHaveCount(0);
      }
    }
  });
});
