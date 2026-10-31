/**
 * What readers see of a story's plan, in a real browser (stories S1-E17-32 to S1-E17-35 and the
 * epic check S1-E17-QA; bundle ATLAS, part i).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - nothing is public until the writer turns an area on in "What readers can see"; an area
 *   turned on shows on the story page and on its own reader page, and turning it off takes it
 *   away at once (S1-E17-32);
 * - "Keep private" on a character keeps it from readers, and only the parts of a sheet the
 *   writer opens show (S1-E17-32, S1-E17-33);
 * - "Preview as a reader" marks an event that waits for a chapter, a visitor doesn't see it,
 *   and a reader who reached that chapter does (S1-E17-35);
 * - a reader can report a public character (S1-E17-34);
 * - the reader pages pass axe, don't scroll sideways and have no doodle over text at 390, 768
 *   and 1440 px, light and night, Romanian and English.
 * Test data: adult_writer gets one story of its own with two published chapters, two
 * characters and two events (all deleted at the end); teen_17 is the signed-in reader.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodleOverlap } from './support/doodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const readerId = '00000000-0000-4000-8000-000000000002';
const storyId = 'e2e17320-0000-4000-9000-000000000001';
const storySlug = 'atlas-public-seed01';
const anaId = 'e2e17320-0000-4000-8000-000000000001';
const cezarId = 'e2e17320-0000-4000-8000-000000000002';
const settingsAddress = `/plan/s/${storySlug}/readers`;
const readerBase = `/s/${storySlug}/atlas`;

/** Removes this spec's story (its chapters, characters and events go with it). */
function cleanUp() {
  runSql(`
    delete from public.reading_positions where story_id = '${storyId}';
    delete from public.story_events where story_id = '${storyId}';
    delete from public.story_characters where story_id = '${storyId}';
    delete from public.story_plans where story_id = '${storyId}';
    delete from public.chapters where story_id = '${storyId}';
    delete from public.stories where id = '${storyId}';
    update public.profiles set locale = 'ro' where id in ('${writerId}', '${readerId}');`);
}

/** The writer's published story: two chapters, Ana and Cezar, and two events. */
function seedStory() {
  runSql(`
    insert into public.stories (id, user_id, slug, title, blurb, language_code, category_id, rating, first_published_at)
    values ('${storyId}', '${writerId}', '${storySlug}', 'Moara de pe deal', 'O moară veche.', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages', now());
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, status,
                                 published_title, published_body, first_published_at, last_published_at)
    values ('${storyId}', '${writerId}', 'e2e32aaa', 1, 'Sosirea', 'Unu.', 'published', 'Sosirea', 'Unu.', now(), now()),
           ('${storyId}', '${writerId}', 'e2e32bbb', 2, 'Focul', 'Doi.', 'published', 'Focul', 'Doi.', now(), now());
    insert into public.story_characters (id, story_id, user_id, name, sheet)
    values ('${anaId}', '${storyId}', '${writerId}', 'Ana', '{"occupation": "Morăriță", "secrets": "Știe de foc"}'),
           ('${cezarId}', '${storyId}', '${writerId}', 'Cezar', '{}');
    insert into public.story_events (story_id, user_id, title, display_date, sort_value, description)
    values ('${storyId}', '${writerId}', 'Plecarea', 'Primăvara', 1, ''),
           ('${storyId}', '${writerId}', 'Incendiul', 'Vara', 2, '');`);
}

/** Opens an address in English, signed in as a persona or as a visitor, at a width. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  path: string,
  width = 1440,
): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  if (persona !== null) {
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

/** The names a visitor sees on the public Characters page. */
async function publicCharacterNames(browser: Browser, persona: SignInPersonaName | null) {
  const page = await openAs(browser, persona, `${readerBase}/characters`);
  await expect(page.getByRole('heading', { level: 1, name: 'Moara de pe deal' })).toBeVisible();
  // Each character's link holds its initials, then its name: the name is the last line.
  const links = page.locator(`main a[href*="${readerBase}/characters/"]`);
  const names = await links.allInnerTexts();
  await page.context().close();
  return names.map((name) => name.trim().split('\n').at(-1));
}

