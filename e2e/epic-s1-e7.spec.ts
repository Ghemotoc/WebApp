/**
 * Epic check for S1-E7, notifications (story S1-E7-QA).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * It adds no feature: it walks the epic's main journeys in a real browser, where S1-E7-01 meets
 * the stories that feed it.
 * - Journey 1, a follow and a comment (S1-E6-05 × S1-E6-01 × S1-E7-01): teacher follows
 *   adult_writer and comments on their chapter in the browser; the writer's Notifications page
 *   says both.
 * - Journey 2, a new chapter (S1-E3-03 × S1-E7-01): the writer publishes chapter 2; teacher's bell
 *   counts it and "Read now" opens it; teen_17, who follows the writer in the seed, is told too.
 * - Journey 3, ratings (S1-E3-06 × S1-E7-01): the story becomes 16+, and kid_14_ok and
 *   kid_14_waiting, who follow the story, aren't shown the chapter; teen_17 still is.
 * - Journey 4, blocks (S1-E5-05 × S1-E7-01): pending_check follows the writer and is then blocked:
 *   the writer's page never names pending_check.
 * - Journey 5, the Notifications page at 390, 768 and 1440 px, at night, in Romanian (the story's
 *   own spec covers the other views).
 * The database half is supabase/tests/database/097-epic-s1-e7.test.sql.
 * Test data: seed personas; a story of the spec's own, removed after with what points at it, and
 * the personas' language put back.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY, screenWidths } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const slug = 'epic-seven-story';

/** The personas' user IDs (supabase/seed.sql). Used only in SQL, never on screen. */
const personaIds: Partial<Record<SignInPersonaName, string>> = {
  adult_writer: '00000000-0000-4000-8000-000000000001',
  teen_17: '00000000-0000-4000-8000-000000000002',
  kid_14_ok: '00000000-0000-4000-8000-000000000003',
  kid_14_waiting: '00000000-0000-4000-8000-000000000004',
  pending_check: '00000000-0000-4000-8000-000000000005',
  teacher: '00000000-0000-4000-8000-000000000007',
};

/** Every persona this spec signs in as, quoted for SQL. */
const quotedIds = Object.values(personaIds)
  .map((id) => `'${id}'`)
  .join(', ');

/** Removes the spec's story, the follows and block it made, and the notifications they caused. */
function cleanUp() {
  runSql(`delete from public.blocks where user_id = '${personaIds.adult_writer}' and blocked_user_id = '${personaIds.pending_check}';
    delete from public.follows_users where followed_user_id = '${personaIds.adult_writer}'
      and user_id in ('${personaIds.teacher}', '${personaIds.pending_check}');
    delete from public.follows_stories where story_id in (select id from public.stories where slug = '${slug}');
    delete from public.notifications where story_id in (select id from public.stories where slug = '${slug}');
    delete from public.notifications where kind = 'new_follower' and user_id = '${personaIds.adult_writer}';
    delete from public.comments where chapter_id in (select id from public.chapters where code in ('epicsev1', 'epicsev2'));
    delete from public.chapters where code in ('epicsev1', 'epicsev2');
    delete from public.stories where slug = '${slug}';
    update public.profiles set locale = 'ro' where id in (${quotedIds});`);
}

