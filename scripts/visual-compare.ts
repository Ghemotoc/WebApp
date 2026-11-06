/**
 * Visual compare: puts each app screen next to the design board it should look like (LOOK-0,
 * the design catch-up bundles, 6 Nov 2026). `npx tsx scripts/visual-compare.ts [route…]` runs it.
 *
 * Why it exists: the boards in design/boards are the source of truth for the look (CLAUDE.md,
 * Designs), but nothing showed the app and the board side by side. Every LOOK pull request
 * attaches these images so the founder can see what changed without running the app.
 *
 * What it needs (it never starts anything itself):
 *   - the local stack: `npx supabase start`, then the demo top-ups (docs/recipes.md, "Compare a
 *     screen with its board");
 *   - the dev server: `npm run dev` (http://localhost:5173, or VISUAL_COMPARE_BASE_URL).
 *
 * What it does, for every route in scripts/visual-compare.routes.json (or only the ones named on
 * the command line), at 1440, 768 and 390 px wide:
 *   1. signs in as the route's seed persona when it has one, with the interface in English
 *      (the boards are drawn in English) and the light theme (the boards have no night mode);
 *   2. takes a full-page screenshot of the app;
 *   3. lays it beside the board render (design/renders/desktop for 1440 and 768,
 *      design/renders/phone for 390) on one labelled image;
 *   4. writes test-results/visual-compare/<width>-<board>.jpg (git ignores test-results/).
 * Who calls it: you, or a Claude Code session working on a LOOK bundle.
 * What it calls: Playwright's Chromium (already installed for the e2e tests; PLAYWRIGHT_CHROMIUM_PATH
 * points it at another copy, as in playwright.config.ts).
 * Errors: a route that fails to load is reported and skipped; the script exits with code 1 at the
 * end if any route failed, so a broken screen is never silently missing from the set.
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { chromium, type Browser, type Page } from '@playwright/test';

import { THEME_STORAGE_KEY } from '../src/lib/theme';

/** One app route and the board it should match, as listed in visual-compare.routes.json. */
export interface CompareRoute {
  route: string;
  board: string;
  /** The seed persona to sign in as (supabase/README.md, Seed personas), or null for a visitor. */
  signedIn: string | null;
}

/** One picture to make: a route at one width. */
export interface CompareShot {
  entry: CompareRoute;
  width: number;
  /** Which render folder holds the board for this width. */
  renderFolder: 'desktop' | 'phone';
}

/** The three widths every screen is checked at (CLAUDE.md rule 21). */
export const compareWidths = [1440, 768, 390] as const;

/** The language key the app reads (src/lib/language-preference.ts); English matches the boards. */
const languageStorageKey = 'interface-language';
/** Every seed persona shares this synthetic test password (supabase/README.md, Seed personas). */
const personaPassword = 'Persona-Test-2026!';
const repositoryRoot = join(import.meta.dirname, '..');
const outputFolder = join(repositoryRoot, 'test-results', 'visual-compare');

/**
 * Reads the route list and keeps only the routes asked for.
 * Input: the parsed JSON file and the routes named on the command line (empty = all of them).
 * Returns: the matching entries, in file order.
 * Errors: throws when a named route is not in the file, so a typo never yields an empty run.
 */
export function pickRoutes(allRoutes: CompareRoute[], askedFor: string[]): CompareRoute[] {
  if (askedFor.length === 0) return allRoutes;
  const unknown = askedFor.filter((route) => !allRoutes.some((entry) => entry.route === route));
  if (unknown.length > 0) {
    throw new Error(`Not in scripts/visual-compare.routes.json: ${unknown.join(', ')}`);
  }
  return allRoutes.filter((entry) => askedFor.includes(entry.route));
}

/**
 * Turns routes into shots: one per route and width, phones compared with the phone render.
 * Input: the routes to compare. Returns: every shot to take, route by route.
 */
export function planShots(routes: CompareRoute[]): CompareShot[] {
  const shots: CompareShot[] = [];
  for (const entry of routes) {
    for (const width of compareWidths) {
      // The boards were rendered at 1440 (desktop) and 390 (phone); 768 uses the desktop one.
      const renderFolder = width === 390 ? 'phone' : 'desktop';
      shots.push({ entry, width, renderFolder });
    }
  }
  return shots;
}

/** The output file name for one shot, for example "390-Discover.jpg". */
export function shotFileName(shot: CompareShot): string {
  return `${shot.width}-${shot.entry.board}.jpg`;
}

/**
 * Makes a signed-in persona's account language read as English, without changing the database.
 * Why: the account language (profiles.locale) wins over the browser's choice
 * (src/lib/language-preference.ts), and the seed personas are Romanian; the boards are English.
 * How: the app reads it with `profiles?select=locale` (src/features/language/api/profileLocale.ts);
 * this rewrites only that answer, in this browser only.
 */
async function answerAccountLanguageAsEnglish(page: Page): Promise<void> {
  await page.route(/\/rest\/v1\/profiles\?select=locale/, async (route) => {
    const response = await route.fetch();
    const body: unknown = await response.json();
    // maybeSingle() asks for one object; a plain read gives a list. Handle both shapes.
    const rewritten = Array.isArray(body)
      ? body.map((row: object) => ({ ...row, locale: 'en' }))
      : { ...(body as object), locale: 'en' };
    await route.fulfill({ response, json: rewritten });
  });
}

