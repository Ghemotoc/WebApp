/**
 * The chapter reader's speed, size and zoom (story S1-E4-01b; S1-E4-01 criteria).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request. It runs against the production
 * build that `vite preview` serves (playwright.config.ts), as decided on 23 Oct 2026 (Q12:
 * emulation on the production build).
 * What it proves:
 * - "Given a mid-range Android phone on 4G, when a chapter opens, then the text is readable within
 *   2 seconds" (a proposal): a cold load at phone size, with the CPU 4 times slower and Chrome's
 *   "Fast 4G" network (9 Mbit/s down, 1.5 Mbit/s up, 60 ms), shows the first paragraph in under
 *   2,000 ms. The median of three loads counts, so one slow load on a busy machine doesn't decide.
 * - The reader stays small: the script it adds beyond what the home page already loads is under
 *   40 KB (today about 11 KB), so a later change can't quietly make chapters slow.
 * - 200% zoom (WCAG 1.4.4 and 1.4.10): a 1280 × 800 window at 200% is a 640 px wide page with
 *   twice the pixel density; nothing scrolls sideways and no text runs past the edge.
 * Test data: one long chapter on adult_writer's seed story; removed after.
 */
import { expect, test, type Browser, type BrowserContext } from '@playwright/test';

import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000001';
const chapterAddress = '/s/statia-meteo-seed01/perfread';

/** The budget for the first paragraph, in milliseconds (S1-E4-01, a proposal). */
const FIRST_PARAGRAPH_BUDGET_MS = 2000;

/** The most script, in KB before compression, the reader may add to the app's own. */
const READER_SCRIPT_BUDGET_KB = 40;

/** Chrome DevTools' "Fast 4G" profile, in the units the DevTools protocol takes. */
const fast4g = {
  offline: false,
  latency: 60,
  downloadThroughput: (9000 * 1024) / 8,
  uploadThroughput: (1500 * 1024) / 8,
};

/** A published chapter of about 2,000 words. */
function seedChapter() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '00000000-0000-4000-8000-000000000001', 'perfread', 1, 'Caietele bunicii',
      'x', 2000, 'published', 'Caietele bunicii',
      repeat('Bunica notează vremea în fiecare dimineață, cu creionul. ' || chr(10) || chr(10), 200),
      2000, now());`);
}

/** Removes the chapter. */
function cleanUp() {
  runSql(`delete from public.chapters where story_id = '${storyId}';`);
}

/** A fresh, signed-in browser at phone size: no cache, nothing loaded yet. */
async function coldReader(browser: Browser): Promise<BrowserContext> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await useSessionInBrowser(context, (await signInPersona('teacher')).session);
  return context;
}

/** Where the page notes when the first paragraph was painted (see markFirstParagraph). */
type TimedWindow = Window & { firstParagraphPaintedAt?: number };

/**
 * Runs inside the page before any of its own scripts: watches for the first paragraph of chapter
 * text and notes performance.now() on the next frame after it appears, which is when it is painted.
 * Timing it inside the page leaves out the test's own polling and round trips, which on a busy
 * machine with the CPU slowed 4 times added a few hundred milliseconds and made the result flaky
 * (PEOPLE-1: it failed on main too).
 */
function markFirstParagraph() {
  const timedWindow = window as TimedWindow;
  const observer = new MutationObserver(() => {
    if (document.querySelector('.tmc-chapter-text p') === null) return;
    observer.disconnect();
    requestAnimationFrame(() => {
      timedWindow.firstParagraphPaintedAt = performance.now();
    });
  });
  observer.observe(document, { childList: true, subtree: true });
}

/**
 * Opens the chapter on a throttled phone and times the first paragraph.
 *
 * @returns milliseconds from the start of the navigation to the first paragraph being painted
 */
async function timeFirstParagraph(browser: Browser): Promise<number> {
  const context = await coldReader(browser);
  await context.addInitScript(markFirstParagraph);
  const page = await context.newPage();
  const devTools = await context.newCDPSession(page);
  await devTools.send('Network.enable');
  await devTools.send('Network.emulateNetworkConditions', fast4g);
  await devTools.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(chapterAddress);
  await page.locator('.tmc-chapter-text p').first().waitFor({ state: 'visible' });
  // performance.now() counts from the start of this page's navigation.
  const handle = await page.waitForFunction(() => (window as TimedWindow).firstParagraphPaintedAt);
  const milliseconds = (await handle.jsonValue()) ?? Number.POSITIVE_INFINITY;
  await context.close();
  return milliseconds;
}

/**
 * The scripts a cold load of an address downloads, with their sizes.
 *
 * @returns a map from file name to KB before compression
 */
async function scriptsLoadedBy(browser: Browser, address: string): Promise<Map<string, number>> {
  const context = await coldReader(browser);
  const page = await context.newPage();
  const scripts = new Map<string, number>();
  page.on('response', async (response) => {
    if (response.request().resourceType() !== 'script') return;
    const body = await response.body().catch(() => Buffer.alloc(0));
    scripts.set(new URL(response.url()).pathname, body.length / 1024);
  });
  await page.goto(address);
  await page.waitForLoadState('networkidle');
  await context.close();
  return scripts;
}

test.describe('chapter reader: speed, size and zoom (S1-E4-01b)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedChapter);
  test.afterAll(cleanUp);

  test('a throttled phone shows the first paragraph within 2 seconds of a cold load', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const loads: number[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      loads.push(await timeFirstParagraph(browser));
    }
    loads.sort((first, second) => first - second);
    const median = loads[1] ?? Number.POSITIVE_INFINITY;
    test.info().annotations.push({
      type: 'first paragraph',
      description: `${loads.map(Math.round).join(', ')} ms (median ${Math.round(median)} ms)`,
    });
    expect(median).toBeLessThan(FIRST_PARAGRAPH_BUDGET_MS);
  });

  test('the reader adds under 40 KB of script to what the home page loads', async ({ browser }) => {
    const home = await scriptsLoadedBy(browser, '/');
    const reader = await scriptsLoadedBy(browser, chapterAddress);
    const added = [...reader].filter(([path]) => !home.has(path));
    const addedKb = added.reduce((total, [, size]) => total + size, 0);
    test.info().annotations.push({
      type: 'reader scripts',
      description: added.map(([path, size]) => `${path} ${size.toFixed(1)} KB`).join('; '),
    });
    expect(addedKb).toBeLessThan(READER_SCRIPT_BUDGET_KB);
  });

  test('at 200% zoom nothing scrolls sideways and no text runs past the edge', async ({
    browser,
  }) => {
    // A 1280 × 800 window at 200%: the page lays out at 640 px with two device pixels per CSS pixel.
    const context = await browser.newContext({
      viewport: { width: 640, height: 400 },
      deviceScaleFactor: 2,
    });
    await useSessionInBrowser(context, (await signInPersona('teacher')).session);
    const page = await context.newPage();
    await page.goto(chapterAddress);
    await expect(page.locator('.tmc-chapter-text p').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      640,
    );
    const overflowing = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1, p, a, button, nav, li'))
        .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 0.5)
        .map((element) => element.textContent?.slice(0, 40) ?? element.tagName),
    );
    expect(overflowing).toEqual([]);
    await context.close();
  });
});
