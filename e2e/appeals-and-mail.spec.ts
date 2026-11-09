/**
 * Appeals and moderator mail in a real browser (stories S1-E10-07 and S1-E10-11; DSA art. 20 and
 * art. 12).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a warned person appeals from My reports and decisions; an admin (not the moderator who
 *   decided) changes the decision on Staff › Appeals; the person is notified and reads the
 *   outcome on My reports (S1-E10-07 criteria 1 to 3);
 * - the person asks the moderators a question about the decision; a moderator answers from the
 *   shared inbox with an internal note and a reply; the person sees the reply as "The moderation
 *   team", never the note or who wrote it, and is notified (S1-E10-11 criteria 1 and 2);
 * - Staff › Appeals, Staff › Moderator mail and the person's messages pass axe at 390, 768 and
 *   1440 px.
 * Test data: seed personas; the report, case, appeal and thread made here are removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The teacher persona: the account the warning is about. */
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

/** Warns the teacher through a report and a moderator's decision; returns the statement. */
async function warnTheTeacher(): Promise<string> {
  const { client: reporter } = await signInPersona('adult_writer');
  const reported = await reporter.rpc('report_item', {
    item_type: 'profile',
    item_reference: 'teacher',
    reason: 'spam',
    details: 'e2e appeals',
  });
  expect(reported.error).toBeNull();
  const caseId = runSql(
    `select id from public.cases where user_id = '${teacherId}' and status = 'open'`,
  );
  const { client: moderator } = await signInPersona('moderator');
  const decided = await moderator.rpc('admin_decide_case', {
    target_case_id: caseId,
    chosen_action: 'warn',
    note_text: 'Advert in the bio.',
    suspension_days: undefined,
    message_to_person: 'Your bio advertises a paid service.',
  });
  expect(decided.error).toBeNull();
  return runSql(
    `select reference from public.statements_of_reasons where user_id = '${teacherId}' order by created_at desc limit 1`,
  );
}

test.describe('appeals and moderator mail (S1-E10-07, S1-E10-11)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`
      delete from public.notifications where user_id = '${teacherId}';
      delete from public.moderator_mail_messages where thread_id in (select id from public.moderator_mail_threads where user_id = '${teacherId}');
      delete from public.moderator_mail_threads where user_id = '${teacherId}';
      delete from public.appeals where user_id = '${teacherId}';
      delete from public.sanctions where user_id = '${teacherId}';
      delete from public.case_actions where case_id in (select id from public.cases where user_id = '${teacherId}');
      delete from public.reports where case_id in (select id from public.cases where user_id = '${teacherId}');
      delete from public.cases where user_id = '${teacherId}';
      delete from public.rate_limit_events where user_id = '${teacherId}';
      update public.profiles set locale = 'ro' where handle in ('moderator', 'admin', 'teacher', 'adult_writer');`);
  });

  test('the person appeals and an admin changes the decision', async ({ browser }) => {
    const statement = await warnTheTeacher();

    // Step 1: the teacher appeals from My reports and decisions.
    const teacherPage = await openAs(browser, 'teacher', '/my-reports');
    const decision = teacherPage.getByRole('article').filter({ hasText: statement });
    await decision.getByRole('button', { name: 'Appeal this decision' }).click();
    await decision
      .getByLabel('Why is this decision wrong?')
      .fill('The link in my bio is to a free school club.');
    await decision.getByRole('button', { name: 'Send the appeal' }).click();
    await expect(decision.getByText(/A moderator is looking at it/)).toBeVisible();

    // Step 2: an admin (not the moderator who decided) changes the decision.
    const staffPage = await openAs(browser, 'admin', '/staff/appeals');
    const card = staffPage.getByRole('listitem').filter({ hasText: statement });
    await card.getByRole('radio', { name: 'Change the decision' }).check({ force: true });
    await card.getByLabel('Note for the team').fill('The club is free; no advert.');
    await card
      .getByLabel('What we tell the person')
      .fill('The link is to a free club, so we removed the warning.');
    await card.getByRole('button', { name: 'Send the decision' }).click();
    await expect(staffPage.getByText('No appeal matches this filter.')).toBeVisible();

    // Step 3: the teacher is notified and reads the outcome.
    await teacherPage.goto('/notifications');
    await expect(teacherPage.getByText(/changed the decision/).first()).toBeVisible();
    await teacherPage.getByRole('link', { name: 'Read why' }).first().click();
    await expect(teacherPage.getByText(/and changed the decision/).first()).toBeVisible();
  });

  test('the person writes to the moderators and the team answers', async ({ browser }) => {
    // Step 1: the teacher writes from the decision's "Ask the moderators a question".
    const teacherPage = await openAs(browser, 'teacher', '/moderator-mail/new');
    await teacherPage.getByLabel('Subject').fill('About my warning');
    await teacherPage.getByLabel('Message', { exact: true }).fill('Is my bio fine now?');
    await teacherPage.getByRole('button', { name: 'Send' }).click();
    await expect(teacherPage.getByText(/Your reference is M-\d{6}/)).toBeVisible();
    const reference = runSql(
      `select reference from public.moderator_mail_threads where user_id = '${teacherId}' order by created_at desc limit 1`,
    );

    // Step 2: a moderator adds a note and answers from the shared inbox.
    const staffPage = await openAs(browser, 'moderator', '/staff/moderator-mail');
    await staffPage
      .getByRole('listitem')
      .filter({ hasText: reference })
      .getByRole('link', { name: 'About my warning' })
      .click();
    const replyBox = staffPage.getByLabel('Answer as the moderation team, or add a note');
    await replyBox.fill('Checked with the case: fine.');
    await staffPage.getByRole('button', { name: 'Add an internal note' }).click();
    await expect(staffPage.getByText(/only staff see this/)).toBeVisible();
    await replyBox.fill('Yes, your bio is fine now.');
    await staffPage.getByRole('button', { name: 'Send' }).click();
    await expect(staffPage.getByText('Yes, your bio is fine now.')).toBeVisible();

    // Step 3: the teacher is notified and sees the team's answer, never the note or the name.
    await teacherPage.goto('/notifications');
    await teacherPage.getByRole('link', { name: 'Read the reply' }).first().click();
    await expect(teacherPage.getByText('Yes, your bio is fine now.')).toBeVisible();
    await expect(teacherPage.getByText('The moderation team').first()).toBeVisible();
    await expect(teacherPage.getByText('Checked with the case: fine.')).toHaveCount(0);
    await expect(teacherPage.getByText('@moderator')).toHaveCount(0);
  });

  for (const view of everyView(['/staff/appeals', '/staff/moderator-mail'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'admin';`);
      await useSessionInBrowser(page.context(), (await signInPersona('admin')).session);
      await checkScreen(page, view);
    });
  }

  for (const view of everyView(['/moderator-mail', '/moderator-mail/new'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'teacher';`);
      await useSessionInBrowser(page.context(), (await signInPersona('teacher')).session);
      await checkScreen(page, view);
    });
  }
});
