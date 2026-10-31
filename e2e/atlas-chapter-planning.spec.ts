/**
 * Chapter planning and the writing view in a real browser (stories S1-E17-23 to S1-E17-26 and
 * the "Appears in" half of S1-E17-12; bundle ATLAS, part e).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the chapter editor shows the story's chapters on the left and the chapter's plan beside the
 *   text; every planning field saves by itself and comes back after a reload (S1-E17-23, 24);
 * - a word target shows as "words / target" under the text and in the chapter list (S1-E17-26);
 * - focus mode hides the plan and the list (S1-E17-23);
 * - scenes are added, moved with buttons, changed and deleted after a second click (S1-E17-25);
 * - "Appears in" on the sheet lists the chapters and opens one with one click (S1-E17-12);
 * - a chapter near the most one chapter holds warns the writer to split it (S1-E17-23);
 * - "New chapter" in the list makes an ordinary draft chapter (S1-E17-24);
 * - the editor passes axe, doesn't scroll sideways and has no doodle over text at 390, 768 and
 *   1440 px, light and night, Romanian and English, with the plan open.
 * Test data: adult_writer gets a story of their own for this spec ("atlas-chapters-seed01") with
 * two chapters and two characters; suspended_user (whose language no other spec changes) gets
 * one story and chapter for the accessibility checks. Both go at the end.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodleOverlap } from './support/doodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const suspendedUserId = '00000000-0000-4000-8000-000000000013';
const slug = 'atlas-chapters-seed01';
const editorAddress = `/write/s/${slug}/c/e2eplan1`;
const axeAddress = '/write/s/atlas-chapters-seed02/c/e2eplanx';

/** Removes this spec's stories (their chapters, plans and characters go with them). */
function cleanUp() {
  runSql(`
    delete from public.chapters where story_id in (select id from public.stories where slug like 'atlas-chapters-seed0%');
    delete from public.stories where slug like 'atlas-chapters-seed0%';
    update public.profiles set locale = 'ro' where id in ('${writerId}', '${suspendedUserId}');`);
}

/** One story with chapters for a persona; the trigger gives each chapter its plan. */
function seedStory(userId: string, storySlug: string, chapters: string) {
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating)
    values ('${userId}', '${storySlug}', 'Farul de pe stâncă', 'Un far stins.', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages');
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count)
    select stories.id, stories.user_id, chapters.code, chapters.position, chapters.title, chapters.body, chapters.words
    from public.stories, (values ${chapters}) as chapters (code, position, title, body, words)
    where stories.slug = '${storySlug}';`);
}

/** The writer's story with two chapters and two characters, and suspended_user's for axe. */
function seedAll() {
  seedStory(
    writerId,
    slug,
    `('e2eplan1', 1, 'Furtuna', 'Vântul bate peste far.', 4), ('e2eplan2', 2, 'Calmul', 'Liniște.', 1)`,
  );
  runSql(`insert into public.story_characters (story_id, user_id, name)
    select id, user_id, names.name from public.stories, (values ('Ana'), ('Bogdan')) as names (name)
    where slug = '${slug}';`);
  seedStory(
    suspendedUserId,
    'atlas-chapters-seed02',
    `('e2eplanx', 1, 'Farul', 'Farul are trei etaje.', 4)`,
  );
}

/** Opens an address in English as a persona, at a width, in a fresh browser context. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  path: string,
  width = 1440,
): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

/** Waits for one field's save note to say Saved. */
async function expectSaved(page: Page, fieldId: string) {
  await expect(page.locator(`#${fieldId}-save`)).toHaveText('Saved');
}

/** Picks an option in one of the plan's drop-downs and waits for it to save. */
async function pick(page: Page, fieldId: string, label: string) {
  await page.locator(`#${fieldId}`).selectOption({ label });
  await expectSaved(page, fieldId);
}

/** Types into one of the plan's boxes, leaves it and waits for it to save. */
async function type(page: Page, fieldId: string, value: string) {
  await page.locator(`#${fieldId}`).fill(value);
  await page.locator(`#${fieldId}`).blur();
  await expectSaved(page, fieldId);
}

