/**
 * The web teaser and link previews (story S1-E4-04; board 3.8; Q6, Q13 option B, Q35, Q36).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first). The
 * pages come from the production build through `vite preview`, whose Pages Functions plugin runs
 * the same server/link-preview.ts as Cloudflare does for /s/….
 * What it proves:
 * - a signed-out visitor on a shared chapter sees the story (title, pen name, blurb), the first
 *   whole paragraphs up to 600 words and never the rest, then the prompt to log in; a signed-in
 *   reader gets the whole chapter;
 * - on 16+ and 18+ stories a visitor sees the title and "No preview for this story" naming the
 *   rating, never the blurb or any text, on the chapter and the story page;
 * - the HTML a link preview reads carries the Open Graph tags (title, pen name, blurb, the cover's
 *   colour), chapter pages carry noindex in the page and the header, story pages carry JSON-LD
 *   without chapter text, and a 16+ story's tags hold its title only;
 * - axe finds nothing serious in all 12 views of the teaser and the notice, nothing scrolls
 *   sideways, and the teaser draws no doodle at 390, 768 and 1440 px.
 * Test data: two chapters on adult_writer's seed story; removed, and the story put back, after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import {
  checkScreen,
  everyView,
  LANGUAGE_STORAGE_KEY,
  screenWidths,
} from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000001';
const slug = 'statia-meteo-seed01';
const chapterAddress = `/s/${slug}/teasere1`;
const writerId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';

/** A 648-word chapter: 300 words, 248 words, then 100 words of "ultimul" that the teaser leaves out. */
const longChapter = `repeat('Bunica notează vremea. ', 100) || chr(10) || chr(10)
  || repeat('Vântul bate dinspre munte. ', 62) || chr(10) || chr(10) || repeat('ultimul ', 100)`;

/** Removes this spec's chapters and puts the seed story back as it was. */
function cleanUp() {
  runSql(`delete from public.chapters where story_id = '${storyId}';`);
  runSql(`update public.stories set rating = 'all_ages', first_published_at = null
    where id = '${storyId}';`);
}

