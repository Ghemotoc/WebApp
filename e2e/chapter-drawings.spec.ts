/**
 * Drawings in chapters in a real browser (story S1-E3-11; board 4.3, "Sketch pad").
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first). The
 * local server's /api/picture-check uses the stub provider, which passes a file called
 * drawing.png.
 * What it proves (with the picture_uploads flag switched on for the test):
 * - Insert › Drawing opens a sketch pad with pen, eraser, three brand colours, Undo and Clear
 *   (criterion 1);
 * - an empty sheet and missing alt text are refused, and the dialog says which pictures are allowed;
 * - a mouse drag and the arrow keys both draw; Undo takes a line away and Clear empties the sheet;
 * - the finished drawing is saved as a picture with its alt text and goes through the picture
 *   check like any picture (criterion 2): the editor shows it as checked and readers see it;
 * - the sketch pad passes axe and fits at 390 (Romanian), 768 and 1440 px.
 * Test data: a draft chapter on adult_writer's seed story "Stația meteo"; the chapter, its picture
 * checks and their cases are removed afterwards.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { waitForAnimationsToFinish } from './support/animations';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';
import { approveWaitingPictures } from './support/pictures';

const writerId = '00000000-0000-4000-8000-000000000001';
const chapterId = 'e2e00511-0000-4000-8000-000000000001';
const chapterCode = 'e2edrw5c';
const editorAddress = `/write/s/statia-meteo-seed01/c/${chapterCode}`;
const readerAddress = `/s/statia-meteo-seed01/${chapterCode}`;

/** Removes the spec's chapter, its pictures and their cases, and switches uploads off. */
function cleanUp() {
  runSql(`
    update public.feature_flags set is_enabled = false where key = 'picture_uploads';
    delete from vault.secrets where name = 'picture_check_secret';
    delete from public.notifications where case_id in (select case_id from public.picture_checks where chapter_id = '${chapterId}');
    delete from public.case_actions where case_id in (select case_id from public.picture_checks where chapter_id = '${chapterId}');
    with removed as (delete from public.picture_checks where chapter_id = '${chapterId}' returning case_id)
    delete from public.cases where id in (select case_id from removed);
    delete from public.rate_limit_events where user_id = '${writerId}';
    delete from public.chapters where id = '${chapterId}';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teen_17');`);
}

