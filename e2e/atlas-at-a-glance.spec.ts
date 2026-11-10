/**
 * Story Atlas's first page in a real browser (stories S1-E17-01 to S1-E17-06; bundle ATLAS,
 * part a).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - New story from Story Atlas makes the story and its plan and opens the at-a-glance page, with
 *   a 90,000-word target and no chapters (S1-E17-01);
 * - each detail saves by itself and is still there after a reload; the title is the story's own,
 *   so a new title shows in the switcher (S1-E17-03);
 * - a linked project refuses an address that isn't http or https, and "Open <name>" opens a new
 *   tab with rel="noopener" (S1-E17-04);
 * - Delete asks twice (S1-E17-05);
 * - the switcher moves between stories and /plan lists the plans, the story open last first
 *   (S1-E17-02, G10a);
 * - "Plan" sits beside "Story settings" on Your writing; another writer can't open someone
 *   else's plan;
 * - the page passes axe, doesn't scroll sideways and draws no doodle at 390, 768 and
 *   1440 px, light and night, Romanian and English.
 * Test data: adult_writer makes "Atlas test" stories (deleted at the end); suspended_user (whose
 * language no other spec changes) gets one seeded story for the accessibility checks.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const suspendedUserId = '00000000-0000-4000-8000-000000000013';
const axeAddress = '/plan/s/atlas-axe-seed01';

/** Removes this spec's stories (their plans and chapters go with them) and resets languages. */
function cleanUp() {
  runSql(`delete from public.stories where title like 'Atlas test%' or slug = 'atlas-axe-seed01';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teacher', 'suspended_user');`);
}

