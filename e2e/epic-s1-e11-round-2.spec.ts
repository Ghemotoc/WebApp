/**
 * Epic check for S1-E11, round two: the admin stories of bundle ADMIN-2 working together with the
 * ones before them (story S1-E11-QA).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * It adds no feature: it walks one journey across S1-E11-13, S1-E10-02, S1-E10-03a, S1-E11-07,
 * S1-E11-08 and S1-E11-09 in a real browser, with the personas the stories name.
 * - blocker asks for help: someone's story copies theirs → support answers with a canned reply
 *   and converts the ticket into a report on adult_writer's story → the moderator finds the case
 *   in the queue, then finds the story in Stories and restricts it with a reason → adult_writer reads
 *   the statement of reasons → blocker asks for a copy of their data on the same ticket and support opens a data
 *   request from it, which opens on its own page.
 * Each story's own screens are checked at every width in its own spec; docs/epic-reports/S1-E11.md
 * lists them. Test data: seed personas only; what the journey makes is removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** adult_writer's seeded story, Stația meteo, and blocker, who writes to support. */
const storyId = '00000000-0000-4000-9000-000000000001';
const blockerId = '00000000-0000-4000-8000-000000000015';

/** Makes this run's subject unique, so a rerun finds its own ticket. */
const subject = `This story copies mine ${Date.now().toString(36)}`;

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

/** Fills the reason of one story form: the reason from the list and a few words. */
async function giveReason(page: Page, idPrefix: string, label: string, words: string) {
  await page.locator(`#${idPrefix}-reason-code`).selectOption({ label });
  await page.locator(`#${idPrefix}-reason-text`).fill(words);
}

/** Everything the journey made: the ticket, notice, case, request, story changes and chapter. */
function cleanUp() {
  runSql(`
    delete from public.data_requests where support_ticket_id in
      (select id from public.support_tickets where subject = '${subject}');
    delete from public.public_notices where support_ticket_id in
      (select id from public.support_tickets where subject = '${subject}');
    delete from public.support_tickets where subject = '${subject}';
    delete from public.notifications where story_id = '${storyId}';
    delete from public.statements_of_reasons where story_id = '${storyId}';
    delete from public.story_revisions where story_id = '${storyId}';
    delete from public.story_restrictions where story_id = '${storyId}';
    delete from public.case_actions where case_id in
      (select id from public.cases where item_id = '${storyId}' and created_at > now() - interval '1 hour');
    delete from public.cases where item_id = '${storyId}' and created_at > now() - interval '1 hour';
    delete from public.chapters where code = 'epice11r';
    update public.stories set first_published_at = null, last_chapter_published_at = null where id = '${storyId}';
    delete from public.rate_limit_events where user_id = '${blockerId}';
    update public.profiles set locale = 'ro'
      where handle in ('blocker', 'support', 'moderator', 'adult_writer');`);
}

test.describe('epic S1-E11, round two', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    // The seeded story is a draft: give it a published chapter, so its address is public.
    runSql(`
      insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
        word_count, status, published_title, published_body, published_word_count, first_published_at)
      values ('${storyId}', '00000000-0000-4000-8000-000000000001', 'epice11r', 1, 'Unu', 'x', 1,
        'published', 'Unu', 'Text.', 1, now());
      update public.stories set first_published_at = now(), last_chapter_published_at = now()
        where id = '${storyId}';`);
  });
  test.afterAll(cleanUp);

  test('a support ticket becomes a report, a story change and a data request', async ({
    browser,
  }) => {
    // Step 1: blocker asks for help from Your support requests.
    const member = await openAs(browser, 'blocker', '/support');
    await member.getByRole('link', { name: 'Ask for help' }).click();
    await member.getByLabel('What is it about?').selectOption({ label: 'A safety question' });
    await member.getByLabel('Subject').fill(subject);
    await member.getByLabel('Message').fill('Stația meteo copies my poem word for word.');
    await member.getByRole('button', { name: 'Send' }).click();
    await expect(member.getByText(/Sent\. Your request is #\d+/)).toBeVisible();
    const number = runSql(`select number from public.support_tickets where subject = '${subject}'`);

    // Step 2: support answers with a canned reply.
    const support = await openAs(browser, 'support', `/staff/support/${number}`);
    await support
      .getByLabel('Canned reply')
      .selectOption({ label: 'Thanks, we’re looking into it' });
    await support.getByRole('button', { name: 'Insert' }).click();
    await support.getByRole('button', { name: 'Send answer' }).click();
    const history = support.getByRole('region', { name: 'History' });
    await expect(history.getByText(/Waiting for an answer from you/)).toBeVisible();

    // Step 3: support converts the ticket into a report on the story.
    await support
      .getByLabel('Address of what is reported (optional)')
      .fill('/s/statia-meteo-seed01');
    await support.getByLabel('Reason').selectOption('copyright');
    await support
      .getByLabel('What the ticket says is wrong')
      .fill('The person says the story copies their poem.');
    await support.getByRole('button', { name: 'Convert to report' }).click();
    await expect(support.getByText(/it’s in the moderation queue/)).toBeVisible();

    // Step 4: the moderator finds the case in the queue.
    const caseReference = runSql(`
      select cases.reference from public.cases
      join public.public_notices on public_notices.case_id = cases.id
      join public.support_tickets on support_tickets.id = public_notices.support_ticket_id
      where support_tickets.subject = '${subject}'`);
    const moderator = await openAs(browser, 'moderator', '/staff/moderation');
    await moderator.getByLabel('Search cases').fill(caseReference);
    await expect(moderator.getByRole('link', { name: new RegExp(caseReference) })).toBeVisible();

    // Step 5: the moderator finds the story in Stories and restricts it with a reason.
    await moderator.goto('/staff/stories');
    await moderator.getByLabel('Title, username or user ID').fill('meteo');
    await moderator.getByRole('button', { name: 'Search', exact: true }).click();
    await moderator.getByRole('link', { name: 'Stația meteo' }).first().click();
    const visibility = moderator.getByRole('radiogroup', { name: 'Who can find this story' });
    await visibility.getByRole('radio', { name: 'Restricted' }).click();
    await giveReason(
      moderator,
      'story-visibility',
      'Something else',
      'Checking a copyright notice.',
    );
    await moderator.getByRole('button', { name: 'Save who can find it' }).click();
    await expect(
      moderator.getByText('Saved. The writer has been told what changed and why.'),
    ).toBeVisible();
    // A restriction is a statement of reasons (DSA art. 17), read under My reports and decisions.
    const writer = await openAs(browser, 'adult_writer', '/my-reports');
    await expect(
      writer.getByRole('article').filter({ hasText: 'Checking a copyright notice.' }),
    ).toBeVisible();

    // Step 6: support opens a data request from the same ticket and follows it to its page.
    await support.getByLabel('What the person asks for').selectOption('copy');
    await support.getByRole('button', { name: 'Open data request' }).click();
    await support
      .getByRole('list', { name: 'Started from this ticket' })
      .getByRole('link', { name: /Data request D-\d{6}/ })
      .click();
    await expect(
      support.getByRole('heading', { level: 1, name: /Data request D-\d{6}/ }),
    ).toBeVisible();
  });
});
