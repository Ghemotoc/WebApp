/**
 * Featured this week, in a real browser (story S1-E5-10, bundle LOOK-4a).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - with no picks, Discover shows no band (criterion 8);
 * - an admin opens Stories › Featured, sees the ranking with a 14-year-old's story marked "The
 *   writer is under 16" and no box to tick (criterion 4), picks two stories, puts the second
 *   first and saves with a reason (criterion 3);
 * - a visitor then sees the band in that order, with "Read the story" opening the story; the
 *   pause button stops it turning (board Discover);
 * - the staff page and the band pass axe at 390 and 1440 px, light and night, ro and en.
 * Test data: three stories of the spec's own with a chapter out yesterday (two by adult_writer,
 * one by kid_14_ok); the picks and the stories are removed afterwards.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** Removes the picks and the spec's stories. */
function cleanUp() {
  runSql(`delete from public.featured_picks;
    delete from public.notifications where kind = 'story_featured';
    delete from public.chapters where code like 'fte2e%';
    delete from public.stories where slug like 'featured-e2e-%';
    update public.profiles set locale = 'ro' where handle = 'admin';`);
}

/** Three stories with one chapter out yesterday; the third is by a 14-year-old. */
function seedStories() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      rating, first_published_at, last_chapter_published_at)
    values
      ('00000000-0000-4000-8000-000000000001', 'featured-e2e-one', 'Corul din salină',
       'Un cor repetă într-o salină veche.', 'ro', (select id from public.categories where slug = 'fiction'),
       'all_ages', now() - interval '3 days', now() - interval '1 day'),
      ('00000000-0000-4000-8000-000000000001', 'featured-e2e-two', 'Fata care repara radiouri',
       'Un radio vechi prinde un post care nu mai emite.', 'ro', (select id from public.categories where slug = 'fiction'),
       'all_ages', now() - interval '3 days', now() - interval '1 day'),
      ('00000000-0000-4000-8000-000000000003', 'featured-e2e-young', 'Caietul verde',
       'Un caiet găsit într-o bancă.', 'ro', (select id from public.categories where slug = 'fiction'),
       'all_ages', now() - interval '3 days', now() - interval '1 day');
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
      status, published_title, published_body, published_word_count, first_published_at)
    select stories.id, stories.user_id, 'fte2e' || lpad(row_number() over (order by slug)::text, 3, '0'), 1,
      'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now() - interval '1 day'
    from public.stories where slug like 'featured-e2e-%';`);
}

/** Opens a page as the admin persona, in a language. */
async function openAsAdmin(browser: Browser, address: string, language: 'en' | 'ro') {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = '${language}' where handle = 'admin';`);
  await useSessionInBrowser(context, (await signInPersona('admin')).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Featured this week (S1-E5-10)', () => {
  test.describe.configure({ mode: 'serial' });
  // kid_14_ok must be an active member for the screen to say "under 16" rather than "not active",
  // so adults_only is off for this spec and goes back to what it was afterwards.
  let wasAdultsOnly = '';
  test.beforeAll(() => {
    wasAdultsOnly = runSql(
      `select is_enabled from public.feature_flags where key = 'adults_only';`,
    ).trim();
    runSql(`update public.feature_flags set is_enabled = false where key = 'adults_only';`);
    seedStories();
  });
  test.afterAll(() => {
    cleanUp();
    runSql(`update public.feature_flags set is_enabled = ${wasAdultsOnly === 't'}
      where key = 'adults_only';`);
  });

  test('with no picks, Discover shows no band', async ({ page }) => {
    await page.goto('/discover');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('featured-band')).toHaveCount(0);
  });

  test('an admin picks two stories in order; a 14-year-old’s story can’t be picked', async ({
    browser,
  }) => {
    const page = await openAsAdmin(browser, '/staff/featured', 'en');
    await expect(page.getByRole('heading', { name: 'Featured this week' })).toBeVisible();
    // Criterion 4: the reason shows and there is no box to tick.
    await expect(page.getByText('No, the writer is under 16').first()).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Pick “Caietul verde”' })).toHaveCount(0);
    // Pick both, then put the second first.
    await page.getByRole('checkbox', { name: 'Pick “Corul din salină”' }).first().check();
    await page.getByRole('checkbox', { name: 'Pick “Fata care repara radiouri”' }).first().check();
    await page.getByRole('button', { name: 'Move “Fata care repara radiouri” up' }).click();
    await page.getByLabel('Why are you changing Featured this week?').fill('A mix for the week');
    await page.getByRole('button', { name: 'Save Featured this week' }).click();
    await expect(page.getByText('Saved. Discover shows the new list')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Picked: 2 of 5' })).toBeVisible();
    await page.context().close();
  });

  test('a visitor sees the band in the staff’s order and can pause it', async ({ page }) => {
    await page.goto('/discover');
    const band = page.getByTestId('featured-band');
    await expect(band).toBeVisible();
    await expect(
      band.getByRole('group', { name: /^1 din 2: Fata care repara radiouri$/ }),
    ).toBeVisible();
    const pause = band.getByRole('button', { name: 'Oprește derularea poveștilor' });
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await band.getByRole('button', { name: 'Povestea următoare' }).click();
    await expect(band.getByRole('group', { name: /^2 din 2: Corul din salină$/ })).toBeVisible();
    await band.getByRole('link', { name: 'Citește povestea' }).click();
    await expect(page).toHaveURL(/\/s\/featured-e2e-one$/);
  });

  for (const language of ['ro', 'en'] as const) {
    for (const width of [390, 1440]) {
      for (const theme of ['light', 'night'] as const) {
        test(`axe: the band on Discover at ${String(width)} px, ${theme}, ${language}`, async ({
          page,
        }) => {
          await checkScreen(page, { address: '/discover', width, theme, language });
          await expect(page.getByTestId('featured-band')).toBeVisible();
        });
      }
    }
    test(`axe: Stories › Featured at 390 px, light, ${language}`, async ({ browser }) => {
      const page = await openAsAdmin(browser, '/', language);
      await checkScreen(page, { address: '/staff/featured', width: 390, theme: 'light', language });
      await page.context().close();
    });
  }
});
