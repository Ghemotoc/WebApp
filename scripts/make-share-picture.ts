/**
 * Makes the site's default share picture: the curled cat emblem on plum, 1200 × 630 px (story
 * S1-E11-38; bundle SEO-1c).
 *
 * Why: share cards (WhatsApp, Facebook, LinkedIn, X) show a large picture when a page has one of
 * 1200 × 630 (summary_large_image). The home page, help pages and landing pages without a picture
 * of their own use this one. It carries no words, so renaming the product never needs a new
 * picture (CLAUDE.md: names are settings); the page's title sits beside it as text on every card.
 * Who runs it: a developer, by hand, when the emblem or the plum changes:
 *   npx tsx scripts/make-share-picture.ts
 * (with CHROMIUM_PATH=<path to chromium> when Playwright's own browser isn't downloaded).
 * What it writes: public/link-previews/share.png, which Cloudflare Pages serves as a static file;
 * server/website-head.ts and server/landing-preview.ts point og:image at it.
 * It draws the picture in the Chromium that Playwright already installs for the end-to-end tests.
 */
import { readFileSync } from 'node:fs';

import { chromium } from 'playwright';

import { linkPreviewPalette } from '../server/link-preview-palette.ts';

/** The picture's size: what share cards ask for. */
const WIDTH = 1200;
const HEIGHT = 630;

/** Where it goes (served from the site's root by Vite and Cloudflare Pages). */
const OUTPUT_FILE = 'public/link-previews/share.png';

/**
 * Draws the picture and saves it.
 *
 * @returns nothing; the file is written
 * Errors: throws when Chromium can't start or the file can't be written.
 */
async function makeSharePicture(): Promise<void> {
  // Step 1: the emblem in its night colour, which reads on plum (BRAND-1, LOGO-1).
  const emblem = readFileSync('public/brand/emblem-dark.svg', 'utf8').replace(
    /<!--[\s\S]*?-->/g,
    '',
  );
  // Step 2: a page the size of the picture: plum, with the emblem in the middle.
  const page = `<!doctype html><html><body style="margin:0;width:${WIDTH}px;height:${HEIGHT}px;
    background:${linkPreviewPalette.plum};display:flex;align-items:center;justify-content:center">
    <div style="width:300px;height:326px">${emblem.replace('<svg ', '<svg width="300" height="326" ')}</div>
  </body></html>`;
  // Step 3: a screenshot of exactly that size, saved as PNG.
  // CHROMIUM_PATH points at another Chromium when Playwright's own isn't downloaded.
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  try {
    const tab = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
    await tab.setContent(page);
    await tab.screenshot({ path: OUTPUT_FILE, type: 'png' });
  } finally {
    await browser.close();
  }
}

await makeSharePicture();
