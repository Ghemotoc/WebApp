/**
 * Who can comment on a story, in a real browser (bundle MUST-1, part a; IDEA-20261106-2; story
 * S1-E6-01; board 3.5, the comments under a chapter).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - on Followers only, someone who doesn't follow the writer sees "Only the writer's followers can
 *   comment here." instead of the comment box, under the chapter and in a paragraph's thread;
 * - a follower sees the box and comments;
 * - the screen passes axe at 390 and 1440 px.
 * Test data: one published chapter on adult_writer's "Stația meteo", set to Followers only, and
 * blocker following adult_writer; all put back before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';
const blockerId = '00000000-0000-4000-8000-000000000015';
const storyId = '00000000-0000-4000-9000-000000000001';
const chapterAddress = '/s/statia-meteo-seed01/audce001';
const followersOnlyLine = 'Only the writer’s followers can comment here.';

/** Removes this spec's chapter and follow, and puts the setting and languages back. */
function cleanUp() {
  runSql(`delete from public.jobs where kind = 'comment_posted';
    delete from public.comments where chapter_id in (select id from public.chapters where code like 'audce%');
    delete from public.chapters where code like 'audce%';
    delete from public.follows_users where followed_user_id = '${adultWriterId}'
      and user_id in ('${teacherId}', '${blockerId}');
    update public.stories set comment_audience = 'everyone', first_published_at = null,
      last_chapter_published_at = null where id = '${storyId}';
    update public.profiles set locale = 'ro' where handle in ('teacher', 'blocker');`);
}

/** One published chapter on a followers-only story, and blocker as a follower. */
function seedChapter() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${adultWriterId}', 'audce001', 1, 'Unu', 'x', 3, 'published', 'Unu',
      'Primul capitol aici.', 3, now());
    update public.stories set comment_audience = 'followers', first_published_at = now(),
      last_chapter_published_at = now() where id = '${storyId}';
    insert into public.follows_users (user_id, followed_user_id) values ('${blockerId}', '${adultWriterId}');`);
}

/** Opens the chapter in English, as a persona, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(chapterAddress);
  return page;
}

test.describe('who can comment on a story (MUST-1a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedChapter);
  test.afterAll(cleanUp);

  test('someone who does not follow the writer sees why there is no comment box', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher');
    await expect(page.getByRole('heading', { name: '0 comments' })).toBeVisible();
    await expect(page.getByText(followersOnlyLine)).toBeVisible();
    await expect(page.getByLabel('Add a comment')).toHaveCount(0);
    await page.context().close();
  });

  test('a follower comments as usual', async ({ browser }) => {
    const page = await openAs(browser, 'blocker');
    await page.getByLabel('Add a comment').fill('I follow this writer.');
    await page.getByRole('button', { name: 'Post comment' }).click();
    await expect(page.getByRole('heading', { name: '1 comment' })).toBeVisible();
    await expect(page.getByText(followersOnlyLine)).toHaveCount(0);
    await page.context().close();
  });

  for (const view of [
    { width: 390, theme: 'night' },
    { width: 1440, theme: 'light' },
  ] as const) {
    test(`axe: the followers-only line at ${view.width} px, ${view.theme}`, async ({ browser }) => {
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('teacher')).session);
      const page = await context.newPage();
      await checkScreen(page, { ...view, address: chapterAddress, language: 'en' });
      await context.close();
    });
  }
});
