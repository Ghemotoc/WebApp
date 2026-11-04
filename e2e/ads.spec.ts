/**
 * Ad slots on public pages in a real browser (bundle SPONSORS, part a1; story S1-E12-01).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a signed-out visitor sees one of our own ads, labelled "From us", on the story page and on
 *   Discover, and "Why this ad?" opens by keyboard and says nothing about the reader was used;
 * - a story shared only with a class shows no ad at all (Q70);
 * - the story page with its ad passes axe and doesn't scroll sideways at 390, 768 and 1440 px, in
 *   light and night mode and in both languages (CLAUDE.md rule 21).
 * Test data: seed personas and the seed story statia-meteo-seed01, with one published chapter
 * made here so visitors can open it; the chapter is removed and the class-only switch put back
 * afterwards.
 */
import { expect, test, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The seed story's public page. */
const storyAddress = '/s/statia-meteo-seed01';

/** Removes the chapter this spec made and puts the story back as it was. */
const cleanUpSql = `
  delete from public.chapters where code = 'adse2e01';
  update public.stories set class_only = false where slug = 'statia-meteo-seed01';`;

/** One published chapter, so the seed story is public and Discover has something to show. */
const setUpSql = `
  insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
    status, published_title, published_body, published_word_count, first_published_at)
  values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'adse2e01',
    1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 800, now());`;

/** Opens an address in English, signed out. */
async function openInEnglish(page: Page, address: string): Promise<void> {
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  await page.goto(address);
}

test.describe('Ad slots', () => {
  test.beforeAll(() => runSql(`${cleanUpSql}${setUpSql}`));
  test.afterAll(() => runSql(cleanUpSql));

  test('a visitor sees our own ad on the story page and can ask why', async ({ page }) => {
    await openInEnglish(page, storyAddress);
    const ad = page.getByRole('complementary', { name: 'Advertisement' });
    await expect(ad).toBeVisible();
    await expect(ad.getByText('From us', { exact: true })).toBeVisible();
    // "Why this ad?" opens by keyboard and promises nothing about the reader is used.
    const why = ad.getByRole('button', { name: 'Why this ad?' });
    await why.focus();
    await page.keyboard.press('Enter');
    await expect(why).toHaveAttribute('aria-expanded', 'true');
    await expect(ad.getByText(/Ads are never personalised, for anyone\./)).toBeVisible();
  });

  test('Discover shows one wide ad after the first shelf', async ({ page }) => {
    await openInEnglish(page, '/discover');
    await expect(page.locator('[data-ad="wide"]')).toHaveCount(1);
  });

  test('a story shared only with a class shows no ad', async ({ page }) => {
    runSql(`update public.stories set class_only = true where slug = 'statia-meteo-seed01';`);
    // The writer still sees their class-only story's page, with no slot on it.
    await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
    await openInEnglish(page, storyAddress);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForTimeout(800);
    await expect(page.locator('[data-ad]')).toHaveCount(0);
    runSql(`update public.stories set class_only = false where slug = 'statia-meteo-seed01';`);
  });

  for (const view of everyView([storyAddress])) {
    test(`the story page with its ad passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
      await expect(page.locator('[data-ad]').first()).toBeVisible();
    });
  }
});
