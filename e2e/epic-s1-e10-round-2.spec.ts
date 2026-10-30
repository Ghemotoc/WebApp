/**
 * Epic check for S1-E10, round two: the stories of bundle SAFE-4 working together with the ones
 * before them (story S1-E10-QA).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * It adds no feature: it walks one journey across S1-E10-01, 03a, 03b, 04, 06, 07 and 11 in a real
 * browser, with the personas the stories name.
 * - blocker reports adult_writer's story → the moderator finds the case by searching the queue,
 *   claims it (the queue then shows "Claimed by you") and hides the story with words for the writer
 *   → adult_writer reads the statement on My reports and decisions and appeals → an admin, not the
 *   moderator who decided, changes the decision → the story is visible again and adult_writer
 *   reads "changed the decision" → adult_writer asks the moderators a question from the statement
 *   and the decision's reference travels with it.
 * Picture checks (S1-E10-05), rate limits (S1-E10-12) and the safety contacts' editing screen
 * (S1-E10-13b) have their own specs; docs/epic-reports/S1-E10.md lists them. Test data: seed
 * personas only; what the journey makes is removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** adult_writer and their seeded story, Stația meteo. */
const writerId = '00000000-0000-4000-8000-000000000001';
const storyId = '00000000-0000-4000-9000-000000000001';

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

/** Everything the journey made: the case, its statement and appeal, the mail and notifications. */
function cleanUp() {
  runSql(`
    update public.stories set first_published_at = null where id = '${storyId}';
    -- A picture-check case (picture-check.spec.ts) may also sit on adult_writer's account.
    update public.picture_checks set case_id = null where user_id = '${writerId}';
    delete from public.notifications where user_id = '${writerId}' and created_at > now() - interval '1 hour';
    delete from public.moderator_mail_messages where thread_id in (select id from public.moderator_mail_threads where user_id = '${writerId}');
    delete from public.moderator_mail_threads where user_id = '${writerId}';
    delete from public.appeals where user_id = '${writerId}';
    delete from public.moderated_items where item_id = '${storyId}';
    delete from public.case_actions where case_id in (select id from public.cases where user_id = '${writerId}' and created_at > now() - interval '1 hour');
    delete from public.reports where case_id in (select id from public.cases where user_id = '${writerId}' and created_at > now() - interval '1 hour');
    delete from public.cases where user_id = '${writerId}' and created_at > now() - interval '1 hour';
    delete from public.rate_limit_events where user_id = '${writerId}';
    update public.profiles set locale = 'ro' where handle in ('moderator', 'admin', 'adult_writer');`);
}

test.describe('epic S1-E10, round two', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(cleanUp);

  test('report, claim, hide, appeal, change the decision and ask the moderators', async ({
    browser,
  }) => {
    // Step 1: the seeded story is a draft, so publish it for the journey; blocker reports it.
    runSql(`update public.stories set first_published_at = now() where id = '${storyId}';`);
    const { client: reporter } = await signInPersona('blocker');
    const reported = await reporter.rpc('report_item', {
      item_type: 'story',
      item_reference: storyId,
      reason: 'spam',
      details: 'e2e epic round two',
    });
    expect(reported.error).toBeNull();
    const caseReference = runSql(
      `select reference from public.cases where user_id = '${writerId}' and status = 'open' order by created_at desc limit 1`,
    );

    // Step 2: the moderator searches the queue, opens the case and claims it.
    const modPage = await openAs(browser, 'moderator', '/staff/moderation');
    await modPage.getByLabel('Search cases').fill(caseReference);
    await modPage.getByRole('link', { name: new RegExp(caseReference) }).click();
    await modPage.getByRole('button', { name: 'Claim this case' }).click();
    await expect(modPage.getByText('You have claimed this case.', { exact: false })).toBeVisible();

    // Step 3: the moderator hides the story, with the words the writer will read.
    const form = modPage.getByRole('form', { name: 'Decision' });
    await form.getByRole('radio', { name: 'Hide' }).check({ force: true });
    await form.getByLabel('Note for the case log (required)').fill('Looks like an advert.');
    await form
      .getByLabel('What we tell the person (required)')
      .fill('Your story reads as an advert.');
    await form.getByRole('button', { name: 'Send decision' }).click();
    await expect(modPage.getByRole('region', { name: 'Statement of reasons' })).toBeVisible();

    // Step 4: adult_writer appeals from My reports and decisions.
    const writerPage = await openAs(browser, 'adult_writer', '/my-reports');
    const decision = writerPage
      .getByRole('article')
      .filter({ hasText: 'Your story reads as an advert.' });
    await decision.getByRole('button', { name: 'Appeal this decision' }).click();
    await decision
      .getByLabel('Why is this decision wrong?')
      .fill('It is a story about a weather station.');
    await decision.getByRole('button', { name: 'Send the appeal' }).click();
    await expect(decision.getByText(/A moderator is looking at it/)).toBeVisible();

    // Step 5: an admin changes the decision; the story is visible again.
    const appealId = runSql(
      `select id from public.appeals where user_id = '${writerId}' and status = 'open'`,
    );
    const { client: admin } = await signInPersona('admin');
    const decided = await admin.rpc('admin_decide_appeal', {
      target_appeal_id: appealId,
      outcome: 'overturned',
      note_text: 'Fiction, not an advert.',
      message_to_person: 'We read it again: it is fiction, so we showed your story again.',
    });
    expect(decided.error).toBeNull();
    expect(runSql(`select public.is_moderated_away('story', '${storyId}')`)).toBe('f');
    await writerPage.reload();
    await expect(writerPage.getByText(/and changed the decision/).first()).toBeVisible();

    // Step 6: adult_writer asks the moderators a question; the decision's reference goes with it.
    await decision.getByRole('link', { name: 'Ask the moderators a question' }).click();
    await expect(writerPage).toHaveURL(/\/moderator-mail\/new\?decision=S-\d{6}/);
    await expect(writerPage.getByText(/About decision S-\d{6}/)).toBeVisible();
  });
});
