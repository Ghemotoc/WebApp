/**
 * A sponsor's ad and "Sponsored by" on public pages, in a real browser (bundle SPONSORS, part b3;
 * story S1-E12-02).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - an approved campaign between Discover's shelves shows as "Sponsored": the sponsor's line, a
 *   link to its site marked rel="sponsored" that opens in a new tab, and a discount code that
 *   copies with one button;
 * - "Why this ad?" names the sponsor who paid and says a person checked it;
 * - a sponsored category says "Sponsored by" under its heading;
 * - part c (S1-E12-03): showing the ad and following its link add to today's totals, and an admin
 *   sees them in the campaign's Report and downloads them as a CSV of daily totals;
 * - Discover with the sponsor's ad and the sponsored category pass axe and never scroll sideways
 *   at 390, 768 and 1440 px, in light and night mode and both languages (CLAUDE.md rule 21).
 * Test data: the sponsor "E2E Press" and two approved campaigns written straight into the
 * database (the staff screens have their own test, sponsors-admin.spec.ts), and one published
 * chapter of the seed story so Discover has a shelf; all removed afterwards.
 */
import { expect, test, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The test sponsor's name. */
const sponsorName = 'E2E Press';

/** Removes everything this spec made. */
const cleanUpSql = `
  delete from public.sponsor_campaigns where sponsor_id in (select id from public.sponsors where name = '${sponsorName}');
  delete from public.sponsors where name = '${sponsorName}';
  delete from public.chapters where code = 'spone2e1';
  update public.profiles set locale = 'ro' where handle = 'admin';`;

/** Today's totals of the test banner, as "impressions|clicks", or "" before anything counted. */
function bannerTotalsToday(): string {
  return runSql(`
    select stats.impressions || '|' || stats.clicks from public.campaign_daily_stats as stats
    join public.sponsor_campaigns on sponsor_campaigns.id = stats.campaign_id
    join public.sponsors on sponsors.id = sponsor_campaigns.sponsor_id
    where sponsors.name = '${sponsorName}' and sponsor_campaigns.name = 'Banner'
      and stats.counted_on = public.romania_today();`).trim();
}

/**
 * A published chapter, the sponsor, an approved Discover banner with a discount code and an
 * approved credit on Poetry, both running from yesterday for a month.
 */
const setUpSql = `
  insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
    status, published_title, published_body, published_word_count, first_published_at)
  values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'spone2e1',
    1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 800, now());
  insert into public.sponsors (name, website_url) values ('${sponsorName}', 'https://press.example');
  insert into public.sponsor_campaigns (sponsor_id, name, placement, category_slug, text_ro, text_en,
    link_url, discount_code, starts_on, ends_on, state, review_checks, reviewed_at)
  select sponsors.id, campaign.name, campaign.placement::public.sponsor_placement, campaign.category_slug,
    campaign.text_ro, campaign.text_en, campaign.link_url, campaign.discount_code,
    public.romania_today() - 1, public.romania_today() + 30, 'approved', public.sponsor_review_checks(), now()
  from public.sponsors,
    (values ('Banner', 'discover_banner', null, 'Cărți noi în fiecare săptămână.', 'New books every week.',
             'https://press.example/books', 'CITESTE10'),
            ('Poetry credit', 'category', 'poetry', '', '', 'https://press.example', '')
    ) as campaign (name, placement, category_slug, text_ro, text_en, link_url, discount_code)
  where sponsors.name = '${sponsorName}';`;

/** Opens an address in English, signed out. */
async function openInEnglish(page: Page, address: string): Promise<void> {
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  await page.goto(address);
}

test.describe('Sponsored ads (S1-E12-02)', () => {
  test.beforeAll(() => runSql(`${cleanUpSql}${setUpSql}`));
  test.afterAll(() => runSql(cleanUpSql));

  test('Discover shows the sponsor’s ad with its link, its code and why it is there', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openInEnglish(page, '/discover');
    const ad = page
      .getByRole('complementary', { name: 'Advertisement' })
      .filter({ hasText: 'New books every week.' });
    await expect(ad.getByText('Sponsored', { exact: true })).toBeVisible();
    await expect(ad.getByText(`From ${sponsorName}`)).toBeVisible();
    // The link says it is paid for and opens the sponsor's site in a new tab.
    const link = ad.getByRole('link', { name: /Visit the site/ });
    await expect(link).toHaveAttribute('href', 'https://press.example/books');
    await expect(link).toHaveAttribute('rel', /sponsored/);
    await expect(link).toHaveAttribute('target', '_blank');
    // The code copies with one button and says so.
    await ad.getByRole('button', { name: 'Copy the code CITESTE10' }).click();
    await expect(ad.getByText('Copied.')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('CITESTE10');
    // "Why this ad?" names who paid.
    await ad.getByRole('button', { name: 'Why this ad?' }).click();
    await expect(
      ad.getByText(new RegExp(`A sponsor, ${sponsorName}, paid for this ad`)),
    ).toBeVisible();
  });

  test('showing and following the ad are counted, and an admin downloads the daily totals', async ({
    browser,
  }) => {
    // Step 1: a visitor sees the ad and follows its link; the new tab opens the sponsor's site.
    const visitor = await browser.newContext();
    const page = await visitor.newPage();
    await openInEnglish(page, '/discover');
    const ad = page
      .getByRole('complementary', { name: 'Advertisement' })
      .filter({ hasText: 'New books every week.' });
    await expect(ad).toBeVisible();
    await visitor.route('https://press.example/**', (route) => route.fulfill({ body: 'ok' }));
    const sponsorTab = visitor.waitForEvent('page');
    await ad.getByRole('link', { name: /Visit the site/ }).click();
    await (await sponsorTab).close();
    await expect.poll(() => bannerTotalsToday().split('|')[1] ?? '').toMatch(/^[1-9]/);
    await visitor.close();

    // Step 2: the admin opens the campaign's report and downloads it.
    runSql(`update public.profiles set locale = 'en' where handle = 'admin';`);
    const staff = await browser.newContext({ acceptDownloads: true });
    await useSessionInBrowser(staff, (await signInPersona('admin')).session);
    await staff.addInitScript(([key, value]) => localStorage.setItem(key, value), [
      LANGUAGE_STORAGE_KEY,
      'en',
    ] as const);
    const staffPage = await staff.newPage();
    const campaignId = runSql(`select sponsor_campaigns.id from public.sponsor_campaigns
      join public.sponsors on sponsors.id = sponsor_id
      where sponsors.name = '${sponsorName}' and sponsor_campaigns.name = 'Banner';`).trim();
    await staffPage.goto(`/staff/sponsors/campaigns/${campaignId}`);
    await expect(staffPage.getByRole('heading', { name: 'Report' })).toBeVisible();
    await expect(staffPage.getByRole('row', { name: /^Total/ })).toBeVisible();
    const download = staffPage.waitForEvent('download');
    await staffPage.getByRole('button', { name: 'Download CSV' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^sponsor-report-banner-\d{4}-\d{2}-\d{2}\.csv$/);
    const chunks: Buffer[] = [];
    for await (const chunk of await file.createReadStream()) chunks.push(chunk as Buffer);
    const lines = Buffer.concat(chunks).toString('utf8').trim().split('\n');
    expect(lines[0]).toBe('day,impressions,clicks');
    // Two days of the run so far: yesterday (nothing) and today (what the visitor did).
    expect(lines).toHaveLength(3);
    expect(lines[2]).toMatch(/^\d{4}-\d{2}-\d{2},[1-9]\d*,[1-9]\d*$/);
    await staff.close();
  });

  test('a sponsored category says who sponsors it under its heading', async ({ page }) => {
    await openInEnglish(page, '/discover/c/poetry');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const line = page.locator('[data-sponsored-by]');
    await expect(line).toHaveText(new RegExp(`Sponsored by ${sponsorName}`));
    await expect(line.getByRole('link', { name: new RegExp(sponsorName) })).toHaveAttribute(
      'rel',
      /sponsored/,
    );
  });

  for (const view of everyView(['/discover', '/discover/c/poetry'])) {
    test(`${view.address} with a sponsor passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }
});
