/**
 * Rank notices and rank pills in a real browser (bundle 14d IDEAS-3, part a; idea
 * IDEA-20261102, "rank-up notice and rank on story cards").
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - when a writer's published chapters lift them to a new rank, they get one notice saying so,
 *   naming the rank in its pill (no sticker since bundle G4) and a link to their own profile
 *   (criterion 1);
 * - the writer card beside a story shows the writer's rank (criterion 3);
 * - a story card on the See all list shows the compact rank pill (criterion 3);
 * - the notifications page passes axe at 390, 768 and 1440 px, light and night, ro and en.
 * Test data: one story "Ranguri anunț e2e" with 15 published chapters by the pending_check persona,
 * whom no other spec gives a rank notice. The story, the notices and the "highest rank told" mark
 * are removed before and after, so the next run starts from no rank.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** The pending_check persona's user ID (the seed's), as in e2e/writer-ranks.spec.ts. */
const writerId = '00000000-0000-4000-8000-000000000005';
const storyId = '23100000-0000-4000-9000-00000000e2e2';
const storySlug = 'ranguri-anunt-e2e';
const title = 'Ranguri anunț e2e';

/** Takes off the story, its chapters, the rank notices and the mark, so the rank goes too. */
function cleanUp() {
  runSql(`
    delete from public.chapters where story_id = '${storyId}';
    delete from public.stories where id = '${storyId}';
    delete from public.notifications where user_id = '${writerId}' and kind = 'rank_reached';
    update public.profiles set highest_rank_notified = null, locale = 'ro'
      where id = '${writerId}';`);
}

/**
 * Gives pending_check a story with 15 published chapters, so they become a Storyteller. The
 * database's triggers work the rank out and send the notice.
 */
function publishChapters() {
  runSql(`
    insert into public.stories (id, user_id, slug, title, language_code, category_id, rating,
      first_published_at, last_chapter_published_at)
    values ('${storyId}', '${writerId}', '${storySlug}', '${title}', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select '${storyId}', '${writerId}', 'rne2e' || lpad(step::text, 3, '0'), step, 'Capitol', 'x',
      2500, 'published', 'Capitol', 'Text.', 2500, now()
    from generate_series(1, 15) as step;`);
}

/** Opens a page in English as pending_check. */
async function openAsWriter(browser: Browser, address: string): Promise<Page> {
  const { session } = await signInPersona('pending_check');
  const context = await browser.newContext();
  await useSessionInBrowser(context, session);
  runSql(`update public.profiles set locale = 'en' where id = '${writerId}';`);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
  return page;
}

test.describe('rank notices and rank pills (IDEAS-3a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    publishChapters();
  });
  test.afterAll(cleanUp);

  test('the writer is told once about their new rank, named in its pill', async ({ browser }) => {
    // Criterion 1: one notice for the highest rank reached, not one per rank on the way.
    const count = runSql(`select count(*) from public.notifications
      where user_id = '${writerId}' and kind = 'rank_reached';`);
    expect(count.split('\n').at(-1)).toBe('1');

    const page = await openAsWriter(browser, '/notifications');
    const notice = page.getByRole('listitem').filter({ hasText: 'Your rank:' });
    await expect(notice).toContainText('you’re now a Storyteller. Well done.');
    await expect(notice.getByTestId('rank-chip')).toContainText('Storyteller');
    await expect(notice.getByRole('link', { name: 'See your rank' })).toHaveAttribute(
      'href',
      '/u/pending_check',
    );
    await page.context().close();
  });

  test('the story page’s writer card shows the rank', async ({ browser }) => {
    const page = await openAsWriter(browser, `/s/${storySlug}`);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByTestId('rank-chip').first()).toHaveText('Writing rank: Storyteller');
    await page.context().close();
  });

  test('a story card on See all shows the compact rank pill', async ({ browser }) => {
    const page = await openAsWriter(browser, '/discover/all/updated');
    const card = page.getByRole('listitem').filter({ hasText: title });
    await expect(card.getByTestId('rank-chip')).toContainText('Storyteller');
    await page.context().close();
  });

  for (const view of everyView(['/notifications'])) {
    test(`axe: a rank notice at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      // The account's language wins over the browser's once the page reads it, so the view's
      // language goes on the account too (as in e2e/notifications.spec.ts).
      runSql(`update public.profiles set locale = '${view.language}' where id = '${writerId}';`);
      const { session } = await signInPersona('pending_check');
      const context = await browser.newContext();
      await useSessionInBrowser(context, session);
      const page = await context.newPage();
      await checkScreen(page, view);
      await expect(page.getByTestId('rank-chip').first()).toBeVisible();
      await context.close();
    });
  }
});
