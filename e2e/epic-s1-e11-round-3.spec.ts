/**
 * Epic check for S1-E11, round three: landing pages and contests working with the stories before
 * them (story S1-E11-QA; bundle CONTESTS-13b2d).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * It adds no feature: it walks one journey across S1-E11-14, S1-E11-15, S1-E10-04, S1-E10-07 and
 * S1-E8-12 in a real browser, with the personas the stories name.
 * - adult_writer enters a story in an open contest from the story's settings → an admin
 *   disqualifies the entry with a reason → the writer appeals from the card's link → a moderator
 *   overturns the appeal and the card shows the entry again → entries close; the admin chooses the
 *   winner, publishes the results and issues certificates → a signed-out visitor sees the winner on
 *   the landing page → the writer opens the certificate, and the visitor checks its code.
 * Each story's own screens are checked at every width in its own spec; docs/epic-reports/S1-E11.md
 * lists them. Test data: seed personas; the contest, its landing page and one chapter are made by
 * SQL and removed afterwards (the audit log keeps its rows).
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The landing page's address and the contest's English name. */
const pageSlug = 'concurs-epic-e2e';
const contestName = 'The epic journey contest';

/** The facts the admin writes, which the writer reads on the decision. */
const facts = 'The story was posted elsewhere before the contest opened.';

/** The writer's appeal, which the moderator's queue shows. */
const appealText = 'It was only a private draft.';

/** The contest's rows, from its landing page. */
const contestOfPage = `(select contests.id from public.contests join public.landing_pages
  on landing_pages.id = contests.landing_page_id where landing_pages.slug = '${pageSlug}')`;

/** Removes everything the journey made, in an order the foreign keys accept. */
const cleanUpSql = `
  delete from public.notifications where kind = 'certificate_issued' and landing_page_id in (
    select id from public.landing_pages where slug = '${pageSlug}');
  delete from public.certificates where contest_id in ${contestOfPage};
  delete from public.notifications where appeal_id in (select appeals.id from public.appeals
    join public.statements_of_reasons on statements_of_reasons.id = appeals.statement_id
    where statements_of_reasons.facts = '${facts}');
  delete from public.appeals where statement_id in (
    select id from public.statements_of_reasons where facts = '${facts}');
  delete from public.notifications where statement_id in (
    select id from public.statements_of_reasons where facts = '${facts}');
  delete from public.contest_entries where contest_id in ${contestOfPage};
  delete from public.statements_of_reasons where facts = '${facts}';
  delete from public.contests where landing_page_id in (select id from public.landing_pages where slug = '${pageSlug}');
  delete from public.landing_page_versions where page_id in (select id from public.landing_pages where slug = '${pageSlug}');
  delete from public.landing_pages where slug = '${pageSlug}';
  delete from public.chapters where code = 'epe11c01';`;

/** A live landing page with an open contest for adults in Romania, and a published chapter. */
const setUpSql = `
  with page as (
    insert into public.landing_pages (slug, page_type) values ('${pageSlug}', 'contest') returning id
  ), version as (
    insert into public.landing_page_versions (page_id, status, content, show_from, published_at)
    select page.id, 'published', jsonb_build_object('theme', 'gold', 'blocks', jsonb_build_array(
      '{"id": "h", "kind": "hero", "ro": {"title": "Concursul călătoriei", "intro": ""}, "en": {"title": "${contestName}", "intro": ""}}'::jsonb)),
      public.romania_today(), now()
    from page
    returning page_id
  )
  insert into public.contests (landing_page_id, name_ro, name_en, entries_open_on, entries_close_on, results_on,
    age_groups, market_codes, language_codes, opened_at)
  select version.page_id, 'Concursul călătoriei', '${contestName}', public.romania_today() - 1,
    public.romania_today() + 5, public.romania_today() + 10, array['18_plus'], array['RO'], array['ro'], now()
  from version;
  insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
    status, published_title, published_body, published_word_count, first_published_at)
  values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'epe11c01',
    1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 800, now());`;

/**
 * Opens an address in English, as a persona or signed out.
 *
 * @param browser - Playwright's browser
 * @param persona - the seed persona, or null for a signed-out visitor
 * @param address - where to go
 * @returns the page
 */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    // The profile's language wins over the browser's, so set it first.
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/**
 * The admin opens the contest's page in Staff › Contests.
 *
 * @param browser - Playwright's browser
 * @returns the admin's page on the contest
 */
async function openContestAsAdmin(browser: Browser): Promise<Page> {
  const admin = await openAs(browser, 'admin', '/staff/contests');
  await admin.getByRole('link', { name: contestName }).click();
  return admin;
}

