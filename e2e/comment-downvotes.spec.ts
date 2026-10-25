/**
 * Private downvotes on comments in a real browser (story S1-E6-04; board 3.5).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a reader presses Downvote on someone's comment: the chip shows it as theirs (aria-pressed)
 *   with the board's "it's private" line, and pressing again takes it back (criterion 1);
 * - the comment's author never sees a Downvote chip or any count on their own comment.
 * (A visitor gets the teaser, without comments, so there is nothing to downvote.)
 * The account's language wins over the browser's and other specs change these personas' language
 * at the same time, so the names are matched in both languages.
 * Test data: a story of its own by adult_writer with one chapter and one comment by teacher,
 * removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';
const chapterAddress = '/s/downv-e2e-story/downv001';
const downvoteName = /^(Downvote|Vot negativ) /;

/** Removes this spec's story, chapter, comment and downvotes. */
function cleanUp() {
  runSql(`delete from public.comments where chapter_id in (select id from public.chapters where code = 'downv001');
    delete from public.chapters where code = 'downv001';
    delete from public.stories where slug = 'downv-e2e-story';`);
}

/** The story, its chapter and teacher's comment. */
function seedComment() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating,
      first_published_at, last_chapter_published_at)
    values ('${adultWriterId}', 'downv-e2e-story', 'Voturi', 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'downv001', 1, 'Unu', 'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now()
    from public.stories where slug = 'downv-e2e-story';
    insert into public.comments (user_id, chapter_id, body)
    select '${teacherId}', id, 'Un comentariu.' from public.chapters where code = 'downv001';`);
}

/** Opens the chapter as a persona. */
async function openAs(browser: Browser, persona: SignInPersonaName): Promise<Page> {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  const page = await context.newPage();
  await page.goto(chapterAddress);
  await expect(page.getByRole('article', { name: 'teacher' })).toBeVisible();
  return page;
}

test.describe('private downvotes (S1-E6-04)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedComment);
  test.afterAll(cleanUp);

  test('a reader downvotes privately and takes it back', async ({ browser }) => {
    const reader = await openAs(browser, 'blocker');
    const comment = reader.getByRole('article', { name: 'teacher' });
    const chip = comment.getByRole('button', { name: downvoteName });
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(comment.getByText(/(Downvote sent|Vot negativ trimis)/)).toBeVisible();
    expect(runSql(`select count(*) from public.comment_downvotes`)).not.toBe('0');
    await chip.click();
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
    await reader.context().close();
  });

  test('the author sees no downvote on their own comment', async ({ browser }) => {
    const author = await openAs(browser, 'teacher');
    await expect(author.getByRole('button', { name: downvoteName })).toHaveCount(0);
    await expect(author.getByText(/downvote|vot negativ/i)).toHaveCount(0);
    await author.context().close();
  });
});
