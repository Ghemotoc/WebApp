/**
 * Epic check for S1-E6, comments, reactions and follows (story S1-E6-QA).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * It adds no feature: it walks the epic's main journeys across its March stories, in a real browser.
 * - Journey 1, an adult reader (S1-E6-03 × S1-E6-01 × S1-E6-02 × S1-E6-04 × S1-E6-05): teacher
 *   likes adult_writer's chapter, comments, reacts to pending_check's comment, downvotes it
 *   privately, then follows the writer and the story.
 * - Journey 2, the minors (S1-E6-01 × the account gate): teen_17, kid_14_ok and kid_14_waiting
 *   read the chapter and its comments, and are told plainly their account can't comment yet (in
 *   March only invited adults write; adults_only, decided 17 Oct 2026, 12:44).
 * - Journey 3, a block (S1-E5-05 × the whole epic): once adult_writer blocks teacher, teacher can't
 *   open the chapter, so there is nothing to like, comment on, react to or downvote; following is
 *   refused in the database half.
 * - Journey 4, the epic's screens at 390, 768 and 1440 px, at night and in Romanian (each story's
 *   own spec covers the other views): the chapter with its comments and the writer's profile.
 * The database half is supabase/tests/database/096-epic-s1-e6.test.sql.
 * Test data: seed personas; a story of the spec's own, removed after, and the personas' language
 * put back.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY, screenWidths } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const slug = 'epic-six-story';
const chapterAddress = `/s/${slug}/epicsix1`;

/** The personas' user IDs (supabase/seed.sql). Used only in SQL, never on screen. */
const personaIds: Partial<Record<SignInPersonaName, string>> = {
  adult_writer: '00000000-0000-4000-8000-000000000001',
  teen_17: '00000000-0000-4000-8000-000000000002',
  kid_14_ok: '00000000-0000-4000-8000-000000000003',
  kid_14_waiting: '00000000-0000-4000-8000-000000000004',
  pending_check: '00000000-0000-4000-8000-000000000005',
  teacher: '00000000-0000-4000-8000-000000000007',
};

/** Every persona this spec signs in as, quoted for SQL. */
const quotedIds = Object.values(personaIds)
  .map((id) => `'${id}'`)
  .join(', ');

/** Removes the spec's story and everything on it, teacher's follows and the block. */
function cleanUp() {
  runSql(`delete from public.blocks where user_id = '${personaIds.adult_writer}' and blocked_user_id = '${personaIds.teacher}';
    delete from public.follows_users where user_id = '${personaIds.teacher}' and followed_user_id = '${personaIds.adult_writer}';
    delete from public.follows_stories where story_id in (select id from public.stories where slug = '${slug}');
    delete from public.notifications where story_id in (select id from public.stories where slug = '${slug}');
    delete from public.notifications where kind = 'new_follower' and user_id = '${personaIds.adult_writer}';
    delete from public.comments where chapter_id in (select id from public.chapters where code = 'epicsix1');
    delete from public.chapters where code = 'epicsix1';
    delete from public.stories where slug = '${slug}';
    update public.profiles set locale = 'ro' where id in (${quotedIds});`);
}

