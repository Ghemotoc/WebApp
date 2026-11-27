/**
 * The Write page of a member with no story yet, in a real browser (board D04, user story 5.4).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - one plain empty state: what the page is, why it is empty and "New story" as the page's one
 *   main button, with no buttons in the header and no reader numbers, followers graph or tables;
 * - "Open the Story Atlas" opens the Atlas, and the three guides open their help pages, each with
 *   its kind and minutes and its one line (CMS help pages, editable from Staff › Website);
 * - no "Join a class" in the page itself (it lives in the footer);
 * - a writer whose story has no chapter out yet sees the drafts list but still no figures, so
 *   nothing shows a row of zeros;
 * - axe finds nothing serious, nothing scrolls sideways and no doodle is drawn at 390, 768 and
 *   1440 px.
 * Persona: support (…11), which has no story in the seed. Test data: one story made by SQL for the
 *   third test and removed afterwards.
 */
import AxeBuilder from '@axe-core/playwright';
import { type Browser, type Page } from '@playwright/test';
import { expect, test } from './support/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { findDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000011';
const storySlug = 'd04-first-draft-e2e';

/** Removes the spec's story and puts the writer's language back. */
function cleanUp() {
  runSql(`delete from public.chapters where story_id in
      (select id from public.stories where slug = '${storySlug}');
    delete from public.stories where slug = '${storySlug}';
    update public.profiles set locale = 'ro' where id = '${writerId}';`);
}

/**
 * Opens /write as the support persona, in English.
 *
 * @param browser - the test's browser
 * @param width - the window's width
 * @returns the open page
 */
async function openWrite(browser: Browser, width = 1440): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where id = '${writerId}';`);
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona('support')).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  const page = await context.newPage();
  // Reduce motion turns off the page's fade-in, so axe measures the colours the page settles on.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/write');
  await expect(page.getByRole('heading', { level: 1, name: 'Writing' })).toBeVisible();
  return page;
}

test.describe('Write with no story yet (board D04)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('one plain empty state with New story as the one main button', async ({ browser }) => {
    const page = await openWrite(browser);
    const main = page.getByRole('main');
    const box = main.getByRole('region', { name: 'No stories yet' });
    await expect(box).toContainText(
      'Only you can see it until you publish the first chapter; the reader numbers start then.',
    );
    await expect(box.getByRole('link', { name: 'New story' })).toHaveAttribute(
      'href',
      '/write/new',
    );
    // The box's New story is the only one, and the header has no buttons.
    await expect(main.getByRole('link', { name: 'New story' })).toHaveCount(1);
    await expect(main.getByRole('link', { name: 'Continue draft' })).toHaveCount(0);
    // No reader numbers, followers graph or tables before the first chapter.
    await expect(main.getByRole('region', { name: 'How readers respond' })).toHaveCount(0);
    await expect(main.getByRole('heading', { name: /followers?$/ })).toHaveCount(0);
    await expect(main.getByRole('heading', { name: 'Story by story' })).toHaveCount(0);
    // Join a class lives in the footer, not in the page.
    await expect(main.getByText('Join a class')).toHaveCount(0);
  });

  test('the Atlas and the three guides open where they should', async ({ browser }) => {
    const page = await openWrite(browser);
    const plan = page.getByRole('region', { name: 'Plan before you write' });
    await expect(plan.getByRole('link', { name: 'Open the Story Atlas' })).toHaveAttribute(
      'href',
      '/plan',
    );
    const guides = page.getByRole('region', { name: 'Guides for a first story' });
    const rows = guides.locator(':scope > ul > li');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0).getByRole('link')).toHaveText('Your first chapter in 5 steps');
    await expect(rows.nth(0).getByRole('link')).toHaveAttribute(
      'href',
      '/help/first-story-1-first-chapter',
    );
    await expect(rows.nth(0).locator('.meta-line > li').first()).toHaveText('Guide');
    await expect(rows.nth(0).locator('.meta-line > li').nth(1)).toHaveText(/^\d+ min$/);
    await expect(rows.nth(0)).toContainText(
      'Start late, end early, and give readers one question to carry.',
    );
    await expect(rows.nth(1).getByRole('link')).toHaveText('Show, then tell (a little)');
    await expect(rows.nth(2).getByRole('link')).toHaveText('Keeping the work yours');
    await expect(rows.nth(2).locator('.meta-line > li').first()).toHaveText('Rights');
    // The brand name comes from the settings, never a fixed word in the CMS text.
    await expect(rows.nth(2)).not.toContainText('{{');
    await rows.nth(0).getByRole('link').click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Your first chapter in 5 steps' }),
    ).toBeVisible();
  });

  test('a story with no chapter out shows its drafts, but still no figures', async ({
    browser,
  }) => {
    runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
        completion_status, rating)
      values ('${writerId}', '${storySlug}', 'Prima ciornă', 'O poveste.', 'ro',
        (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages');
      insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
        word_count)
      select id, user_id, 'd04draft', 1, 'Începutul', 'Era dimineață.', 2
      from public.stories where slug = '${storySlug}';`);
    const page = await openWrite(browser);
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Story by story' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Not published yet' })).toBeVisible();
    await expect(main.getByRole('region', { name: 'How readers respond' })).toHaveCount(0);
    await expect(main.getByRole('heading', { name: 'Latest comments' })).toHaveCount(0);
    await expect(main.getByRole('region', { name: 'No stories yet' })).toHaveCount(0);
    cleanUp();
  });

  for (const width of [390, 768, 1440]) {
    test(`passes axe, fits and draws no doodle at ${width} px`, async ({ browser }) => {
      const page = await openWrite(browser, width);
      await expect(page.getByRole('region', { name: 'Guides for a first story' })).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );
      expect(serious).toEqual([]);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      expect(await findDoodles(page)).toEqual([]);
    });
  }
});
