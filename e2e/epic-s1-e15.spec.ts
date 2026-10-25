/**
 * Epic check for S1-E15, analytics and the March test (story S1-E15-QA).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * It adds no feature: it walks the epic's main journey in a real browser, where the reader
 * (S1-E4-01a) meets the March numbers (S1-E15-02).
 * - Journey 1, reading becomes a number: teen_17 and kid_14_ok open the spec's chapter in the
 *   reader, the daily job counts the day, and the owner's Metrics page lists today's reads.
 * - Journey 2, who sees it: the admin does; the moderator is pointed to the queue; teen_17,
 *   kid_14_ok and kid_14_waiting are refused, and nothing on any of those pages names a person.
 * - Journey 3, the Metrics page at 390, 768 and 1440 px, at night, in Romanian (the story's own
 *   spec covers the other views).
 * The database half is supabase/tests/database/099-epic-s1-e15.test.sql.
 * Test data: seed personas; a story of the spec's own, removed after with its reads and today's
 * count, and the personas' language put back.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY, screenWidths } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const slug = 'epic15-e2e-story';

/** Today by the Romanian date, as SQL. */
const today = `(now() at time zone 'Europe/Bucharest')::date`;

/** Removes the spec's story (its reads go with it), today's count and the language changes. */
function cleanUp() {
  runSql(`delete from public.chapters where code = 'ep15e2e1';
    delete from public.stories where slug = '${slug}';
    delete from public.daily_metrics where metric_date = ${today};
    update public.profiles set locale = 'ro'
    where handle in ('owner', 'admin', 'moderator', 'teen_17', 'kid_14_ok', 'kid_14_waiting');`);
}

/** One All ages story by adult_writer with one published chapter. */
function seedStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('${adultWriterId}', '${slug}', 'Counted pages', 'x', 'en',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'ep15e2e1', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 1, now()
    from public.stories where slug = '${slug}';`);
}

/** Opens a page as a persona, in a language. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
  language: 'en' | 'ro' = 'en',
): Promise<Page> {
  runSql(`update public.profiles set locale = '${language}' where handle = '${persona}';`);
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

/** Today's read total for the spec's chapter. */
function readsToday(): number {
  return Number(
    runSql(`select coalesce(sum(total), 0) from public.chapter_reads
      join public.chapters on chapters.id = chapter_reads.chapter_id
      where chapters.code = 'ep15e2e1' and read_on = ${today};`),
  );
}

test.describe('epic check S1-E15 (S1-E15-QA)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('journey 1: two readers open a chapter and the owner sees today’s reads', async ({
    browser,
  }) => {
    for (const reader of ['teen_17', 'kid_14_ok'] as const) {
      const page = await openAs(browser, reader, `/s/${slug}/ep15e2e1`);
      await expect(page.getByText('Text.')).toBeVisible();
    }
    await expect.poll(readsToday).toBe(2);
    runSql(`select public.compute_daily_metrics(${today});`);

    const owner = await openAs(browser, 'owner', '/staff/metrics');
    await expect(owner.getByRole('heading', { name: 'Chapter reads per day' })).toBeVisible();
    const todayLabel = await owner.evaluate(() =>
      new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Europe/Bucharest',
      }).format(new Date()),
    );
    await expect(owner.getByText(new RegExp(`^Counted on ${todayLabel}`))).toBeVisible();
    await expect(owner.locator('body')).not.toContainText('00000000-0000-4000-8000');
  });

  test('journey 2: the admin sees the numbers; the moderator and members don’t', async ({
    browser,
  }) => {
    const admin = await openAs(browser, 'admin', '/staff/metrics');
    await expect(admin.getByRole('progressbar')).toHaveCount(3);
    const moderator = await openAs(browser, 'moderator', '/staff/metrics');
    await expect(moderator.getByRole('link', { name: 'Open the moderation queue' })).toBeVisible();
    await expect(moderator.getByRole('progressbar')).toHaveCount(0);
    for (const member of ['teen_17', 'kid_14_ok', 'kid_14_waiting'] as const) {
      const page = await openAs(browser, member, '/staff/metrics');
      await expect(page.getByRole('heading', { name: 'This part is for staff' })).toBeVisible();
      await expect(page.getByRole('progressbar')).toHaveCount(0);
    }
  });

  for (const width of screenWidths) {
    test(`journey 3: /staff/metrics passes axe at ${width} px, night, Romanian`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = 'ro' where handle = 'owner';`);
      await useSessionInBrowser(page.context(), (await signInPersona('owner')).session);
      await checkScreen(page, { address: '/staff/metrics', width, theme: 'night', language: 'ro' });
    });
  }
});
