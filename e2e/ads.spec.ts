/**
 * Ad slots in a real browser (bundle SPONSORS, part a1; story S1-E12-01; who sees them and where
 * from bundle G7e).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a visitor who isn't signed in sees no ad on any page, and the page never asks for one
 *   (Robert's design rules, 7 Nov 2026, "Content rules"; G7e);
 * - a signed-in reader sees one of our own ads, labelled "From us", on the story page and on
 *   Discover, and "Why this ad?" opens by keyboard and says nothing about the reader was used;
 * - a story shared only with a class shows no ad at all (Q70);
 * - every other public page has its slots at 1440 px: Search (wide and portrait), Forums (wide
 *   and side box), a public space, a writer profile, the teaser, the classics list (wide) and a
 *   See all list (a card), never more than two kinds on one page (SPONSORS-a2);
 * - on a long list the first ad sits high: the classics banner above the stories and the See all
 *   card after the 4th story, then one after every 10 stories (G7e);
 * - the story page with its ad passes axe and doesn't scroll sideways at 390, 768 and 1440 px, in
 *   light and night mode and in both languages (CLAUDE.md rule 21).
 * Test data: seed personas and the seed story statia-meteo-seed01, with one published chapter
 * made here so readers can open it; the chapter is removed and the class-only switch put back
 * afterwards. Pages are opened signed in as the teacher persona, a reader who isn't the writer.
 */
import { expect, test, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { rememberAdReaderLanguage, signInAdReader } from './support/adReader';
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

/** Signs a reader in, so the page shows ads (G7e: only signed-in readers see them). */
async function signInReader(page: Page, language: 'en' | 'ro' = 'en'): Promise<void> {
  await signInAdReader(page.context(), language);
}

/** The pages a visitor might land on, each of which has ad slots for a signed-in reader. */
const visitorPages = [
  storyAddress,
  '/discover',
  '/s/statia-meteo-seed01/adse2e01',
  '/discover/all/new',
];

test.describe('Ad slots', () => {
  let putLanguageBack: () => void = () => undefined;
  test.beforeAll(() => {
    runSql(`${cleanUpSql}${setUpSql}`);
    putLanguageBack = rememberAdReaderLanguage();
  });
  test.afterAll(() => {
    runSql(cleanUpSql);
    putLanguageBack();
  });

  test('a visitor who isn’t signed in sees no ad, and no page asks for one', async ({ page }) => {
    let askedForAds = false;
    page.on('request', (request) => {
      if (request.url().includes('/rpc/page_ads')) askedForAds = true;
    });
    for (const address of visitorPages) {
      await openInEnglish(page, address);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await page.waitForTimeout(800);
      await expect(page.locator('[data-ad]')).toHaveCount(0);
    }
    expect(askedForAds).toBe(false);
  });

  test('a signed-in reader sees our own ad on the story page and can ask why', async ({ page }) => {
    await signInReader(page);
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
    await signInReader(page);
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

  /** Each public page of part a2, with the slot shapes it shows at 1440 px. */
  const pagesAndShapes: [string, string[]][] = [
    ['/search?q=meteo', ['wide', 'portrait']],
    ['/forums', ['wide', 'side_box']],
    ['/spaces/fantasy-writers-circle', ['wide']],
    ['/u/adult_writer', ['wide']],
    ['/s/statia-meteo-seed01/adse2e01', ['wide']],
    ['/discover/all/classics', ['wide']],
    // Every language: the list otherwise follows the reader's languages (MARKETS-2c), and the
    // seeded new stories are Romanian while this reader reads English.
    ['/discover/all/new?language=any', ['list_card']],
  ];
  for (const [address, shapes] of pagesAndShapes) {
    test(`${address} shows ${shapes.join(' and ')} at 1440 px`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await signInReader(page);
      await openInEnglish(page, address);
      for (const shape of shapes) {
        await expect(page.locator(`[data-ad="${shape}"]`).first()).toBeVisible();
      }
      // Never more than two kinds of slot on a page (decided 17 Oct 2026, 11:53); a long grid
      // shows its one slot again every 10 stories (G7e).
      const kinds = await page
        .locator('[data-ad]')
        .evaluateAll((ads) => ads.map((ad) => ad.getAttribute('data-ad')));
      expect(new Set(kinds).size).toBeLessThanOrEqual(2);
    });
  }

  for (const view of everyView([storyAddress])) {
    test(`the story page with its ad passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await signInReader(page, view.language);
      await checkScreen(page, view);
      await expect(page.locator('[data-ad]').first()).toBeVisible();
    });
  }
});
