/**
 * Staff hide a story's title or cover, in a real browser (bundle ADMIN-2, part b3; story
 * S1-E11-08 criterion "hide the cover or the title"; screen 8.11).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the staff page shows the story's cover;
 * - a moderator hides the title with a reason; a reader then sees "Titlu ascuns de echipa de
 *   moderare" (the story is Romanian) instead of it, and never the real title;
 * - a moderator hides the drawn cover; the staff page says so and the history lists both changes;
 * - showing the title again brings it back for readers;
 * - support staff see the cover and the history but no "Title and cover" section;
 * - the page with a hidden title and cover passes axe and doesn't scroll sideways at 390, 768 and
 *   1440 px.
 * Test data: one chapter added to seed story 1; everything is put back afterwards except the
 * audit log, which nobody may change.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const weatherStationId = '00000000-0000-4000-9000-000000000001';
const staffAddress = `/staff/stories/${weatherStationId}`;
const marker = 'Titlu ascuns de echipa de moderare';

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

/** Puts the seed story back as it was and removes the test chapter. */
function cleanUp() {
  runSql(`
    delete from public.notifications where story_id = '${weatherStationId}';
    delete from public.statements_of_reasons where story_id = '${weatherStationId}';
    delete from public.story_revisions where story_id = '${weatherStationId}';
    delete from public.chapters where code = 'e2ehid01';
    update public.stories set first_published_at = null, last_chapter_published_at = null,
      title_hidden_at = null, cover_hidden_at = null
      where id = '${weatherStationId}';
    update public.profiles set locale = 'ro' where handle in ('moderator', 'support', 'teacher');`);
}

test.describe('hiding a title or cover (S1-E11-08)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at,
      last_published_at)
      values ('${weatherStationId}', '00000000-0000-4000-8000-000000000001', 'e2ehid01', 1, 'Unu',
      'Prima frază.', 2, 'published', 'Unu', 'Prima frază.', 2, now(), now());
      update public.stories set first_published_at = now(), last_chapter_published_at = now()
        where id = '${weatherStationId}';`);
  });
  test.afterAll(cleanUp);

  test('a moderator hides the title and the cover, and shows the title again', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'moderator', staffAddress);
    const section = page.getByRole('region', { name: 'Title and cover' });
    await expect(section.getByText('Readers see the title.')).toBeVisible();

    // Hide the title.
    await section.getByRole('button', { name: 'Hide the title' }).click();
    await giveReason(
      page,
      'presentation-title',
      'It breaks our community guidelines',
      'An insult.',
    );
    await section.getByRole('button', { name: 'Hide the title' }).click();
    await expect(
      section.getByText(/Hidden: readers see “Title hidden by the moderation team”/),
    ).toBeVisible();
    await expect(page.getByText('Title hidden from readers')).toBeVisible();

    // A reader sees the marker, never the title.
    const reader = await openAs(browser, 'teacher', '/s/statia-meteo-seed01');
    await expect(reader.getByRole('heading', { level: 1, name: marker })).toBeVisible();
    await expect(reader.getByText('Stația meteo')).toHaveCount(0);

    // Hide the cover.
    await section.getByRole('button', { name: 'Hide the cover' }).click();
    await giveReason(
      page,
      'presentation-cover',
      'It breaks our community guidelines',
      'A rude drawing.',
    );
    await section.getByRole('button', { name: 'Hide the cover' }).click();
    await expect(page.getByText('Cover hidden from readers')).toBeVisible();
    const history = page.getByRole('region', { name: 'Version history' });
    await expect(history.getByText('Title: shown → hidden')).toBeVisible();
    await expect(history.getByText('Cover: shown → hidden')).toBeVisible();

    // Show the title again: readers see it.
    await section.getByRole('button', { name: 'Show the title again' }).click();
    await giveReason(page, 'presentation-title', 'Something else', 'The title was fine.');
    await section.getByRole('button', { name: 'Show the title again' }).click();
    await expect(section.getByText('Readers see the title.')).toBeVisible();
    await reader.reload();
    await expect(reader.getByRole('heading', { level: 1, name: 'Stația meteo' })).toBeVisible();
  });

  test('support staff see the cover and history but can’t hide anything', async ({ browser }) => {
    const page = await openAs(browser, 'support', staffAddress);
    await expect(page.getByText('Cover hidden from readers')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Title and cover' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Hide the/ })).toHaveCount(0);
  });

  for (const view of everyView([staffAddress])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // The account's language wins over the browser's (S1-E1-04), so it is set to the view's.
      runSql(`update public.stories set title_hidden_at = now() where id = '${weatherStationId}';
        update public.profiles set locale = '${view.language}' where handle = 'moderator';`);
      await useSessionInBrowser(page.context(), (await signInPersona('moderator')).session);
      await checkScreen(page, view);
    });
  }
});
