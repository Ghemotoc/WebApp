/**
 * Music and video in chapters in a real browser (story S1-E3-10; board 4.3 Editor and 3.5 Reader;
 * ADR 0008).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first). The
 * local server's /api/embed uses the oEmbed stub: a link containing "notfound" has no video,
 * anything else is "Test <Service> title" by "Test channel".
 * What it proves (with the media_embeds flag switched on for the test):
 * - Insert › Video accepts a YouTube link and puts a card in the chapter (criterion 1);
 * - a link from another site is refused at once, and a missing video is explained (criterion 1);
 * - a reader sees the card with the title, the service and the cookie line, and nothing at all
 *   loads from the service until they press play (criterion 2);
 * - play loads the privacy-enhanced youtube-nocookie.com player, and Stop takes it away
 *   (criterion 3);
 * - a reader can report the card, and a card a moderator removed shows
 *   "[Removed by the moderation team]" while the chapter stays up (criterion 4);
 * - with the flag off there is no Music or Video in the Insert menu;
 * - the editor, its dialog and the reader pass axe and fit at 390 (Romanian), 768 and 1440 px.
 * Test data: a draft chapter on adult_writer's seed story "Stația meteo"; the chapter, its cards
 * and the moderation row are removed afterwards. The player itself is never fetched: the test
 * answers youtube-nocookie.com with an empty page, so no test ever reaches YouTube.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { waitForAnimationsToFinish } from './support/animations';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const moderatorId = '00000000-0000-4000-8000-000000000010';
const chapterId = 'e2e00510-0000-4000-8000-000000000001';
const chapterCode = 'e2emed5b';
const editorAddress = `/write/s/statia-meteo-seed01/c/${chapterCode}`;
const readerAddress = `/s/statia-meteo-seed01/${chapterCode}`;
const youtubeLink = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=tracking';

/**
 * Removes the spec's chapter, its cards, the moderation row and the chapter's queued jobs, and
 * switches cards off. The jobs go first: publishing queues a chapter_published job, and a job left
 * pointing at a deleted chapter breaks the next spec that runs the notification jobs (CI-1).
 */
