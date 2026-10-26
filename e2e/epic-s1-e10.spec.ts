/**
 * Epic check for S1-E10, Reporting, moderation and safety (story S1-E10-QA).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * It adds no feature: it walks the epic's main journey across the March stories built so far, in
 * a real browser, with the personas the story names.
 * - Journey 1 (S1-E10-13a × S1-E10-01 × S1-E10-03a × S1-E10-06): kid_14_waiting, read-only in
 *   March, opens the Report dialog on a profile, sees the helplines for Romania above the form,
 *   reports harassment and gets a reference → the moderator finds the case in the queue (7 days,
 *   "Reporter under 18"), opens it, reads the note, suspends the account for 7 days → adult_writer
 *   sees "Your account is suspended until …" and can still read the contact page → the moderator
 *   pauses kid_14_waiting's reporting → kid_14_waiting's next report is refused in the dialog →
 *   the moderator lifts the suspension → the notice is gone.
 * - Journey 2 (S1-E10-13a × S1-E14-02 × S1-E14-04): a visitor from Great Britain reads 999 on the
 *   contact page, switches to Romania, and finds "Write to us" there.
 * The stories not built yet (S1-E10-02, 04, 05, 08, 09, 10) are listed in
 * docs/epic-reports/S1-E10.md. The axe runs for every screen of the epic live in each story's own
 * spec. Test data: seed personas only; what the journey makes is removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

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

/** Everything the journey made on adult_writer's account and kid_14_waiting's reporting. */
function cleanUp() {
  runSql(`
    delete from public.sanctions where user_id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004')
      and created_at > now() - interval '1 hour';
    delete from public.case_actions where case_id in (select id from public.cases where user_id = '00000000-0000-4000-8000-000000000001' and created_at > now() - interval '1 hour');
    delete from public.reports where case_id in (select id from public.cases where user_id = '00000000-0000-4000-8000-000000000001' and created_at > now() - interval '1 hour');
    delete from public.cases where user_id = '00000000-0000-4000-8000-000000000001' and created_at > now() - interval '1 hour';
    update public.profiles set locale = 'ro' where handle in ('kid_14_waiting', 'moderator', 'adult_writer');`);
}

test.describe('epic S1-E10 journeys', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(cleanUp);

  test('journey 1: a minor reports, the moderator decides and sanctions, the person sees why', async ({
    browser,
  }) => {
    // The seed's open case on adult_writer would swallow the report, so it goes first.
    runSql(`
      delete from public.sanctions where case_id in (select id from public.cases where user_id = '00000000-0000-4000-8000-000000000001' and status = 'open');
      delete from public.case_actions where case_id in (select id from public.cases where user_id = '00000000-0000-4000-8000-000000000001' and status = 'open');
      delete from public.reports where case_id in (select id from public.cases where user_id = '00000000-0000-4000-8000-000000000001' and status = 'open');
      delete from public.cases where user_id = '00000000-0000-4000-8000-000000000001' and status = 'open';`);

    // Step 1: kid_14_waiting reports adult_writer's profile from the Report button (S1-E10-01),
    // with the helplines above the form (S1-E10-13a).
    const kidPage = await openAs(browser, 'kid_14_waiting', '/design#report');
    await kidPage.getByRole('button', { name: 'Report @adult_writer' }).click();
    const dialog = kidPage.getByRole('dialog', { name: 'Report this profile' });
    await expect(
      dialog.getByRole('region', { name: 'Is someone in danger right now?' }),
    ).toContainText('116 111');
    await dialog.getByText('Harassment', { exact: true }).click();
    await dialog
      .getByLabel('Anything else? (optional)')
      .fill('Keeps mocking my pen name in replies.');
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(dialog.getByText('Report sent')).toBeVisible();
    const reference = /R-\d{6}/.exec(await dialog.innerText())?.[0] ?? '';
    expect(reference).toMatch(/^R-\d{6}$/);

    // Step 2: the moderator finds the case and suspends the account for 7 days (S1-E10-03a × 06).
    const modPage = await openAs(browser, 'moderator', '/staff/moderation');
    const row = modPage.getByRole('listitem').filter({ hasText: reference });
    await expect(row).toContainText('7 days');
    await expect(row).toContainText('Reporter under 18');
    await modPage.getByRole('link', { name: `Open case ${reference}` }).click();
    await expect(modPage.getByText('Keeps mocking my pen name in replies.')).toBeVisible();
    const form = modPage.getByRole('form', { name: 'Decision' });
    await form.getByRole('radio', { name: 'Suspend' }).check({ force: true });
    await form.getByLabel('For how long?').selectOption('7');
    await form.getByLabel('Note for the case log (required)').fill('Repeated mocking; 7 days.');
    await form
      .getByLabel('What we tell the person (required)')
      .fill('You kept mocking another writer in replies.');
    await form.getByRole('button', { name: 'Send decision' }).click();
    await expect(modPage.getByRole('status').getByText('Decision saved')).toBeVisible();

    // Step 3: adult_writer sees why, and still reads (S1-E10-06).
    const writerPage = await openAs(browser, 'adult_writer', '/legal/contact');
    await expect(writerPage.getByText(/Your account is suspended until/)).toBeVisible();
    await expect(
      writerPage.getByRole('heading', { name: 'Contact and company details', level: 2 }),
    ).toBeVisible();

    // Step 4: the moderator pauses kid_14_waiting's reporting; their next report is refused.
    await modPage.getByRole('button', { name: 'Pause reporting for @kid_14_waiting' }).click();
    await modPage.getByLabel('Why is reporting paused?').fill('Unfounded again and again.');
    await modPage.getByRole('button', { name: /Pause for 30 days/ }).click();
    await expect(modPage.getByText('Reporting paused.')).toBeVisible();
    await kidPage.reload();
    await kidPage.getByRole('button', { name: 'Report @adult_writer' }).click();
    await dialog.getByText('Spam', { exact: true }).click();
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(
      dialog.getByText('Your reporting is paused for now. You can still read and write.'),
    ).toBeVisible();

    // Step 5: the suspension is lifted; the notice goes.
    const panel = modPage.getByRole('region', { name: 'Reported account: sanctions' });
    await panel.getByRole('button', { name: 'Lift' }).click();
    await panel.getByLabel('Why is it lifted?').fill('Appeal upheld.');
    await panel.getByRole('button', { name: 'Lift the sanction' }).click();
    await expect(panel).toContainText('Lifted');
    await writerPage.reload();
    await expect(writerPage.getByText(/Your account is suspended until/)).toHaveCount(0);
  });

  test('journey 2: a visitor reads their country’s helplines and finds the way to write to us', async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders({ 'X-Fake-Country': 'GB' });
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.goto('/legal/contact');
    const block = page.getByRole('region', { name: 'Is someone in danger right now?' });
    await expect(block).toContainText('999');
    await block.getByRole('combobox').selectOption('RO');
    await expect(block).toContainText('112');
    await page.getByRole('link', { name: 'Write to us' }).click();
    await expect(page.getByRole('heading', { name: 'Write to us' })).toBeVisible();
  });
});
