/**
 * Staff › Sponsors › Placements in a real browser: booking a slot, the clash check, cancelling
 * and our own house ads (story S1-E12-05; bundle SPONSORS-e2).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - criterion 2: an admin books an approved campaign into Discover's wide banner; the grid then
 *   says Booked with the sponsor; a second campaign on overlapping days is refused, naming the
 *   booking already there; cancelling with a reason frees the slot;
 * - criterion 3: a signed-in reader on Discover sees the booked sponsor's ad, labelled Sponsored;
 * - criterion 6: an admin adds a house ad in both languages, linking to one of our own pages, and
 *   a link to another site is refused;
 * - Placements passes axe and never scrolls sideways at 390, 768 and 1440 px (the grid scrolls
 *   inside its own box).
 * Test data: the sponsor "E2E Slots" with two approved Discover banners, written straight into
 * the database, one published chapter of the seed story so Discover has a shelf, and the
 * bookings and house ads the screens make; all removed afterwards.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { rememberAdReaderLanguage, signInAdReader } from './support/adReader';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The test sponsor's name. */
const sponsorName = 'E2E Slots';

/** Removes everything this spec made; bookings first, because they point at the campaigns. */
const cleanUpSql = `
  delete from public.ad_bookings where campaign_id in (select sponsor_campaigns.id from public.sponsor_campaigns
    join public.sponsors on sponsors.id = sponsor_campaigns.sponsor_id where sponsors.name = '${sponsorName}');
  delete from public.house_ads where title_en like 'E2E %';
  delete from public.sponsor_campaigns where sponsor_id in (select id from public.sponsors where name = '${sponsorName}');
  delete from public.sponsors where name = '${sponsorName}';
  delete from public.chapters where code = 'slote2e1';
  update public.profiles set locale = 'ro' where handle = 'admin';`;

/** A published chapter, the sponsor and two approved Discover banners running for a month. */
const setUpSql = `
  insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
    status, published_title, published_body, published_word_count, first_published_at)
  values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'slote2e1',
    1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 800, now());
  insert into public.sponsors (name, website_url) values ('${sponsorName}', 'https://slots.example');
  insert into public.sponsor_campaigns (sponsor_id, name, placement, text_ro, text_en, link_url,
    starts_on, ends_on, state, review_checks, reviewed_at)
  select sponsors.id, campaign.name, 'discover_banner', campaign.text_ro, campaign.text_en,
    'https://slots.example/books', public.romania_today() - 1, public.romania_today() + 30, 'approved',
    public.sponsor_review_checks(), now()
  from public.sponsors,
    (values ('Slot first', 'Primul banner.', 'The first banner.'),
            ('Slot second', 'Al doilea banner.', 'The second banner.')) as campaign (name, text_ro, text_en)
  where sponsors.name = '${sponsorName}';`;

/**
 * Opens Staff › Sponsors in English as the admin persona, scrolled to Placements.
 *
 * @param browser - Playwright's browser
 * @returns the page
 */
async function openPlacements(browser: Browser): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where handle = 'admin';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('admin')).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  const page = await context.newPage();
  await page.goto('/staff/sponsors');
  await expect(page.getByRole('heading', { name: 'Placements', level: 2 })).toBeVisible();
  return page;
}

/**
 * Books one of the test campaigns into Discover's wide banner for the next week.
 *
 * @param page - the Placements page
 * @param campaignName - which campaign
 */
async function bookDiscoverBanner(page: Page, campaignName: string): Promise<void> {
  const form = page.getByRole('form', { name: 'Book a slot for a campaign' });
  await form
    .getByLabel('Campaign (approved only)')
    .selectOption({ label: `${campaignName} · ${sponsorName}` });
  await form.getByLabel('Slot', { exact: true }).selectOption({ label: 'Discover wide banner' });
  await form.getByRole('button', { name: 'Check and book' }).click();
}

