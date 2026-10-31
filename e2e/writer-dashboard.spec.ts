/**
 * The writer dashboard on /write, in a real browser (story S1-E3-07; board WriterDashboard 4.1).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the tiles show reads, read-through, likes, comments and followers for all the writer's
 *   stories, and each story's table shows them per chapter (criterion 1);
 * - a count from fewer than 5 readers reads "fewer than 5" (criterion 2);
 * - the page names no reader who opened a chapter: only the commenter, whose words are public
 *   under the chapter, appears (criterion 3);
 * - "Last 30 days" changes the tiles; "Not published yet" lists the draft with an Edit link and
 *   "Continue draft" opens it;
 * - axe finds nothing serious and nothing scrolls sideways at 390, 768 and 1440 px.
 * Test data: a story by the editor persona (…12, which no other spec writes with) with one
 * published chapter and one draft; reading places, likes, follows and a comment from seeded
 * personas. All removed afterwards.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000012';
const storySlug = 'dashboard-e2e';
const publishedCode = 'tablou01';
const draftCode = 'tablou02';
/** Seeded readers by number (…02, …03, …07, …08, …09, …10). */
const readers = [2, 3, 7, 8, 9, 10];

/** A persona's ID from its number. */
function personaId(personaNumber: number): string {
  return `00000000-0000-4000-8000-${String(personaNumber).padStart(12, '0')}`;
}

/** Removes the spec's story with its numbers, and the writer's followers. */
function cleanUp() {
  runSql(`delete from public.comments where chapter_id in
      (select id from public.chapters where code in ('${publishedCode}', '${draftCode}'));
    delete from public.chapter_likes where chapter_id in
      (select id from public.chapters where code = '${publishedCode}');
    delete from public.reading_positions where chapter_id in
      (select id from public.chapters where code = '${publishedCode}');
    delete from public.chapters where code in ('${publishedCode}', '${draftCode}');
    delete from public.stories where slug = '${storySlug}';
    delete from public.follows_users where followed_user_id = '${writerId}';
    update public.profiles set locale = 'ro' where id = '${writerId}';`);
}

/** The story, its two chapters and readers' numbers: 12 reads, 3 of 6 at the end, 3 likes. */
function seedDashboard() {
  cleanUp();
  const places = readers
    .map((reader, index) => `('${personaId(reader)}', ${index < 3 ? 100 : 30})`)
    .join(', ');
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('${writerId}', '${storySlug}', 'Tabloul din pod', 'O poveste despre un tablou.', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, '${publishedCode}', 1, 'Podul', 'x', 3, 'published', 'Podul',
      'Era praf peste tot.', 3, now() - interval '3 days' from public.stories where slug = '${storySlug}';
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count)
    select id, user_id, '${draftCode}', 2, 'Rama', 'Rama era aurie.', 3
    from public.stories where slug = '${storySlug}';
    insert into public.chapter_reads (chapter_id, read_on, total)
    select id, (now() at time zone 'Europe/Bucharest')::date, 12 from public.chapters where code = '${publishedCode}';
    insert into public.reading_positions (user_id, story_id, chapter_id, percent, device_kind)
    select place.user_id::uuid, chapters.story_id, chapters.id, place.percent, 'computer'
    from public.chapters, (values ${places}) as place (user_id, percent)
    where chapters.code = '${publishedCode}';
    insert into public.chapter_likes (user_id, chapter_id)
    select liker::uuid, chapters.id from public.chapters,
      unnest(array['${personaId(2)}', '${personaId(3)}', '${personaId(7)}']) as liker
    where chapters.code = '${publishedCode}';
    insert into public.follows_users (user_id, followed_user_id)
    select follower::uuid, '${writerId}' from unnest(array['${personaId(2)}', '${personaId(3)}',
      '${personaId(7)}', '${personaId(8)}', '${personaId(9)}']) as follower;
    insert into public.comments (user_id, chapter_id, body)
    select '${personaId(7)}', id, 'Ce praf frumos!' from public.chapters where code = '${publishedCode}';`);
}

/** Opens /write as the writer, in English. */
async function openDashboard(browser: Browser, width = 1440): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where id = '${writerId}';`);
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona('editor')).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  const page = await context.newPage();
  await page.goto('/write');
  await expect(page.getByRole('heading', { level: 2, name: 'How readers respond' })).toBeVisible();
  return page;
}

/** A tile, found by its label inside "How readers respond". */
function tileValue(page: Page, label: string) {
  return page
    .getByRole('region', { name: 'How readers respond' })
    .getByText(label, { exact: true })
    .locator('xpath=..');
}

test.describe('The writer dashboard', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedDashboard);
  test.afterAll(cleanUp);

  test('the tiles show totals, with "fewer than 5" for small counts', async ({ browser }) => {
    const page = await openDashboard(browser);
    await expect(tileValue(page, 'Reads')).toContainText('12');
    await expect(tileValue(page, 'Read-through')).toContainText('50%');
    await expect(tileValue(page, 'Likes')).toContainText('fewer than 5');
    await expect(tileValue(page, 'Comments')).toContainText('fewer than 5');
    await expect(tileValue(page, 'Followers')).toContainText('5');
    await expect(page.getByText('These are totals only.')).toBeVisible();
    await page.context().close();
  });

  test('each story has a table of numbers per chapter', async ({ browser }) => {
    const page = await openDashboard(browser);
    const table = page.getByRole('region', { name: /Numbers per chapter for Tabloul din pod/ });
    const published = table.getByRole('row', { name: /1\. Podul/ });
    await expect(published.getByRole('cell')).toHaveText([
      /Published/,
      '12',
      '50%',
      'fewer than 5',
      'fewer than 5',
    ]);
    await expect(table.getByRole('row', { name: /2\. Rama/ })).toContainText('not published');
    await page.context().close();
  });

  test('the page names no reader, only the public comment', async ({ browser }) => {
    const page = await openDashboard(browser);
    const comments = page.getByRole('region', { name: 'Latest on your chapters' });
    await expect(comments.getByText('Ce praf frumos!')).toBeVisible();
    await expect(comments.getByRole('link', { name: /Reply to .* on chapter 1/ })).toHaveAttribute(
      'href',
      `/s/${storySlug}/${publishedCode}#comments-heading`,
    );
    // The readers who only opened or liked the chapter are nowhere on the page.
    for (const handle of ['teen_17', 'kid_14_ok', 'owner', 'admin', 'moderator']) {
      await expect(page.getByText(handle)).toHaveCount(0);
    }
    await page.context().close();
  });

  test('the period, the waiting draft and "Continue draft"', async ({ browser }) => {
    const page = await openDashboard(browser);
    await page.getByRole('radio', { name: 'Last 30 days' }).click();
    await expect(page.getByText('New followers in 30 days')).toBeVisible();
    const waiting = page.getByRole('region', { name: 'Not published yet' });
    await expect(waiting.getByText('Chapter 2: Rama')).toBeVisible();
    await expect(waiting.getByRole('link', { name: 'Edit: Chapter 2: Rama' })).toBeVisible();
    await page.getByRole('link', { name: 'Continue draft' }).click();
    await expect(page).toHaveURL(new RegExp(`/write/s/${storySlug}/c/${draftCode}$`));
    await page.context().close();
  });

  for (const width of [390, 768, 1440]) {
    test(`passes axe and fits at ${width} px`, async ({ browser }) => {
      const page = await openDashboard(browser, width);
      await expect(page.getByRole('heading', { name: /followers?$/ })).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(serious).toEqual([]);
      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(pageWidth).toBeLessThanOrEqual(width);
      await page.context().close();
    });
  }
});
