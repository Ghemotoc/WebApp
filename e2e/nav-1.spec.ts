/**
 * Getting around as a writer, in a real browser (bundle NAV-1; Robert, 6 Nov 2026, 18:40 UTC).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the account menu starts with the person's name and @username, which opens their public
 *   profile, then "Edit profile", which opens Settings › Profile;
 * - the Library has a "My stories" chip with the writer's own stories, drafts included, and a card
 *   opens the story's chapters in the writing tools;
 * - the Library's My stories shelf and the open account menu pass axe at 390 px, light, ro and en.
 * Test data: a draft story "Ciorna din raft" for adult_writer, removed afterwards.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const draftSlug = 'nav1-draft';

/** Removes the spec's draft story and puts the writer's language back. */
function cleanUp() {
  runSql(`delete from public.stories where slug = '${draftSlug}';
    update public.profiles set locale = 'ro' where handle = 'adult_writer';`);
}

/** A story with no published chapter yet, so it is a draft that only its writer sees. */
function seedDraft() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating)
    values ('${writerId}', '${draftSlug}', 'Ciorna din raft', 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages');`);
}

/** Opens a page as adult_writer on a fresh device, in the given language. */
async function openAsWriter(browser: Browser, path: string, language: 'en' | 'ro' = 'en') {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = '${language}' where handle = 'adult_writer';`);
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('getting around as a writer (NAV-1)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedDraft);
  test.afterAll(cleanUp);

  test('the name in the account menu opens the public profile; Edit profile opens Settings', async ({
    browser,
  }) => {
    const page = await openAsWriter(browser, '/discover');
    // Step 1: the menu's first row is the person, linking to their own public profile.
    await page.getByRole('button', { name: 'Your account' }).click();
    const profileLink = page.getByRole('link', { name: /@adult_writer/ });
    await expect(profileLink).toHaveAttribute('href', '/u/adult_writer');
    await expect(profileLink).toContainText('View your public profile');
    await profileLink.click();
    await expect(page).toHaveURL(/\/u\/adult_writer$/);
    // Step 2: "Edit profile" opens the Profile group of Settings.
    await page.getByRole('button', { name: 'Your account' }).click();
    await page.getByRole('link', { name: 'Edit profile' }).click();
    await expect(page).toHaveURL(/\/settings#profile$/);
    await page.context().close();
  });

  test('the Library shows the writer’s own stories, drafts included, under My stories', async ({
    browser,
  }) => {
    const page = await openAsWriter(browser, '/library');
    const chips = page.getByRole('radiogroup', { name: 'Shelf' });
    await chips.getByRole('radio', { name: /^My stories \(\d+\)$/ }).click();
    // The draft is there, marked Draft, and opens its chapters in the writing tools.
    const draftCard = page.getByRole('link', { name: /Ciorna din raft/ }).first();
    await expect(draftCard).toContainText('Draft');
    await expect(draftCard).toHaveAttribute('href', `/write/s/${draftSlug}/chapters`);
    await expect(
      page.getByRole('link', {
        name: 'Open Your writing for numbers, comments and every story tool',
      }),
    ).toHaveAttribute('href', '/write');
    await page.context().close();
  });

  for (const language of ['ro', 'en'] as const) {
    test(`axe: My stories in the Library at 390 px, light, ${language}`, async ({ browser }) => {
      const page = await openAsWriter(browser, '/library', language);
      await checkScreen(
        page,
        { address: '/library', width: 390, theme: 'light', language },
        async (screen) => {
          const chipName = language === 'ro' ? /^Poveștile mele \(\d+\)$/ : /^My stories \(\d+\)$/;
          await screen.getByRole('radio', { name: chipName }).click();
          await expect(screen.getByRole('link', { name: /Ciorna din raft/ }).first()).toBeVisible();
        },
      );
      await page.context().close();
    });

    test(`axe: the open account menu at 390 px, light, ${language}`, async ({ browser }) => {
      const page = await openAsWriter(browser, '/discover', language);
      await checkScreen(
        page,
        { address: '/discover', width: 390, theme: 'light', language },
        async (screen) => {
          const accountName = language === 'ro' ? 'Contul tău' : 'Your account';
          await screen.getByRole('button', { name: accountName }).click();
          await expect(screen.getByRole('link', { name: /@adult_writer/ })).toBeVisible();
        },
      );
      await page.context().close();
    });
  }
});
