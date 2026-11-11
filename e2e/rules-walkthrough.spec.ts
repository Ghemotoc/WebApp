/**
 * The rules walkthrough before an under-18's first comment, in a real browser (bundle MUST-1,
 * part c; IDEA-20261108-7; the comment box, board 3.5).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - teen_17's first press of "Post comment" opens the four cards with the focus on the first;
 * - the cards pass axe;
 * - Next walks to the last card, and Done hands the box back with the words as typed;
 * - the next press posts, and the walkthrough never shows again.
 * Test data: one published chapter on adult_writer's "Stația meteo". The adults_only flag is turned
 * off for the test, so a 17-year-old can comment (the March test is invited adults only), and put
 * back after; the e2e run uses one worker, so no other spec sees the change.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import AxeBuilder from '@axe-core/playwright';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const storyId = '00000000-0000-4000-9000-000000000001';
const chapterAddress = '/s/statia-meteo-seed01/rules001';

/** Removes this spec's chapter and puts the flag and teen_17's walkthrough and language back. */
function cleanUp() {
  runSql(`update public.feature_flags set is_enabled = true where key = 'adults_only';
    delete from public.jobs where kind = 'comment_posted';
    delete from public.comments where chapter_id in (select id from public.chapters where code like 'rules%');
    delete from public.chapters where code like 'rules%';
    update public.stories set first_published_at = null, last_chapter_published_at = null where id = '${storyId}';
    update public.profiles set rules_walkthrough_seen_at = null, locale = 'ro' where handle = 'teen_17';`);
}

/** One published chapter, and teen_17 able to comment and not yet through the walkthrough. */
function seed() {
  cleanUp();
  runSql(`update public.feature_flags set is_enabled = false where key = 'adults_only';
    update public.profiles set locale = 'en' where handle = 'teen_17';
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${adultWriterId}', 'rules001', 1, 'Unu', 'x', 3, 'published', 'Unu',
      'Primul capitol aici.', 3, now());
    update public.stories set first_published_at = now(), last_chapter_published_at = now()
      where id = '${storyId}';`);
}

/** Opens the chapter as teen_17, in English. */
async function openAsTeen(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('teen_17')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(chapterAddress);
  return page;
}

test.describe('the rules walkthrough before a first comment (MUST-1c)', () => {
  test.beforeAll(seed);
  test.afterAll(cleanUp);

  test('a 17-year-old reads four short rules, keeps the words, then posts', async ({ browser }) => {
    const page = await openAsTeen(browser);
    const box = page.getByLabel('Add a comment');
    await box.fill('Loved the ending');
    await page.getByRole('button', { name: 'Post comment' }).click();
    await expect(page.getByRole('heading', { name: 'Be kind' })).toBeFocused();
    await expect(page.getByText('1 of 4')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('section[aria-labelledby="comments-heading"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
      .analyze();
    const serious = results.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    );
    expect(serious).toEqual([]);
    for (let press = 0; press < 3; press += 1) {
      await page.getByRole('button', { name: 'Next' }).click();
    }
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(box).toHaveValue('Loved the ending');
    await expect(box).toBeFocused();
    await page.getByRole('button', { name: 'Post comment' }).click();
    await expect(page.getByRole('heading', { name: '1 comment' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Be kind' })).toHaveCount(0);
    await expect
      .poll(() =>
        runSql(
          `select rules_walkthrough_seen_at is not null from public.profiles where handle = 'teen_17';`,
        ).trim(),
      )
      .toBe('t');
    await page.context().close();
  });
});
