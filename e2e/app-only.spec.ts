/**
 * App only stories behind their switch, in a real browser (bundle GAPS-15; stories S1-E3-08 and
 * S1-E4-09; boards NewStory and AppOnly).
 *
 * What it proves:
 * - the writer finds "Where can people read this story?" in the story's settings, picks "In the
 *   app only", is told nothing changes until the apps exist, and saves;
 * - while the switch is off a reader still reads the chapter on the web;
 * - once staff turn the switch on, a reader and a visitor get the "only in the app" notice
 *   instead of the text, the story page says the chapters open in the app, and the page has no
 *   serious axe issue at phone and desktop width.
 * The database rules (who may set it, no text, no shared passages, the card label) are in
 * supabase/tests/database/342-app-only.test.sql.
 * Test data: the seed's adult_writer and teacher, reading in English, and one chapter this spec
 * adds to the seed story "Stația meteo" and removes afterwards; the switch and the story's choice
 * are put back.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const seedStoryId = '00000000-0000-4000-9000-000000000001';
const writerId = '00000000-0000-4000-8000-000000000001';
const storySlug = 'statia-meteo-seed01';
const chapterCode = 'apponlye';
const chapterText = 'Ultimul tramvai pleacă la miezul nopții.';

/** Puts back what this spec changed: the chapter, the story's choice and the switch. */
function cleanUp() {
  runSql(`delete from public.chapters where code = '${chapterCode}';
    update public.stories set is_app_only = false where id = '${seedStoryId}';
    update public.feature_flags set is_enabled = false where key = 'app_only_stories';`);
}

/** Adds a published chapter to the seed story, so readers have something to open. */
function addChapter() {
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${seedStoryId}', '${writerId}', '${chapterCode}', 91, 'Tramvaiul', 'x', 6, 'published',
      'Tramvaiul', '${chapterText}', 6, now());
    update public.stories set first_published_at = now()
    where id = '${seedStoryId}' and first_published_at is null;`);
}

/** Turns the app only switch on or off, the way staff flip it in settings. */
function setSwitch(isOn: boolean) {
  runSql(`update public.feature_flags set is_enabled = ${isOn} where key = 'app_only_stories';`);
}

/** Opens a page as a seed persona reading in English, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName, path: string, width = 1440) {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('app only stories behind their switch (GAPS-15)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    addChapter();
  });
  test.afterAll(cleanUp);

  test('the writer sets a story to app only and is told it waits for the apps', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', `/write/s/${storySlug}/settings`);
    const choice = page.getByRole('radiogroup', { name: 'Where can people read this story?' });
    await choice.getByRole('radio', { name: 'In the app only' }).click();
    await expect(page.getByText('aren’t out yet', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await page.context().close();
  });

  test('while the switch is off, a reader still reads the chapter on the web', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher', `/s/${storySlug}/${chapterCode}`);
    await expect(page.getByText(chapterText)).toBeVisible();
    await expect(page.getByText('This story is only in the app')).toHaveCount(0);
    await page.context().close();
  });

  test('once the switch is on, readers and visitors get the notice, not the text', async ({
    browser,
  }) => {
    setSwitch(true);
    const page = await openAs(browser, 'teacher', `/s/${storySlug}/${chapterCode}`, 390);
    await expect(
      page.getByRole('heading', { name: 'This story is only in the app' }),
    ).toBeVisible();
    await expect(page.getByText(chapterText)).toHaveCount(0);
    await page.getByRole('link', { name: 'Back to the story' }).click();
    await expect(page.getByText('publishes this story in the app only')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();

    const visitorContext = await browser.newContext();
    const visitorPage = await visitorContext.newPage();
    await visitorPage.goto(`/s/${storySlug}/${chapterCode}`);
    await expect(visitorPage.getByText(chapterText)).toHaveCount(0);
    await visitorContext.close();
  });

  for (const view of [
    { address: `/s/${storySlug}/${chapterCode}`, width: 390, theme: 'night' },
    { address: `/s/${storySlug}`, width: 1440, theme: 'light' },
  ] as const) {
    test(`no serious axe issue on ${view.address} at ${view.width} px, ${view.theme}`, async ({
      browser,
    }) => {
      setSwitch(true);
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('teacher')).session);
      const page = await context.newPage();
      await checkScreen(page, { ...view, language: 'en' });
      await context.close();
    });
  }
});
