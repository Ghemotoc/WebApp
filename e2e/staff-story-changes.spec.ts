/**
 * Staff change a story, in a real browser (bundle ADMIN-2, part b1; story S1-E11-08, part 08a;
 * screen 8.11).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a moderator opens teen_17's story, sees "under 18" (the age group only), corrects its category
 *   with a reason, and the writer finds a notification saying what changed and why;
 * - a change without a reason is stopped with a plain message;
 * - a moderator restricts a story, then shows it again; the status says so each time;
 * - a moderator hides one chapter, which then shows as Hidden, the rest untouched;
 * - support staff see no change controls (the server refuses them too: database test 239);
 * - the page with its controls passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: the seed stories, one chapter added to story 1; everything is put back afterwards
 * except the audit log, which nobody may change.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const weatherStationId = '00000000-0000-4000-9000-000000000001';
const lettersId = '00000000-0000-4000-9000-000000000003';
const seedStories = `'${weatherStationId}', '${lettersId}'`;

/** Opens an address in English as a persona, in a fresh browser context. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Fills the reason of one form: the reason from the list and a few words. */
async function giveReason(page: Page, idPrefix: string, label: string, words: string) {
  await page.locator(`#${idPrefix}-reason-code`).selectOption({ label });
  await page.locator(`#${idPrefix}-reason-text`).fill(words);
}

/** Puts the seed stories back as they were and removes the test chapter. */
function cleanUp() {
  runSql(`
    delete from public.notifications where story_id in (${seedStories});
    delete from public.statements_of_reasons where story_id in (${seedStories});
    delete from public.story_revisions where story_id in (${seedStories});
    delete from public.story_restrictions where story_id in (${seedStories});
    delete from public.moderated_items where item_id in (${seedStories})
      or item_id in (select id from public.chapters where code = 'e2echg01');
    delete from public.chapters where code = 'e2echg01';
    update public.stories set category_id = (select id from public.categories where slug = 'poetry')
      where id = '${lettersId}';
    update public.profiles set locale = 'ro' where handle in ('moderator', 'support', 'teen_17');`);
}

test.describe('staff change a story (S1-E11-08)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
      values ('${weatherStationId}', '00000000-0000-4000-8000-000000000001', 'e2echg01', 1, 'Unu', 'x',
      1, 'published', 'Unu', 'Text.', 1, now());`);
  });
  test.afterAll(cleanUp);

  test('a moderator corrects a category and the writer is told why', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', `/staff/stories/${lettersId}`);
    await expect(page.getByRole('heading', { name: 'Settings and details' })).toBeVisible();
    await expect(page.getByText('under 18', { exact: true })).toBeVisible();

    // Without a reason, nothing is sent.
    await page.locator('#story-settings-category').selectOption('fiction');
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(page.getByText('Pick a reason and say why in a few words.')).toBeVisible();

    // With one, it is saved and the writer is told.
    await giveReason(
      page,
      'story-settings',
      'A detail is wrong (category, tags, language or labels)',
      'This is a short story, not a poem.',
    );
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(
      page.getByText('Saved. The writer has been told what changed and why.'),
    ).toBeVisible();

    const writer = await openAs(browser, 'teen_17', '/notifications');
    await expect(writer.getByText(/we changed the category of your story/)).toBeVisible();
    await expect(
      writer.getByText('This is a short story, not a poem.', { exact: false }),
    ).toBeVisible();
  });

  test('a moderator restricts a story, shows it again and hides one chapter', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'moderator', `/staff/stories/${weatherStationId}`);
    const visibility = page.getByRole('radiogroup', { name: 'Who can find this story' });
    await visibility.getByRole('radio', { name: 'Restricted' }).click();
    await giveReason(page, 'story-visibility', 'It breaks our community guidelines', 'Spam links.');
    await page.getByRole('button', { name: 'Save who can find it' }).click();
    await expect(
      page.getByText('Saved. The writer has been told what changed and why.'),
    ).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Restricted' })).toBeChecked();

    await visibility.getByRole('radio', { name: 'Shown' }).click();
    await giveReason(page, 'story-visibility', 'Something else', 'The links are gone.');
    await page.getByRole('button', { name: 'Save who can find it' }).click();
    await expect(page.getByRole('radio', { name: 'Shown' })).toBeChecked();

    // One chapter hidden; the story itself stays shown.
    await page.getByRole('button', { name: 'Hide chapter 1' }).click();
    const chapterId = runSql(`select id from public.chapters where code = 'e2echg01';`).trim();
    await giveReason(page, `chapter-${chapterId}`, 'Someone’s personal data', 'A real address.');
    await page.getByRole('button', { name: 'Hide chapter 1' }).click();
    await expect(page.getByRole('button', { name: 'Show chapter 1 again' })).toBeVisible();
    await expect(page.getByRole('list').getByText('Hidden', { exact: true })).toBeVisible();
  });

  test('support staff see no change controls', async ({ browser }) => {
    const page = await openAs(browser, 'support', `/staff/stories/${weatherStationId}`);
    await expect(
      page.getByText('Your role can look at stories but not change them.'),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Settings and details' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Hide chapter/ })).toHaveCount(0);
  });

  for (const view of everyView([`/staff/stories/${lettersId}`])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's language wins over the browser's (S1-E1-04), so it is set to the view's.
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'moderator';`);
      await useSessionInBrowser(page.context(), (await signInPersona('moderator')).session);
      await checkScreen(page, view);
    });
  }
});
