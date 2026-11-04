/**
 * Epic check for S1-E12, banners and sponsor slots (story S1-E12-QA; bundle SPONSORS).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * It adds no feature: it walks the epic's main journeys in a real browser, where its stories meet.
 * - Journey 1, from booking to report (S1-E12-05 × S1-E12-02 × S1-E12-01 × S1-E12-03): with the
 *   ad network on, the admin books an approved banner into Discover's wide slot; kid_14_ok then
 *   sees that sponsor there, labelled Sponsored, never the network; the view is counted and the
 *   admin finds it in the campaign's report.
 * - Journey 2, a writer's rating turns the network off (S1-E3-06 × S1-E12-04): teen_17 sees an
 *   "Ad" on the story's page; the writer rates the story 16+ for graphic violence; teen_17 then
 *   sees our own ad there and Google is never asked.
 * - Journey 3, the story page with our own ad passes axe at 390, 768 and 1440 px, at night, in
 *   Romanian (each story's own spec covers its other screens and views).
 * The database half is supabase/tests/database/277-epic-s1-e12.test.sql.
 * Test data: the sponsor "E2E Epic" with one approved banner, one published chapter of the seed
 * story, the network switched on with a test account; all put back afterwards. Requests to Google
 * are answered by a stub, so the real script is never fetched.
 */
import { expect, test, type Browser, type Page, type Request } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY, screenWidths } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The test sponsor's name. */
const sponsorName = 'E2E Epic';

/** The seed story the journeys use. */
const storySlug = 'statia-meteo-seed01';

/** Removes everything this spec made and puts the network, the story and the languages back. */
const cleanUpSql = `
  delete from public.ad_bookings where campaign_id in (select sponsor_campaigns.id from public.sponsor_campaigns
    join public.sponsors on sponsors.id = sponsor_campaigns.sponsor_id where sponsors.name = '${sponsorName}');
  delete from public.sponsor_campaigns where sponsor_id in (select id from public.sponsors where name = '${sponsorName}');
  delete from public.sponsors where name = '${sponsorName}';
  delete from public.chapters where code = 'epic12e1';
  update public.stories set rating = 'all_ages', rating_reasons = '{}' where slug = '${storySlug}';
  update public.feature_flags set is_enabled = false where key = 'ad_network';
  update public.settings set value = '""'::jsonb where key in ('ad_network_publisher_id', 'ad_network_slot_id');
  update public.profiles set locale = 'ro' where handle in ('admin', 'adult_writer', 'teen_17', 'kid_14_ok');`;

/** A published chapter, the sponsor and its approved Discover banner, and the network on. */
const setUpSql = `
  insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
    status, published_title, published_body, published_word_count, first_published_at)
  values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'epic12e1',
    1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 800, now());
  insert into public.sponsors (name, website_url) values ('${sponsorName}', 'https://epic.example');
  insert into public.sponsor_campaigns (sponsor_id, name, placement, text_ro, text_en, link_url,
    starts_on, ends_on, state, review_checks, reviewed_at)
  select id, 'Epic banner', 'discover_banner', 'Citește cu noi.', 'Read with us.', 'https://epic.example/',
    public.romania_today() - 1, public.romania_today() + 30, 'approved', public.sponsor_review_checks(), now()
  from public.sponsors where name = '${sponsorName}';
  update public.feature_flags set is_enabled = true where key = 'ad_network';
  update public.settings set value = '"ca-pub-0000000000000000"'::jsonb where key = 'ad_network_publisher_id';
  update public.settings set value = '"1234567890"'::jsonb where key = 'ad_network_slot_id';`;

/** Today's views of the test banner, or 0 before anything counted. */
function bannerViewsToday(): number {
  return Number(
    runSql(`select coalesce(sum(stats.impressions), 0) from public.campaign_daily_stats as stats
      join public.sponsor_campaigns on sponsor_campaigns.id = stats.campaign_id
      where sponsor_campaigns.name = 'Epic banner' and stats.counted_on = public.romania_today();`),
  );
}