test.describe('Staff › Sponsors › Placements (S1-E12-05)', () => {
  test.describe.configure({ mode: 'serial' });
  // The ad reader's language is put back afterwards (only signed-in readers see ads, G7e).
  let putLanguageBack: () => void = () => undefined;
  test.beforeAll(() => {
    runSql(`${cleanUpSql}${setUpSql}`);
    putLanguageBack = rememberAdReaderLanguage();
  });
  test.afterAll(() => {
    runSql(cleanUpSql);
    putLanguageBack();
  });

  test('an admin books a slot, a clashing booking is refused, and the visitor sees the sponsor', async ({
    browser,
  }) => {
    const page = await openPlacements(browser);
    // Step 1: the first campaign books Discover's wide banner; the grid says Booked.
    await bookDiscoverBanner(page, 'Slot first');
    await expect(page.getByText('Booked. The grid shows it now.')).toBeVisible();
    const row = page.getByRole('row').filter({ hasText: 'Discover wide banner' });
    await expect(row.getByText(`${sponsorName} · Slot first`).first()).toBeVisible();
    // Step 2: the second campaign on the same days is refused, naming the first.
    await bookDiscoverBanner(page, 'Slot second');
    await expect(
      page.getByText(/That slot is already booked on some of those days: Slot first/),
    ).toBeVisible();
    await page.context().close();

    // Step 3: a signed-in reader on Discover sees the booked sponsor, labelled Sponsored (only
    // signed-in readers see ads, G7e).
    const visitor = await browser.newPage();
    await signInAdReader(visitor.context());
    await visitor.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await visitor.goto('/discover');
    const banner = visitor.locator('[data-ad="wide"]').first();
    await expect(banner.getByText('The first banner.')).toBeVisible();
    await expect(banner.getByText('Sponsored')).toBeVisible();
    await visitor.close();
  });

  test('cancelling a booking with a reason frees the slot', async ({ browser }) => {
    const page = await openPlacements(browser);
    await page.getByRole('button', { name: 'Cancel booking: Slot first' }).click();
    await page.getByLabel('Why it’s cancelled').fill('The sponsor moved it');
    await page.getByRole('button', { name: 'Cancel it', exact: true }).click();
    await expect(page.getByText('Cancelled. The slot is free on those days.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel booking: Slot first' })).toHaveCount(0);
    await page.context().close();
  });

  test('an admin adds a house ad in both languages, and a link to another site is refused', async ({
    browser,
  }) => {
    const page = await openPlacements(browser);
    await page.getByRole('button', { name: 'New house ad' }).click();
    const form = page.getByRole('form', { name: 'New house ad' });
    await form.getByLabel('Title in Română').fill('E2E Săptămâna poeziei');
    await form.getByLabel('Title in English').fill('E2E Poetry week');
    // Another site is refused.
    await form.getByLabel('Page on our site').fill('https://example.com/');
    await form.getByRole('button', { name: 'Save house ad' }).click();
    await expect(form.getByText(/isn’t filled in correctly/)).toBeVisible();
    // One of our own pages is saved and listed.
    await form.getByLabel('Page on our site').fill('/c/poetry-week');
    await form.getByRole('button', { name: 'Save house ad' }).click();
    await expect(form.getByText('Saved. It shows between its dates.')).toBeVisible();
    await expect(page.getByText('Links to /c/poetry-week', { exact: false })).toBeVisible();
    await page.context().close();
  });

  for (const width of [390, 768, 1440]) {
    test(`Placements passes axe at ${width} px and never scrolls sideways`, async ({ browser }) => {
      const page = await openPlacements(browser);
      await page.setViewportSize({ width, height: 900 });
      const results = await new AxeBuilder({ page })
        .include('section[aria-labelledby="placements-heading"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze();
      const serious = results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      );
      expect(serious).toEqual([]);
      const isWider = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(isWider).toBe(false);
      await page.context().close();
    });
  }
});
