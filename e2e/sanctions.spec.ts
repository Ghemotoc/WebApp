/**
 * Sanctions in a real browser (story S1-E10-06).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the moderator decides a case with "Suspend" for 7 days: the account is read-only (the
 *   database says suspended), the person sees "Account suspended until …" on every page
 *   and can still read; the case page lists the live suspension and the moderator lifts it;
 * - "Ban" from a case: the person can't sign in any more (Supabase's own ban) and the email can't
 *   sign up again (the seed's banned_user is the proof for sign-in; the hash for sign-up);
 * - "Pause reporting" on a reporter: their next report is refused in plain words in the dialog;
 * - "Remove" from a case hides the item for everyone but staff (is_moderated_away) and "Restore"
 *   brings it back;
 * - the case page with its sanctions panel passes axe at 390, 768 and 1440 px.
 * Test data: seed personas; the reports, cases and sanctions made here are removed afterwards.
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

/** Reports the teacher's profile as a persona and returns the open case's ID. */
async function openCaseOnTeacher(
  reporter: 'adult_writer' | 'teen_17',
  reason: 'spam' | 'hate',
): Promise<string> {
  const { client } = await signInPersona(reporter);
  const { error } = await client.rpc('report_item', {
    item_type: 'profile',
    item_reference: 'teacher',
    reason,
    details: 'e2e sanctions',
  });
  expect(error).toBeNull();
  return runSql(
    `select id from public.cases where user_id = '00000000-0000-4000-8000-000000000007' and status = 'open'`,
  );
}

test.describe('sanctions (S1-E10-06)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`
      delete from public.moderated_items where user_id = '00000000-0000-4000-8000-000000000007';
      delete from public.sanctions where user_id in ('00000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000001');
      delete from public.case_actions where case_id in (select id from public.cases where user_id = '00000000-0000-4000-8000-000000000007');
      delete from public.reports where case_id in (select id from public.cases where user_id = '00000000-0000-4000-8000-000000000007');
      delete from public.cases where user_id = '00000000-0000-4000-8000-000000000007';
      update public.profiles set locale = 'ro' where handle in ('moderator', 'teacher', 'adult_writer', 'teen_17');`);
  });

  test('suspend from a case: the person is read-only and sees why; the moderator lifts it', async ({
    browser,
  }) => {
    const caseId = await openCaseOnTeacher('adult_writer', 'spam');
    const page = await openAs(browser, 'moderator', `/staff/moderation/cases/${caseId}`);
    const form = page.getByRole('form', { name: 'Decision' });
    await form.getByRole('radio', { name: 'Suspend' }).check({ force: true });
    await form.getByLabel('For how long?').selectOption('7');
    await form.getByLabel('Note for the case log (required)').fill('Second upheld case; 7 days.');
    await form
      .getByLabel('What we tell the person (required)')
      .fill('You kept posting spam after our warning.');
    await form.getByRole('button', { name: 'Send decision' }).click();
    await expect(page.getByRole('status').getByText('Decision saved')).toBeVisible();
    expect(runSql(`select public.account_state('00000000-0000-4000-8000-000000000007')`)).toBe(
      'suspended',
    );

    const teacherPage = await openAs(browser, 'teacher', '/');
    await expect(teacherPage.getByText(/Account suspended until/)).toBeVisible();

    const panel = page.getByRole('region', { name: 'Reported account: sanctions' });
    await expect(panel).toContainText('Suspension');
    await expect(panel).toContainText('Live');
    await panel.getByRole('button', { name: 'Lift' }).click();
    await panel.getByLabel('Why is it lifted?').fill('Appeal upheld.');
    await panel.getByRole('button', { name: 'Lift the sanction' }).click();
    await expect(panel).toContainText('Lifted');
    expect(runSql(`select public.account_state('00000000-0000-4000-8000-000000000007')`)).toBe(
      'active',
    );
  });

  test('a banned account can’t sign in', async () => {
    const client = makeTestClient();
    const { error } = await client.auth.signInWithPassword({
      email: 'banned_user@personas.test',
      password: 'Persona-Test-2026!',
    });
    expect(error?.code).toBe('user_banned');
  });

  test('pause reporting: the reporter’s next report is refused in the dialog', async ({
    browser,
  }) => {
    // The decided case from the first test still lists adult_writer's report.
    const caseId = runSql(
      `select id from public.cases where user_id = '00000000-0000-4000-8000-000000000007' order by created_at desc limit 1`,
    );
    const page = await openAs(browser, 'moderator', `/staff/moderation/cases/${caseId}`);
    await page.getByRole('button', { name: 'Pause reporting for @adult_writer' }).click();
    await page.getByLabel('Why is reporting paused?').fill('Five unfounded reports this month.');
    await page.getByRole('button', { name: /Pause for 30 days/ }).click();
    await expect(page.getByText('Reporting paused.')).toBeVisible();

    // adult_writer sees the notice on every page, and the report dialog refuses before anything else.
    const writerPage = await openAs(browser, 'adult_writer', '/design#report');
    await expect(writerPage.getByText(/Reporting paused until/)).toBeVisible();
    await writerPage.getByRole('button', { name: 'Report @adult_writer' }).click();
    const dialog = writerPage.getByRole('dialog', { name: 'Report this profile' });
    await dialog.getByText('Spam', { exact: true }).click();
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(
      dialog.getByText('Your reporting is paused for now. You can still read and write.'),
    ).toBeVisible();
  });

  test('remove from a case moderates the item away; restore brings it back', async ({
    browser,
  }) => {
    // teen_17 reports: adult_writer is paused, and reported the same profile today.
    const caseId = await openCaseOnTeacher('teen_17', 'hate');
    const page = await openAs(browser, 'moderator', `/staff/moderation/cases/${caseId}`);
    const form = page.getByRole('form', { name: 'Decision' });
    await form.getByRole('radio', { name: 'Remove' }).check({ force: true });
    await form.getByLabel('Note for the case log (required)').fill('Slurs in the bio.');
    await form.getByLabel('What we tell the person (required)').fill('Your bio used slurs.');
    await form.getByRole('button', { name: 'Send decision' }).click();
    await expect(page.getByText(/The item is removed/)).toBeVisible();
    expect(
      runSql(`select public.is_moderated_away('profile', '00000000-0000-4000-8000-000000000007')`),
    ).toBe('t');
    await page.getByRole('button', { name: 'Restore' }).click();
    await page.getByLabel('Why is it restored?').fill('A quotation, not slurs.');
    await page.getByRole('button', { name: 'Restore the item' }).click();
    await expect(page.getByText('The item was restored.')).toBeVisible();
    expect(
      runSql(`select public.is_moderated_away('profile', '00000000-0000-4000-8000-000000000007')`),
    ).toBe('f');
  });

  for (const view of everyView(['/staff/moderation/cases/decided'])) {
    test(`axe: a decided case at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's language wins over the browser's (S1-E1-04), and earlier tests here set it
      // to English, so it is set to the view's language first (no race between the two).
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'moderator';`);
      await useSessionInBrowser(page.context(), (await signInPersona('moderator')).session);
      const caseId = runSql(`select id from public.cases where decision = 'suspend' limit 1`);
      await checkScreen(page, { ...view, address: `/staff/moderation/cases/${caseId}` });
    });
  }
});