/** Opens an address as a persona at a width, in a language (English unless told). */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
  view: { width: number; language: string } = { width: 1440, language: 'en' },
): Promise<Page> {
  runSql(`update public.profiles set locale = '${view.language}' where handle = '${persona}';`);
  const context = await browser.newContext({ viewport: { width: view.width, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    view.language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Opens Insert › Drawing. */
async function openSketchPad(page: Page) {
  await page.getByRole('button', { name: 'Insert' }).click();
  await page.getByRole('menuitem', { name: /Drawing/ }).click();
  return page.getByRole('dialog', { name: 'Draw a sketch' });
}

/** Drags the mouse across the sheet, from 20 % to 80 % of its width. */
async function dragAcross(page: Page) {
  const box = await page.locator('dialog canvas').boundingBox();
  if (box === null) throw new Error('no sheet');
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, y - 20, { steps: 5 });
  await page.mouse.move(box.x + box.width * 0.8, y, { steps: 5 });
  await page.mouse.up();
}

test.describe('drawings in chapters (S1-E3-11)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    // The local server signs check results with PICTURE_CHECK_SECRET (playwright.config.ts); the
    // database checks them against the same value in its Vault. Never a real secret.
    runSql(`
      update public.feature_flags set is_enabled = true where key = 'picture_uploads';
      select vault.create_secret('local-e2e-picture-secret', 'picture_check_secret');
      insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count, status)
      values ('${chapterId}', '00000000-0000-4000-9000-000000000001', '${writerId}', '${chapterCode}', 1,
        'Furtuna', 'Bunica a desenat o furtună.', 4, 'draft');`);
  });
  test.afterAll(cleanUp);

  test('the sketch pad has its tools and refuses an empty sheet or missing fields', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', editorAddress);
    const dialog = await openSketchPad(page);
    const tools = dialog.getByRole('group', { name: 'Drawing tools' });
    await expect(tools.getByRole('button', { name: 'Pen' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(tools.getByRole('button', { name: 'Eraser' })).toBeVisible();
    for (const colour of ['black', 'red', 'blue']) {
      await expect(tools.getByRole('button', { name: `Colour: ${colour}` })).toBeVisible();
    }
    await expect(tools.getByRole('button', { name: 'Undo' })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Insert drawing' }).click();
    await expect(dialog.getByText('Draw something first.')).toBeVisible();
    await expect(dialog.getByText('Write alt text for the picture.')).toBeVisible();
    await expect(
      dialog.getByText('Any picture, as long as it doesn’t show a real person.'),
    ).toBeVisible();
    await expect(dialog.getByRole('checkbox')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    expect(
      runSql(`select count(*) from public.picture_checks where chapter_id = '${chapterId}'`),
    ).toBe('0');
    await page.context().close();
  });

  test('mouse and keyboard both draw; Undo and Clear work; the drawing waits for a moderator like any picture', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', editorAddress);
    const dialog = await openSketchPad(page);
    const sheet = dialog.getByRole('application', { name: 'Drawing' });
    await dragAcross(page);
    await expect(dialog.getByText('1 line drawn')).toBeAttached();
    await dialog.getByRole('button', { name: 'Clear' }).click();
    await expect(dialog.getByText('0 lines drawn')).toBeAttached();

    // The keyboard: two arrows draw two lines; Shift moves without drawing; Undo takes one away.
    await dialog.getByRole('button', { name: 'Colour: red' }).click();
    await sheet.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowDown');
    await page.keyboard.press('ArrowRight');
    await expect(dialog.getByText('2 lines drawn')).toBeAttached();
    await dialog.getByRole('button', { name: 'Undo' }).click();
    await expect(dialog.getByText('1 line drawn')).toBeAttached();
    await dragAcross(page);

    await dialog.getByRole('textbox', { name: 'Alt text' }).fill('A storm cloud over the station');
    await dialog.getByRole('button', { name: 'Insert drawing' }).click();
    await expect(dialog).toBeHidden();

    // Criterion 2: a picture like any other, checked, with its alt text in the stored Markdown.
    const figure = page.getByRole('figure', { name: 'Picture in this chapter' });
    // The seed story is All ages, so the drawing waits for a moderator (ADMIN-2e1b).
    await expect(figure.getByText('Waiting for a person', { exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: 'Chapter title' }).focus();
    await expect(page.getByRole('region', { name: 'Saving' }).getByRole('status')).toHaveText(
      /Saved at \d/,
    );
    const body = runSql(`select draft_body from public.chapters where id = '${chapterId}'`);
    expect(body).toMatch(/!\[A storm cloud over the station\]\(picture:[0-9a-f-]{36}\)/);
    expect(
      runSql(`select status from public.picture_checks where chapter_id = '${chapterId}'`),
    ).toBe('held');
    expect(approveWaitingPictures(`chapter_id = '${chapterId}'`)).toBe('1');
    await page.context().close();
  });

  test('readers see the drawing as a picture with its alt text', async ({ browser }) => {
    runSql(`select set_config('request.jwt.claims', '{"sub": "${writerId}", "role": "authenticated"}', false);
      select public.publish_chapter('${chapterCode}');`);
    const page = await openAs(browser, 'teen_17', readerAddress);
    await expect(page.getByRole('img', { name: 'A storm cloud over the station' })).toBeVisible();
    await page.context().close();
  });

  for (const [width, language] of [
    [390, 'ro'],
    [768, 'en'],
    [1440, 'en'],
  ] as const) {
    test(`the sketch pad passes axe and fits at ${width} px`, async ({ browser }) => {
      const page = await openAs(browser, 'adult_writer', editorAddress, { width, language });
      await page.locator('button[aria-haspopup="menu"]').click();
      await page.getByRole('menuitem').nth(1).click();
      await expect(page.locator('dialog canvas')).toBeVisible();
      await dragAcross(page);
      await expectAccessibleAndFitting(page, width);
      await page.context().close();
    });
  }
});

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
