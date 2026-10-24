/**
 * The moderation queue and the case page in a real browser (story S1-E10-03a).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a report made by a member (adult_writer, through report_item() as the app calls it) shows up
 *   for the moderator as a 7-day case with its deadline, most urgent cases first;
 * - the moderator opens the case, reads the reporter's note, and decides with an action and a
 *   note; the case is then decided and leaves the open queue; the decision is in the audit log;
 * - a decision without a note is refused in plain words;
 * - the admin persona, who has no safeguarding permission, doesn't see the safeguarding cases the
 *   moderator sees (decided 23 Oct 2026, Q6);
 * - support and the content editor are refused; a member sees "This part is for staff";
 * - the queue and a case page pass axe and don't scroll sideways at 390, 768 and 1440 px.
 * Test data: seed personas and the seeded cases; the report made here is removed afterwards.
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
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The ID of the seeded removal order, for the case page's axe views. */
function orderCaseId(): string {
  return runSql(`select id from public.cases where reference = 'TCO-0001'`);
}

test.describe('moderation queue (S1-E10-03a)', () => {
  test.describe.configure({ mode: 'serial' });
  /** The reference of the report adult_writer makes, so the case can be found and removed. */
  let reference = '';

  test.afterAll(() => {
    runSql(`
      delete from public.sanctions where case_id in (select id from public.cases where reference = '${reference}');
      delete from public.case_actions where case_id in (select id from public.cases where reference = '${reference}');
      delete from public.reports where reference = '${reference}';
      delete from public.cases where reference = '${reference}';
      update public.profiles set locale = 'ro'
        where handle in ('owner', 'admin', 'moderator', 'support', 'editor', 'adult_writer');`);
  });

  test('a member reports a profile and the moderator sees a 7-day case', async ({ browser }) => {
    // adult_writer reports the teacher's profile, the way the Report button does.
    const { client } = await signInPersona('adult_writer');
    const { data, error } = await client.rpc('report_item', {
      item_type: 'profile',
      item_reference: 'teacher',
      reason: 'spam',
      details: 'The bio is one long advert for an essay-writing service.',
    });
    expect(error).toBeNull();
    reference = data?.[0]?.report_reference ?? '';
    expect(reference).toMatch(/^R-\d{6}$/);

    const page = await openAs(browser, 'moderator', '/staff/moderation');
    await expect(page.getByRole('heading', { name: 'Report queue' })).toBeVisible();
    // The tier cards and the list, most urgent first: the removal order comes before everything.
    const tierCards = page.getByRole('list', { name: 'Open cases by tier' });
    await expect(tierCards).toContainText('1 hour');
    await expect(tierCards).toContainText('Open: 1');
    const links = await page.getByRole('link', { name: /^Open case / }).allInnerTexts();
    expect(links[0]).toBe('TCO-0001');
    expect(links).toContain(reference);

    const row = page.getByRole('listitem').filter({ hasText: reference });
    await expect(row).toContainText('7 days');
    await expect(row).toContainText('6 d 23 h left');
    await expect(row).toContainText('Spam');
    await expect(row).toContainText('@teacher');
    await expect(row).toContainText('Reports: 1');
    await expect(row).toContainText('Adult reporters');
  });

  test('the moderator decides the case with an action and a note', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/moderation');
    await page.getByRole('link', { name: `Open case ${reference}` }).click();
    await expect(page.getByRole('heading', { name: `Case ${reference}` })).toBeVisible();
    await expect(
      page.getByText('The bio is one long advert for an essay-writing service.'),
    ).toBeVisible();
    await expect(page.getByText(`${reference} · @adult_writer, adult`)).toBeVisible();

    // Sending without an action, then without a note, is refused in plain words.
    const form = page.getByRole('form', { name: 'Decision' });
    await form.getByRole('button', { name: 'Send decision' }).click();
    await expect(form.getByText('Choose an action first.')).toBeVisible();
    await form.getByRole('radio', { name: 'Warn' }).check({ force: true });
    await form.getByRole('button', { name: 'Send decision' }).click();
    await expect(form.getByText('Write a note to send the decision.')).toBeVisible();

    await form
      .getByLabel('Note for the case log (required)')
      .fill('Looked at the bio: an advert for a paid service. First warning.');
    await form.getByRole('button', { name: 'Send decision' }).click();
    await expect(page.getByRole('status').getByText('Decision saved')).toBeVisible();
    await expect(page.getByText(/This case is decided: Warn/)).toBeVisible();
    await expect(page.getByText(/Warn · @moderator · /)).toBeVisible();

    // The case has left the open queue, and the decision is in the audit log.
    await page.getByRole('link', { name: 'Back to the queue' }).click();
    await expect(page.getByRole('heading', { name: 'Report queue' })).toBeVisible();
    await expect(page.getByRole('link', { name: `Open case ${reference}` })).toHaveCount(0);
    expect(
      runSql(`select count(*) from public.audit_log where action = 'case.decided'
        and target_id = (select id::text from public.cases where reference = '${reference}')`),
    ).toBe('1');
  });

  test('the admin, without the safeguarding permission, sees no safeguarding case', async ({
    browser,
  }) => {
    const moderatorPage = await openAs(browser, 'moderator', '/staff/moderation');
    await expect(moderatorPage.getByRole('link', { name: 'Open case P-0001' })).toBeVisible();
    await expect(moderatorPage.getByText('Safeguarding').first()).toBeVisible();

    const adminPage = await openAs(browser, 'admin', '/staff/moderation');
    await expect(adminPage.getByRole('heading', { name: 'Report queue' })).toBeVisible();
    await expect(adminPage.getByRole('link', { name: 'Open case TCO-0001' })).toBeVisible();
    await expect(adminPage.getByRole('link', { name: 'Open case P-0001' })).toHaveCount(0);
    await expect(adminPage.getByText('Safeguarding')).toHaveCount(0);

    // Opening a safeguarding case by its address gives the admin nothing either.
    const safeguardingId = runSql(`select id from public.cases where reference = 'P-0001'`);
    await adminPage.goto(`/staff/moderation/cases/${safeguardingId}`);
    await expect(
      adminPage.getByText('There is no case here, or it is not one you can see.'),
    ).toBeVisible();
  });

  test('support, the content editor and a member are refused', async ({ browser }) => {
    const supportPage = await openAs(browser, 'support', '/staff/moderation');
    await expect(supportPage.getByText('Only moderation staff can see the queue.')).toBeVisible();
    const editorPage = await openAs(browser, 'editor', `/staff/moderation/cases/${orderCaseId()}`);
    await expect(editorPage.getByText('Only moderation staff can open a case.')).toBeVisible();
    const memberPage = await openAs(browser, 'adult_writer', '/staff/moderation');
    await expect(memberPage.getByRole('heading', { name: 'This part is for staff' })).toBeVisible();
  });

  for (const view of everyView(['/staff/moderation', '/staff/moderation/cases/order'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's language wins over the browser's (S1-E1-04), and earlier tests here set it
      // to English, so it is set to the view's language first (no race between the two).
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'moderator';`);
      await useSessionInBrowser(page.context(), (await signInPersona('moderator')).session);
      const address = view.address.replace('/cases/order', `/cases/${orderCaseId()}`);
      await checkScreen(page, { ...view, address });
    });
  }
});
