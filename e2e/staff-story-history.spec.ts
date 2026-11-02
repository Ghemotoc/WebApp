/**
 * A story's version history, Restore and removing a passage, in a real browser (bundle ADMIN-2,
 * part b2; story S1-E11-08, part 08b; screen 8.11).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a moderator opens a published chapter's words, which can't be typed in, selects an exact
 *   passage, gives a reason and removes it; readers then see "[Eliminat de echipa de moderare]"
 *   (the story is Romanian) and the rest of the chapter as before;
 * - the history lists the removal without its words; "Show the removed words" shows them;
 * - Restore puts the words back, as a new version, and readers see them again;
 * - support staff see the history but no Restore and no "Remove a passage";
 * - the page with the history passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: one chapter added to seed story 1; everything is put back afterwards except the
 * audit log, which nobody may change.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const weatherStationId = '00000000-0000-4000-9000-000000000001';
const chapterText = 'Prima frază. Adresa: Strada Lungă 5. Ultima frază.';
const passage = 'Strada Lungă 5';

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

/** The test chapter's ID. */
function chapterId(): string {
  return runSql(`select id from public.chapters where code = 'e2ehis01';`).trim();
}

/** Puts the seed story back as it was and removes the test chapter. */
function cleanUp() {
  runSql(`
    delete from public.notifications where story_id = '${weatherStationId}';
    delete from public.statements_of_reasons where story_id = '${weatherStationId}';
    delete from public.removed_passages where story_id = '${weatherStationId}';
    delete from public.story_revisions where story_id = '${weatherStationId}';
    delete from public.chapters where code = 'e2ehis01';
    update public.stories set first_published_at = null, last_chapter_published_at = null
      where id = '${weatherStationId}';
    update public.profiles set locale = 'ro' where handle in ('moderator', 'support');`);
}

test.describe('story history and removing a passage (S1-E11-08)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at,
      last_published_at)
      values ('${weatherStationId}', '00000000-0000-4000-8000-000000000001', 'e2ehis01', 1, 'Unu',
      '${chapterText}', 8, 'published', 'Unu', '${chapterText}', 8, now(), now());
      update public.stories set first_published_at = now(), last_chapter_published_at = now()
        where id = '${weatherStationId}';`);
  });
  test.afterAll(cleanUp);

  test('a moderator removes an exact passage, reads it back and restores it', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'moderator', `/staff/stories/${weatherStationId}`);
    await page.getByRole('button', { name: 'Remove a passage from chapter 1' }).click();
    const words = page.getByRole('textbox', { name: 'Chapter 1, read only' });
    await expect(words).toHaveValue(chapterText);
    await expect(words).toHaveAttribute('readonly', '');

    // Select the exact words, as a mouse or Shift and the arrow keys would.
    const start = chapterText.indexOf(passage);
    await words.evaluate(
      (field: HTMLTextAreaElement, range) => field.setSelectionRange(range.from, range.to),
      { from: start, to: start + passage.length },
    );
    await page.getByRole('button', { name: 'Use the selected words' }).click();
    await expect(page.locator('blockquote', { hasText: passage })).toBeVisible();
    await giveReason(page, `passage-${chapterId()}`, 'Someone’s personal data', 'A real address.');
    await page.getByRole('button', { name: 'Remove the passage' }).click();
    await expect(
      page.getByText('Saved. The writer has been told what changed and why.'),
    ).toBeVisible();

    // The history counts the characters; the words open only on request.
    const history = page.getByRole('region', { name: 'Version history' });
    await expect(history.getByText('a passage of 14 characters removed')).toBeVisible();
    await history.getByRole('button', { name: 'Show the removed words' }).click();
    await expect(history.locator('blockquote', { hasText: passage })).toBeVisible();

    // Readers see the marker in the story's language and the rest as before.
    const reader = await openAs(browser, 'support', '/s/statia-meteo-seed01/e2ehis01');
    await expect(reader.getByText(/Adresa: \[Eliminat de echipa de moderare\]\./)).toBeVisible();
    await expect(reader.getByText(passage)).toHaveCount(0);

    // Restore puts the words back.
    await history.getByRole('button', { name: 'Restore what this replaced' }).click();
    const removalId = runSql(
      `select id from public.story_revisions where story_id = '${weatherStationId}' and change_kind = 'passage';`,
    ).trim();
    await giveReason(page, `restore-${removalId}`, 'Something else', 'It was a made-up address.');
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    await expect(history.getByText('the removed passage put back')).toBeVisible();
    await expect(history.getByText(/Restores the change of/)).toBeVisible();
    await reader.reload();
    await expect(reader.getByText(chapterText)).toBeVisible();
  });

  test('support staff see the history but change nothing', async ({ browser }) => {
    const page = await openAs(browser, 'support', `/staff/stories/${weatherStationId}`);
    const history = page.getByRole('region', { name: 'Version history' });
    await expect(history.getByText('the removed passage put back')).toBeVisible();
    await expect(page.getByRole('button', { name: /Restore/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Remove a passage/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Show the removed words' })).toHaveCount(0);
  });

  for (const view of everyView([`/staff/stories/${weatherStationId}`])) {
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