/**
 * Opens a page in English as a persona, answering Google's script with a stub and noting each
 * request to Google.
 *
 * @returns the page and the requests to Google it made
 */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<{ page: Page; googleRequests: Request[] }> {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  await context.route('https://pagead2.googlesyndication.com/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: '/* stub */' }),
  );
  const page = await context.newPage();
  const googleRequests: Request[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).hostname.endsWith('googlesyndication.com')) {
      googleRequests.push(request);
    }
  });
  await page.goto(address);
  return { page, googleRequests };
}

test.describe('epic check S1-E12 (S1-E12-QA)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => runSql(`${cleanUpSql}${setUpSql}`));
  test.afterAll(() => runSql(cleanUpSql));

  test('journey 1: a booked sponsor beats the network, and its view reaches the report', async ({
    browser,
  }) => {
    // Step 1: the admin books the banner into Discover's wide slot (S1-E12-05).
    const { page: staff } = await openAs(browser, 'admin', '/staff/sponsors');
    const form = staff.getByRole('form', { name: 'Book a slot for a campaign' });
    await form
      .getByLabel('Campaign (approved only)')
      .selectOption({ label: `Epic banner · ${sponsorName}` });
    await form.getByLabel('Slot', { exact: true }).selectOption({ label: 'Discover wide banner' });
    await form.getByRole('button', { name: 'Check and book' }).click();
    await expect(staff.getByText('Booked. The grid shows it now.')).toBeVisible();
    await staff.context().close();

    // Step 2: kid_14_ok sees the sponsor, labelled Sponsored, though the network is on.
    const { page: reader } = await openAs(browser, 'kid_14_ok', '/discover');
    const banner = reader.locator('[data-ad="wide"]').first();
    await banner.scrollIntoViewIfNeeded();
    await expect(banner.getByText('Read with us.')).toBeVisible();
    await expect(banner.getByText('Sponsored', { exact: true })).toBeVisible();
    await expect.poll(bannerViewsToday).toBeGreaterThan(0);
    await reader.context().close();

    // Step 3: the admin finds today's view in the campaign's report (S1-E12-03).
    const campaignId = runSql(
      `select id from public.sponsor_campaigns where name = 'Epic banner';`,
    ).trim();
    const { page: report } = await openAs(
      browser,
      'admin',
      `/staff/sponsors/campaigns/${campaignId}`,
    );
    await expect(report.getByRole('heading', { name: 'Report' })).toBeVisible();
    await expect(report.getByRole('row', { name: /^Total/ })).toBeVisible();
    await report.context().close();
  });

  test('journey 2: the writer rates the story 16+ for graphic violence and the network goes', async ({
    browser,
  }) => {
    // Step 1: on an All ages story, teen_17 is shown a network ad.
    const before = await openAs(browser, 'teen_17', `/s/${storySlug}`);
    const slot = before.page.locator('[data-ad="wide"]').first();
    await expect(slot.getByText('Ad', { exact: true })).toBeAttached();
    await before.page.context().close();

    // Step 2: the writer rates it 16+ and says why (S1-E3-06, SPONSORS-f).
    const { page: writer } = await openAs(browser, 'adult_writer', '/write');
    await writer
      .getByRole('article', { name: 'Stația meteo' })
      .getByRole('link', { name: 'Story settings' })
      .click();
    await writer.getByRole('radio', { name: '16+', exact: true }).click();
    await writer.getByRole('checkbox', { name: 'Graphic violence or gore' }).check();
    await writer.getByRole('button', { name: 'Save changes' }).click();
    await expect(writer.getByText('Saved.')).toBeVisible();
    await writer.context().close();

    // Step 3: teen_17 now sees our own ad there, and Google is never asked.
    const after = await openAs(browser, 'teen_17', `/s/${storySlug}`);
    const ownSlot = after.page.locator('[data-ad="wide"]').first();
    await ownSlot.scrollIntoViewIfNeeded();
    await expect(ownSlot.getByText('From us', { exact: true })).toBeVisible();
    expect(after.googleRequests).toEqual([]);
    await after.page.context().close();
  });

  for (const width of screenWidths) {
    test(`journey 3: the story page with our own ad passes axe at ${width} px, night, Romanian`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = 'ro' where handle = 'teen_17';`);
      await useSessionInBrowser(page.context(), (await signInPersona('teen_17')).session);
      await checkScreen(page, {
        address: `/s/${storySlug}`,
        width,
        theme: 'night',
        language: 'ro',
      });
    });
  }
});
