/**
 * The campaign landing page of board A10 in a real browser (BOOKS-A10, user story 1.10).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the hero shows its kicker, its title with the violet second line, the live count once five
 *   writers wrote this month, and "How it works" jumps to the steps;
 * - a visitor's "Join for free" opens Sign up with the hero's link remembered, and a member sees
 *   "Join writing month", which opens the link;
 * - a page that has ended says "Ended on …" and its button goes to Read;
 * - the steps have a line icon in a round tile, and the questions are open with a line between;
 * - the page follows the look rules and passes axe at 390, 768 and 1440 px, light and night,
 *   ro and en.
 * Test data: the page "writing-month-e2e" and five writing days marked with 1234567 words, on
 * accounts no writing month spec uses; removed afterwards.
 */
import { expect, test } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectLookRules } from './support/lookCheck';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The page's address part after /c/. */
const slug = 'writing-month-e2e';

/** The words each marked writing day holds, so the clean-up finds exactly these rows. */
const markedWords = 1234567;

/** Removes the spec's page and writing days. */
function cleanUp() {
  runSql(`delete from public.landing_pages where slug = '${slug}';
    delete from public.writing_days where words = ${markedWords};`);
}

/** One block's words in both languages (the page reads the visitor's language). */
function both(words: Record<string, unknown>): string {
  const json = JSON.stringify(words);
  return `"en": ${json}, "ro": ${json}`;
}

/** The page's blocks: a hero with both buttons and the live count, steps and questions. */
const content = `{"theme": "plum", "blocks": [
  {"id": "hero", "kind": "hero", "link": "/hub", "live_count": true, ${both({
    kicker: 'Writing month · 1 to 30 November',
    title: 'Write 15,000 words',
    title_accent: 'in November.',
    intro: 'Track your words and post chapter one by the end of the month.',
    button_label: 'Join for free',
    member_button_label: 'Join writing month',
  })}},
  {"id": "steps", "kind": "steps", ${both({
    heading: 'Three steps to a first draft',
    entries: [
      { title: 'Set a goal', body: 'Pick 5,000, 15,000 or 50,000 words.' },
      { title: 'Write every day', body: 'Words count in the editor.' },
      { title: 'Post chapter one', body: 'Readers find new stories on Read.' },
    ],
  })}},
  {"id": "questions", "kind": "questions", ${both({
    heading: 'Before you start',
    items: [
      { question: 'Is it free?', answer: 'Yes. Writing month is free.' },
      { question: 'Can I write in Romanian?', answer: 'Yes. Write in Romanian or English.' },
    ],
  })}}
]}`;

/**
 * Publishes the page, live since yesterday, and taken down from tomorrow or yesterday.
 *
 * @param hasEnded - true for a page whose take-down date has passed
 */
function seedPage(hasEnded: boolean) {
  const showFrom = hasEnded ? `current_date - 40` : `current_date - 1`;
  const takeDownOn = hasEnded ? `current_date - 1` : `current_date + 10`;
  runSql(`delete from public.landing_pages where slug = '${slug}';
    with page as (
      insert into public.landing_pages (slug, page_type) values ('${slug}', 'campaign') returning id
    )
    insert into public.landing_page_versions (page_id, content, status, show_from, take_down_on, published_at)
    select id, $json$${content}$json$::jsonb, 'published', ${showFrom}, ${takeDownOn}, now() from page;`);
}

test.describe('campaign landing page (BOOKS-A10, board A10)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    cleanUp();
    // Five writers this month, so the live count shows (it says nothing under five).
    runSql(`insert into public.writing_days (user_id, day, words)
      select id, public.romania_today(), ${markedWords} from public.profiles
      where handle in ('blocker', 'blocked', 'banned_user', 'suspended_user', 'failed_check')
      on conflict (user_id, day) do nothing;`);
    seedPage(false);
  });
  test.afterAll(cleanUp);

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(([key]) => localStorage.setItem(key, 'en'), [
      LANGUAGE_STORAGE_KEY,
    ] as const);
  });

  test('a visitor sees the hero, the live count, the steps and the questions as drawn', async ({
    page,
  }) => {
    await page.goto(`/c/${slug}`);
    await expect(page.getByText('Writing month · 1 to 30 November')).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: /^Write 15,000 words\s*in November\.$/ }),
    ).toBeVisible();
    // The live count: rounded to one decimal in the compact form ("6.2M").
    await expect(page.getByText('Live count')).toBeVisible();
    await expect(page.getByText(/^\d+(\.\d)?[KMB]$/)).toBeVisible();
    await expect(page.getByText('words written so far this month')).toBeVisible();
    // Each step has a round tile with a line icon (an svg, never an emoji) and "Step 1".
    const steps = page.getByRole('list').filter({ hasText: 'Set a goal' });
    await expect(steps.locator('li svg')).toHaveCount(3);
    await expect(steps.getByText('Step 1')).toBeVisible();
    // Questions are open: every answer reads without a click.
    await expect(page.getByText('Yes. Write in Romanian or English.')).toBeVisible();
    // "How it works" jumps to the steps.
    await page.getByRole('link', { name: 'How it works' }).click();
    await expect(page).toHaveURL(/#landing-steps$/);
    await expectLookRules(page);
  });

  test('Join for free opens Sign up with the campaign remembered', async ({ page }) => {
    await page.goto(`/c/${slug}`);
    const join = page.getByRole('link', { name: 'Join for free' });
    await expect(join).toHaveAttribute('href', '/sign-up?next=%2Fhub');
    await join.click();
    await expect(page).toHaveURL(/\/sign-up\?next=%2Fhub$/);
    // Sign up keeps the page for after setup, so the new member lands in writing month.
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('path-after-sign-up')))
      .toBe('/hub');
  });

  test('a signed-in member sees Join writing month, which opens writing month', async ({
    page,
  }) => {
    await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
    await page.goto(`/c/${slug}`);
    // The member's account language may be Romanian once the profile loads; both pages say it.
    await expect(page.getByRole('link', { name: 'Join writing month' })).toHaveAttribute(
      'href',
      '/hub',
    );
  });

  test('an ended campaign says when it ended and its button goes to Read', async ({ page }) => {
    seedPage(true);
    await page.goto(`/c/${slug}`);
    await expect(
      page.getByRole('status').filter({ hasText: /This campaign has ended\. Ended on / }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Join for free' })).toHaveAttribute(
      'href',
      '/discover',
    );
    seedPage(false);
  });

  for (const view of everyView([`/c/${slug}`])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }
});
