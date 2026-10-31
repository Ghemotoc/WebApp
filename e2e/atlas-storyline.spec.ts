/**
 * The storyline in Story Atlas in a real browser: the chapter board, the timeline and the
 * point-of-view lanes (stories S1-E17-19 to S1-E17-22; bundle ATLAS, part f).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the board shows the chapters as cards in act columns with their label, title, point of view,
 *   status, "Published", words and in-world date, and a card opens the writing view (S1-E17-19);
 * - the move buttons move a card within and between acts, and a drag does the same; a move that
 *   renumbers published chapters asks first, and "Keep the order" changes nothing;
 * - "Add chapter" adds a draft at the end of its act;
 * - the timeline adds, sorts, changes and deletes events beside dated chapters, and lists the
 *   undated chapters apart (S1-E17-20);
 * - the lanes show each chapter in its teller's column with its status in words (S1-E17-21);
 * - the view toggle remembers the last choice (S1-E17-22);
 * - the page passes axe, doesn't scroll sideways and has no doodle over text at 390, 768 and
 *   1440 px, light and night, Romanian and English, each view at every width.
 * Test data: adult_writer gets "atlas-storyline-seed01" with three chapters (two published) and
 * two characters; suspended_user (whose language no other spec changes) gets one small story for
 * the accessibility checks. Both go at the end.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodleOverlap } from './support/doodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const suspendedUserId = '00000000-0000-4000-8000-000000000013';
const slug = 'atlas-storyline-seed01';
const storylineAddress = `/plan/s/${slug}/storyline`;
const axeAddress = '/plan/s/atlas-storyline-seed02/storyline';
const viewKey = 'atlas-storyline-view';

/** Removes this spec's stories (their chapters, plans, characters and events go with them). */
function cleanUp() {
  runSql(`
    delete from public.chapters where story_id in (select id from public.stories where slug like 'atlas-storyline-seed0%');
    delete from public.stories where slug like 'atlas-storyline-seed0%';
    update public.profiles set locale = 'ro' where id in ('${writerId}', '${suspendedUserId}');`);
}

