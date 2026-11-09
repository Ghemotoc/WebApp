/**
 * Design a cover in Canva, in a real browser, with the Canva stand-in (story S1-E3-12; ADR 0009).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first). The
 * local server's /api/canva/… always uses the stand-in, whose consent page and editor are our own
 * small pages, so nothing leaves the machine; /api/picture-check uses the stub provider.
 * What it proves (with canva_covers and picture_uploads switched on for the test):
 * - Story settings shows "Design it in Canva (opens a new tab)" and the note that Canva's rules
 *   apply there; it opens a new tab;
 * - a writer who hasn't connected goes to the consent page first, and saying no there shares
 *   nothing (criterion 4);
 * - after Allow, a blank design opens; Return brings it back, it goes through the picture check
 *   and becomes the story's cover (criteria 1 to 3); back in the settings tab, the new cover
 *   shows by itself, labelled as waiting for its check (IDEAS-2d, idea IDEA-20261101-11);
 * - Settings shows the connection and Disconnect removes it;
 * - with canva_covers off, neither the button nor the Settings section shows;
 * - the pages pass axe and fit at 390 (Romanian), 768 and 1440 px.
 * Test data: adult_writer's seed story "The Girl Who Fixed Radios" (automatic cover); its cover,
 * picture checks, cases and the Canva connection are put back afterwards.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { waitForAnimationsToFinish } from './support/animations';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';
import { approveWaitingPictures } from './support/pictures';

const writerId = '00000000-0000-4000-8000-000000000001';
const storyId = '00000000-0000-4000-9000-000000000002';
const settingsAddress = '/write/s/the-girl-who-fixed-radios-seed02/settings';

/** Puts the story, the flags and the connection back as the seed has them. */
function cleanUp() {
  runSql(`
    update public.feature_flags set is_enabled = false where key in ('canva_covers', 'picture_uploads');
    delete from vault.secrets where name = 'picture_check_secret';
    delete from public.canva_connections where user_id = '${writerId}';
    update public.stories set cover_kind = 'automatic', cover_tall_path = null, cover_square_path = null where id = '${storyId}';
    delete from public.notifications where case_id in (select case_id from public.picture_checks where story_id = '${storyId}');
    delete from public.case_actions where case_id in (select case_id from public.picture_checks where story_id = '${storyId}');
    with removed as (delete from public.picture_checks where story_id = '${storyId}' returning case_id)
    delete from public.cases where id in (select case_id from removed);
    delete from public.rate_limit_events where user_id = '${writerId}';
    update public.profiles set locale = 'ro' where handle = 'adult_writer';`);
}

/** Switches the two flags and the picture check's local secret on. */
function switchOn() {
  runSql(`
    update public.feature_flags set is_enabled = true where key in ('canva_covers', 'picture_uploads');
    select vault.create_secret('local-e2e-picture-secret', 'picture_check_secret');`);
}

