/**
 * Reactions on comments in a real browser (story S1-E6-02; board 3.5).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a reader opens "Add a reaction", picks Heart, then Fire: one reaction per person, the chip
 *   shows it as theirs with aria-pressed; picking their own chip again takes it away (criterion 1);
 * - Escape closes the picker and puts focus back on "Add a reaction";
 * - a read-only account is told it can't react yet;
 * - the chips pass axe and don't scroll sideways at 390, 768 and 1440 px, light and night,
 *   Romanian and English.
 * Test data: one published chapter on adult_writer's "Stația meteo" with one comment by teacher,
 * which adult_writer reacted to with Wow; they go with the chapter.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';
const storyId = '00000000-0000-4000-9000-000000000001';
const chapterAddress = '/s/statia-meteo-seed01/reace001';

/** Removes this spec's chapter (its comment and reactions go with it) and the seed state. */
function cleanUp() {
  runSql(`delete from public.comments where chapter_id in (select id from public.chapters where code like 'reace%');
    delete from public.chapters where code like 'reace%';
    update public.stories set first_published_at = null, last_chapter_published_at = null where id = '${storyId}';
    update public.profiles set locale = 'ro' where handle in ('blocker', 'kid_14_ok');`);
}

/** One published chapter, teacher's comment on it and adult_writer's Wow on that comment. */
function seedChapter() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${adultWriterId}', 'reace001', 1, 'Unu', 'x', 3, 'published', 'Unu',
      'Primul capitol aici.', 3, now());
    update public.stories set first_published_at = now(), last_chapter_published_at = now()
      where id = '${storyId}';
    insert into public.comments (user_id, chapter_id, body)
      select '${teacherId}', id, 'Ce final!' from public.chapters where code = 'reace001';
    insert into public.comment_reactions (user_id, comment_id, kind)
      select '${adultWriterId}', comments.id, 'wow' from public.comments
      join public.chapters on chapters.id = comments.chapter_id where chapters.code = 'reace001';`);
}

/** Opens the chapter in English, as a persona, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(chapterAddress);
  await expect(page.getByRole('heading', { name: '1 comment' })).toBeVisible();
  return page;
}

test.describe('reactions on comments (S1-E6-02)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedChapter);
  test.afterAll(cleanUp);

  test('a reader picks one reaction, changes it and takes it away', async ({ browser }) => {
    const reader = await openAs(browser, 'blocker');
    const comment = reader.getByRole('article', { name: 'teacher' });
    await expect(comment.getByRole('button', { name: 'Wow, 1' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    // Heart, from the picker.
    await comment.getByRole('button', { name: 'Add a reaction' }).click();
    await comment
      .getByRole('group', { name: 'Pick a reaction' })
      .getByRole('button', { name: 'Heart' })
      .click();
    const heart = comment.getByRole('button', { name: 'Heart, 1, your reaction' });
    await expect(heart).toHaveAttribute('aria-pressed', 'true');
    // Fire replaces it: one reaction per person.
    await comment.getByRole('button', { name: 'Add a reaction' }).click();
    await comment
      .getByRole('group', { name: 'Pick a reaction' })
      .getByRole('button', { name: 'Fire' })
      .click();
    await expect(comment.getByRole('button', { name: 'Fire, 1, your reaction' })).toBeVisible();
    await expect(comment.getByRole('button', { name: /^Heart/ })).toHaveCount(0);
    // Pressing their own chip again takes it away.
    await comment.getByRole('button', { name: 'Fire, 1, your reaction' }).click();
    await expect(comment.getByRole('button', { name: /^Fire/ })).toHaveCount(0);
    expect(runSql(`select count(*) from public.comment_reactions`)).toBe('1');
    await reader.context().close();
  });

  test('Escape closes the picker and goes back to “Add a reaction”', async ({ browser }) => {
    const reader = await openAs(browser, 'blocker');
    const add = reader.getByRole('button', { name: 'Add a reaction' });
    await add.click();
    await reader.getByRole('button', { name: 'Star' }).focus();
    await reader.keyboard.press('Escape');
    await expect(reader.getByRole('group', { name: 'Pick a reaction' })).toHaveCount(0);
    await expect(add).toBeFocused();
    await expect(add).toHaveAttribute('aria-expanded', 'false');
    await reader.context().close();
  });

  test('a read-only account is told it can’t react yet', async ({ browser }) => {
    const page = await openAs(browser, 'kid_14_ok');
    await page.getByRole('button', { name: 'Add a reaction' }).click();
    await page.getByRole('button', { name: 'Heart' }).click();
    await expect(page.getByRole('alert')).toHaveText('Your account can’t react yet.');
    expect(runSql(`select count(*) from public.comment_reactions`)).toBe('1');
    await page.context().close();
  });

  for (const view of everyView([chapterAddress])) {
    test(`the reactions pass axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('blocker')).session);
      const page = await context.newPage();
      await checkScreen(page, view);
      await expect(page.locator('#comments-heading')).toBeVisible();
      await context.close();
    });
  }
});
