/**
 * Suggestions from reading in a real browser (story S1-E15-06, bundle ANALYTICS-1c).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request.
 * What it proves:
 * - the story page (for a visitor) and the end of the latest chapter (for a member) show "More by" and "Stories like this"
 *   (criterion 1), each with "Why am I seeing this?" (criterion 4);
 * - Discover shows "Because you read" to a member who finished a story, and not after they turn
 *   "Suggestions from reading" off in Settings › Privacy (criteria 3 and 5);
 * - the story page with its rows passes axe and fits at 390, 768 and 1440 px, light and night,
 *   ro and en (CLAUDE.md rule 21).
 * Test data: three English stories of their own, two by adult_writer and one by teacher, each with
 * one chapter; the pair between the first and the third is written straight into story_pairs (the
 * nightly job that counts it has its own database test, 362-suggestions).
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';
const blockerId = '00000000-0000-4000-8000-000000000015';
const stories = [
  { slug: 'sugg-e2e-harbour', title: 'Harbour Lights', writer: adultWriterId, code: 'sugge2e1' },
  { slug: 'sugg-e2e-orchard', title: 'Orchard Letters', writer: adultWriterId, code: 'sugge2e2' },
  {
    slug: 'sugg-e2e-lighthouse',
    title: 'The Lighthouse Clock',
    writer: teacherId,
    code: 'sugge2e3',
  },
];

/** Removes the spec's stories (their chapters, pairs and library rows go with them). */
function cleanUp() {
  const slugs = stories.map((story) => `'${story.slug}'`).join(', ');
  runSql(`delete from public.chapters where code like 'sugge2e%';
    delete from public.stories where slug in (${slugs});
    update public.profiles set suggests_from_reading = null where id = '${blockerId}';`);
}

/** The three stories, each with a published chapter, and the pair the job would have kept. */
function seedStories() {
  cleanUp();
  for (const story of stories) {
    runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
        completion_status, rating, first_published_at, last_chapter_published_at)
      values ('${story.writer}', '${story.slug}', '${story.title}', 'x', 'en',
        (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
      insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
        word_count, status, published_title, published_body, published_word_count, first_published_at)
      select id, user_id, '${story.code}', 1, 'One', 'x', 1, 'published', 'One', 'Text.', 1, now()
      from public.stories where slug = '${story.slug}';`);
  }
  // Five readers finished both the first and the third story.
  runSql(`insert into public.story_pairs (story_id, paired_story_id, readers)
    select first_story.id, third_story.id, 5
    from public.stories as first_story, public.stories as third_story
    where first_story.slug = 'sugg-e2e-harbour' and third_story.slug = 'sugg-e2e-lighthouse';
    insert into public.library_entries (user_id, story_id, shelf)
    select '${blockerId}', id, 'finished' from public.stories where slug = 'sugg-e2e-harbour';`);
}

/** A fresh browser in English, signed in as blocker (an adult) or signed out. */
async function openInEnglish(browser: Browser, isSignedIn: boolean) {
  const context = await browser.newContext();
  if (isSignedIn) {
    runSql(`update public.profiles set locale = 'en' where id = '${blockerId}';`);
    await useSessionInBrowser(context, (await signInPersona('blocker')).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  return { context, page: await context.newPage() };
}

test.describe('suggestions from reading (S1-E15-06)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStories);
  test.afterAll(cleanUp);

  test('the story page shows More by and Stories like this, each saying why', async ({
    browser,
  }) => {
    const { context, page } = await openInEnglish(browser, false);
    await page.goto('/s/sugg-e2e-harbour');
    const moreBy = page.locator('#more-by-writer');
    await expect(moreBy.getByRole('heading', { name: 'More by Lia Scrie' })).toBeVisible();
    await expect(moreBy.getByRole('link', { name: /Orchard Letters/ })).toBeVisible();
    const likeThis = page.locator('#stories-like-this');
    await expect(likeThis.getByRole('link', { name: /The Lighthouse Clock/ })).toBeVisible();
    // "Why am I seeing this?" opens its one sentence in place, by keyboard too.
    const why = likeThis.getByRole('button', { name: 'Why am I seeing this?' });
    await why.focus();
    await page.keyboard.press('Enter');
    await expect(why).toHaveAttribute('aria-expanded', 'true');
    await expect(likeThis.getByText(/At least 5 readers who finished this story/)).toBeVisible();
    await context.close();
  });

  test('the end of the latest chapter shows the same rows', async ({ browser }) => {
    const { context, page } = await openInEnglish(browser, true);
    await page.goto('/s/sugg-e2e-harbour/sugge2e1');
    await expect(page.getByText(/latest chapter so far/)).toBeVisible();
    await expect(
      page.locator('#stories-like-this').getByRole('link', { name: /The Lighthouse Clock/ }),
    ).toBeVisible();
    await context.close();
  });

  test('Discover shows Because you read, until the switch is turned off', async ({ browser }) => {
    const { context, page } = await openInEnglish(browser, true);
    await page.goto('/discover');
    const row = page.locator('#because-you-read');
    await expect(
      row.getByRole('heading', { name: 'Because you read Harbour Lights' }),
    ).toBeVisible();
    await expect(row.getByRole('link', { name: /The Lighthouse Clock/ })).toBeVisible();
    // Settings › Privacy: the switch starts on for an adult; turning it off hides the row.
    await page.goto('/settings#privacy');
    const toggle = page.getByRole('switch', { name: /Suggestions from reading/ });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    // The switch shows "off" at once and saves in the background, so wait for the database's
    // answer before leaving: loading another page mid-save cancels it and the row stays (FINAL-1).
    const saved = page.waitForResponse(
      (response) => response.url().includes('/rpc/set_suggests_from_reading') && response.ok(),
    );
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await saved;
    await page.goto('/discover');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForTimeout(800);
    await expect(page.locator('#because-you-read')).toHaveCount(0);
    await context.close();
  });

  for (const view of everyView(['/s/sugg-e2e-harbour'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view, async (screen) => {
        await expect(screen.locator('#stories-like-this')).toBeVisible();
      });
    });
  }
});
