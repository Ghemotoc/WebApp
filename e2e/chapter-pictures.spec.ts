/**
 * Pictures in chapters in a real browser (story S1-E3-09; board 4.3 Editor and 3.5 Reader).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first). The
 * local server's /api/picture-check uses the stub provider: a file passes unless its name ends in
 * _fail, _gore, _match or _down.
 * What it proves (with the picture_uploads flag switched on for the test):
 * - Insert › Picture asks for the file and the alt text before anything is inserted, and says
 *   any picture as long as it doesn't show a real person, with one "i" tooltip listing what is
 *   accepted that opens on keyboard focus and closes with Escape (criterion 1; PICTURES-1, Robert,
 *   7 Nov 2026; no rights tick box since bundle ADMIN-2, part e1);
 * - the stored file has no location or camera data and is at most 1,600 px wide, though the
 *   chosen JPEG carried both and was 2,400 px wide (criterion 2);
 * - a clean picture in this All ages story waits for a moderator, then shows to readers; a flagged one shows "Picture being checked" and
 *   its file is never sent (criterion 3);
 * - a reader can report a picture from the button under it (criterion 4);
 * - with the flag off there is no Insert button;
 * - the editor with its pictures, the Insert menu and the dialog, and the reader, pass axe and
 *   fit at 390 (Romanian), 768 and 1440 px.
 * Test data: a draft chapter on adult_writer's seed story "Stația meteo"; the chapter, its picture
 * checks and their cases are removed afterwards (the files stay in the local bucket: Storage
 * refuses deletes from SQL, and nothing reads them).
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { waitForAnimationsToFinish } from './support/animations';
import { runSql } from './support/database';
import { approveWaitingPictures } from './support/pictures';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const chapterId = 'e2e00509-0000-4000-8000-000000000001';
const chapterCode = 'e2epic5a';
const editorAddress = `/write/s/statia-meteo-seed01/c/${chapterCode}`;
const readerAddress = `/s/statia-meteo-seed01/${chapterCode}`;

/** A 1 by 1 pixel PNG, enough for the stub check. */
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

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
    -- Publishing queued a chapter_published job; left behind, it points at a chapter that no
    -- longer exists and breaks the next spec that runs the job queue (QA-3).
    delete from public.jobs where payload ->> 'chapter_id' = '${chapterId}';
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

/**
 * A 2,400 × 1,200 JPEG whose file carries an Exif block with a made-up GPS marker, drawn in the
 * page (the browser has a JPEG encoder; Node doesn't).
 */
async function jpegWithLocationData(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2400;
    canvas.height = 1200;
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('no canvas');
    context.fillStyle = '#2E4A8C';
    context.fillRect(0, 0, 2400, 1200);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg'));
    if (blob === null) throw new Error('no JPEG');
    const jpeg = new Uint8Array(await blob.arrayBuffer());
    // An APP1 "Exif" segment straight after the start marker, holding the words GPS E2EGPS.
    const payload = new TextEncoder().encode('Exif\0\0GPS E2EGPS 44.4268 26.1025');
    const segment = new Uint8Array([0xff, 0xe1, 0, payload.length + 2, ...payload]);
    const withExif = new Uint8Array([...jpeg.slice(0, 2), ...segment, ...jpeg.slice(2)]);
    let text = '';
    for (const byte of withExif) text += String.fromCharCode(byte);
    return btoa(text);
  });
  return Buffer.from(base64, 'base64');
}

