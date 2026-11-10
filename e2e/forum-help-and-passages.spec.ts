/**
 * Help threads with a marked answer, and threads started from a chapter passage, in a real
 * browser (bundle 14d IDEAS-3, part f; ideas IDEA-20261102-8 and IDEA-20261102-10).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the thread's starter presses "This answered it" on a reply: the thread links the reply at the
 *   top, the reply shows "Answer", and the forum's list shows "Answered" (idea 8, criterion 1);
 *   someone else reading the thread is offered no button (criterion 2);
 * - a reader selects a passage of a public chapter and chooses "Discuss in the forums": the new
 *   thread form in Book talk opens with the passage quoted and a link back, and the thread posts
 *   (idea 10, criterion 1); an unlisted story doesn't offer it (criterion 2);
 * - the thread with its answer note passes axe at 390, 768 and 1440 px, light and night, ro and en.
 * Test data: adult_writer's help thread with a reply by teacher, and adult_writer's story
 *   "Ploaia de test" with one chapter; teacher reads it and starts a Book talk thread. Every
 *   thread title ends in "e2e help"; all removed before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';
const helpTitle = 'How do I write dialogue e2e help';
const passageTitle = 'The rain scene e2e help';
const storySlug = 'ploaia-de-test-discutie';
const chapterCode = 'discut01';
const chapterPath = `/s/${storySlug}/${chapterCode}`;
const firstParagraph = 'Ploua peste oraș de trei zile.';
const secondParagraph = 'Farul clipea în ceață, fără grabă.';

/** Removes the threads and the story, and puts the personas back in Romanian. */
function cleanUp() {
  runSql(`delete from public.forum_threads where title like '%e2e help';
    delete from public.chapters where code = '${chapterCode}';
    delete from public.stories where slug = '${storySlug}';
    delete from public.rate_limit_events where user_id in ('${writerId}', '${teacherId}');
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'teacher');`);
}

/** Runs one forum write as a persona, through the same function the screens call. */
function asPersona(userId: string, statement: string): string {
  return runSql(`select set_config('request.jwt.claims', '{"sub": "${userId}", "role": "authenticated"}', false);
    ${statement}`);
}

/** The help thread: adult_writer asks, teacher replies (#2). */
function seedHelpThread() {
  asPersona(
    writerId,
    `select public.start_forum_thread('help-and-ideas', '${helpTitle}', 'Mă încurc la linii de dialog.');`,
  );
  asPersona(
    teacherId,
    `select public.reply_to_forum_thread(${helpThreadNumber()}, 'Folosește linia de dialog și un rând nou.');`,
  );
}

/** The help thread's number, read from the database. */
function helpThreadNumber(): string {
  return runSql(
    `select thread_number from public.forum_threads where title = '${helpTitle}' and deleted_at is null;`,
  ).trim();
}

/** The story with one public chapter of two paragraphs. */
function seedStory() {
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('${writerId}', '${storySlug}', 'Ploaia de test', 'O ploaie lungă.', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, '${chapterCode}', 1, 'Unu', 'x', 12, 'published', 'Ploaia',
      E'${firstParagraph}\\n\\n${secondParagraph}', 12, now()
    from public.stories where slug = '${storySlug}';`);
}

/** Opens a page as a persona in English, with motion reduced. */
async function openAs(browser: Browser, persona: SignInPersonaName, address: string) {
  const context = await browser.newContext();
  // The profile's language wins over the browser's, so set it first.
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
  return page;
}

/** Selects one paragraph of the chapter, as a reader dragging over it would. */
async function selectParagraph(page: Page, index: number) {
  await page.evaluate((paragraphIndex) => {
    const paragraph = document.querySelectorAll('[data-protected-text] p')[paragraphIndex];
    if (paragraph === undefined) throw new Error('No such paragraph.');
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  }, index);
}

test.describe('forum help and passages (IDEAS-3f)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    cleanUp();
    seedHelpThread();
    seedStory();
  });
  test.afterAll(cleanUp);

  test('the starter marks the reply that answered it', async ({ browser }) => {
    const address = `/forums/help-and-ideas/${helpThreadNumber()}`;
    const page = await openAs(browser, 'adult_writer', address);
    await page.getByRole('button', { name: 'This answered it: reply #2' }).click();
    const note = page.getByRole('complementary', { name: 'The answer to this thread' });
    await expect(note.getByRole('link', { name: /see reply #2 by/ })).toBeVisible();
    await expect(page.locator('#post-2').getByText('Answer', { exact: true })).toBeVisible();
    await page.goto('/forums/help-and-ideas');
    // The forum's own list, not the "New for you" card beside it (bundle G8a).
    const row = page
      .locator('section[aria-labelledby="thread-list-heading"]')
      .getByRole('listitem')
      .filter({ hasText: helpTitle });
    await expect(row.getByText('Answered', { exact: true })).toBeVisible();
    await page.context().close();
  });

  test('someone else reading the thread can’t mark an answer', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', `/forums/help-and-ideas/${helpThreadNumber()}`);
    await expect(page.locator('#post-2')).toBeVisible();
    await expect(page.getByRole('button', { name: /This answered it/ })).toHaveCount(0);
    await page.context().close();
  });

  test('a passage of a public chapter starts a thread quoting it', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', chapterPath);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await selectParagraph(page, 1);
    await page.getByRole('button', { name: 'Discuss in the forums' }).click();
    await expect(page).toHaveURL(/\/forums\/book-talk\/new$/);
    const post = page.getByLabel('Post');
    await expect(post).toHaveValue(new RegExp(`^> ${secondParagraph}`));
    await expect(post).toHaveValue(new RegExp(`/s/${storySlug}/${chapterCode}/p2\\)`));
    await page.getByLabel('Title').fill(passageTitle);
    await page.getByRole('button', { name: 'Post the thread' }).click();
    await expect(page.getByRole('heading', { level: 1, name: passageTitle })).toBeVisible();
    await expect(page.locator('#post-1 blockquote')).toContainText(secondParagraph);
    await expect(
      page.locator('#post-1').getByRole('link', { name: /From chapter 1 of/ }),
    ).toBeVisible();
    await page.context().close();
  });

  test('an unlisted story doesn’t offer it', async ({ browser }) => {
    runSql(`update public.stories set visibility = 'unlisted' where slug = '${storySlug}';`);
    const page = await openAs(browser, 'teacher', chapterPath);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    await selectParagraph(page, 0);
    await expect(page.getByRole('button', { name: 'Copy link to this passage' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Discuss in the forums' })).toHaveCount(0);
    await page.context().close();
  });

  test('axe: the thread with its answer note', async ({ browser }) => {
    test.setTimeout(180_000);
    const context = await browser.newContext();
    const page = await context.newPage();
    for (const view of everyView([`/forums/help-and-ideas/${helpThreadNumber()}`])) {
      await checkScreen(page, view, async (opened) => {
        await expect(opened.locator('#post-2')).toBeVisible();
      });
    }
    await context.close();
  });
});
