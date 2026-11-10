/**
 * The safeguarding path in a real browser (story S1-E10-10; DSA art. 18).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a self-harm report opens a safeguarding case; the moderator with the permission sees the
 *   steps, the helplines for the person's country, downloads the evidence pack and logs a
 *   referral (criteria 1 and 2);
 * - the admin, without the permission, moves another case into safeguarding and then no longer
 *   sees it (criterion 3);
 * - a safeguarding case page passes axe at 390, 768 and 1440 px.
 * Test data: reports on the teacher persona's profile, made here and removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The teacher persona: the account the reports are about. */
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

/**
 * Reports the teacher's profile and returns the open case's ID. Each test reports as a different
 * person, because the same person's second report within a day only returns the first one.
 */
async function reportTeacher(
  reason: 'self_harm' | 'harassment',
  reporter: SignInPersonaName,
): Promise<string> {
  const { client } = await signInPersona(reporter);
  const reported = await client.rpc('report_item', {
    item_type: 'profile',
    item_reference: 'teacher',
    reason,
    details: 'e2e safeguarding',
  });
  expect(reported.error).toBeNull();
  return runSql(`select id from public.cases where user_id = '${teacherId}' and status = 'open'`);
}

/** Removes this file's reports and cases (referrals go with their case). */
function cleanUp(): void {
  runSql(`
    delete from public.notifications where case_id in (select id from public.cases where user_id = '${teacherId}');
    delete from public.reports where case_id in (select id from public.cases where user_id = '${teacherId}');
    delete from public.cases where user_id = '${teacherId}';
    update public.profiles set locale = 'ro' where handle in ('moderator', 'admin');`);
}

test.describe('safeguarding (S1-E10-10)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(cleanUp);

  test('the safeguarding moderator sees the helplines, downloads the pack and logs a referral', async ({
    browser,
  }) => {
    const caseId = await reportTeacher('self_harm', 'adult_writer');
    const page = await openAs(browser, 'moderator', `/staff/moderation/cases/${caseId}`);
    const panel = page.getByRole('region', { name: 'Safeguarding' });
    await expect(panel.getByText(/If a life is at risk, call 112 first/)).toBeVisible();
    await expect(panel.getByText(/Support contacts for the person/)).toBeVisible();

    await panel.getByRole('button', { name: 'Build the evidence pack' }).click();
    await panel.getByLabel('Why is the pack needed?').fill('The police asked for it.');
    const download = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Build and download' }).click();
    expect((await download).suggestedFilename()).toMatch(/^evidence-R-\d+\.json$/);

    await panel.getByLabel(/^Authority \(/).fill('Poliția Română');
    await panel.getByLabel('Authority’s reference (optional)').fill('DOS-123');
    await panel.getByRole('button', { name: 'Log the referral' }).click();
    await expect(panel.getByText(/Poliția Română \(DOS-123\)/)).toBeVisible();
    // The case stays open for the next test's own report, so it is closed here by hand.
    runSql(
      `update public.cases set status = 'decided', decision = 'no_action', decided_at = now(),
        decided_by_user_id = '00000000-0000-4000-8000-000000000010' where id = '${caseId}'`,
    );
  });

  test('the admin moves a case into safeguarding and then no longer sees it', async ({
    browser,
  }) => {
    const caseId = await reportTeacher('harassment', 'blocker');
    const page = await openAs(browser, 'admin', `/staff/moderation/cases/${caseId}`);
    await page.getByRole('button', { name: 'Move to safeguarding' }).click();
    await page
      .getByLabel('Why does it belong in safeguarding?')
      .fill('The messages are to a child.');
    await page.getByRole('button', { name: 'Move the case' }).click();
    await expect(
      page.getByText('There is no case here, or it is not one you can see.'),
    ).toBeVisible();
    expect(runSql(`select is_safeguarding from public.cases where id = '${caseId}'`)).toBe('t');
  });

  for (const view of everyView(['/staff/moderation/cases/safeguarding'])) {
    test(`axe: a safeguarding case at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'moderator';`);
      await useSessionInBrowser(page.context(), (await signInPersona('moderator')).session);
      const caseId = runSql(
        `select id from public.cases where is_safeguarding and status = 'open' order by created_at limit 1`,
      );
      await checkScreen(page, { ...view, address: `/staff/moderation/cases/${caseId}` });
    });
  }
});