/** suspended_user's story with one drafted chapter, for the accessibility checks. */
function seedAxeStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating)
    values ('${suspendedUserId}', 'atlas-axe-seed01', 'Harta din podul bunicii', 'O hartă veche.', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages');
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count)
    select id, user_id, 'atlasax1', 1, 'Podul', 'x', 1200 from public.stories where slug = 'atlas-axe-seed01';
    update public.story_plans set logline = 'O fată găsește o hartă care se schimbă noaptea.'
    where story_id = (select id from public.stories where slug = 'atlas-axe-seed01');`);
}

/** Opens an address in English as a persona, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName, path: string): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

/** The story's title on the at-a-glance page: the heading inside the story card. */
function storyTitle(page: Page) {
  return page.locator('#atlas-summary-title');
}

/** The first plan card's link on /plan (the card's title, stretched over the card). */
function firstPlanLink(page: Page) {
  return page.getByRole('article').first().getByRole('link').first();
}

/** Fills New story's required answers and creates the story. */
async function createStory(page: Page, title: string) {
  await page.getByRole('textbox', { name: 'Title' }).fill(title);
  await page.getByRole('radio', { name: 'Română' }).click();
  await page.getByRole('radio', { name: 'Fiction' }).click();
  await page.getByRole('radio', { name: 'All ages', exact: true }).click();
  await page.getByRole('radio', { name: 'No AI', exact: true }).click();
  await page.getByRole('button', { name: /^Create/ }).click();
}

test.describe('Story Atlas at a glance (S1-E17-01 to S1-E17-06)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedAxeStory);
  test.afterAll(cleanUp);

  test('New story from Story Atlas opens the plan, and every detail saves by itself', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', '/write/new?from=plan');
    await createStory(page, 'Atlas test: harta');
    // The story and its plan, on the at-a-glance page (S1-E17-01).
    await expect(page).toHaveURL(/\/plan\/s\/[a-z0-9-]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('At a glance');
    await expect(storyTitle(page)).toHaveText('Atlas test: harta');
    await expect(page.getByText('0 of 90,000 words')).toBeVisible();
    await expect(page.getByText('No chapters yet.')).toBeVisible();

    // The plan's own fields save by themselves (S1-E17-03).
    await page.getByLabel('Logline', { exact: true }).fill('A map that changes at night.');
    await page.getByRole('textbox', { name: 'Word target' }).fill('60000');
    await expect(page.locator('#atlas-word-target-save')).toHaveText('Saved');
    await page.getByLabel('Writing status').selectOption('drafting');
    await expect(page.locator('#atlas-writing-status-save')).toHaveText('Saved');
    await expect(page.locator('#atlas-logline-save')).toHaveText('Saved');
    // A word target the database wouldn't take waits with a plain message.
    await page.getByRole('textbox', { name: 'Word target' }).fill('0');
    await expect(page.locator('#atlas-word-target-save')).toHaveText(/whole number of words/);
    await page.getByRole('textbox', { name: 'Word target' }).fill('60000');
    await expect(page.locator('#atlas-word-target-save')).toHaveText('Saved');

    // The title is the story's own: the switcher shows the new one (S1-E17-03).
    await page.getByRole('textbox', { name: 'Title' }).fill('Atlas test: harta nopții');
    await expect(page.locator('#atlas-title-save')).toHaveText('Saved');
    await expect(page.getByLabel('Story', { exact: true })).toContainText(
      'Atlas test: harta nopții',
    );

    // Still there after a reload, and in the summary.
    await page.reload();
    const summary = page.getByRole('region', { name: 'The story' });
    await expect(summary).toContainText('A map that changes at night.');
    await expect(summary).toContainText('Drafting');
    await expect(page.getByText('0 of 60,000 words')).toBeVisible();
    await expect(storyTitle(page)).toHaveText('Atlas test: harta nopții');
    await page.context().close();
  });

  test('a linked project takes only web addresses and opens in a new tab', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/plan');
    // /plan lists the plans, the one planned last first: here the new one (S1-E17-02 and G10a,
    // a fresh device: the newest). Its card opens the plan.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Story plans');
    await expect(firstPlanLink(page)).toHaveText('Atlas test: harta nopții');
    await firstPlanLink(page).click();
    await expect(storyTitle(page)).toHaveText('Atlas test: harta nopții');
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Mood board');
    await expect(page.locator('#atlas-linked-label-save')).toHaveText('Saved');
    const address = page.getByRole('textbox', { name: 'Web address' });
    await address.fill('ftp://example.com/board');
    await expect(page.locator('#atlas-linked-address-save')).toHaveText(/starts with http/);
    await address.fill('https://example.com/board');
    await expect(page.locator('#atlas-linked-address-save')).toHaveText('Saved');
    const open = page.getByRole('link', { name: /Open Mood board/ });
    await expect(open).toHaveAttribute('href', 'https://example.com/board');
    await expect(open).toHaveAttribute('target', '_blank');
    await expect(open).toHaveAttribute('rel', /noopener/);
    await page.context().close();
  });

  test('the switcher moves between stories, and /plan opens the one open last', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', '/write');
    // "Plan" sits beside "Story settings" on each story card.
    await page
      .getByRole('article')
      .filter({ hasText: 'Atlas test: harta nopții' })
      .getByRole('link', { name: 'Plan', exact: true })
      .click();
    await expect(page).toHaveURL(/\/plan\/s\//);
    await page.getByLabel('Story', { exact: true }).selectOption('statia-meteo-seed01');
    await expect(page).toHaveURL(/\/plan\/s\/statia-meteo-seed01$/);
    await expect(storyTitle(page)).not.toHaveText(/Atlas test/);
    // Back on the list, the story open last comes first.
    await page.goto('/plan');
    await expect(firstPlanLink(page)).toHaveAttribute('href', '/plan/s/statia-meteo-seed01');
    await page.context().close();
  });

  test('another writer can’t open someone else’s plan', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/plan/s/statia-meteo-seed01');
    await expect(page.getByText('We couldn’t find that story on this account.')).toBeVisible();
    await expect(page.getByText('Story details')).toHaveCount(0);
    await page.context().close();
  });

  test('Delete asks twice, then hides the story with undo', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/write');
    await page
      .getByRole('article')
      .filter({ hasText: 'Atlas test: harta nopții' })
      .getByRole('link', { name: 'Plan', exact: true })
      .click();
    const deleteSection = page.getByRole('region', { name: 'Delete this story' });
    await deleteSection.getByRole('button', { name: 'Delete story' }).click();
    await deleteSection.getByRole('button', { name: 'Yes, delete story' }).click();
    await expect(deleteSection.getByText('Last check.')).toBeVisible();
    await deleteSection.getByRole('button', { name: 'Delete story' }).click();
    await expect(deleteSection.getByRole('button', { name: 'Undo' })).toBeVisible();
    await page.context().close();
  });

  for (const view of everyView([axeAddress])) {
    test(`at a glance passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      runSql(
        `update public.profiles set locale = '${view.language}' where id = '${suspendedUserId}';`,
      );
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('suspended_user')).session);
      const page = await context.newPage();
      await checkScreen(page, view);
      await expect(storyTitle(page)).toHaveText('Harta din podul bunicii');
      await expectNoDoodles(page);
      await context.close();
    });
  }
});
