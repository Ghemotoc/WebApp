/**
 * Comment lengths and the kind-words nudge in a real browser (bundle ADMIN-2, part d3; Robert,
 * 2 Nov 2026, 22:09 to 22:11).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the chapter's comment box counts to 3,000 and a paragraph's to 500, and the box takes no more;
 * - a comment with a word from the lists asks "We’re a supportive place. Still want to send
 *   this?": Edit goes back to the box with nothing sent; Send anyway posts it exactly as typed;
 *   a kind comment posts straight away. The nudge passes axe;
 * - an admin adds a phrase on Staff › Settings, and the comment box nudges on it at once.
 * Test data: one published chapter on adult_writer's "Stația meteo"; its comments go with it, and
 * the phrase the admin adds is removed afterwards.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const storyId = '00000000-0000-4000-9000-000000000001';
const chapterAddress = '/s/statia-meteo-seed01/nudge001';

/** Removes this spec's chapter, its comments and the phrase the admin adds. */
function cleanUp() {
  runSql(`delete from public.jobs where kind = 'comment_posted';
    delete from public.comments where chapter_id in (select id from public.chapters where code = 'nudge001');
    delete from public.chapters where code = 'nudge001';
    delete from public.comment_nudge_words where phrase = 'grumpy pants';
    update public.stories set first_published_at = null, last_chapter_published_at = null where id = '${storyId}';
    update public.profiles set locale = 'ro' where handle in ('teacher', 'admin');`);
}

/** One published chapter of two paragraphs to comment on. */
function seedChapter() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${adultWriterId}', 'nudge001', 1, 'One', 'x', 8, 'published', 'One',
      'The station was quiet.' || chr(10) || chr(10) || 'The lift stopped.', 8, now());
    update public.stories set first_published_at = now(), last_chapter_published_at = now()
      where id = '${storyId}';`);
}

/** Opens an address in English as a persona, in a fresh browser context. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The chapter's own comment box. */
function chapterBox(page: Page) {
  return page.locator('form', { has: page.getByRole('textbox', { name: 'Add a comment' }) });
}

/** How many comments the chapter holds now. */
function commentCount(): string {
  return runSql(`select count(*) from public.comments where chapter_id =
    (select id from public.chapters where code = 'nudge001');`).trim();
}

test.describe('comment lengths and the kind-words nudge', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedChapter);
  test.afterAll(cleanUp);

  test('the chapter box counts to 3,000 and a paragraph’s box to 500', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', chapterAddress);
    const box = chapterBox(page);
    await expect(box.getByText('0 / 3,000')).toBeVisible();
    await expect(box.getByRole('textbox')).toHaveAttribute('maxlength', '3000');
    // A paragraph's thread has the shorter limit.
    await page
      .locator('.tmc-paragraph-row', { has: page.locator('p[data-block="2"]') })
      .locator('.tmc-paragraph-marker')
      .click();
    const thread = page.getByRole('region', { name: 'Comments on paragraph 2' });
    const paragraphBox = thread.getByRole('textbox', { name: 'Comment on this paragraph' });
    await expect(thread.getByText('0 / 500')).toBeVisible();
    await paragraphBox.fill('a'.repeat(600));
    await expect(paragraphBox).toHaveValue('a'.repeat(500));
    await page.context().close();
  });

  test('a hurtful word brings the nudge; Edit sends nothing, Send anyway posts it as typed', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher', chapterAddress);
    const box = chapterBox(page);
    const text = box.getByRole('textbox');
    // Step 1: a kind comment posts at once.
    await text.fill('I loved the lift.');
    await box.getByRole('button', { name: 'Post comment' }).click();
    await expect(page.getByRole('article', { name: 'teacher' })).toContainText('I loved the lift.');
    // Step 2: a hurtful word asks first, and the question takes the focus.
    await text.fill('What an IDIOT of a lift.');
    await box.getByRole('button', { name: 'Post comment' }).click();
    const question = box.getByText('We’re a supportive place. Still want to send this?');
    await expect(question).toBeFocused();
    // Reduce motion ends every animation at once, so axe measures the colours the screen
    // settles on, not a fade half-way through (as in e2e/support/accessibility.ts; FINAL-1).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const axe = await new AxeBuilder({ page })
      .include('form')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations).toEqual([]);
    // Step 3: Edit goes back to the box, with nothing sent.
    await box.getByRole('button', { name: 'Edit' }).click();
    await expect(question).toBeHidden();
    await expect(text).toBeFocused();
    expect(commentCount()).toBe('1');
    // Step 4: asked again, Send anyway posts exactly what was typed.
    await box.getByRole('button', { name: 'Post comment' }).click();
    await box.getByRole('button', { name: 'Send anyway' }).click();
    await expect(page.getByText('What an IDIOT of a lift.')).toBeVisible();
    expect(commentCount()).toBe('2');
    await page.context().close();
  });

  test('an admin adds a phrase on Settings and the comment box nudges on it', async ({
    browser,
  }) => {
    const admin = await openAs(browser, 'admin', '/staff/settings#nudge');
    const section = admin.getByRole('region', { name: 'Kind-words nudge' });
    await section.getByLabel('List', { exact: true }).selectOption('en');
    await section
      .getByRole('textbox', { name: 'Word or phrase to add (up to 60 characters)' })
      .fill('grumpy pants');
    await section.getByRole('button', { name: 'Add' }).click();
    await expect(section.getByRole('button', { name: 'Remove grumpy pants' })).toBeVisible();
    await admin.context().close();
    // A reader's box now asks before sending it, accents and capitals aside.
    const page = await openAs(browser, 'teacher', chapterAddress);
    const box = chapterBox(page);
    await box.getByRole('textbox').fill('Such Grumpy   Pants.');
    await box.getByRole('button', { name: 'Post comment' }).click();
    await expect(box.getByText('We’re a supportive place. Still want to send this?')).toBeVisible();
    await page.context().close();
  });
});
