/**
 * The ranking place, "#1 in Fiction", in a real browser (story S1-E15-05, bundle ANALYTICS-1b).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request.
 * What it proves:
 * - a visitor sees the story's place in its category on the story page (criterion 2);
 * - staff see the same place on the story in Stories (criterion 2);
 * - a story with no score shows no place (criterion 3).
 * Test data: one English story of its own by adult_writer with one chapter, scored by the
 * ranking job and then given the top score in Fiction by hand, so the place is certain.
 */
import { expect, test } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const slug = 'rank-e2e-lantern';

/** Removes the spec's story and its score. */
function cleanUp() {
  runSql(`delete from public.chapters where code = 'ranke2e1';
    delete from public.stories where slug = '${slug}';`);
}

/** The story, read once, scored, then put first in Fiction. */
function seedStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('${adultWriterId}', '${slug}', 'Lantern Hours', 'x', 'en',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'ranke2e1', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 1, now()
    from public.stories where slug = '${slug}';`);
}

/** Puts the spec's story first in Fiction, or takes its score away. */
function setScore(isScored: boolean) {
  runSql(
    isScored
      ? `insert into public.story_scores (story_id, score)
           select id, 1e9 from public.stories where slug = '${slug}'
         on conflict (story_id) do update set score = excluded.score;`
      : `delete from public.story_scores
           where story_id = (select id from public.stories where slug = '${slug}');`,
  );
}

test.describe('the ranking place (S1-E15-05)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('a visitor sees the place, and a story with no score shows none', async ({ browser }) => {
    const context = await browser.newContext();
    await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const page = await context.newPage();
    setScore(true);
    await page.goto(`/s/${slug}`);
    await expect(page.getByText('#1 in Fiction')).toBeVisible();
    setScore(false);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Lantern Hours' })).toBeVisible();
    await expect(page.getByText(/^#\d+ in /)).toHaveCount(0);
    await context.close();
  });

  test('staff see the same place on the story in Stories', async ({ browser }) => {
    setScore(true);
    const storyId = runSql(`select id from public.stories where slug = '${slug}';`).trim();
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('admin')).session);
    await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    runSql(`update public.profiles set locale = 'en' where handle = 'admin';`);
    const page = await context.newPage();
    await page.goto(`/staff/stories/${storyId}`);
    await expect(page.getByText('#1 in Fiction')).toBeVisible();
    runSql(`update public.profiles set locale = 'ro' where handle = 'admin';`);
    await context.close();
  });
});