test.describe('Story Atlas chapter planning (S1-E17-23 to S1-E17-26)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    seedAll();
  });
  test.afterAll(cleanUp);

  test('the plan sits beside the text, every field saves and the target shows its progress', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', editorAddress);
    const chapters = page.getByRole('navigation', { name: 'Chapters of this story' });
    await expect(chapters.getByRole('link', { name: /Furtuna/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(chapters.getByRole('link', { name: /Calmul/ })).toBeVisible();
    const plan = page.getByRole('region', { name: 'Plan for this chapter' });
    await expect(plan.getByText('Only you see this. Readers never do.')).toBeVisible();
    await pick(page, 'atlas-chapter-kind', 'Prologue');
    await pick(page, 'atlas-chapter-status', 'Drafting');
    await pick(page, 'atlas-chapter-pov', 'Ana');
    await pick(page, 'atlas-chapter-act', 'Act I');
    await type(page, 'atlas-chapter-target', '3,000');
    await expect(page.getByTestId('atlas-chapter-words')).toHaveText('4 / 3,000 words');
    await expect(chapters.getByRole('link', { name: /Furtuna/ })).toContainText('4 / 3,000 words');
    await expect(chapters.getByRole('link', { name: /Furtuna/ })).toContainText('Prologue:');
    await type(page, 'atlas-chapter-world-date', 'Spring, year 3');
    await type(page, 'atlas-chapter-world-sort', '3,5');
    await type(page, 'atlas-chapter-location', 'The lighthouse');
    await type(page, 'atlas-chapter-summary', 'The storm reaches the lighthouse.');
    await plan.getByRole('button', { name: 'Ana' }).click();
    await expect(plan.getByRole('button', { name: 'Ana' })).toHaveAttribute('aria-pressed', 'true');
    // A word that isn't a number waits with a plain message.
    await page.locator('#atlas-chapter-target').fill('many');
    await expect(page.locator('#atlas-chapter-target-save')).toHaveText(
      'Type a whole number from 1 to 1,000,000, or leave it empty.',
    );
    // After a reload, everything that saved is still there.
    await page.reload();
    await expect(page.locator('#atlas-chapter-kind')).toHaveValue('prologue');
    await expect(page.locator('#atlas-chapter-target')).toHaveValue('3000');
    await expect(page.locator('#atlas-chapter-world-sort')).toHaveValue('3.5');
    await expect(page.locator('#atlas-chapter-summary')).toHaveValue(
      'The storm reaches the lighthouse.',
    );
    await expect(plan.getByRole('button', { name: 'Ana' })).toHaveAttribute('aria-pressed', 'true');
    await expect(plan.getByRole('button', { name: 'Bogdan' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await page.context().close();
  });

  test('focus mode hides the plan and the chapter list', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', editorAddress);
    const plan = page.getByRole('region', { name: 'Plan for this chapter' });
    await expect(plan).toBeVisible();
    await page.getByRole('button', { name: 'Focus mode' }).click();
    await expect(page.getByRole('button', { name: 'Focus mode' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(plan).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Chapters of this story' })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: 'Chapter text' })).toBeVisible();
    await page.getByRole('button', { name: 'Focus mode' }).click();
    await expect(plan).toBeVisible();
    await page.context().close();
  });

  test('scenes are added, moved with buttons, changed and deleted after a second click', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', editorAddress);
    const scenes = page.getByRole('region', { name: 'Scenes' });
    for (const title of ['Arrival', 'Dinner', 'Departure']) {
      await scenes.getByRole('textbox', { name: 'New scene’s title' }).fill(title);
      await scenes.getByRole('button', { name: 'Add scene' }).click();
      await expect(scenes.getByRole('textbox', { name: /^Title of scene/ }).last()).toHaveValue(
        title,
      );
    }
    await scenes.getByRole('button', { name: 'Move Departure earlier' }).click();
    await expect(scenes.getByRole('textbox', { name: 'Title of scene 2' })).toHaveValue(
      'Departure',
    );
    await expect(scenes.getByRole('button', { name: 'Move Arrival earlier' })).toBeDisabled();
    await scenes.getByRole('textbox', { name: 'Title of scene 3' }).fill('Long dinner');
    await scenes.getByRole('textbox', { name: 'Title of scene 3' }).blur();
    await expect(scenes.getByRole('button', { name: 'Delete Long dinner' })).toBeVisible();
    await scenes.getByRole('button', { name: 'Delete Arrival' }).click();
    await scenes.getByRole('button', { name: 'Keep it' }).click();
    await expect(scenes.getByTestId('atlas-scene-row')).toHaveCount(3);
    await scenes.getByRole('button', { name: 'Delete Arrival' }).click();
    await scenes.getByRole('button', { name: 'Yes, delete' }).click();
    await expect(scenes.getByTestId('atlas-scene-row')).toHaveCount(2);
    await expect(scenes.getByRole('textbox', { name: 'Title of scene 1' })).toHaveValue(
      'Departure',
    );
    await page.context().close();
  });

  test('"Appears in" on the sheet lists the chapters and opens one with one click', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', `/plan/s/${slug}/characters`);
    await page.getByRole('link', { name: 'Ana', exact: true }).click();
    const appears = page.getByRole('region', { name: 'Appears in' });
    await expect(appears.getByRole('listitem')).toHaveCount(1);
    await expect(appears.getByRole('listitem')).toContainText('point of view, present');
    await appears.getByRole('link', { name: 'Chapter 1: Furtuna' }).click();
    await expect(page).toHaveURL(new RegExp(`${editorAddress}$`));
    await page.context().close();
  });

  test('a long chapter warns, and "New chapter" in the list makes a draft chapter', async ({
    browser,
  }) => {
    runSql(
      `update public.chapters set draft_body = repeat('Vântul bate. ', 7000) where code = 'e2eplan2';`,
    );
    const page = await openAs(browser, 'adult_writer', `/write/s/${slug}/c/e2eplan2`);
    await expect(
      page.getByText('This chapter is close to the most one chapter can hold.', { exact: false }),
    ).toBeVisible();
    const chapters = page.getByRole('navigation', { name: 'Chapters of this story' });
    await chapters.getByRole('button', { name: 'New chapter' }).click();
    await expect(page).toHaveURL(new RegExp(`/write/s/${slug}/c/[a-z0-9]{8}$`));
    await expect(chapters.getByRole('link')).toHaveCount(3);
    expect(
      runSql(
        `select status from public.chapters where story_id = (select id from public.stories where slug = '${slug}') and position = 3`,
      ),
    ).toBe('draft');
    await page.context().close();
  });

  for (const view of everyView([axeAddress])) {
    test(`the writing view passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      runSql(
        `update public.profiles set locale = '${view.language}' where id = '${suspendedUserId}';`,
      );
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('suspended_user')).session);
      const page = await context.newPage();
      await checkScreen(page, view);
      await expect(page.locator('#atlas-chapter-kind')).toBeVisible();
      await expectNoDoodleOverlap(page);
      await context.close();
    });
  }
});