function cleanUp() {
  runSql(`
    update public.feature_flags set is_enabled = false where key = 'media_embeds';
    delete from public.moderated_items where item_type = 'embed' and item_id in (select id from public.chapter_embeds where chapter_id = '${chapterId}');
    delete from public.rate_limit_events where user_id = '${writerId}';
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
  // The player is answered here with an empty page, so the test never reaches YouTube.
  await context.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>x</title>',
    }),
  );
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Opens the Video link button (its own toolbar button since G9e) and pastes a link. */
async function pasteVideoLink(page: Page, link: string) {
  await page.getByRole('button', { name: 'Insert a video link (YouTube, Vimeo or Loom)' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a video' });
  await dialog.getByRole('textbox', { name: 'Link' }).fill(link);
  await dialog.getByRole('button', { name: 'Add' }).click();
  return dialog;
}

test.describe('music and video in chapters (S1-E3-10)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    runSql(`
      update public.feature_flags set is_enabled = true where key = 'media_embeds';
      insert into public.chapters (id, story_id, user_id, code, position, draft_title, draft_body, word_count, status)
      values ('${chapterId}', '00000000-0000-4000-9000-000000000001', '${writerId}', '${chapterCode}', 1,
        'Prognoza', 'Bunica ascultă prognoza la radio.', 5, 'draft');`);
  });
  test.afterAll(cleanUp);

  test('a link from another site or a missing video is explained, and nothing goes in', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', editorAddress);
    const dialog = await pasteVideoLink(page, 'https://example.org/watch?v=dQw4w9WgXcQ');
    await expect(dialog.getByText(/That link isn’t from Spotify, Apple Music/)).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Link' }).fill('https://youtu.be/notfound123');
    await dialog.getByRole('button', { name: 'Add' }).click();
    await expect(dialog.getByText(/there’s no song or video at that link/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    expect(
      runSql(`select count(*) from public.chapter_embeds where chapter_id = '${chapterId}'`),
    ).toBe('0');
    await page.context().close();
  });

  test('Insert › Video turns a YouTube link into a card in the chapter', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', editorAddress);
    const dialog = await pasteVideoLink(page, youtubeLink);
    await expect(dialog).toBeHidden();
    const card = page.getByRole('group', { name: 'Music or video card' });
    await expect(card.getByText('Test YouTube title')).toBeVisible();
    await expect(card.getByText('Video · YouTube')).toBeVisible();
    await expect(card.getByRole('button', { name: 'Remove video' })).toBeVisible();
    // Leaving the text saves at once; the card is in the stored Markdown, the link isn't.
    await page.getByRole('textbox', { name: 'Chapter title' }).focus();
    await expect(page.getByRole('region', { name: 'Saving' }).getByRole('status')).toHaveText(
      /Saved at \d/,
    );
    const body = runSql(`select draft_body from public.chapters where id = '${chapterId}'`);
    expect(body).toMatch(/!\[Test YouTube title\]\(embed:[0-9a-f-]{36}\)/);
    expect(body).not.toContain('youtube');
    // The stored link is the clean one, without the tracking parameter.
    expect(
      runSql(`select source_url from public.chapter_embeds where chapter_id = '${chapterId}'`),
    ).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.context().close();
  });

  test('readers load nothing from YouTube until play, then the no-cookie player', async ({
    browser,
  }) => {
    runSql(`select set_config('request.jwt.claims', '{"sub": "${writerId}", "role": "authenticated"}', false);
      select public.publish_chapter('${chapterCode}');`);
    const page = await openAs(browser, 'teen_17', 'about:blank');
    const serviceRequests: string[] = [];
    page.on('request', (request) => {
      if (/youtube|ytimg|googlevideo/.test(new URL(request.url()).hostname)) {
        serviceRequests.push(request.url());
      }
    });
    await page.goto(readerAddress);
    const card = page.getByRole('group', { name: 'Video from YouTube' });
    await expect(card.getByText('Test YouTube title')).toBeVisible();
    await expect(card.getByText('Plays from YouTube. YouTube may use cookies.')).toBeVisible();
    await expect(card.locator('iframe')).toHaveCount(0);
    expect(serviceRequests).toEqual([]);

    // Criterion 3: the privacy-enhanced player, only now; focus moves to Stop and back.
    await card.getByRole('button', { name: /Play video: Test YouTube title/ }).click();
    await expect(card.locator('iframe')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1',
    );
    await expect(card.getByRole('button', { name: 'Stop' })).toBeFocused();
    await card.getByRole('button', { name: 'Stop' }).click();
    await expect(card.locator('iframe')).toHaveCount(0);
    await expect(card.getByRole('button', { name: /Play video/ })).toBeFocused();

    // Criterion 4: the card has its own Report button.
    await card.getByRole('button', { name: 'Report the video “Test YouTube title”' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.context().close();
  });

  test('a card a moderator removed shows the marker and the chapter stays up', async ({
    browser,
  }) => {
    runSql(`insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note)
      select '${writerId}', 'embed', id, 'removed', '${moderatorId}', 'Test removal'
      from public.chapter_embeds where chapter_id = '${chapterId}';`);
    const page = await openAs(browser, 'teen_17', readerAddress);
    await expect(page.getByText('[Removed by the moderation team]')).toBeVisible();
    await expect(page.getByText('Bunica ascultă prognoza la radio.')).toBeVisible();
    await expect(page.getByText('Test YouTube title')).toHaveCount(0);
    runSql(`delete from public.moderated_items where item_type = 'embed' and item_id in
      (select id from public.chapter_embeds where chapter_id = '${chapterId}');`);
    await page.context().close();
  });

  test('with cards switched off there is no Music or Video to insert', async ({ browser }) => {
    runSql(`update public.feature_flags set is_enabled = false where key = 'media_embeds';`);
    const page = await openAs(browser, 'adult_writer', editorAddress);
    await expect(page.getByRole('toolbar', { name: 'Formatting' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Insert a video link/ })).toHaveCount(0);
    const insert = page.getByRole('button', { name: 'Insert', exact: true });
    if ((await insert.count()) > 0) {
      await insert.click();
      await expect(page.getByRole('menuitem', { name: /Video/ })).toHaveCount(0);
      await expect(page.getByRole('menuitem', { name: /Music/ })).toHaveCount(0);
    }
    runSql(`update public.feature_flags set is_enabled = true where key = 'media_embeds';`);
    await page.context().close();
  });

  for (const [width, language] of [
    [390, 'ro'],
    [768, 'en'],
    [1440, 'en'],
  ] as const) {
    test(`the editor, its dialog and the reader pass axe and fit at ${width} px`, async ({
      browser,
    }) => {
      const page = await openAs(browser, 'adult_writer', editorAddress, { width, language });
      await expect(page.locator('.ProseMirror [role="group"]').first()).toBeVisible();
      await expectAccessibleAndFitting(page, width);
      // The Video link button (G9e), in either language.
      await page
        .locator(
          'button[aria-label^="Insert a video link"], button[aria-label^="Inserează un link video"]',
        )
        .click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expectAccessibleAndFitting(page, width);
      await page.goto(readerAddress);
      await expect(page.locator('[data-chapter-embed]').first()).toBeVisible();
      await expectAccessibleAndFitting(page, width);
      await page.locator('[data-chapter-embed] button').first().click();
      await expect(page.locator('[data-chapter-embed] iframe')).toBeVisible();
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