test.describe('Story Atlas for readers (S1-E17-32 to S1-E17-35)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    seedStory();
  });
  test.afterAll(cleanUp);

  test('nothing is public until the writer turns an area on', async ({ browser }) => {
    const visitor = await openAs(browser, null, `${readerBase}/characters`);
    await expect(visitor.getByText('This isn’t available.', { exact: false })).toBeVisible();
    await visitor.goto(`/s/${storySlug}`);
    await expect(visitor.getByRole('heading', { name: 'The story’s world' })).toHaveCount(0);
    await visitor.context().close();
  });

  test('the writer turns on Characters and Timeline and they show for readers', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', settingsAddress);
    await expect(
      page.getByRole('heading', { level: 1, name: 'What readers can see' }),
    ).toBeVisible();
    const areas = page.getByRole('group', { name: 'Areas readers see' });
    await areas.getByRole('checkbox', { name: 'Characters' }).check();
    await expect(areas.getByRole('checkbox', { name: 'Characters' })).toBeChecked();
    await areas.getByRole('checkbox', { name: 'Timeline' }).check();
    await expect(areas.getByRole('checkbox', { name: 'Timeline' })).toBeChecked();
    await page.context().close();

    // The story page links to the two areas, and only those.
    const visitor = await openAs(browser, null, `/s/${storySlug}`);
    const world = visitor.getByRole('region', { name: 'The story’s world' });
    await expect(world.getByRole('link', { name: 'Characters' })).toBeVisible();
    await expect(world.getByRole('link', { name: 'Timeline' })).toBeVisible();
    await expect(world.getByRole('link', { name: 'World' })).toHaveCount(0);
    // An area that is off says so, the same way as a story the reader can't read.
    await visitor.goto(`${readerBase}/world`);
    await expect(visitor.getByText('This isn’t available.', { exact: false })).toBeVisible();
    await visitor.context().close();
    expect(await publicCharacterNames(browser, null)).toEqual(['Ana', 'Cezar']);
  });

  test('“Keep private” and the sheet’s parts decide what a reader sees', async ({ browser }) => {
    const page = await openAs(
      browser,
      'adult_writer',
      `/plan/s/${storySlug}/characters/${cezarId}`,
    );
    await page.getByRole('checkbox', { name: 'Keep private: Cezar' }).check();
    await expect(page.getByRole('checkbox', { name: 'Keep private: Cezar' })).toBeChecked();
    await page.context().close();
    expect(await publicCharacterNames(browser, null)).toEqual(['Ana']);

    // Ana's page shows the basics but not "Inside", which is closed by default.
    const visitor = await openAs(browser, null, `${readerBase}/characters/${anaId}`);
    await expect(visitor.getByText('Morăriță')).toBeVisible();
    await expect(visitor.getByText('Știe de foc')).toHaveCount(0);
    // A private character's own address shows nothing of them.
    await visitor.goto(`${readerBase}/characters/${cezarId}`);
    await expect(visitor.getByRole('heading', { name: 'Cezar' })).toHaveCount(0);
    await visitor.context().close();
  });

  test('an event waits for its chapter: marked in the preview, shown once a reader gets there', async ({
    browser,
  }) => {
    // The writer holds "Incendiul" back until chapter 2, from the timeline.
    const page = await openAs(
      browser,
      'adult_writer',
      `/plan/s/${storySlug}/storyline?view=timeline`,
    );
    const fire = page.getByTestId('atlas-timeline-item').filter({ hasText: 'Incendiul' });
    await fire.getByRole('button', { name: 'Edit Incendiul' }).click();
    await fire.getByLabel('Readers see it from').selectOption({ label: 'Chapter 2: Focul' });
    await expect(fire.getByLabel('Readers see it from')).toHaveValue('e2e32bbb');
    // The preview shows it with the chapter it waits for.
    await page.goto(`/plan/s/${storySlug}/preview/timeline`);
    const previewed = page.getByTestId('atlas-public-event').filter({ hasText: 'Incendiul' });
    await expect(previewed.getByText('Shows from chapter 2: Focul')).toBeVisible();
    await page.context().close();

    // A visitor sees only "Plecarea".
    const visitor = await openAs(browser, null, `${readerBase}/timeline`);
    await expect(visitor.getByTestId('atlas-public-event')).toHaveCount(1);
    await expect(visitor.getByTestId('atlas-public-event')).toContainText('Plecarea');
    await visitor.context().close();

    // A reader who opened chapter 2 sees both, with no chapter marker.
    runSql(`insert into public.reading_positions (user_id, story_id, chapter_id, percent, device_kind)
      select '${readerId}', story_id, id, 10, 'computer' from public.chapters where code = 'e2e32bbb';`);
    const reader = await openAs(browser, 'teen_17', `${readerBase}/timeline`);
    await expect(reader.getByTestId('atlas-public-event')).toHaveCount(2);
    await expect(reader.getByText('Shows from chapter', { exact: false })).toHaveCount(0);
    await reader.context().close();
  });

  test('a reader can report a public character', async ({ browser }) => {
    const reader = await openAs(browser, 'teen_17', `${readerBase}/characters/${anaId}`);
    await reader.getByRole('button', { name: 'Report Ana', exact: false }).click();
    await expect(reader.getByRole('dialog')).toBeVisible();
    await reader.context().close();
  });

  for (const view of everyView([`${readerBase}/characters`, `${readerBase}/timeline`])) {
    test(`reader pages pass axe at ${view.width} px, ${view.theme}, ${view.language}, ${view.address}`, async ({
      browser,
    }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await checkScreen(page, view);
      await expect(page.getByRole('heading', { level: 1, name: 'Moara de pe deal' })).toBeVisible();
      await expectNoDoodleOverlap(page);
      await context.close();
    });
  }

  test('turning an area off takes it away from readers at once', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', settingsAddress);
    const areas = page.getByRole('group', { name: 'Areas readers see' });
    await areas.getByRole('checkbox', { name: 'Timeline' }).uncheck();
    await expect(areas.getByRole('checkbox', { name: 'Timeline' })).not.toBeChecked();
    await page.context().close();
    const visitor = await openAs(browser, null, `${readerBase}/timeline`);
    await expect(visitor.getByText('This isn’t available.', { exact: false })).toBeVisible();
    await visitor.context().close();
  });
});
