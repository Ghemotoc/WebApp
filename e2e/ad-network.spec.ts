/**
 * Ad-network ads in a real browser (bundle SPONSORS, part d; story S1-E12-04; ADR 0014).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - with the network off (as it is until GO-LIVE), no page asks Google for anything;
 * - switched on with a test publisher ID, Discover's wide banner is labelled "Ad", and the
 *   network's script is requested only once that slot comes into view, with the publisher ID and
 *   nothing about the reader; "Why this ad?" says it is never personalised;
 * - when the script can't load (an ad blocker), the slot shows our own "Start writing" ad.
 * The real script is never fetched: requests to Google are answered by a stub or refused.
 * Test data: the flag and the two settings, put back afterwards, and one published chapter of the
 * seed story so Discover has shelves.
 */
import { expect, test, type Page, type Request } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { rememberAdReaderLanguage, signInAdReader } from './support/adReader';

/** The test publisher ID and ad unit: the right shape, not a real account. */
const publisherId = 'ca-pub-0000000000000000';

/** Puts the network back off and removes the chapter. */
const cleanUpSql = `
  update public.feature_flags set is_enabled = false where key = 'ad_network';
  update public.settings set value = '""'::jsonb where key in ('ad_network_publisher_id', 'ad_network_slot_id');
  delete from public.chapters where code = 'netwe2e1';`;

/** One published chapter, so Discover has shelves above its wide banner. */
const chapterSql = `
  insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
    status, published_title, published_body, published_word_count, first_published_at)
  values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'netwe2e1',
    1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 800, now());`;

/** Switches the network on with the test account. */
const switchOnSql = `
  update public.feature_flags set is_enabled = true where key = 'ad_network';
  update public.settings set value = '"${publisherId}"'::jsonb where key = 'ad_network_publisher_id';
  update public.settings set value = '"1234567890"'::jsonb where key = 'ad_network_slot_id';`;

/** True for a request to Google's ad servers. */
function isToGoogle(request: Request): boolean {
  return new URL(request.url()).hostname.endsWith('googlesyndication.com');
}

/**
 * Opens Discover in English, signed in as a reader (only signed-in readers see ads, G7e), on a
 * short screen so the banner starts out of view.
 */
async function openDiscover(page: Page): Promise<Request[]> {
  await signInAdReader(page.context());
  const googleRequests: Request[] = [];
  page.on('request', (request) => {
    if (isToGoogle(request)) googleRequests.push(request);
  });
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  // A signed-in reader's Discover has its banner high (about 300 px down with the seed's one
  // shelf), so the screen is shorter than that to start the banner out of view.
  await page.setViewportSize({ width: 1440, height: 240 });
  await page.goto('/discover');
  return googleRequests;
}

test.describe('The ad network (S1-E12-04)', () => {
  test.describe.configure({ mode: 'serial' });
  // The ad reader's language is put back afterwards (only signed-in readers see ads, G7e).
  let putLanguageBack: () => void = () => undefined;
  test.beforeAll(() => {
    runSql(`${cleanUpSql}${chapterSql}`);
    putLanguageBack = rememberAdReaderLanguage();
  });
  test.afterAll(() => {
    runSql(cleanUpSql);
    putLanguageBack();
  });

  test('while the network is off, nothing is asked of Google', async ({ page }) => {
    const googleRequests = await openDiscover(page);
    const banner = page.locator('[data-ad="wide"]').first();
    await banner.scrollIntoViewIfNeeded();
    await expect(banner.getByText('From us', { exact: true })).toBeVisible();
    expect(googleRequests).toEqual([]);
  });

  test('switched on, the banner says Ad and loads the network only once it is seen', async ({
    page,
  }) => {
    runSql(switchOnSql);
    await page.route('https://pagead2.googlesyndication.com/**', (route) =>
      route.fulfill({ contentType: 'text/javascript', body: '/* stub */' }),
    );
    const googleRequests = await openDiscover(page);
    const banner = page.locator('[data-ad="wide"]').first();
    await expect(banner.getByText('Ad', { exact: true })).toBeAttached();
    // Nothing yet: the banner is below the fold of this short screen.
    expect(googleRequests).toEqual([]);
    await banner.scrollIntoViewIfNeeded();
    await expect.poll(() => googleRequests.length).toBe(1);
    expect(googleRequests[0]?.url()).toBe(
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`,
    );
    // Every request asks for non-personalised ads.
    expect(
      await page.evaluate(
        () =>
          (window as { adsbygoogle?: { requestNonPersonalizedAds?: number } }).adsbygoogle
            ?.requestNonPersonalizedAds,
      ),
    ).toBe(1);
    await banner.getByRole('button', { name: 'Why this ad?' }).click();
    await expect(banner.getByText(/never personalise ads/)).toBeVisible();
  });

  test('when the network’s script is blocked, the slot shows our own ad', async ({ page }) => {
    runSql(switchOnSql);
    await page.route('https://pagead2.googlesyndication.com/**', (route) => route.abort());
    await openDiscover(page);
    const banner = page.locator('[data-ad="wide"]').first();
    await banner.scrollIntoViewIfNeeded();
    await expect(banner.getByRole('link', { name: 'Start writing' })).toBeVisible();
  });
});