/** A story with chapters (code, position, title, status, words) and characters for a persona. */
function seedStory(userId: string, storySlug: string, chapters: string, names: string) {
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating)
    values ('${userId}', '${storySlug}', 'Farul de pe stâncă', 'Un far stins.', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages');
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count, status,
                                 published_title, published_body, first_published_at, last_published_at)
    select stories.id, stories.user_id, chapters.code, chapters.position, chapters.title, 'Text.', chapters.words,
      chapters.status::public.chapter_status,
      case when chapters.status = 'published' then chapters.title end,
      case when chapters.status = 'published' then 'Text.' end,
      case when chapters.status = 'published' then now() end,
      case when chapters.status = 'published' then now() end
    from public.stories, (values ${chapters}) as chapters (code, position, title, status, words)
    where stories.slug = '${storySlug}';
    insert into public.story_characters (story_id, user_id, name)
    select id, user_id, names.name from public.stories, (values ${names}) as names (name)
    where slug = '${storySlug}';`);
}

/** Sets one chapter's plan: its act (by place, or null), point of view, status and date. */
function planChapter(code: string, fields: string) {
  runSql(`update public.chapter_plans set ${fields}
    where chapter_id = (select id from public.chapters where code = '${code}');`);
}

/** The act at a place in a story, for planChapter. */
const actAt = (storySlug: string, place: number) =>
  `(select acts.id from public.story_plan_acts as acts join public.stories on stories.id = acts.story_id
    where stories.slug = '${storySlug}' and acts.position = ${place})`;

/** The character with a name in a story, for planChapter. */
const characterNamed = (storySlug: string, name: string) =>
  `(select cast_member.id from public.story_characters as cast_member join public.stories on stories.id = cast_member.story_id
    where stories.slug = '${storySlug}' and cast_member.name = '${name}')`;

/** The writer's story and suspended_user's for axe. */
function seedAll() {
  seedStory(
    writerId,
    slug,
    `('e2estor1', 1, 'Furtuna', 'published', 4), ('e2estor2', 2, 'Calmul', 'draft', 1),
     ('e2estor3', 3, 'Zorii', 'published', 2)`,
    `('Ana'), ('Bogdan')`,
  );
  planChapter(
    'e2estor1',
    `act_id = ${actAt(slug, 1)}, pov_character_id = ${characterNamed(slug, 'Ana')},
    planning_status = 'drafting', world_date = 'Spring 2055', world_sort = 2055`,
  );
  planChapter(
    'e2estor2',
    `act_id = ${actAt(slug, 1)}, pov_character_id = ${characterNamed(slug, 'Bogdan')}`,
  );
  planChapter('e2estor3', `kind = 'epilogue'`);
  seedStory(
    suspendedUserId,
    'atlas-storyline-seed02',
    `('e2estorx', 1, 'Farul', 'draft', 4)`,
    `('Ana')`,
  );
  planChapter(
    'e2estorx',
    `act_id = ${actAt('atlas-storyline-seed02', 1)},
    pov_character_id = ${characterNamed('atlas-storyline-seed02', 'Ana')}, world_sort = 1, world_date = 'Year 1'`,
  );
  runSql(`insert into public.story_events (story_id, user_id, title, display_date, sort_value)
    select id, user_id, 'The storm', 'Year 0', 0 from public.stories where slug = 'atlas-storyline-seed02';`);
}

/** Opens an address in English as a persona, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName, path: string): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

/** The titles of the cards in one column, in order. */
async function columnTitles(page: Page, name: string): Promise<string[]> {
  const column = page.getByRole('region', { name, exact: true });
  return column.getByTestId('atlas-board-card').getByRole('link').allTextContents();
}

/** The writer's chapters in book order, from the database. */
function bookOrder(): string {
  return runSql(`select string_agg(draft_title, ',' order by position) from public.chapters
    where story_id = (select id from public.stories where slug = '${slug}') and deleted_at is null`);
}

/**
 * Drags one card onto another. Playwright's dragTo doesn't fire HTML5 drops here, so the events
 * are sent by hand with one DataTransfer, as a real drag does (the same as atlas-bible.spec.ts).
 */
async function dragCard(page: Page, fromTitle: string, ontoTitle: string) {
  const cardOf = (title: string) =>
    page.getByTestId('atlas-board-card').filter({ hasText: title }).locator('[draggable="true"]');
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await cardOf(fromTitle).dispatchEvent('dragstart', { dataTransfer });
  await cardOf(ontoTitle).dispatchEvent('dragover', { dataTransfer });
  await cardOf(ontoTitle).dispatchEvent('drop', { dataTransfer });
  await cardOf(fromTitle).dispatchEvent('dragend', { dataTransfer });
}

test.describe('Story Atlas storyline (S1-E17-19 to S1-E17-22)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    seedAll();
  });
  test.afterAll(cleanUp);

  test('the board shows each chapter as a card in its act, and a card opens the writing view', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', storylineAddress);
    await page.getByRole('radio', { name: 'Board' }).click();
    for (const name of ['Act I', 'Act II', 'Act III', 'No act']) {
      await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
    }
    expect(await columnTitles(page, 'Act I')).toEqual(['Furtuna', 'Calmul']);
    const storm = page.getByTestId('atlas-board-card').filter({ hasText: 'Furtuna' });
    await expect(storm).toContainText('Chapter 1');
    await expect(storm).toContainText('Drafting');
    await expect(storm).toContainText('Published');
    await expect(storm).toContainText('POV: Ana');
    await expect(storm).toContainText('4 words');
    await expect(storm).toContainText('In-world date: Spring 2055');
    const calm = page.getByTestId('atlas-board-card').filter({ hasText: 'Calmul' });
    await expect(calm).toContainText('Chapter 2');
    await expect(calm).not.toContainText('Published');
    await expect(page.getByTestId('atlas-board-card').filter({ hasText: 'Zorii' })).toContainText(
      'Epilogue',
    );
    await storm.getByRole('link', { name: 'Furtuna' }).click();
    await expect(page).toHaveURL(new RegExp(`/write/s/${slug}/c/e2estor1$`));
    await page.context().close();
  });

  test('the move buttons move a card within and between acts; a draft moves without asking', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', storylineAddress);
    await page.getByRole('button', { name: 'Move Calmul earlier' }).click();
    await expect.poll(() => columnTitles(page, 'Act I')).toEqual(['Calmul', 'Furtuna']);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    expect(bookOrder()).toBe('Calmul,Furtuna,Zorii');
    // The chapter numbers follow by themselves.
    await expect(page.getByTestId('atlas-board-card').filter({ hasText: 'Calmul' })).toContainText(
      'Chapter 1',
    );
    await expect(page.getByRole('button', { name: 'Move Calmul earlier' })).toBeDisabled();
    await page.getByRole('button', { name: 'Move Calmul to the next act' }).click();
    await expect.poll(() => columnTitles(page, 'Act II')).toEqual(['Calmul']);
    expect(bookOrder()).toBe('Furtuna,Calmul,Zorii');
    await expect(page.getByRole('button', { name: 'Move Zorii to the next act' })).toBeDisabled();
    await page.context().close();
  });

  test('a move that renumbers published chapters asks first, by drag or by button', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', storylineAddress);
    await expect.poll(() => columnTitles(page, 'Act I')).toEqual(['Furtuna']);
    await dragCard(page, 'Zorii', 'Furtuna');
    const question = page.getByRole('alertdialog', { name: 'Change the order readers see?' });
    await expect(question).toBeVisible();
    await question.getByRole('button', { name: 'Keep the order' }).click();
    await expect(question).toBeHidden();
    expect(bookOrder()).toBe('Furtuna,Calmul,Zorii');
    await dragCard(page, 'Zorii', 'Furtuna');
    await question.getByRole('button', { name: 'Move it' }).click();
    await expect.poll(() => columnTitles(page, 'Act I')).toEqual(['Zorii', 'Furtuna']);
    expect(bookOrder()).toBe('Zorii,Furtuna,Calmul');
    // Back again with a button: Furtuna earlier also changes what readers see.
    await page.getByRole('button', { name: 'Move Furtuna earlier' }).click();
    await question.getByRole('button', { name: 'Move it' }).click();
    await expect.poll(() => columnTitles(page, 'Act I')).toEqual(['Furtuna', 'Zorii']);
    expect(bookOrder()).toBe('Furtuna,Zorii,Calmul');
    await page.context().close();
  });

  test('"Add chapter" adds a draft at the end of its act', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', storylineAddress);
    await page.getByRole('button', { name: 'Add chapter to Act I', exact: true }).click();
    await expect(
      page.getByRole('region', { name: 'Act I', exact: true }).getByTestId('atlas-board-card'),
    ).toHaveCount(3);
    expect(bookOrder()).toBe('Furtuna,Zorii,,Calmul');
    await expect(
      page
        .getByRole('region', { name: 'Act I', exact: true })
        .getByTestId('atlas-board-card')
        .last(),
    ).toContainText('Untitled chapter');
    await page.context().close();
  });

  test('the timeline sorts events with dated chapters, changes and deletes them, and remembers the view', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', storylineAddress);
    await page.getByRole('radio', { name: 'Timeline' }).click();
    await page.getByRole('textbox', { name: 'Title' }).fill('The war');
    await page.getByRole('button', { name: 'Add event' }).click();
    await expect(
      page.getByText('Give the event a number to sort by, such as 2055.3.'),
    ).toBeVisible();
    await page.getByRole('textbox', { name: 'Sort value' }).fill('2054');
    await page.getByRole('textbox', { name: 'Date as it shows' }).fill('2054');
    await page.getByRole('button', { name: 'Add event' }).click();
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('');
    await page.getByRole('textbox', { name: 'Title' }).fill('Peace');
    await page.getByRole('textbox', { name: 'Sort value' }).fill('2056,5');
    await page.getByRole('button', { name: 'Add event' }).click();
    const timeline = page.getByRole('list', { name: 'Events and chapters in story order' });
    await expect(timeline.getByTestId('atlas-timeline-item')).toHaveCount(3);
    const lines = timeline.getByTestId('atlas-timeline-item');
    await expect(lines.nth(0)).toContainText('Event');
    await expect(lines.nth(0)).toContainText('The war');
    await expect(lines.nth(1)).toContainText('Chapter');
    await expect(lines.nth(1)).toContainText('Furtuna');
    await expect(lines.nth(2)).toContainText('Peace');
    // The undated chapters are listed apart.
    const undated = page.getByRole('region', { name: 'Chapters without a date' });
    await expect(undated.getByRole('link', { name: /Calmul/ })).toBeVisible();
    // Change an event's sort value: it takes its new place.
    await page.getByRole('button', { name: 'Edit Peace' }).click();
    const sortBox = timeline.getByRole('textbox', { name: 'Sort value' });
    await sortBox.fill('2050');
    await sortBox.blur();
    await expect(lines.nth(0)).toContainText('Peace');
    // Delete asks twice.
    await timeline.getByRole('button', { name: 'Delete Peace' }).click();
    await timeline.getByRole('button', { name: 'Yes, delete it' }).click();
    await expect(lines).toHaveCount(2);
    // The view is remembered.
    await page.reload();
    await expect(page.getByRole('radio', { name: 'Timeline' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.context().close();
  });

  test('the lanes show each chapter in its teller’s column, with its status in words', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', storylineAddress);
    await page.getByRole('radio', { name: 'POV lanes' }).click();
    const table = page.getByRole('table', { name: 'Chapters by point-of-view character' });
    await expect(table.getByRole('columnheader')).toHaveText(['Chapter', 'Ana', 'Bogdan']);
    const stormRow = table.getByRole('row', { name: /Furtuna/ });
    await expect(stormRow.getByRole('cell').nth(0)).toHaveText('Drafting');
    await expect(stormRow.getByRole('cell').nth(1)).toHaveText('');
    await expect(
      table
        .getByRole('row', { name: /Calmul/ })
        .getByRole('cell')
        .nth(1),
    ).toHaveText('Idea');
    await expect(table.getByTestId('atlas-lane-row')).toHaveCount(4);
    await page.context().close();
  });

  everyView([axeAddress]).forEach((view, index) => {
    // Each view of the page gets its turn at every width: board, timeline, lanes, board …
    const storylineView = (['board', 'timeline', 'lanes'] as const)[index % 3] ?? 'board';
    test(`the ${storylineView} passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      runSql(
        `update public.profiles set locale = '${view.language}' where id = '${suspendedUserId}';`,
      );
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('suspended_user')).session);
      await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
        viewKey,
        storylineView,
      ] as const);
      const page = await context.newPage();
      await checkScreen(page, view);
      await expect(page.getByRole('radiogroup')).toBeVisible();
      await expectNoDoodleOverlap(page);
      await context.close();
    });
  });
});