/** Fills and sends "Add a picture". */
async function addPicture(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
  alt: string,
) {
  await page.getByRole('button', { name: 'Insert' }).click();
  await page.getByRole('menuitem', { name: /Picture/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a picture' });
  await dialog.getByLabel('Picture', { exact: true }).setInputFiles(file);
  await dialog.getByRole('textbox', { name: 'Alt text' }).fill(alt);
  await dialog.getByRole('button', { name: 'Add the picture' }).click();
  await expect(dialog).toBeHidden();
}

/** The bytes of a picture the page shows, read with the page's own signed address. */
async function pictureBytes(
  page: Page,
  alt: string,
): Promise<{ text: string; type: string; width: number }> {
  const picture = page.getByRole('img', { name: alt });
  await expect(picture).toBeVisible();
  await expect
    .poll(() => picture.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  const width = await picture.evaluate((image: HTMLImageElement) => image.naturalWidth);
  const address = await picture.getAttribute('src');
  const { text, type } = await page.evaluate(async (url) => {
    const response = await fetch(url ?? '');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let all = '';
    for (const byte of bytes) all += String.fromCharCode(byte);
    return { text: all, type: response.headers.get('content-type') ?? '' };
  }, address);
  return { text, type, width };
}

test.describe('pictures in chapters (S1-E3-09)', () => {
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
        'Harta', 'Bunica a desenat o hartă a dealurilor.', 6, 'draft');`);
  });
  test.afterAll(cleanUp);

  test('Insert › Picture needs the file and the alt text, and says which pictures are allowed', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', editorAddress);
    await page.getByRole('button', { name: 'Insert' }).click();
    await expect(page.getByRole('menu', { name: 'Insert' })).toBeVisible();
    // Escape closes the menu and gives focus back to the button.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Insert' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: /Picture/ })).toBeFocused();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Add a picture' });
    await dialog.getByRole('button', { name: 'Add the picture' }).click();
    await expect(dialog.getByText('Choose a picture.')).toBeVisible();
    await expect(dialog.getByText('Write alt text for the picture.')).toBeVisible();
    await expect(
      dialog.getByText('Any picture, as long as it doesn’t show a real person.'),
    ).toBeVisible();
    // The one tooltip lists what is accepted: open on focus, close with Escape (DoD tooltip rule).
    const infoButton = dialog.getByRole('button', { name: 'Which pictures are allowed' });
    await infoButton.focus();
    const tooltip = dialog.getByRole('tooltip');
    await expect(tooltip).toContainText('photos of places and things');
    await expect(tooltip).toContainText('Never a real person or a celebrity.');
    await page.keyboard.press('Escape');
    await expect(tooltip).toBeHidden();
    await expect(infoButton).toBeFocused();
    await expect(dialog.getByRole('checkbox')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    // Nothing was uploaded or inserted.
    expect(
      runSql(`select count(*) from public.picture_checks where chapter_id = '${chapterId}'`),
    ).toBe('0');
    await expect(page.getByRole('figure', { name: 'Picture in this chapter' })).toHaveCount(0);
  });

  test('a clean picture goes in without its location data; a flagged one waits for a person', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', editorAddress);
    await addPicture(
      page,
      { name: 'harta.jpg', mimeType: 'image/jpeg', buffer: await jpegWithLocationData(page) },
      'Map of the hills',
    );
    const figures = page.getByRole('figure', { name: 'Picture in this chapter' });
    // The seed story is All ages, so even a clean picture waits for a moderator (ADMIN-2e1b).
    await expect(figures.first().getByText('Waiting for a person')).toBeVisible();

    // Criterion 2: the stored file is a new one: no Exif, no GPS marker, at most 1,600 px wide.
    const stored = await pictureBytes(page, 'Map of the hills');
    expect(stored.width).toBe(1600);
    expect(stored.text).not.toContain('Exif');
    expect(stored.text).not.toContain('E2EGPS');
    expect(stored.type).toBe('image/webp');

    // A picture is selected after it goes in; the next one goes after it, never in its place.
    await expect(figures).toHaveCount(1);
    await addPicture(
      page,
      { name: 'storm_fail.png', mimeType: 'image/png', buffer: tinyPng },
      'A storm over the station',
    );
    await expect(figures).toHaveCount(2);
    await expect(figures.nth(1).getByText('Waiting for a person')).toBeVisible();
    // Leaving the text saves at once; both pictures are in the stored Markdown with their alt text.
    await page.getByRole('textbox', { name: 'Chapter title' }).focus();
    await expect(page.getByRole('region', { name: 'Saving' }).getByRole('status')).toHaveText(
      /Saved at \d/,
    );
    const body = runSql(`select draft_body from public.chapters where id = '${chapterId}'`);
    expect(body).toMatch(/!\[Map of the hills\]\(picture:[0-9a-f-]{36}\)/);
    expect(body).toMatch(/!\[A storm over the station\]\(picture:[0-9a-f-]{36}\)/);
    expect(
      runSql(
        `select string_agg(status::text, ',' order by created_at) from public.picture_checks where chapter_id = '${chapterId}'`,
      ),
    ).toBe('held,held');
    await page.context().close();
  });

  test('readers see the clean picture, "Picture being checked" for the other, and can report it', async ({
    browser,
  }) => {
    runSql(`select set_config('request.jwt.claims', '{"sub": "${writerId}", "role": "authenticated"}', false);
      select public.publish_chapter('${chapterCode}');`);
    // A moderator approves the clean picture on Pictures to check; the flagged one stays held.
    expect(approveWaitingPictures(`chapter_id = '${chapterId}'`)).toBe('1');
    const page = await openAs(browser, 'teen_17', readerAddress);
    await expect(page.getByRole('img', { name: 'Map of the hills' })).toBeVisible();
    await expect(page.getByText('Picture being checked')).toHaveCount(1);
    await expect(page.getByRole('img', { name: 'A storm over the station' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Report the picture “Map of the hills”' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.context().close();
  });

  test('with picture uploads off there is no Insert button', async ({ browser }) => {
    runSql(`update public.feature_flags set is_enabled = false where key = 'picture_uploads';`);
    const page = await openAs(browser, 'adult_writer', editorAddress);
    await expect(page.getByRole('toolbar', { name: 'Formatting' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Insert' })).toHaveCount(0);
    // The pictures already in the chapter stay.
    await expect(page.getByRole('figure', { name: 'Picture in this chapter' })).toHaveCount(2);
    runSql(`update public.feature_flags set is_enabled = true where key = 'picture_uploads';`);
    await page.context().close();
  });

  for (const [width, language] of [
    [390, 'ro'],
    [768, 'en'],
    [1440, 'en'],
  ] as const) {
    test(`the editor, its menu and dialog, and the reader pass axe and fit at ${width} px`, async ({
      browser,
    }) => {
      const page = await openAs(browser, 'adult_writer', editorAddress, { width, language });
      await expect(page.getByRole('figure').first()).toBeVisible();
      await expectAccessibleAndFitting(page, width);
      await page.locator('button[aria-haspopup="menu"]').click();
      await expectAccessibleAndFitting(page, width);
      await page.getByRole('menuitem').first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expectAccessibleAndFitting(page, width);
      await page.goto(readerAddress);
      await expect(page.locator('[data-chapter-picture]').first()).toBeVisible();
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
