/**
 * Footnotes in a real browser (BOOKS-D05b; boards D13-EditorFootnotes and B15-ReaderFootnotes).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * 1. the writer presses Footnote ("fn") in the toolbar; the note's box opens under its number
 *    with the focus in its field, Done closes it with the caret after the number, the Notes list
 *    under the text shows the note, the foot says "notes not counted", and the saved text holds
 *    the note where its number sits (`[note](footnote:)`) while the word count leaves it out;
 * 2. a reader opens the number (a button named "Footnote 1"), reads the note in its box, closes
 *    it with Escape back to the number, and from the Notes list under the text goes back to the
 *    number; on a 390 px phone the note opens in the bottom sheet;
 * 3. the reader with the note open, and the editor with the note's box open, pass axe at 390,
 *    768 and 1440 px, light and night, ro and en, and draw no doodle.
 * Test data: one chapter made in SQL on adult_writer's seed story "The girl who fixed radios";
 * only that chapter is removed after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { editorSaveStatus } from './support/chapterEditor';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000002';
const slug = 'the-girl-who-fixed-radios-seed02';
const code = 'fnotes01';
const note = 'Se vopsește în fiecare primăvară.';
const editorAddress = `/write/s/${slug}/c/${code}`;
const readerAddress = `/s/${slug}/${code}`;

/** The personas' user IDs (supabase/seed.sql). Used only in SQL, never on screen. */
const personaIds: Partial<Record<SignInPersonaName, string>> = {
  adult_writer: '00000000-0000-4000-8000-000000000001',
  teacher: '00000000-0000-4000-8000-000000000007',
};

/** The first footnote's number, in either language (its name in the text). */
const firstMarkerName = /^(Footnote|Nota de subsol) 1$/;

/** Removes this spec's chapter and puts the personas' language back. */
function cleanUp() {
  runSql(`delete from public.chapters where code = '${code}';`);
  const ids = Object.values(personaIds).map((id) => `'${id}'`);
  runSql(`update public.profiles set locale = 'ro' where id in (${ids.join(', ')});`);
}