/** adult_writer's story with one published chapter, and a comment on it by pending_check. */
function seedStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating,
      first_published_at, last_chapter_published_at)
    values ('${personaIds.adult_writer}', '${slug}', 'Epica șase', 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'epicsix1', 1, 'Unu', 'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now()
    from public.stories where slug = '${slug}';
    insert into public.comments (user_id, chapter_id, body)
    select '${personaIds.pending_check}', id, 'Abia aștept al doilea.' from public.chapters where code = 'epicsix1';`);
}

/** Opens a page as a persona, in a language. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
  language: 'en' | 'ro' = 'en',
): Promise<Page> {
  runSql(
    `update public.profiles set locale = '${language}' where id = '${personaIds[persona] ?? ''}';`,
  );
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** How many rows a query counts. */
function countOf(sql: string): string {
  return runSql(`select count(*) from ${sql}`);
}

test.describe('epic check: comments, reactions and follows (S1-E6-QA)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('journey 1: an adult reader likes, comments, reacts, downvotes and follows', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher', chapterAddress);
    // Step 1: the like (S1-E6-03).
    await page.getByRole('button', { name: 'Like this chapter 0 likes' }).click();
    await expect(page.getByRole('button', { name: 'Liked 1 like' })).toBeVisible();
    // Step 2: a comment (S1-E6-01).
    await page.getByLabel('Add a comment').fill('Un început bun.');
    await page.getByRole('button', { name: 'Post comment' }).click();
    await expect(page.getByRole('article', { name: 'teacher' })).toContainText('Un început bun.');
    // Step 3: a reaction and a private downvote on pending_check's comment (S1-E6-02, S1-E6-04).
    const other = page.getByRole('article', { name: 'pending_check' });
    await other.getByRole('button', { name: 'Add a reaction' }).click();
    await other
      .getByRole('group', { name: 'Pick a reaction' })
      .getByRole('button', { name: 'Heart' })
      .click();
    await expect(other.getByRole('button', { name: 'Heart, 1, your reaction' })).toBeVisible();
    const downvote = other.getByRole('button', { name: /^Downvote/ });
    await downvote.click();
    await expect(downvote).toHaveAttribute('aria-pressed', 'true');
    await expect(other.getByText(/\d+ downvote/i)).toHaveCount(0);
    // Step 4: follow the writer on their profile, and the story on its page (S1-E6-05).
    await page.goto('/u/adult_writer');
    await page.getByRole('button', { name: /^Follow (?!story)/ }).click();
    await expect(page.getByRole('button', { name: /^Following (?!story)/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.goto(`/s/${slug}`);
    await page.getByRole('button', { name: 'Follow story Epica șase' }).click();
    await expect(page.getByRole('button', { name: 'Following story Epica șase' })).toBeVisible();
    // Step 5: the database holds each of them once.
    expect(
      countOf(`public.chapter_likes where user_id = '${personaIds.teacher}'
      and chapter_id = (select id from public.chapters where code = 'epicsix1')`),
    ).toBe('1');
    expect(countOf(`public.comment_downvotes where user_id = '${personaIds.teacher}'`)).not.toBe(
      '0',
    );
    expect(
      countOf(`public.follows_stories where user_id = '${personaIds.teacher}'
      and story_id = (select id from public.stories where slug = '${slug}')`),
    ).toBe('1');
    await page.context().close();
  });

  for (const persona of ['teen_17', 'kid_14_ok', 'kid_14_waiting'] as const) {
    test(`journey 2: ${persona} reads the chapter and its comments but can't comment yet`, async ({
      browser,
    }) => {
      const page = await openAs(browser, persona, chapterAddress);
      await expect(page.getByRole('article', { name: 'pending_check' })).toContainText(
        'Abia aștept al doilea.',
      );
      await page.getByLabel('Add a comment').fill('Și eu!');
      await page.getByRole('button', { name: 'Post comment' }).click();
      await expect(page.getByText('This account can’t comment yet.')).toBeVisible();
      expect(countOf(`public.comments where user_id = '${personaIds[persona]}'`)).toBe('0');
      await page.context().close();
    });
  }

  test('journey 3: once the writer blocks teacher, teacher can no longer reach the chapter', async ({
    browser,
  }) => {
    runSql(`insert into public.blocks (user_id, blocked_user_id)
      values ('${personaIds.adult_writer}', '${personaIds.teacher}') on conflict do nothing;`);
    const page = await openAs(browser, 'teacher', chapterAddress);
    await expect(page.getByRole('heading', { name: 'This chapter isn’t available' })).toBeVisible();
    await expect(page.getByLabel('Add a comment')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Like/ })).toHaveCount(0);
    await page.context().close();
    runSql(
      `delete from public.blocks where user_id = '${personaIds.adult_writer}' and blocked_user_id = '${personaIds.teacher}';`,
    );
  });

  for (const width of screenWidths) {
    test(`journey 4: the chapter's comments and the profile at ${width} px, at night, in Romanian`, async ({
      browser,
    }) => {
      for (const address of [chapterAddress, '/u/adult_writer']) {
        const page = await openAs(browser, 'teacher', address, 'ro');
        await checkScreen(page, { address, width, theme: 'night', language: 'ro' });
        await page.context().close();
      }
    });
  }
});
