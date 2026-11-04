/**
 * Sharing a passage or a picture from a chapter, in a real browser (story S1-E4-11; board 3.6
 * Share).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - selecting a paragraph offers "Copy link to this passage", whose link is the chapter's address
 *   with only the spot added (/p2), and the copy counts as a share (first criterion);
 * - a picture that passed its check has "Share picture", which opens a picture card with the
 *   story, the writer and the link to the picture's spot (first criterion);
 * - opening a spot link shows the chapter with the passage highlighted and focused, and "Read
 *   from the start"; the link preview shows the passage instead of the blurb (second criterion);
 * - with the writer's switches off, neither appears and the preview goes back to the blurb; the
 *   new "Sharing pictures" switch saves from story settings (third criterion);
 * - a 16+ story offers neither and its preview never shows the passage (fourth criterion);
 * - a link to the passed picture previews with the picture itself, from /api/picture-preview/…;
 *   with the picture switch off it keeps the cover colour and that address answers 404
 *   (IDEAS-2f, idea IDEA-20261101-12);
 * - the highlighted reader and the picture card pass axe and fit at 390, 768 and 1440 px.
 * Test data: adult_writer's story "Farul" with one chapter of three paragraphs and a picture;
 *   blocked reads it (no other reader spec signs in as blocked while this runs). All removed
 *   afterwards.
 */
import { randomUUID } from 'node:crypto';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const readerId = '00000000-0000-4000-8000-000000000016';
const storySlug = 'passage-e2e';
const chapterCode = 'pasaj001';
const chapterId = '11e41100-0000-4000-8000-000000000001';
// A new picture each run: writers can't delete chapter pictures through Storage, so a file from
// an earlier run stays in the local stack's storage (as in chapter-pictures.spec.ts).
const pictureId = randomUUID();
const picturePath = `${chapterId}/${pictureId}.png`;
const chapterPath = `/s/${storySlug}/${chapterCode}`;
const pictureAlt = 'Un far în ceață';
const paragraphs = [
  'Farul se aprindea în fiecare seară la ora opt.',
  'Paznicul urca o sută de trepte și nu se plângea niciodată.',
  'Într-o noapte, lumina nu s-a mai aprins.',
];
/** A small red PNG, the picture in the chapter. */
const pictureBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAIAAADRv8uKAAAAKklEQVR4nO3NMQ0AAAgDsAmb/yALGXA06d9MeyJisVgsFovFYrFYLP4bL9HP3Ew1mJ9PAAAAAElFTkSuQmCC';

/** Removes the spec's story, picture, shares and the reader's rate-limit events. */
function cleanUp() {
  runSql(`update public.feature_flags set is_enabled = false where key = 'picture_uploads';
    delete from public.picture_checks where chapter_id = '${chapterId}';
    delete from public.rate_limit_events where user_id = '${readerId}';
    delete from public.chapters where code = '${chapterCode}';
    delete from public.stories where slug = '${storySlug}';
    update public.profiles set locale = 'ro' where handle in ('blocked', 'adult_writer');`);
}