/** adult_writer's story: chapter 1 published, chapter 2 a draft; the two children follow the story. */
function seedStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating,
      first_published_at, last_chapter_published_at)
    values ('${personaIds.adult_writer}', '${slug}', 'Epica șapte', 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'epicsev1', 1, 'Unu', 'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now()
    from public.stories where slug = '${slug}';
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count, status)
    select id, user_id, 'epicsev2', 2, 'Doi', 'Al doilea capitol.', 3, 'draft'
    from public.stories where slug = '${slug}';
    insert into public.follows_stories (user_id, story_id)
    select persona.id, stories.id from public.stories,
      (values ('${personaIds.kid_14_ok}'::uuid), ('${personaIds.kid_14_waiting}'::uuid)) as persona(id)
    where stories.slug = '${slug}';`);
}

/** Opens a page as a persona, in a language. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
  language: 'en' | 'ro' = 'en',
): Promise<Page> {
  runSql(
    `update public.profiles set locale = '${language}' where id = '${personaIds[persona] ?? ''}';`,
  );
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The line a new chapter 2 notification reads. */
const newChapterLine = 'published Chapter 2 of Epica șapte.';

test.describe('epic check: notifications (S1-E7-QA)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('journey 1: a follow and a comment reach the writer', async ({ browser }) => {
    const reader = await openAs(browser, 'teacher', '/u/adult_writer');
    await reader.getByRole('button', { name: /^Follow (?!story)/ }).click();
    await expect(reader.getByRole('button', { name: /^Following (?!story)/ })).toBeVisible();
    await reader.goto(`/s/${slug}/epicsev1`);
    await reader.getByLabel('Add a comment').fill('Un început bun.');
    await reader.getByRole('button', { name: 'Post comment' }).click();
    await expect(reader.getByRole('article', { name: 'teacher' })).toBeVisible();
    await reader.context().close();
    // The comment's job runs every minute on staging; here the test runs it.
    runSql('select public.run_notification_jobs();');
    const writer = await openAs(browser, 'adult_writer', '/notifications');
    await expect(writer.getByText(/teacher.* started following you\./).first()).toBeVisible();
    await expect(writer.getByText('commented on Chapter 1 of Epica șapte.')).toBeVisible();
    await expect(writer.getByText('“Un început bun.”')).toBeVisible();
    await writer.context().close();
  });

  test('journey 2: a new chapter reaches the followers, and "Read now" opens it', async ({
    browser,
  }) => {
    const { client } = await signInPersona('adult_writer');
    const { error } = await client.rpc('publish_chapter', { chapter_code: 'epicsev2' });
    expect(error).toBeNull();
    runSql('select public.run_notification_jobs();');
    const reader = await openAs(browser, 'teacher', '/discover');
    await reader.getByRole('link', { name: /^Notifications, \d+ new$/ }).click();
    const row = reader.getByRole('listitem').filter({ hasText: newChapterLine });
    await row.getByRole('link').click();
    await expect(reader).toHaveURL(new RegExp(`/s/${slug}/epicsev2$`));
    await reader.context().close();
    const teen = await openAs(browser, 'teen_17', '/notifications');
    await expect(teen.getByText(newChapterLine)).toBeVisible();
    await teen.context().close();
  });

  test("journey 3: at 16+ the children who follow the story aren't shown it", async ({
    browser,
  }) => {
    runSql(`update public.stories set rating = '16_plus' where slug = '${slug}';`);
    for (const persona of ['kid_14_ok', 'kid_14_waiting'] as const) {
      const kid = await openAs(browser, persona, '/notifications');
      await expect(kid.getByRole('heading', { level: 1, name: 'What’s new' })).toBeVisible();
      await expect(kid.getByText('Epica șapte', { exact: false })).toHaveCount(0);
      await kid.context().close();
    }
    const teen = await openAs(browser, 'teen_17', '/notifications');
    await expect(teen.getByText(newChapterLine)).toBeVisible();
    await teen.context().close();
    runSql(`update public.stories set rating = 'all_ages' where slug = '${slug}';`);
  });

  test('journey 4: nobody is told about someone they blocked', async ({ browser }) => {
    runSql(`insert into public.follows_users (user_id, followed_user_id)
        values ('${personaIds.pending_check}', '${personaIds.adult_writer}') on conflict do nothing;
      insert into public.blocks (user_id, blocked_user_id)
        values ('${personaIds.adult_writer}', '${personaIds.pending_check}') on conflict do nothing;`);
    const writer = await openAs(browser, 'adult_writer', '/notifications');
    await expect(writer.getByText(/teacher.* started following you\./).first()).toBeVisible();
    await expect(writer.getByText(/pending_check/)).toHaveCount(0);
    await writer.context().close();
  });

  for (const width of screenWidths) {
    test(`journey 5: the Notifications page at ${width} px, at night, in Romanian`, async ({
      browser,
    }) => {
      const page = await openAs(browser, 'adult_writer', '/notifications', 'ro');
      await checkScreen(page, { address: '/notifications', width, theme: 'night', language: 'ro' });
      await page.context().close();
    });
  }
});