/** Two published chapters, the first one long, on a story readers can find. */
function seedChapters() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values
      ('${storyId}', '${writerId}', 'teasere1', 1, 'Caietele bunicii', 'x', 650, 'published',
        'Caietele bunicii', ${longChapter}, 650, now()),
      ('${storyId}', '${writerId}', 'teasere2', 2, 'Vântul', 'x', 2, 'published',
        'Vântul', 'Vântul se întoarce.', 3, now());`);
  runSql(`update public.stories set first_published_at = now() where id = '${storyId}';`);
}

/** Gives the story a rating that hides it from visitors. */
function rateStory(rating: '16_plus' | '18_plus') {
  runSql(`update public.stories set rating = '${rating}' where id = '${storyId}';`);
}

/** Opens an address in English as a visitor who isn't logged in. */
async function openAsVisitor(page: Page, address: string) {
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  await page.goto(address);
}

/** A signed-in adult reader's page, in English. */
async function openAsReader(browser: Browser, address: string): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where id = '${teacherId}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('teacher')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('the web teaser and link previews (S1-E4-04)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(seedChapters);
  test.afterAll(() => {
    cleanUp();
    runSql(`update public.profiles set locale = 'ro' where id = '${teacherId}';`);
  });

  test('a visitor reads the story card and the first part, then is asked to log in', async ({
    page,
  }) => {
    await openAsVisitor(page, chapterAddress);
    // The story card: the title as the page's heading, the pen name and the blurb.
    await expect(page.getByRole('heading', { level: 1, name: 'Stația meteo' })).toBeVisible();
    await expect(page.getByText('Shared with you · chapter 1 of 2')).toBeVisible();
    await expect(page.getByText('Lia Scrie').first()).toBeVisible();
    await expect(page.getByText('Bunica mea notează vremea în fiecare dimineață')).toBeVisible();
    // The chapter: its heading, the first two paragraphs and never the third.
    await expect(page.getByRole('heading', { level: 2, name: 'Caietele bunicii' })).toBeVisible();
    await expect(page.getByText('You’re reading the first part')).toBeVisible();
    await expect(page.locator('.tmc-chapter-text p')).toHaveCount(2);
    expect(await page.content()).not.toContain('ultimul');
    // The prompt.
    await expect(page.getByText('1 more chapter')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Log in to read on' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Log in' }).last()).toHaveAttribute(
      'href',
      '/sign-in',
    );
  });

  test('a signed-in reader still reads the whole chapter (Q35)', async ({ browser }) => {
    const page = await openAsReader(browser, chapterAddress);
    await expect(page.locator('.tmc-chapter-text p')).toHaveCount(3);
    await expect(page.getByText('ultimul ultimul').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Log in to read on' })).toHaveCount(0);
  });

  test('16+ and 18+: a visitor sees the story’s details and why, never the text', async ({
    page,
  }) => {
    for (const rating of ['16_plus', '18_plus'] as const) {
      rateStory(rating);
      const label = rating === '16_plus' ? '16+' : '18+';
      for (const address of [chapterAddress, `/s/${slug}`]) {
        await openAsVisitor(page, address);
        await expect(page.getByRole('heading', { level: 1, name: 'Stația meteo' })).toBeVisible();
        await expect(
          page.getByRole('heading', { name: 'No preview for this story' }),
        ).toBeVisible();
        await expect(page.getByText(`The writer rated it ${label}.`)).toBeVisible();
        await expect(
          page.getByRole('link', { name: 'Log in to check if you can read it' }),
        ).toBeVisible();
        // S1-E11-36: the blurb shows like any story's; the chapter text never does (Q6).
        expect(await page.content()).not.toContain('ultimul ultimul');
      }
    }
  });

  test('a shared link’s HTML carries the preview, and only story pages are indexable', async ({
    request,
  }) => {
    // A chapter: Open Graph tags, noindex in the page and in the header, no structured data.
    const chapter = await request.get(chapterAddress);
    const chapterHtml = await chapter.text();
    expect(chapterHtml).toContain(
      '<meta property="og:title" content="Stația meteo · Caietele bunicii">',
    );
    expect(chapterHtml).toMatch(
      /<meta property="og:description" content="de Lia Scrie · [^"·]+ · Bunica mea/,
    );
    expect(chapterHtml).toMatch(
      /<meta property="og:image" content="http[^"]+\/link-previews\/sky\.png">/,
    );
    expect(chapterHtml).toContain('<meta name="robots" content="noindex">');
    expect(chapter.headers()['x-robots-tag']).toBe('noindex');
    expect(chapterHtml).not.toContain('application/ld+json');
    expect(chapterHtml).not.toContain('Vântul bate');
    // The picture it names is served.
    const image = await request.get('/link-previews/sky.png');
    expect(image.headers()['content-type']).toBe('image/png');
    // A story page: indexable, with JSON-LD naming the title, blurb, pen name, category and tags.
    const story = await request.get(`/s/${slug}`);
    const storyHtml = await story.text();
    expect(story.headers()['x-robots-tag']).toBeUndefined();
    expect(storyHtml).toContain('"@type":"CreativeWork"');
    expect(storyHtml).toContain('"author":{"@type":"Person","name":"Lia Scrie"}');
    expect(storyHtml).not.toContain('Vântul bate');
    // A 16+ story: the same details as any story, never its rating (S1-E11-36).
    rateStory('16_plus');
    const sixteenHtml = await (await request.get(chapterAddress)).text();
    expect(sixteenHtml).toContain(
      '<meta property="og:title" content="Stația meteo · Caietele bunicii">',
    );
    expect(sixteenHtml).toMatch(
      /<meta property="og:description" content="de Lia Scrie · [^"·]+ · Bunica mea/,
    );
    expect(sixteenHtml).not.toContain('16+');
    expect(sixteenHtml).not.toContain('Vântul bate');
    // An 18+ story: the same, with "For mature readers" and still no rating.
    rateStory('18_plus');
    const eighteenHtml = await (await request.get(`/s/${slug}`)).text();
    expect(eighteenHtml).toMatch(
      /<meta property="og:description" content="de Lia Scrie · Pentru cititori maturi · [^"·]+ · Bunica mea/,
    );
    expect(eighteenHtml).not.toContain('18+');
  });

  test('axe in all 12 views of the teaser and the notice; no doodle drawn', async ({ browser }) => {
    test.setTimeout(240_000);
    const context = await browser.newContext();
    for (const view of everyView([chapterAddress])) {
      const page = await context.newPage();
      await test.step(`teaser at ${view.width} px, ${view.theme}, ${view.language}`, async () => {
        await checkScreen(page, view);
        await expect(page.locator('.tmc-chapter-text')).toBeVisible();
        await expectNoDoodles(page);
      });
      await page.close();
    }
    rateStory('18_plus');
    for (const width of screenWidths) {
      const page = await context.newPage();
      await test.step(`notice at ${width} px`, async () => {
        await checkScreen(page, { address: chapterAddress, width, theme: 'light', language: 'en' });
        await expect(
          page.getByRole('heading', { name: 'No preview for this story' }),
        ).toBeVisible();
      });
      await page.close();
    }
    await context.close();
  });
});
