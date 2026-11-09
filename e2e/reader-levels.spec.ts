/**
 * Reader levels in a real browser (bundle G7a; Robert approved reader levels on 7 Nov 2026,
 * 19:53 UTC; the tests and the switch are the DESIGN thread's, 7 Nov 2026, 19:56 UTC).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the reader sees their own Reading level card while it is hidden, with "Only you can see
 *   this" and the way to Settings › Privacy, and no pill in their header;
 * - a visitor sees neither the pill nor the card while it is hidden;
 * - "Show it on my profile" in Settings › Privacy saves at once, and then a visitor sees the
 *   "New reader" pill above the name and the card with "3 of 50 chapters read to Reader";
 * - the profile with the level shown passes axe at 390, 768 and 1440 px, light and night, ro
 *   and en.
 * Test data: one completed story "Niveluri e2e" with three chapters by the owner persona, read
 *   to the end by the support persona (no other spec reads as support). Removed before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The support persona reads; the owner persona wrote the story. */
const readerId = '00000000-0000-4000-8000-000000000011';
const writerId = '00000000-0000-4000-8000-000000000008';
const storyId = '23100000-0000-4000-9000-00000000e2e7';

/** Takes off the story, the reader's places and the switch, as the seed has them. */
function cleanUp() {
  runSql(`
    delete from public.reading_positions where user_id = '${readerId}';
    delete from public.library_entries where user_id = '${readerId}';
    delete from public.chapters where story_id = '${storyId}';
    delete from public.stories where id = '${storyId}';
    update public.profiles set shows_reader_level = false, locale = 'ro' where handle = 'support';`);
}

/** A completed three-chapter story, every chapter read to the end by the reader. */
function readStory() {
  runSql(`
    insert into public.stories (id, user_id, slug, title, language_code, category_id, rating,
      completion_status, first_published_at, last_chapter_published_at)
    values ('${storyId}', '${writerId}', 'niveluri-e2e', 'Niveluri e2e', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages', 'completed', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select '${storyId}', '${writerId}', 'rle2e' || lpad(step::text, 3, '0'), step, 'Capitol', 'x',
      1, 'published', 'Capitol', 'Text.', 1, now()
    from generate_series(1, 3) as step;
    insert into public.reading_positions (user_id, story_id, chapter_id, percent, device_kind)
    select '${readerId}', '${storyId}', chapters.id, 100, 'computer'
    from public.chapters where chapters.story_id = '${storyId}';`);
}

/**
 * Opens a page in English, signed in as the reader or signed out.
 *
 * @param isReader - true to sign in as the support persona
 * @returns the open page
 */
async function openPage(browser: Browser, address: string, isReader: boolean): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  if (isReader) {
    runSql(`update public.profiles set locale = 'en' where handle = 'support';`);
    await useSessionInBrowser(context, (await signInPersona('support')).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
  return page;
}

test.describe('reader levels (G7a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    readStory();
  });
  test.afterAll(cleanUp);

  test('the reader sees their own hidden level, with the way to show it', async ({ browser }) => {
    const page = await openPage(browser, '/u/support', true);
    const card = page.getByRole('region', { name: 'New reader' });
    await expect(card).toBeVisible();
    await expect(card.getByText('Only you can see this.', { exact: false })).toBeVisible();
    await expect(card.getByRole('link', { name: 'Open Privacy settings' })).toHaveAttribute(
      'href',
      '/settings#privacy',
    );
    await expect(card.getByText('3 of 50 chapters read to Reader')).toBeVisible();
    // The header shows what others see: nothing while it is hidden.
    await expect(page.getByTestId('reader-level-pill')).toHaveCount(0);
    await page.context().close();
  });

  test('a visitor sees nothing while the level is hidden', async ({ browser }) => {
    const page = await openPage(browser, '/u/support', false);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('reader-level-pill')).toHaveCount(0);
    await expect(page.getByText('The four reading levels')).toHaveCount(0);
    await page.context().close();
  });

  test('Show it on my profile puts the level on the profile', async ({ browser }) => {
    // Step 1: the reader turns it on in Settings › Privacy.
    const settings = await openPage(browser, '/settings#privacy', true);
    const group = settings.getByRole('group', { name: 'Your reading level' });
    await expect(group.getByRole('radio', { name: 'Hidden' })).toBeChecked();
    await group.getByRole('radio', { name: 'Show it on my profile' }).check();
    await expect
      .poll(() =>
        runSql(`select shows_reader_level from public.profiles where handle = 'support';`),
      )
      .toContain('t');
    await settings.context().close();
    // Step 2: a visitor now sees the pill and the card.
    const page = await openPage(browser, '/u/support', false);
    await expect(page.getByTestId('reader-level-pill')).toHaveText('Reading level: New reader');
    const card = page.getByRole('region', { name: 'New reader' });
    const ladder = card.getByRole('list', { name: 'The four reading levels' });
    await expect(ladder.getByRole('listitem')).toHaveCount(4);
    await expect(ladder.locator('[aria-current="step"]')).toContainText('New reader');
    await expect(card.getByText('3 of 50 chapters read to Reader')).toBeVisible();
    await expect(card.getByText('Only you can see this.', { exact: false })).toHaveCount(0);
    await page.context().close();
  });

  test('axe: a profile showing its reading level, every view', async ({ browser }) => {
    // 12 views in one browser take longer than one test's usual 30 s.
    test.setTimeout(240_000);
    const context = await browser.newContext();
    const page = await context.newPage();
    for (const view of everyView(['/u/support'])) {
      await checkScreen(page, view);
      await expect(page.getByTestId('reader-level-pill')).toBeVisible();
    }
    await context.close();
  });
});
