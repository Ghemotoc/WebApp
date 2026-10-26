/**
 * Removal orders and the on-call rota in a real browser (story S1-E10-09; Regulation (EU)
 * 2021/784).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - an order's alert names who is on call (the seed's owner), and Acknowledge on the queue
 *   records it (criteria 1 and 2);
 * - Emergency disable on the case takes the item down everywhere in one action, keeps it six
 *   months and fills in the timeline (criteria 3 and 4); the uploader gets a statement (5);
 * - /staff/on-call shows who is on call now; the owner adds and removes a shift; a moderator sees
 *   the rota but can't change it;
 * - /staff/on-call passes axe at 390, 768 and 1440 px.
 * Test data: an order case on the teacher persona's profile, made here and removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The teacher persona: the uploader the order is about. */
const teacherId = '00000000-0000-4000-8000-000000000007';
/** This run's order reference. */
const reference = `TCO-E${String(Date.now()).slice(-6)}`;

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

/** A date-and-time field's value, some days from now. */
function localTimeInDays(days: number, hour: number): string {
  const when = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  when.setHours(hour, 0, 0, 0);
  const twoDigits = (value: number) => String(value).padStart(2, '0');
  return `${when.getFullYear()}-${twoDigits(when.getMonth() + 1)}-${twoDigits(when.getDate())}T${twoDigits(hour)}:00`;
}

test.describe('removal orders (S1-E10-09)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    // An order as the public form makes one (S1-E10-02), with its alert; the trigger names who
    // is on call.
    runSql(`
      with order_case as (
        insert into public.cases (reference, user_id, item_type, item_id, source, tier, deadline_at)
        values ('${reference}', '${teacherId}', 'profile', '${teacherId}', 'authority_order', 'one_hour', now() + interval '1 hour')
        returning id)
      insert into public.on_call_alerts (kind, case_id) select 'removal_order', id from order_case;`);
  });
  test.afterAll(() => {
    runSql(`
      delete from public.on_call_alerts where case_id in (select id from public.cases where user_id = '${teacherId}');
      delete from public.notifications where case_id in (select id from public.cases where user_id = '${teacherId}');
      delete from public.moderated_items where user_id = '${teacherId}';
      delete from public.case_actions where case_id in (select id from public.cases where user_id = '${teacherId}');
      delete from public.cases where user_id = '${teacherId}';
      delete from public.on_call_rota where starts_at > now() + interval '35 days';
      update public.profiles set locale = 'ro' where handle in ('owner', 'moderator', 'teacher');`);
  });

  test('the owner on call acknowledges the alert on the queue', async ({ browser }) => {
    const page = await openAs(browser, 'owner', '/staff/moderation');
    const alert = page.getByRole('listitem').filter({ hasText: `Open case ${reference}` });
    await expect(alert).toContainText('On call: @owner.');
    await alert.getByRole('button', { name: 'Acknowledge' }).click();
    await expect(alert).toContainText('Acknowledged');
  });

  test('Emergency disable takes the item down, keeps it and tells the uploader', async ({
    browser,
  }) => {
    const caseId = runSql(`select id from public.cases where reference = '${reference}'`);
    const page = await openAs(browser, 'owner', `/staff/moderation/cases/${caseId}`);
    const panel = page.getByRole('region', { name: 'Removal order' });
    await panel
      .getByLabel('Note for the case log (required)')
      .fill('Checked the order and the profile.');
    await panel
      .getByLabel('What we tell the uploader (required)')
      .fill('A removal order from the police named your profile.');
    await panel.getByRole('button', { name: 'Emergency disable' }).click();
    await expect(page.getByText(/Taken down everywhere/)).toBeVisible();
    expect(runSql(`select public.is_moderated_away('profile', '${teacherId}')`)).toBe('t');
    expect(
      runSql(
        `select preserve_until > now() + interval '5 months' from public.cases where id = '${caseId}'`,
      ),
    ).toBe('t');

    const teacherPage = await openAs(browser, 'teacher', '/my-reports');
    await expect(
      teacherPage.getByText('A removal order from the police named your profile.'),
    ).toBeVisible();
  });

  test('the owner adds and removes a shift; a moderator only reads the rota', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'owner', '/staff/on-call');
    await expect(page.getByText('On call now: @owner.')).toBeVisible();
    const form = page.getByRole('form', { name: 'Add a shift' });
    await form.getByLabel('Who', { exact: true }).selectOption({ label: '@owner' });
    await form.getByLabel('From', { exact: true }).fill(localTimeInDays(40, 9));
    await form.getByLabel('Until', { exact: true }).fill(localTimeInDays(41, 9));
    await form.getByLabel('Why (required)').fill('Cover for the weekend.');
    await form.getByRole('button', { name: 'Add the shift' }).click();
    const shifts = page.getByRole('region', { name: 'Shifts' });
    await expect(shifts.getByRole('listitem')).toHaveCount(2);
    await shifts.getByRole('button', { name: 'Remove the shift for @owner' }).last().click();
    await shifts.getByLabel('Why is the shift removed?').fill('Plans changed.');
    await shifts.getByRole('button', { name: 'Remove the shift', exact: true }).click();
    await expect(shifts.getByRole('listitem')).toHaveCount(1);

    const moderatorPage = await openAs(browser, 'moderator', '/staff/on-call');
    await expect(moderatorPage.getByText('On call now: @owner.')).toBeVisible();
    await expect(moderatorPage.getByRole('form', { name: 'Add a shift' })).toHaveCount(0);
  });

  for (const view of everyView(['/staff/on-call'])) {
    test(`axe: the on-call rota at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'owner';`);
      await useSessionInBrowser(page.context(), (await signInPersona('owner')).session);
      await checkScreen(page, view);
    });
  }
});