test.describe('Epic S1-E11, round three: landing pages and contests', () => {
  test.beforeAll(() => runSql(`${cleanUpSql}${setUpSql}`));
  test.afterAll(() => {
    runSql(`${cleanUpSql}
      update public.profiles set locale = 'ro' where handle in ('admin', 'moderator', 'adult_writer');`);
  });

  test('an entry is disqualified, put back on appeal, wins and gets a certificate anyone can check', async ({
    browser,
  }) => {
    // Step 1: the writer enters the story from its settings (S1-E11-15).
    const writer = await openAs(browser, 'adult_writer', '/write/s/statia-meteo-seed01/settings');
    await writer.getByRole('button', { name: `Enter ${contestName}` }).click();
    await expect(writer.getByText('This story is entered.')).toBeVisible();

    // Step 2: an admin disqualifies it with a reason (S1-E11-15 × S1-E10-04).
    const admin = await openContestAsAdmin(browser);
    const entries = admin.getByRole('region', { name: 'Entries' });
    await entries.getByRole('button', { name: /^Disqualify .+’s entry$/ }).click();
    await admin.getByLabel('Why the entry breaks the rules').fill(facts);
    await admin.getByRole('button', { name: 'Disqualify', exact: true }).click();
    await expect(entries.getByRole('cell', { name: /^Disqualified \(S-\d{6}\)$/ })).toBeVisible();
    await admin.context().close();

    // Step 3: the writer follows the card to the decision and appeals (S1-E10-07).
    await writer.reload();
    await writer.getByRole('link', { name: 'Read the decision and appeal' }).click();
    const decision = writer.getByRole('article').filter({ hasText: facts });
    await decision.getByRole('button', { name: 'Appeal this decision' }).click();
    await decision.getByLabel('Why is this decision wrong?').fill(appealText);
    await decision.getByRole('button', { name: 'Send the appeal' }).click();
    await expect(decision.getByText(/A moderator is looking at it/)).toBeVisible();

    // Step 4: a moderator, not the admin who decided, overturns it; the entry is back.
    const moderator = await openAs(browser, 'moderator', '/staff/appeals');
    const card = moderator.getByRole('listitem').filter({ hasText: appealText });
    await card.getByRole('radio', { name: 'Change the decision' }).check({ force: true });
    await card.getByLabel('Note for the team').fill('Only a private draft existed.');
    await card.getByLabel('What we tell the person').fill('Your entry is back in the contest.');
    await card.getByRole('button', { name: 'Send the decision' }).click();
    await expect(card).toHaveCount(0);
    await moderator.context().close();
    await writer.goto('/write/s/statia-meteo-seed01/settings');
    await expect(writer.getByText('This story is entered.')).toBeVisible();

    // Step 5: entries close; the admin picks the winner, publishes and issues certificates.
    runSql(`update public.contests set entries_close_on = public.romania_today() - 1
      where id in ${contestOfPage};`);
    const judge = await openContestAsAdmin(browser);
    await judge.getByLabel(/^Placing for /).selectOption('winner');
    await expect(judge.getByText('Placing saved.')).toBeVisible();
    await judge.getByRole('button', { name: 'Publish results' }).click();
    await expect(judge.getByText('The results are published on the landing page.')).toBeVisible();
    await judge.getByRole('button', { name: 'Issue certificates' }).click();
    await expect(judge.getByText('1 certificate issued or updated.')).toBeVisible();
    await judge.context().close();

    // Step 6: a signed-out visitor sees the winner on the landing page (S1-E11-14).
    const visitor = await openAs(browser, null, `/c/${pageSlug}`);
    await expect(visitor.getByRole('heading', { level: 3, name: 'Winners' })).toBeVisible();
    await expect(
      visitor.getByRole('region', { name: 'Results' }).locator('a[href="/s/statia-meteo-seed01"]'),
    ).toBeVisible();

    // Step 7: the writer opens the certificate; the visitor checks its code (S1-E8-12).
    await writer.goto('/certificates');
    await writer.getByRole('link', { name: `Open “${contestName}”` }).click();
    await expect(
      writer.getByText(`for winning the writing contest “${contestName}”.`),
    ).toBeVisible();
    const code = runSql(
      `select code from public.certificates where contest_id in ${contestOfPage};`,
    ).trim();
    await expect(writer.getByText(code).first()).toBeVisible();
    await visitor.goto(`/verify?code=${code}`);
    await expect(visitor.getByText('This certificate is valid.')).toBeVisible();
    await expect(visitor.getByText(contestName)).toBeVisible();
    await visitor.context().close();
    await writer.context().close();
  });
});
