/**
 * Nothing scrolls sideways on any page, at any of the three widths (bundle G14, the liquid glass
 * final pass; CLAUDE.md rule 21: "Check each screen at 390, 768 and 1440 px wide; nothing
 * overlaps, cuts off or scrolls sideways").
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves: every route in src/app/router.tsx that a visitor, a member or an admin can open
 * fits the screen at 390, 768 and 1440 px. Each screen's own spec runs axe and the same width check
 * on its own screens; this one sweeps every page in one place, so a page no spec covers can't
 * slip through. When a page is too wide, the failure names the elements that stick out, so the fix
 * starts from the right place.
 * Test data: one story of adult_writer's with two published chapters, removed afterwards. Pages
 * that need a row this spec doesn't make (a case, a ticket, a class) are opened at their list.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY, screenWidths } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The spec's own story and its chapter code prefix. */
const storySlug = 'narrow-screens-e2e';
const chapterPrefix = 'narrowc';

/** Pages anyone can open, signed in or not. */
const visitorPages = [
  '/',
  '/help',
  '/legal',
  '/contact',
  '/report',
  '/sign-up',
  '/sign-in',
  '/forgot-password',
  '/not-open',
  '/verify',
  '/discover',
  '/search',
  '/forums',
  '/forums/writing-craft',
  '/spaces',
  `/s/${storySlug}`,
  `/s/${storySlug}/${chapterPrefix}1`,
  '/u/adult_writer',
  '/no-such-page',
];

/** Pages a signed-in member opens; the story's own pages are adult_writer's. */
const memberPages = [
  '/hub',
  '/write',
  '/write/new',
  '/write/comments',
  `/write/s/${storySlug}/settings`,
  `/write/s/${storySlug}/chapters`,
  `/write/s/${storySlug}/c/${chapterPrefix}1`,
  '/plan',
  `/plan/s/${storySlug}`,
  `/plan/s/${storySlug}/characters`,
  `/plan/s/${storySlug}/connections`,
  `/plan/s/${storySlug}/world`,
  `/plan/s/${storySlug}/storyline`,
  `/plan/s/${storySlug}/ideas`,
  `/plan/s/${storySlug}/marketing`,
  `/plan/s/${storySlug}/search`,
  `/plan/s/${storySlug}/readers`,
  '/library',
  '/notifications',
  '/settings',
  '/my-reports',
  '/support',
  '/support/new',
  '/moderator-mail',
  '/moderator-mail/new',
  '/certificates',
  '/spaces/new',
  '/forums/writing-craft/new',
  '/class',
  '/contests',
  '/delete-account',
];

/** The staff site's pages, as an admin. */
const staffPages = [
  '/staff',
  '/staff/moderation',
  '/staff/moderator-mail',
  '/staff/support',
  '/staff/support/canned',
  '/staff/tags',
  '/staff/forums',
  '/staff/pictures',
  '/staff/appeals',
  '/staff/safety-contacts',
  '/staff/hub',
  '/staff/contests',
  '/staff/sponsors',
  '/staff/website',
  '/staff/settings',
  '/staff/roles',
  '/staff/on-call',
  '/staff/users',
  '/staff/users/age-checks',
  '/staff/waitlist',
  '/staff/users/invites',
  '/staff/invites',
  '/staff/stories',
  '/staff/data-requests',
  '/staff/data-requests/new',
  '/staff/featured',
  '/staff/classics',
  '/staff/schools/teachers',
  '/staff/schools/classes',
  '/staff/schools/certificates',
  '/staff/metrics',
  '/staff/logs',
  '/staff/audit-log',
];

/** Removes the spec's story and its chapters. */
function cleanUp() {
  runSql(`delete from public.chapters where code like '${chapterPrefix}%';
    delete from public.stories where slug = '${storySlug}';`);
}

/** adult_writer's story with two published chapters, so the story, reader and writing pages draw. */
function seedStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('00000000-0000-4000-8000-000000000001', '${storySlug}',
      'O poveste cu un titlu destul de lung cât să se rupă pe două rânduri', 'Un rezumat scurt.', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select stories.id, stories.user_id, '${chapterPrefix}' || place, place, 'Capitol', 'Text.', 500,
      'published', 'Capitolul ' || place, 'Un paragraf al capitolului, cu destule cuvinte cât să umple un rând.', 500, now()
    from public.stories cross join generate_series(1, 2) as place
    where stories.slug = '${storySlug}';`);
}

/**
 * Opens a browser context (one device), signed in as a persona or as a visitor, in English.
 *
 * @param browser - Playwright's browser
 * @param persona - who is signed in, or null for a visitor
 * @returns a page in that context
 */
async function openDevice(browser: Browser, persona: SignInPersonaName | null): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  return context.newPage();
}

/**
 * The elements that stick out past the right edge of the screen, for the failure message.
 *
 * @param page - the open page
 * @returns up to five short descriptions (tag, classes, how far it sticks out)
 */
async function elementsSticking(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const screenWidth = document.documentElement.clientWidth;
    const found: string[] = [];
    for (const element of Array.from(document.body.querySelectorAll('*'))) {
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.right <= screenWidth + 1) continue;
      // Only the outermost element that sticks out: its children follow it.
      const parent = element.parentElement;
      if (parent !== null && parent.getBoundingClientRect().right > screenWidth + 1) continue;
      const classes = typeof element.className === 'string' ? element.className.slice(0, 80) : '';
      found.push(
        `${element.tagName.toLowerCase()}.${classes} sticks out ${Math.round(box.right - screenWidth)} px`,
      );
      if (found.length === 5) break;
    }
    return found;
  });
}

/**
 * Opens each page at each width and checks nothing scrolls sideways.
 *
 * @param page - a page signed in as the right person
 * @param addresses - the pages to open
 * @param signedIn - true when the page belongs to a signed-in person, so a sign-in redirect fails
 * Errors: one soft failure per page and width that is too wide, naming what sticks out.
 */
async function checkPages(page: Page, addresses: string[], signedIn: boolean): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of screenWidths) {
    await page.setViewportSize({ width, height: 900 });
    for (const address of addresses) {
      // Step 1: open the page and let its data arrive.
      await page.goto(address);
      await page.waitForLoadState('networkidle');
      // A signed-in page that sent the browser to sign in would pass without being checked.
      if (signedIn)
        expect.soft(page.url(), `${address} opened signed in`).not.toContain('/sign-in');
      // Step 2: the page may be no wider than the screen.
      const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const sticking = pageWidth > width ? await elementsSticking(page) : [];
      expect.soft(sticking, `${address} at ${width} px is ${pageWidth} px wide`).toEqual([]);
      expect.soft(pageWidth, `${address} at ${width} px`).toBeLessThanOrEqual(width);
    }
  }
}

test.describe('nothing scrolls sideways (G14, CLAUDE.md rule 21)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('a visitor’s pages fit at 390, 768 and 1440 px', async ({ browser }) => {
    test.setTimeout(240_000);
    await checkPages(await openDevice(browser, null), visitorPages, false);
  });

  test('a member’s pages fit at 390, 768 and 1440 px', async ({ browser }) => {
    test.setTimeout(360_000);
    await checkPages(await openDevice(browser, 'adult_writer'), memberPages, true);
  });

  test('the staff site fits at 390, 768 and 1440 px', async ({ browser }) => {
    test.setTimeout(360_000);
    await checkPages(await openDevice(browser, 'admin'), staffPages, true);
  });
});