/** An empty draft chapter for the writer to fill. */
function seedDraft() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status)
    values ('${storyId}', '${personaIds.adult_writer}', '${code}', 1, 'Liftul', '', 0, 'draft');`);
}

/** Puts the saved draft live, as Publish would. */
function publishDraft() {
  runSql(`update public.chapters set status = 'published', published_title = draft_title,
      published_body = draft_body, published_word_count = word_count, first_published_at = now()
    where code = '${code}';`);
}

/** Opens a page in English as a persona, in a fresh browser context. */
async function openAsPersona(
  browser: Browser,
  persona: SignInPersonaName,
  path: string,
): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where id = '${personaIds[persona] ?? ''}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

/** Opens the first footnote's note by its number, in whichever language the page is in. */
async function openFirstNote(page: Page) {
  await page.getByRole('button', { name: firstMarkerName }).first().click();
}

test.describe('footnotes (BOOKS-D05b)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedDraft);
  test.afterAll(cleanUp);

  test('a writer adds a footnote from the toolbar, and it is saved where its number sits', async ({
    browser,
  }) => {
    const page = await openAsPersona(browser, 'adult_writer', editorAddress);
    const text = page.getByRole('textbox', { name: 'Chapter text' });
    await text.click();
    await page.keyboard.type('Liftul e vopsit');

    // The toolbar's "fn" names its shortcut and puts the number at the caret, opening its note.
    const toolbar = page.getByRole('toolbar', { name: 'Formatting' });
    const footnoteButton = toolbar.getByRole('button', { name: 'Footnote', exact: true });
    await expect(footnoteButton).toHaveAttribute('aria-keyshortcuts', 'Control+Alt+F');
    await footnoteButton.click();
    const box = page.getByRole('dialog', { name: 'Footnote 1' });
    await expect(box).toBeVisible();
    await expect(footnoteButton).toHaveAttribute('aria-pressed', 'true');
    const field = box.getByRole('textbox', { name: 'Footnote 1 text' });
    await expect(field).toBeFocused();
    await page.keyboard.type(note);
    await expect(box).toContainText(`${note.length} of 600`);

    // Done closes the box and the writing goes on after the number.
    await box.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(box).toBeHidden();
    await page.keyboard.type(' din nou.');
    const notes = page.getByRole('region', { name: 'Notes' });
    await expect(notes).toContainText(note);
    await expect(page.getByText('5 words · notes not counted')).toBeVisible();

    // Saved: the note sits where its number is, and the database's count leaves it out.
    await page.getByRole('textbox', { name: 'Chapter title' }).focus();
    await expect(editorSaveStatus(page)).toHaveText(/Saved at \d/);
    expect(runSql(`select draft_body from public.chapters where code = '${code}'`)).toBe(
      `Liftul e vopsit[${note}](footnote:) din nou.`,
    );
    expect(runSql(`select word_count from public.chapters where code = '${code}'`)).toBe('5');

    // The list's Edit opens the same note again.
    await notes.getByRole('button', { name: 'Edit footnote 1' }).click();
    await expect(box.getByRole('textbox', { name: 'Footnote 1 text' })).toHaveValue(note);
    await page.keyboard.press('Escape');
    await expect(box).toBeHidden();
    await expectNoDoodles(page);
  });

  test('a reader opens the note, goes back to the text, and on a phone reads it in a sheet', async ({
    browser,
  }) => {
    publishDraft();
    const page = await openAsPersona(browser, 'teacher', readerAddress);

    // From 768 px the note opens in a box under its number; Escape takes the reader back to it.
    const marker = page.getByRole('button', { name: 'Footnote 1', exact: true });
    await marker.click();
    await expect(marker).toHaveAttribute('aria-expanded', 'true');
    const box = page.getByRole('dialog', { name: 'Note 1' });
    await expect(box).toContainText(note);
    await page.keyboard.press('Escape');
    await expect(box).toBeHidden();
    await expect(marker).toBeFocused();

    // The note is listed under the text, and its Back link returns to the number.
    const notes = page.getByRole('region', { name: 'Notes' });
    await expect(notes).toContainText(note);
    await page.getByRole('link', { name: 'Back to the text, note 1' }).click();
    await expect(marker).toBeFocused();

    // On a phone the note opens in the bottom sheet, and Escape closes it back to the number.
    await page.setViewportSize({ width: 390, height: 800 });
    await marker.click();
    const sheet = page.getByRole('dialog', { name: 'Note 1' });
    await expect(sheet).toContainText(note);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(marker).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    await expectNoDoodles(page);
  });

  test('the reader with a note open passes axe at every width, light and night, ro and en', async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('teacher')).session);
    for (const view of everyView([readerAddress])) {
      runSql(
        `update public.profiles set locale = '${view.language}' where id = '${personaIds.teacher}';`,
      );
      const page = await context.newPage();
      await test.step(`axe at ${view.width} px, ${view.theme}, ${view.language}`, async () => {
        await checkScreen(page, view, openFirstNote);
        await expect(page.getByRole('dialog', { name: /^(Note|Nota) 1$/ })).toBeVisible();
      });
      await page.close();
    }
  });

  test('the editor with a note open passes axe at every width, light and night, ro and en', async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    for (const view of everyView([editorAddress])) {
      runSql(
        `update public.profiles set locale = '${view.language}' where id = '${personaIds.adult_writer}';`,
      );
      const page = await context.newPage();
      await test.step(`axe at ${view.width} px, ${view.theme}, ${view.language}`, async () => {
        await checkScreen(page, view, openFirstNote);
        await expect(
          page.getByRole('dialog', { name: /^(Footnote|Nota de subsol) 1$/ }),
        ).toBeVisible();
      });
      await page.close();
    }
  });
});
