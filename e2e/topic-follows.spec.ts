/**
 * Following a genre or a tag in a real browser (BOOKS-A06 and BOOKS-A09, user stories 1.6 and
 * 1.9; boards A06 and A09).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a genre page shows "Follow Fiction" and the genre's most used tags as links; following it
 *   presses the button and keeps the follow in the account (board A06);
 * - a tag page shows "Follow this tag", then "Related" and the tags that sit on the same stories
 *   (board A09);
 * - Library's "What you follow" lists the genre and the tag, and unfollowing there takes them
 *   away (user story 1.6: "Library's What you follow lists them");
 * - a visitor is offered the log-in link instead of the button.
 * Test data: one published chapter on the seed story Stația meteo (fiction, tagged Grandparents
 * and Family), so the genre and tag pages have a story to count tags over without
 * leaning on what an earlier spec in the same shard published; and teacher's genre and tag
 * follows. Both are removed after.
 */
import { type Browser } from '@playwright/test';
import { expect, test } from './support/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const teacherId = '00000000-0000-4000-8000-000000000007';

/** Removes this spec's chapter and teacher's follows, and puts the seed language back. */
function cleanUp() {
  runSql(`delete from public.chapters where code = 'topice01';
    delete from public.topic_follows where user_id = '${teacherId}';
    update public.profiles set locale = 'ro' where handle = 'teacher';`);
}

/**
 * Publishes one chapter on Stația meteo, so the fiction genre lists a story with tags. The seed
 * itself publishes nothing, and topic_tags() counts only stories a reader can open.
 */
function publishSeedChapter() {
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
      'topice01', 1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 800, now());`);
}

/**
 * Counts teacher's follows of one kind, read straight from the table.
 *
 * @param column - 'category_id' for genres, 'tag_id' for tags
 * @returns the count as text, as runSql gives it
 */
function teacherFollowCount(column: 'category_id' | 'tag_id') {
  return runSql(
    `select count(*) from public.topic_follows where user_id = '${teacherId}' and ${column} is not null`,
  );
}

/** Opens a page in English, signed in as teacher or as a visitor, in a fresh browser context. */
async function openAs(browser: Browser, isTeacher: boolean, path: string) {
  const context = await browser.newContext();
  if (isTeacher) {
    runSql(`update public.profiles set locale = 'en' where handle = 'teacher';`);
    await useSessionInBrowser(context, (await signInPersona('teacher')).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('genre and tag follows (BOOKS-A06, BOOKS-A09)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    publishSeedChapter();
  });
  test.afterAll(cleanUp);

  test('teacher follows a genre from its page, under its tags', async ({ browser }) => {
    const page = await openAs(browser, true, '/discover/c/fiction');
    // Board A06: the genre's most used tags, each a link to its own page.
    const tags = page.getByRole('list', { name: 'Tags in this genre' });
    await expect(tags.getByRole('link', { name: '#Family' })).toHaveAttribute(
      'href',
      '/discover/t/Family',
    );
    await page.getByRole('button', { name: 'Follow Fiction' }).click();
    await expect(page.getByRole('button', { name: 'Following Fiction' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // The button turns pressed as soon as it is clicked, so wait for the save itself.
    await expect.poll(() => teacherFollowCount('category_id')).toBe('1');
    await page.context().close();
  });

  test('teacher follows a tag from its page, beside its related tags', async ({ browser }) => {
    const page = await openAs(browser, true, '/discover/t/Family');
    // Board A09: "Related" before the tags that sit on the same stories.
    await expect(page.getByText('Related', { exact: true })).toBeVisible();
    const related = page.getByRole('list', { name: 'Related' });
    await expect(related.getByRole('link', { name: '#Grandparents' })).toBeVisible();
    await expect(related.getByRole('link', { name: '#Family' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Follow this tag #Family' }).click();
    await expect(page.getByRole('button', { name: 'Following this tag #Family' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect.poll(() => teacherFollowCount('tag_id')).toBe('1');
    await page.context().close();
  });

  test('Library lists the genre and the tag, and unfollows them there', async ({ browser }) => {
    const page = await openAs(browser, true, '/library');
    await expect(page.getByText('Genres and tags · 2')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Fiction', exact: true })).toHaveAttribute(
      'href',
      '/discover/c/fiction',
    );
    await expect(page.getByRole('link', { name: '#Family', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Following Fiction' }).click();
    await expect.poll(() => teacherFollowCount('category_id')).toBe('0');
    await page.getByRole('button', { name: 'Following this tag #Family' }).click();
    await expect.poll(() => teacherFollowCount('tag_id')).toBe('0');
    await page.context().close();
  });

  test('a visitor is offered the log-in link instead of Follow', async ({ browser }) => {
    const page = await openAs(browser, false, '/discover/c/fiction');
    await expect(page.getByRole('link', { name: 'Get in to follow' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Follow/ })).toHaveCount(0);
    await page.context().close();
  });
});
