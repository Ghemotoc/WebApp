/**
 * Who can read a story, in a real browser (bundle NEW-1, part a).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the writer makes the story Unlisted in its settings; a signed-out visitor with the link still
 *   reads it, but it is gone from the writer's public profile;
 * - the writer makes it Private; the visitor with the link now sees "This story isn't
 *   available", while the writer still opens it;
 * - Story settings with the new section passes axe and never scrolls sideways at 390, 768 and
 *   1440 px.
 * Test data: one published chapter of the seed story "Stația meteo"; the story is put back to
 * public and the chapter removed afterwards.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, screenWidths, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The seed story's address. */
const slug = 'statia-meteo-seed01';

/** Puts the story back to public, removes the chapter and the writer's language. */
function cleanUp() {
  runSql(`update public.stories set visibility = 'public' where slug = '${slug}';
    delete from public.chapters where code = 'visie2e1';
    update public.profiles set locale = 'ro' where handle = 'adult_writer';`);
}

/** One published chapter, so the story has something to read. */
function seedChapter() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'visie2e1',
      1, 'Unu', 'x', 1, 'published', 'Unu', 'Text.', 1, now());
    update public.stories set first_published_at = now(), last_chapter_published_at = now()
    where slug = '${slug}';`);
}

/** Opens a page in English, as a persona or as a visitor, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName | null, path: string) {
  const context = await browser.newContext();
  if (persona !== null) {
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

/**
 * The writer opens the story's settings, picks who can read it and saves.
 *
 * @param choice - the chip's name
 */
async function chooseWhoCanRead(browser: Browser, choice: 'Unlisted' | 'Private') {
  const page = await openAs(browser, 'adult_writer', '/write');
  await page
    .getByRole('article', { name: 'Stația meteo' })
    .getByRole('link', { name: 'Story settings' })
    .click();
  const group = page.getByRole('radiogroup', { name: 'Who can read it' });
  await group.getByRole('radio', { name: choice, exact: true }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
  await page.context().close();
}

test.describe('who can read a story (NEW-1)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedChapter);
  test.afterAll(cleanUp);

  test('unlisted: the link still works, but the story leaves the writer’s profile', async ({
    browser,
  }) => {
    await chooseWhoCanRead(browser, 'Unlisted');
    expect(runSql(`select visibility from public.stories where slug = '${slug}'`)).toBe('unlisted');
    const visitor = await openAs(browser, null, `/s/${slug}`);
    await expect(visitor.getByRole('heading', { level: 1, name: 'Stația meteo' })).toBeVisible();
    await visitor.goto('/u/adult_writer');
    await expect(visitor.getByRole('heading', { level: 1, name: 'Lia Scrie' })).toBeVisible();
    await expect(visitor.getByRole('link', { name: /Stația meteo/ })).toHaveCount(0);
    await visitor.context().close();
  });

  test('private: only the writer opens it', async ({ browser }) => {
    await chooseWhoCanRead(browser, 'Private');
    const visitor = await openAs(browser, null, `/s/${slug}`);
    await expect(
      visitor.getByRole('heading', { name: 'This story isn’t available' }),
    ).toBeVisible();
    await visitor.context().close();
    const writer = await openAs(browser, 'adult_writer', `/s/${slug}`);
    await expect(writer.getByRole('heading', { level: 1, name: 'Stația meteo' })).toBeVisible();
    await writer.context().close();
  });

  for (const width of screenWidths) {
    test(`Story settings passes axe at ${width} px and never scrolls sideways`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = 'en' where handle = 'adult_writer';`);
      await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
      await checkScreen(page, {
        address: `/write/s/${slug}/settings`,
        width,
        theme: 'light',
        language: 'en',
      });
    });
  }
});