/** Signs a persona in through the real log-in screen, as a person would. */
async function signIn(page: Page, baseUrl: string, persona: string): Promise<void> {
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: 'networkidle' });
  await page.locator('input[type=email]').fill(`${persona}@personas.test`);
  await page.locator('input[autocomplete=current-password]').fill(personaPassword);
  await page.locator('button[type=submit]').first().click();
  // Wait for the session to be saved before the next page load reads it.
  await page.waitForURL((address) => !address.pathname.startsWith('/sign-in'), { timeout: 15_000 });
}

/** Takes the full-page screenshot of the app for one shot and returns it as a JPEG buffer. */
async function captureApp(browser: Browser, baseUrl: string, shot: CompareShot): Promise<Buffer> {
  const context = await browser.newContext({ viewport: { width: shot.width, height: 900 } });
  try {
    // Step 1: English and the light theme before the first page draws.
    await context.addInitScript(
      ([themeKey, languageKey]) => {
        localStorage.setItem(themeKey, 'light');
        localStorage.setItem(languageKey, 'en');
      },
      [THEME_STORAGE_KEY, languageStorageKey] as const,
    );
    // Reduced motion so nothing is caught half-way through an animation.
    const page = await context.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await answerAccountLanguageAsEnglish(page);
    // Step 2: sign in when the screen is a signed-in one.
    if (shot.entry.signedIn !== null) await signIn(page, baseUrl, shot.entry.signedIn);
    // Step 3: open the route and give late data a moment to arrive.
    await page.goto(`${baseUrl}${shot.entry.route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1_000);
    return await page.screenshot({ fullPage: true, type: 'jpeg', quality: 80 });
  } finally {
    await context.close();
  }
}

/** The HTML page that lays the board and the app side by side, each under its own label. */
function sideBySideHtml(boardImage: Buffer, appImage: Buffer, title: string): string {
  const column = (label: string, colour: string, image: Buffer) =>
    `<figure><figcaption style="color:${colour}">${label}</figcaption>` +
    `<img src="data:image/jpeg;base64,${image.toString('base64')}" alt=""></figure>`;
  return `<!doctype html><html><head><style>
    body{margin:0;background:#fff;font:600 22px system-ui,sans-serif}
    h1{font-size:18px;margin:12px 16px;color:#26142e}
    main{display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:0 16px 16px;align-items:start}
    figure{margin:0}figcaption{padding:4px 0 8px}img{width:100%;display:block;border:1px solid #ded3e4}
  </style></head><body><h1>${title}</h1><main>
    ${column('Design board', '#481c5f', boardImage)}
    ${column('App (this branch)', '#8c2b3a', appImage)}
  </main></body></html>`;
}

/** Makes and saves the side-by-side picture for one shot. */
async function compareOne(browser: Browser, baseUrl: string, shot: CompareShot): Promise<void> {
  const boardPath = join(
    repositoryRoot,
    'design',
    'renders',
    shot.renderFolder,
    `${shot.entry.board}.jpg`,
  );
  const boardImage = readFileSync(boardPath);
  const appImage = await captureApp(browser, baseUrl, shot);
  // Lay both out on a 1600 px page and screenshot it whole.
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  try {
    const title = `${shot.entry.route} at ${shot.width} px · board ${shot.entry.board}`;
    await page.setContent(sideBySideHtml(boardImage, appImage, title), { waitUntil: 'load' });
    const outputPath = join(outputFolder, shotFileName(shot));
    await page.screenshot({ path: outputPath, fullPage: true, type: 'jpeg', quality: 70 });
    console.log(`Wrote ${outputPath}`);
  } finally {
    await page.close();
  }
}

/** Runs every shot; returns the routes that failed so main() can set the exit code. */
async function runShots(shots: CompareShot[], baseUrl: string): Promise<string[]> {
  const failures: string[] = [];
  // Same switch as playwright.config.ts: a machine whose Chromium lives elsewhere names it here.
  const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  const browser = await chromium.launch(
    chromiumPath === undefined ? {} : { executablePath: chromiumPath },
  );
  try {
    for (const shot of shots) {
      try {
        await compareOne(browser, baseUrl, shot);
      } catch (error) {
        // One broken screen must not stop the others; it is listed at the end.
        const reason = error instanceof Error ? error.message.split('\n')[0] : String(error);
        failures.push(`${shot.entry.route} at ${shot.width} px: ${reason}`);
      }
    }
  } finally {
    await browser.close();
  }
  return failures;
}

/** Reads the route file, plans the shots, runs them and reports. */
async function main(): Promise<void> {
  const baseUrl = process.env.VISUAL_COMPARE_BASE_URL ?? 'http://localhost:5173';
  const routeFile = join(repositoryRoot, 'scripts', 'visual-compare.routes.json');
  const parsed = JSON.parse(readFileSync(routeFile, 'utf8')) as { routes: CompareRoute[] };
  const shots = planShots(pickRoutes(parsed.routes, process.argv.slice(2)));
  mkdirSync(outputFolder, { recursive: true });
  const failures = await runShots(shots, baseUrl);
  if (failures.length > 0) {
    console.error(`\n${failures.length} screen(s) failed:\n- ${failures.join('\n- ')}`);
    process.exitCode = 1;
  }
}

// Run only when started from the command line, not when the test file imports the helpers.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  void main();
}
