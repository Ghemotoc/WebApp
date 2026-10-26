/**
 * Statements of reasons in a real browser (story S1-E10-04; DSA art. 17 and art. 16(5)).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the moderator warns from a case with "What we tell the person"; the case page then shows the
 *   statement exactly as sent (criterion 3);
 * - the person reads it on My reports and decisions: what we did, why (the moderator's words),
 *   the rule, that no automated tools decided, and until when they can challenge it, with a link
 *   to Contact us (criterion 1); their notification links there with "Read why";
 * - the reporter sees "Decided: action taken" on the same page, never the warning (criterion 2);
 * - My reports and decisions passes axe at 390, 768 and 1440 px.
 * Test data: seed personas; the report, case and statement made here are removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The teacher persona: the account the report is about. */
const teacherId = '00000000-0000-4000-8000-000000000007';

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

test.describe('statements of reasons (S1-E10-04)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    // Cases take their statements with them (on delete cascade); notifications go first.
    runSql(`
      delete from public.notifications where case_id in (select id from public.cases where user_id = '${teacherId}');
      delete from public.sanctions where user_id = '${teacherId}';
      delete from public.case_actions where case_id in (select id from public.cases where user_id = '${teacherId}');
      delete from public.reports where case_id in (select id from public.cases where user_id = '${teacherId}');
      delete from public.cases where user_id = '${teacherId}';
      update public.profiles set locale = 'ro' where handle in ('moderator', 'teacher', 'adult_writer');`);
  });

  test('a warning sends the person a statement, and the reporter only the outcome', async ({
    browser,
  }) => {
    // Step 1: adult_writer reports the teacher's profile.
    const { client } = await signInPersona('adult_writer');
    const reported = await client.rpc('report_item', {
      item_type: 'profile',
      item_reference: 'teacher',
      reason: 'spam',
      details: 'e2e statements',
    });
    expect(reported.error).toBeNull();
    const caseId = runSql(
      `select id from public.cases where user_id = '${teacherId}' and status = 'open'`,
    );

    // Step 2: the moderator warns, with the words the person will read.
    const page = await openAs(browser, 'moderator', `/staff/moderation/cases/${caseId}`);
    const form = page.getByRole('form', { name: 'Decision' });
    await form.getByRole('radio', { name: 'Warn' }).check({ force: true });
    await form
      .getByLabel('Note for the case log (required)')
      .fill('Advert in the bio; first warning.');
    await form
      .getByLabel('What we tell the person (required)')
      .fill('Your bio advertises a paid service.');
    await form.getByRole('button', { name: 'Send decision' }).click();
    const stored = page.getByRole('region', { name: 'Statement of reasons' });
    await expect(stored.getByRole('heading', { name: 'We warned your account' })).toBeVisible();
    await expect(stored).toContainText('Your bio advertises a paid service.');

    // Step 3: the teacher reads it, with the rule, how it was found and the challenge link.
    const teacherPage = await openAs(browser, 'teacher', '/notifications');
    await teacherPage.getByRole('link', { name: 'Read why' }).first().click();
    await expect(teacherPage).toHaveURL(/\/my-reports/);
    const decision = teacherPage.getByRole('article').filter({ hasText: 'We warned your account' });
    await expect(decision).toContainText('Your bio advertises a paid service.');
    await expect(decision).toContainText('Our community guidelines: spam');
    await expect(decision).toContainText('No automated tools made this decision.');
    await expect(decision.getByRole('link', { name: /Challenge this decision, S-/ })).toBeVisible();

    // Step 4: the reporter sees the outcome only.
    const reporterPage = await openAs(browser, 'adult_writer', '/my-reports');
    await expect(reporterPage.getByText('Decided: action taken').first()).toBeVisible();
    await expect(reporterPage.getByText('We warned your account')).toHaveCount(0);
  });

  for (const view of everyView(['/my-reports'])) {
    test(`axe: My reports and decisions at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'teacher';`);
      await useSessionInBrowser(page.context(), (await signInPersona('teacher')).session);
      await checkScreen(page, view);
    });
  }
});
