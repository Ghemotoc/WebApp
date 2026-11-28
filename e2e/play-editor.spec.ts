/**
 * The play editor in a real browser (LAYOUTS-2; Robert, 27 Nov 2026, 17:34 UTC; board
 * D14-EditorPlay).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * 1. a stored play opens as speeches and directions; Enter goes from a line to the next name,
 *    a typed "M" suggests "Mara" from the cast, Enter takes it and goes to the line, and the save
 *    stores `**Mara:** words`; the Direction button turns a block into a direction;
 * 2. pasted "NAME: words" lines become speeches and a line in brackets a direction;
 * 3. the Characters panel adds a character to the story's cast, and the footer counts lines and
 *    directions;
 * 4. on a phone the cast's names ride above the formatting bar while a name is typed;
 * 5. a break test: another member's forged call can't change this story's cast;
 * 6. the editor passes axe at 390, 768 and 1440 px, light and night, ro and en, and the look
 *    check by day and at night.
 * Test data: one play chapter made in SQL on adult_writer's seed story "The girl who fixed
 * radios", and a two-name cast on that story; both are put back after.
 */
import { type Browser, type Page } from '@playwright/test';
import { expect, test } from './support/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectLookRulesByDayAndNight } from './support/lookCheck';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000002';
const slug = 'the-girl-who-fixed-radios-seed02';
const code = 'played01';
const writerId = '00000000-0000-4000-8000-000000000001';
const editorAddress = `/write/s/${slug}/c/${code}`;

/** The chapter's draft as stored. */
function storedBody(): string {
  return runSql(`select draft_body from public.chapters where code = '${code}'`);
}

/** The story's cast as stored, as JSON text. */
function storedCast(): string {
  return runSql(`select play_cast::text from public.stories where id = '${storyId}'`);
}

/** Removes this spec's chapter and cast, and puts the writer's language back. */
function cleanUp() {
  runSql(`delete from public.chapters where code = '${code}';`);
  runSql(`update public.stories set play_cast = '[]' where id = '${storyId}';`);
  runSql(`update public.profiles set locale = 'ro' where id = '${writerId}';`);
}

/** A play chapter with one speech and one direction, and a cast of two. */
function seedPlay() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, layout)
    values ('${storyId}', '${writerId}', '${code}', 1, 'Epilogue', E'**TEO:** Who left the lights on?\\n\\n*The lift stops.*', 9, 'draft', 'play');`);
  runSql(`update public.stories
    set play_cast = '[{"name": "Mara", "note": "sings alto"}, {"name": "Mrs Dobre", "note": ""}]'
    where id = '${storyId}';`);
}

/** Opens the editor in English as the writer. */
async function openEditor(browser: Browser, width = 1440): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where id = '${writerId}';`);
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(editorAddress);
  await expect(page.getByRole('toolbar', { name: 'Formatting, play layout' })).toBeVisible();
  return page;
}

/** The chapter's text area. */
function chapterText(page: Page) {
  return page.getByRole('textbox', { name: 'Chapter text' });
}

/** Pastes plain text into the text area, as the clipboard would. */
async function pastePlainText(page: Page, text: string) {
  await chapterText(page).evaluate((element, pasted) => {
    const data = new DataTransfer();
    data.setData('text/plain', pasted);
    element.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
    );
  }, text);
}

test.describe('the play editor (LAYOUTS-2)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(seedPlay);
  test.afterAll(cleanUp);

  test('Enter goes from a line to the next name, and a suggested name is taken', async ({
    browser,
  }) => {
    const page = await openEditor(browser);
    const text = chapterText(page);
    // The stored play opens as a speech beside its name and a direction.
    await expect(text.locator('[data-play-name]').first()).toHaveText('TEO');
    await expect(text.locator('[data-play-direction]')).toHaveText('The lift stops.');
    // The caret at the end of Teo's line: Enter starts the next name.
    await text.locator('[data-play-line]').first().click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Character', pressed: true })).toBeVisible();
    await page.keyboard.type('M');
    const suggestions = page.getByRole('listbox', { name: 'Characters' });
    await expect(suggestions.getByRole('option', { name: /Mara/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(suggestions.getByRole('option', { name: 'Add “M” to the cast' })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Line', pressed: true })).toBeVisible();
    await page.keyboard.type('Fresh paint, mind your coats.');
    await expect.poll(storedBody).toContain('**Mara:** Fresh paint, mind your coats.');
    // The toolbar's Direction turns the block into a direction, stored in italics.
    await page.getByRole('button', { name: 'Direction' }).click();
    await expect.poll(storedBody).toContain('*Fresh paint, mind your coats.*');
    await expectNoDoodles(page);
  });

  test('pasted NAME: lines become speeches and a bracketed line a direction', async ({
    browser,
  }) => {
    const page = await openEditor(browser);
    await chapterText(page).locator('[data-play-direction]').click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await pastePlainText(page, 'ILIE: Fresh paint.\n(He waves.)');
    await expect.poll(storedBody).toContain('**ILIE:** Fresh paint.');
    await expect.poll(storedBody).toContain('*(He waves.)*');
  });

  test('the Characters panel adds to the cast, and the foot counts lines and directions', async ({
    browser,
  }) => {
    const page = await openEditor(browser);
    const panel = page.getByRole('region', { name: 'Characters' });
    await expect(
      panel.getByText('For the whole story. Readers see this list at the start of the play.'),
    ).toBeVisible();
    await expect(page.getByText('9 words · 1 line · 1 direction')).toBeVisible();
    await panel.getByRole('button', { name: 'Add', exact: true }).click();
    // Save stays pressable and says what is missing (design books item 9).
    await panel.getByRole('button', { name: 'Save' }).click();
    await expect(panel.getByText('Write the character’s name.')).toBeVisible();
    await panel.getByLabel('Name').fill('Ilie');
    await panel.getByLabel('Short note').fill('runs the lift');
    await panel.getByRole('button', { name: 'Save' }).click();
    await expect(panel.getByRole('button', { name: /^Ilie 0 lines runs the lift$/ })).toBeVisible();
    await expect.poll(storedCast).toContain('"name": "Ilie", "note": "runs the lift"');
  });

  test('on a phone the cast rides above the bar while a name is typed', async ({ browser }) => {
    const page = await openEditor(browser, 390);
    await chapterText(page).locator('[data-play-line]').first().click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    const names = page.getByRole('group', { name: 'Characters' });
    await names.getByRole('button', { name: 'Mrs Dobre' }).click();
    await expect(chapterText(page).locator('[data-play-name]').nth(1)).toHaveText('Mrs Dobre');
    await expect(page.getByRole('button', { name: 'Line', pressed: true })).toBeVisible();
  });

  test("a forged call can't change someone else's cast", async () => {
    // Break test: another member calls the database function directly with this story's address.
    const answer = runSql(`begin;
      select set_config('role', 'authenticated', true),
        set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000007", "role": "authenticated"}', true);
      select public.set_story_cast('${slug}', '[{"name": "Intruder", "note": ""}]');
      commit;`);
    expect(answer).toContain('not_found');
    expect(storedCast()).not.toContain('Intruder');
  });

  test('the play editor passes axe on every screen and the look check by day and at night', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    const page = await context.newPage();
    for (const view of everyView([editorAddress])) {
      runSql(`update public.profiles set locale = '${view.language}' where id = '${writerId}';`);
      await checkScreen(page, view);
    }
    await context.close();
    await expectLookRulesByDayAndNight(browser, 'adult_writer', editorAddress, (ready) =>
      expect(ready.getByRole('region', { name: /Characters|Personaje/ })).toBeVisible(),
    );
  });
});