/** Opens an address as adult_writer at a width, in a language. */
async function openAsWriter(
  browser: Browser,
  address: string,
  view: { width: number; language: string } = { width: 1440, language: 'en' },
): Promise<Page> {
  runSql(`update public.profiles set locale = '${view.language}' where handle = 'adult_writer';`);
  const context = await browser.newContext({ viewport: { width: view.width, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    view.language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Presses "Design it in Canva" and gives back the new tab. */
async function pressDesignInCanva(page: Page): Promise<Page> {
  const link = page.getByRole('link', { name: 'Design it in Canva (opens a new tab)' });
  await expect(link).toHaveAttribute('target', '_blank');
  const [tab] = await Promise.all([page.context().waitForEvent('page'), link.click()]);
  return tab;
}

/** Checks axe and the page width. */
async function expectAccessibleAndFitting(page: Page, width: number) {
  await waitForAnimationsToFinish(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious).toEqual([]);
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(width);
}

test.describe('design a cover in Canva (S1-E3-12)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    switchOn();
  });
  test.afterAll(cleanUp);

  test('saying no on the consent page shares nothing', async ({ browser }) => {
    const page = await openAsWriter(browser, settingsAddress);
    await expect(page.getByText('Canva’s rules apply there')).toBeVisible();
    const tab = await pressDesignInCanva(page);
    await expect(tab.getByRole('heading', { name: /connect your account/ })).toBeVisible();
    await tab.getByRole('link', { name: 'Cancel' }).click();
    await expect(tab.getByText('nothing was shared with Canva')).toBeVisible();
    await expect(tab.getByRole('link', { name: 'Back to your story’s settings' })).toBeVisible();
    expect(
      runSql(`select count(*) from public.canva_connections where user_id = '${writerId}'`),
    ).toBe('0');
    await page.context().close();
  });

  test('connect, design, Return: the design becomes the checked cover', async ({ browser }) => {
    const page = await openAsWriter(browser, settingsAddress);
    const tab = await pressDesignInCanva(page);
    await tab.getByRole('link', { name: 'Allow' }).click();
    // Criterion 1: after connecting, the blank design opens in the same tab.
    await expect(tab.getByRole('heading', { name: /your design/ })).toBeVisible();
    expect(
      runSql(`select count(*) from public.canva_connections where user_id = '${writerId}'`),
    ).toBe('1');
    await tab.getByRole('link', { name: 'Return' }).click();
    // Criteria 2 and 3: back, uploaded through the picture check and saved as the cover.
    await expect(tab.getByText('Canva cover saved.')).toBeVisible();
    // The seed story is All ages, so the cover waits for a moderator (ADMIN-2e1b).
    await expect(tab.getByText(/up to two days when a person/)).toBeVisible();
    expect(
      runSql(
        `select cover_kind || ' ' || (cover_tall_path like '${storyId}/%')::text from public.stories where id = '${storyId}'`,
      ),
    ).toBe('upload true');
    expect(
      runSql(
        `select status from public.picture_checks where story_id = '${storyId}' order by created_at desc limit 1`,
      ),
    ).toBe('held');
    // IDEAS-2d: back in the settings tab, the new cover shows by itself, waiting for its check.
    await page.bringToFront();
    await page.evaluate(() =>
      document.dispatchEvent(new Event('visibilitychange', { bubbles: true })),
    );
    const arrived = page.getByRole('status').filter({ hasText: 'Your new cover from Canva' });
    await expect(arrived).toBeVisible();
    await expect(arrived.getByText(/Waiting for a/)).toBeVisible();
    expect(approveWaitingPictures(`story_id = '${storyId}'`)).toBe('1');
    await page.context().close();
  });

  test('a second design skips the consent page once connected', async ({ browser }) => {
    const page = await openAsWriter(browser, settingsAddress);
    const tab = await pressDesignInCanva(page);
    await expect(tab.getByRole('heading', { name: /your design/ })).toBeVisible();
    await page.context().close();
  });

  test('Settings shows the connection, and Disconnect removes it', async ({ browser }) => {
    const page = await openAsWriter(browser, '/settings#account');
    const section = page.getByRole('region', { name: 'Canva' });
    await expect(section.getByText(/Connected since/)).toBeVisible();
    await expectAccessibleAndFitting(page, 1440);
    await section.getByRole('button', { name: 'Disconnect Canva' }).click();
    await expect(section.getByText(/Not connected/)).toBeVisible();
    expect(
      runSql(`select count(*) from public.canva_connections where user_id = '${writerId}'`),
    ).toBe('0');
    await page.context().close();
  });

  for (const [width, language] of [
    [390, 'ro'],
    [768, 'en'],
    [1440, 'en'],
  ] as const) {
    test(`the cover button and the return page pass axe and fit at ${width} px`, async ({
      browser,
    }) => {
      const page = await openAsWriter(browser, settingsAddress, { width, language });
      await expect(page.locator('a[href^="/canva/start"]')).toBeVisible();
      await expectAccessibleAndFitting(page, width);
      await page.goto('/canva/return?error=access_denied&state=x');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectAccessibleAndFitting(page, width);
      await page.context().close();
    });
  }

  test('with canva_covers off, neither the button nor the Settings section shows', async ({
    browser,
  }) => {
    runSql(`update public.feature_flags set is_enabled = false where key = 'canva_covers';`);
    const page = await openAsWriter(browser, settingsAddress);
    await expect(page.getByText('Upload a picture').first()).toBeVisible();
    await expect(page.locator('a[href^="/canva/start"]')).toHaveCount(0);
    await page.goto('/settings#account');
    await expect(page.getByRole('region', { name: 'Email address' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Canva' })).toHaveCount(0);
    await page.context().close();
  });
});
