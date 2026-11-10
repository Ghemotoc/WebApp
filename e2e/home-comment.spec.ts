/**
 * The staff-picked reader comment on the home page, in a real browser (bundle GAPS-13; story
 * S1-E5-13; board Website-Home, the comment card on the cover wall).
 *
 * What it proves:
 * - an admin sees a reader's recent comment at /staff/featured, invites the reader and sees the
 *   pick waiting;
 * - a visitor sees no comment on the home page before the reader agrees;
 * - the reader gets a notification that leads to the invitation on their hub, and agrees there;
 * - a visitor then sees the card on the cover wall: the reader's name, the comment, the story
 *   and the chapter, with nothing running off the screen on a phone;
 * - the reader takes the comment down again and it goes for everyone;
 * - the home page, the hub and the staff page have no serious axe issue at phone and desktop
 *   width.
 * The database rules (who may pick, adults only, All ages and 13+ stories, no spoilers, blocks)
 * are in supabase/tests/database/340-home-comment.test.sql.
 * Test data: the seed's admin and teacher, who read in Romanian, and one chapter and comment
 * this spec adds to the seed story "Stația meteo" and removes afterwards (the audit log keeps
 * its rows: append-only).
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const comment = 'Am citit în tramvai și era să ratez stația (e2e)';
const chapterCode = 'homece2e';
const seedStoryId = '00000000-0000-4000-9000-000000000001';
const writerId = '00000000-0000-4000-8000-000000000001';
const readerId = '00000000-0000-4000-8000-000000000007';

/** Removes what this spec made: the chapter takes its comment and the pick with it. */
function cleanUp() {
  runSql(`delete from public.notifications where kind = 'home_comment_invited' and user_id = '${readerId}';
    delete from public.chapters where code = '${chapterCode}';`);
}

/** Adds a published chapter to the seed story and the reader's comment on it. */
function addComment() {
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
      status, published_title, published_body, published_word_count, first_published_at)
    values ('${seedStoryId}', '${writerId}', '${chapterCode}', 90, 'Tramvaiul', 'x', 3, 'published',
      'Tramvaiul', 'Ultimul tramvai pleacă la miezul nopții.', 6, now());
    insert into public.comments (user_id, chapter_id, body)
    select '${readerId}', id, '${comment}' from public.chapters where code = '${chapterCode}';`);
}

/** Opens a page as a seed persona, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName, path: string) {
  // Other specs leave a persona reading in English; this one checks the Romanian words, so it
  // sets the language itself instead of counting on what ran before it.
  runSql(`update public.profiles set locale = 'ro' where handle = '${persona}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

/** Opens the home page as a visitor who isn't signed in. */
async function openHomeAsVisitor(browser: Browser, width: number) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  return page;
}

test.describe('reader comment on the home page (GAPS-13)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    addComment();
  });
  test.afterAll(cleanUp);

  test('an admin invites the reader and the pick waits for their answer', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/featured');
    await page.setViewportSize({ width: 1440, height: 900 });
    const section = page.getByRole('region', {
      name: 'Comentariul unui cititor pe pagina principală',
    });
    const candidate = section.getByRole('listitem').filter({ hasText: comment });
    await expect(candidate.getByText('Stația meteo · Capitolul 90')).toBeVisible();
    await candidate.getByRole('button', { name: 'Invită cititorul teacher' }).click();
    // The comment moves from the candidates to the picks, waiting.
    const pick = section.getByRole('listitem').filter({ hasText: comment });
    await expect(pick.getByText('Se așteaptă cititorul')).toBeVisible();
    await expect(
      pick.getByRole('button', { name: 'Scoate comentariul scris de teacher' }),
    ).toBeVisible();
    await expect(section.getByRole('button', { name: 'Invită cititorul teacher' })).toHaveCount(0);
    await page.context().close();
  });

  test('a visitor sees no comment before the reader agrees', async ({ browser }) => {
    const page = await openHomeAsVisitor(browser, 1440);
    await expect(page.getByText(comment)).toHaveCount(0);
    await page.context().close();
  });

  test('the reader follows the notification and agrees on their hub', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/notifications');
    await page.getByRole('link', { name: 'Vezi invitația' }).first().click();
    await expect(page).toHaveURL(/\/hub#home-comment-invitation$/);
    const invitation = page.locator('#home-comment-invitation');
    await expect(invitation.getByText(comment)).toBeVisible();
    await expect(invitation.getByText('Nimic nu apare până nu accepți.')).toBeVisible();
    await invitation.getByRole('button', { name: 'Accept', exact: true }).click();
    await expect(
      invitation.getByText('Ai acceptat. Pagina principală poate arăta comentariul.'),
    ).toBeVisible();
    await page.context().close();
  });

  test('a visitor then sees the card on the cover wall, on a phone too', async ({ browser }) => {
    for (const width of [1440, 390]) {
      const page = await openHomeAsVisitor(browser, width);
      const card = page.getByLabel('Comentariul unui cititor');
      await expect(card.getByText(comment)).toBeVisible();
      await expect(card.getByText('teacher', { exact: true })).toBeVisible();
      await expect(card.getByText('Stația meteo · Capitolul 90')).toBeVisible();
      // Nothing runs off the screen, and the card stays inside it.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
      await page.context().close();
    }
  });

  test('staff see which pick is on the home page', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/featured');
    const section = page.getByRole('region', {
      name: 'Comentariul unui cititor pe pagina principală',
    });
    const pick = section.getByRole('listitem').filter({ hasText: comment });
    await expect(pick.getByText('A acceptat')).toBeVisible();
    await expect(pick.getByText('Pe pagina principală')).toBeVisible();
    await page.context().close();
  });

  for (const view of [
    { persona: null, address: '/', width: 390, theme: 'night' },
    { persona: null, address: '/', width: 1440, theme: 'light' },
    { persona: 'teacher', address: '/hub', width: 390, theme: 'light' },
    { persona: 'admin', address: '/staff/featured', width: 390, theme: 'night' },
    { persona: 'admin', address: '/staff/featured', width: 1440, theme: 'light' },
  ] as const) {
    test(`no serious axe issue on ${view.address} at ${view.width} px, ${view.theme}`, async ({
      browser,
    }) => {
      const context = await browser.newContext();
      if (view.persona !== null) {
        await useSessionInBrowser(context, (await signInPersona(view.persona)).session);
      }
      const page = await context.newPage();
      await checkScreen(page, { ...view, language: 'ro' });
      await context.close();
    });
  }

  test('the reader takes the comment down and it goes for everyone', async ({ browser }) => {
    const readerPage = await openAs(browser, 'teacher', '/hub');
    const invitation = readerPage.locator('#home-comment-invitation');
    await invitation.getByRole('button', { name: 'Scoate comentariul' }).click();
    await expect(invitation.getByText('Ai refuzat. Nimic nu apare.')).toBeVisible();
    await readerPage.context().close();
    const visitorPage = await openHomeAsVisitor(browser, 1440);
    await expect(visitorPage.getByText(comment)).toHaveCount(0);
    await visitorPage.context().close();
  });
});