/** The story with one chapter: paragraph 1, paragraph 2, the picture (block 3), paragraph 3. */
async function seedStory() {
  cleanUp();
  const body = [
    paragraphs[0],
    paragraphs[1],
    `![${pictureAlt}](picture:${pictureId})`,
    paragraphs[2],
  ].join('\\n\\n');
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('${writerId}', '${storySlug}', 'Farul', 'Un paznic și un far.', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select '${chapterId}', id, user_id, '${chapterCode}', 1, 'Capitol', 'x', 30, 'published',
      'Lumina', E'${body}', 30, now()
    from public.stories where slug = '${storySlug}';`);
  // The picture: uploaded by the writer while uploads are on, then marked as passed (the check
  // itself is S1-E10-05's).
  runSql(`update public.feature_flags set is_enabled = true where key = 'picture_uploads';`);
  const { client } = await signInPersona('adult_writer');
  const { error } = await client.storage
    .from('chapter-images')
    .upload(picturePath, Buffer.from(pictureBase64, 'base64'), { contentType: 'image/png' });
  if (error !== null) throw new Error(`Could not upload the test picture: ${error.message}`);
  runSql(`insert into public.picture_checks (id, user_id, bucket, path, kind, story_id, chapter_id,
      status, rights_confirmed_at, checked_at)
    select '${pictureId}', '${writerId}', 'chapter-images', '${picturePath}', 'chapter_picture',
      story_id, id, 'passed', now(), now()
    from public.chapters where id = '${chapterId}';`);
}

/** Today's share total for the chapter. */
function sharesToday(): string {
  return runSql(`select coalesce(sum(total), 0) from public.chapter_shares
    where chapter_id = '${chapterId}';`).trim();
}

/** Sets the story's switches and rating directly. */
function setStory(changes: string) {
  runSql(`update public.stories set ${changes} where slug = '${storySlug}';`);
}

/** Opens a page as a persona in English, with the clipboard allowed. */
async function openAs(browser: Browser, persona: SignInPersonaName, path: string): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  const page = await context.newPage();
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  return page;
}

/** Selects one paragraph of the chapter text, as a reader dragging over it would. */
async function selectParagraph(page: Page, index: number) {
  await page.evaluate((paragraphIndex) => {
    const paragraph = document.querySelectorAll('[data-protected-text] p')[paragraphIndex];
    if (paragraph === undefined) throw new Error('No such paragraph.');
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  }, index);
}

/** Waits until the page has asked what may be shared and the bar has read the selection. */
async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}

/** The og:description a chat app would read for an address, as a visitor. */
async function previewDescription(page: Page, path: string): Promise<string> {
  const response = await page.request.get(path);
  const html = await response.text();
  return /<meta property="og:description" content="([^"]*)">/.exec(html)?.[1] ?? '';
}

/** The og:image a chat app would read for an address, as a visitor (IDEAS-2f). */
async function previewImage(page: Page, path: string): Promise<string> {
  const response = await page.request.get(path);
  const html = await response.text();
  return /<meta property="og:image" content="([^"]*)">/.exec(html)?.[1] ?? '';
}

/** Runs axe and checks nothing scrolls sideways at the page's width. */
async function expectAccessibleAndFitting(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
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

test.describe('share a passage or a picture (S1-E4-11)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('a selected paragraph has "Copy link to this passage", a clean link to its spot', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'blocked', chapterPath);
    const sharesBefore = Number(sharesToday());
    await selectParagraph(page, 1);
    await page.getByRole('button', { name: 'Copy link to this passage' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Link copied' })).toBeVisible();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    const url = new URL(link);
    expect(url.pathname).toBe(`${chapterPath}/p2`);
    expect(url.search).toBe('');
    await expect.poll(() => Number(sharesToday())).toBe(sharesBefore + 1);
    await page.context().close();
  });

  test('the spot link opens the chapter with the passage highlighted and focused', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'blocked', `${chapterPath}/p2`);
    await expect(
      page.getByText('You opened a link to a passage. It’s highlighted below.'),
    ).toBeVisible();
    const passage = page.locator('.tmc-shared-passage');
    await expect(passage).toHaveCount(1);
    await expect(passage).toHaveText(paragraphs[1] ?? '');
    await expect(passage).toBeFocused();
    for (const width of [390, 768, 1440]) await expectAccessibleAndFitting(page, width);
    await page.getByRole('link', { name: 'Read from the start' }).click();
    await expect(page).toHaveURL(new RegExp(`${chapterPath}$`));
    await expect(page.locator('.tmc-shared-passage')).toHaveCount(0);
    await page.context().close();
  });

  test('a link to a passage that is gone says so', async ({ browser }) => {
    const page = await openAs(browser, 'blocked', `${chapterPath}/p9`);
    await expect(page.getByText(/isn’t in this chapter any more/)).toBeVisible();
    await page.context().close();
  });

  test('the link preview shows the passage or the picture instead of the blurb', async ({
    browser,
  }) => {
    const page = await browser.newPage();
    expect(await previewDescription(page, `${chapterPath}/p2`)).toContain(`„${paragraphs[1]}”`);
    expect(await previewDescription(page, `${chapterPath}/p3`)).toContain(`Imagine: ${pictureAlt}`);
    expect(await previewDescription(page, chapterPath)).toContain('Un paznic și un far.');
    // IDEAS-2f criterion 1: a link to the passed picture shows the picture itself, from our
    // own address, which answers with the picture file.
    const image = await previewImage(page, `${chapterPath}/p3`);
    expect(image).toMatch(new RegExp(`/api/picture-preview/${storySlug}/${chapterCode}/3$`));
    const picture = await page.request.get(new URL(image).pathname);
    expect(picture.status()).toBe(200);
    expect(picture.headers()['content-type']).toBe('image/png');
    // A paragraph keeps the cover colour's square.
    expect(await previewImage(page, `${chapterPath}/p2`)).toContain('/link-previews/');
    await page.close();
  });

  test('a passed picture has "Share picture": a card with the story, the writer and its link', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'blocked', chapterPath);
    await page.getByRole('button', { name: `Share picture: ${pictureAlt}` }).click();
    const dialog = page.getByRole('dialog', { name: 'Your picture card' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(`${storySlug}/${chapterCode}/p3`)).toBeVisible();
    await expect(dialog.getByRole('img', { name: /A picture from Farul by/ })).toBeVisible();
    // The picture loads into the card, so the image buttons come on.
    await expect(dialog.getByRole('button', { name: 'Save image' })).toBeEnabled();
    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Save image' }).click();
    expect((await download).suggestedFilename()).toBe('picture-card.png');
    await expect(dialog.getByRole('status')).toHaveText('Image saved.');
    for (const width of [390, 768, 1440]) await expectAccessibleAndFitting(page, width);
    await page.context().close();
  });

  test('with the writer’s switches off, neither appears and the preview shows the blurb', async ({
    browser,
  }) => {
    setStory('quote_cards_enabled = false, picture_sharing_enabled = false');
    const page = await openAs(browser, 'blocked', chapterPath);
    await expect(page.getByRole('img', { name: pictureAlt })).toBeVisible();
    await selectParagraph(page, 0);
    await settle(page);
    await expect(page.getByRole('button', { name: 'Copy link to this passage' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Share picture/ })).toHaveCount(0);
    expect(await previewDescription(page, `${chapterPath}/p2`)).toContain('Un paznic și un far.');
    // IDEAS-2f criterion 2: a picture that may not be shared keeps the cover colour, and its
    // preview address answers nothing.
    expect(await previewImage(page, `${chapterPath}/p3`)).toContain('/link-previews/');
    const refused = await page.request.get(`/api/picture-preview/${storySlug}/${chapterCode}/3`);
    expect(refused.status()).toBe(404);
    setStory('quote_cards_enabled = true, picture_sharing_enabled = true');
    await page.context().close();
  });

  test('a 16+ story shares only a plain link, and its preview never shows the passage', async ({
    browser,
  }) => {
    setStory(`rating = '16_plus'`);
    const page = await openAs(browser, 'blocked', chapterPath);
    await expect(page.getByRole('img', { name: pictureAlt })).toBeVisible();
    await selectParagraph(page, 0);
    await settle(page);
    await expect(page.getByRole('button', { name: 'Copy link to this passage' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Share picture/ })).toHaveCount(0);
    const description = await previewDescription(page, `${chapterPath}/p2`);
    expect(description).not.toContain(paragraphs[1]);
    expect(description).toContain('16+');
    setStory(`rating = 'all_ages'`);
    await page.context().close();
  });

  test('the writer turns "Sharing pictures" off in story settings', async ({ browser }) => {
    const writer = await openAs(browser, 'adult_writer', `/write/s/${storySlug}/settings`);
    const pictureSwitch = writer.getByRole('switch', { name: 'Sharing pictures' });
    await expect(pictureSwitch).toHaveAttribute('aria-checked', 'true');
    await pictureSwitch.click();
    await writer.getByRole('button', { name: 'Save changes' }).click();
    await expect(writer.getByText('Saved.')).toBeVisible();
    expect(
      runSql(
        `select picture_sharing_enabled from public.stories where slug = '${storySlug}';`,
      ).trim(),
    ).toBe('f');
    await writer.context().close();
  });
});
