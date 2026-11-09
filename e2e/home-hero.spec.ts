/**
 * The home page's hero in a real browser (bundle LOOK-2, the design catch-up; board
 * Website-Home): the cover wall, the gold "Your rights" card, the joined "Why write here" card
 * and the quiet safety row.
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the cover wall shows Trending stories rated All ages and 13+ only, even to an adult who may
 *   read the 16+ and 18+ ones (brief LOOK-2: the wall must suit every visitor), as one picture
 *   named by its titles;
 * - the gold card shows the CMS's words (CLAUDE.md rule 4; seeded version 1);
 * - the safety row's link, worded with the CMS safety heading, jumps to the questions;
 * - at 390, 768 and 1440 px, light and night, Romanian and English: axe finds no serious or
 *   critical issue, nothing scrolls sideways and no doodle is drawn (DoD design
 *   rules; CLAUDE.md rules 9 and 21).
 * Test data: four stories of its own by adult_writer, one of each rating, scored by the ranking
 * job; removed afterwards.
 */
import { expect, test } from '@playwright/test';

import { checkScreen, everyView } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';

/** The stories this spec adds, one of each rating. */
const wallTitles = {
  all_ages: 'Wall lantern',
  '13_plus': 'Wall harbour',
  '16_plus': 'Wall storm',
  '18_plus': 'Wall midnight',
} as const;

/** Removes this spec's stories and their chapters. */
function cleanUp() {
  runSql(`delete from public.chapters where code like 'hwle2e%';
    delete from public.stories where slug like 'hero-wall-e2e-%';`);
}

/** Four published stories, one per rating, each with one chapter, then the scores. */
function seedStories() {
  cleanUp();
  const rows = Object.entries(wallTitles)
    .map(
      ([
        rating,
        title,
      ]) => `('${adultWriterId}', 'hero-wall-e2e-${rating.replace('_', '-')}', '${title}', 'x', 'en',
       (select id from public.categories where slug = 'fiction'), 'ongoing', '${rating}',
       now() - interval '1 day', now() - interval '1 day')`,
    )
    .join(',\n');
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ${rows};
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'hwle2e' || substr(md5(slug), 1, 2), 1, 'One', 'x', 1, 'published', 'One',
      'Text.', 1, first_published_at from public.stories where slug like 'hero-wall-e2e-%';
    select public.compute_story_scores();`);
}

test.describe('the home page hero', () => {
  test.beforeAll(seedStories);
  test.afterAll(cleanUp);

  test('the cover wall shows only All ages and 13+ stories, even to an adult', async ({
    browser,
  }) => {
    // adult_writer may read 16+ and 18+ stories, so only the wall's own rule can hide them.
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    const page = await context.newPage();
    await page.goto('/');

    const wall = page.getByRole('img', { name: /^Coperte de povești/ });
    await expect(wall).toBeVisible();
    await expect(wall).toHaveAccessibleName(new RegExp(wallTitles.all_ages));
    await expect(wall).toHaveAccessibleName(new RegExp(wallTitles['13_plus']));
    const wallName = (await wall.getAttribute('aria-label')) ?? '';
    expect(wallName).not.toContain(wallTitles['16_plus']);
    expect(wallName).not.toContain(wallTitles['18_plus']);
    await context.close();
  });

  test('the gold card shows the CMS words and the safety link jumps to the questions', async ({
    page,
  }) => {
    await page.goto('/');

    // Version 1 of the Romanian home page, seeded by the LOOK-2 migration.
    await expect(
      page.getByText('Toate drepturile asupra textelor tale rămân ale tale'),
    ).toBeVisible();
    await expect(page.getByText('Le poți publica și oriunde altundeva')).toBeVisible();

    // The safety row is a list named by the safety heading; its last item links to the questions.
    const safetyRow = page.getByRole('list', { name: 'Cum avem grijă de toți' });
    await expect(
      safetyRow.getByText('Yoti face verificarea vârstei.', { exact: false }),
    ).toBeVisible();
    await safetyRow.getByRole('link', { name: 'Cum avem grijă de toți' }).click();
    await expect(page).toHaveURL(/#questions$/);
    await expect(page.locator('#questions')).toBeInViewport();
  });

  for (const view of everyView(['/'])) {
    test(`the hero passes axe and draws no doodle at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
      // Wait for the wall, so the covers are on the page when it is checked.
      await expect(page.getByRole('img', { name: new RegExp(wallTitles.all_ages) })).toBeVisible();
      await expectNoDoodles(page);
    });
  }
});
