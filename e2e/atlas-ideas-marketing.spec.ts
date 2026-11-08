/**
 * Questions and ideas, and marketing notes, in Story Atlas in a real browser (stories S1-E17-27
 * to S1-E17-29; bundle ATLAS, part g).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the quick-add box adds a line of the chosen type on Enter and clears (S1-E17-27);
 * - a note has a Done tick-box, editable text and "Action or outcome"; ticking it records the
 *   date it was done; Open, Done and All filter the list; its type changes and it deletes after
 *   a second click (S1-E17-28);
 * - every marketing field saves by itself, the logline and genre being the same fields as At a
 *   glance and Story settings; "Back cover" opens a preview of the title, logline, blurb and
 *   comparable titles as real text (S1-E17-29);
 * - both pages pass axe, don't scroll sideways and have no doodle over text at 390, 768 and
 *   1440 px, light and night, Romanian and English; the open back cover passes axe too.
 * Test data: adult_writer gets "atlas-ideas-seed01"; suspended_user (whose language only the
 * Story Atlas specs change, one at a time) gets "atlas-ideas-seed02" with two notes and
 * marketing notes for the accessibility checks. Both go at the end.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodleOverlap } from './support/doodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const suspendedUserId = '00000000-0000-4000-8000-000000000013';
const slug = 'atlas-ideas-seed01';
const ideasAddress = `/plan/s/${slug}/ideas`;
const marketingAddress = `/plan/s/${slug}/marketing`;
const axeIdeasAddress = '/plan/s/atlas-ideas-seed02/ideas';
const axeMarketingAddress = '/plan/s/atlas-ideas-seed02/marketing';

/** Removes this spec's stories (their plans, notes and marketing notes go with them). */
function cleanUp() {
  runSql(`
    delete from public.stories where slug like 'atlas-ideas-seed0%';
    update public.profiles set locale = 'ro' where id in ('${writerId}', '${suspendedUserId}');`);
}

/** A story for a persona; its plan is made by the trigger. */
function seedStory(userId: string, storySlug: string) {
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id, rating)
    values ('${userId}', '${storySlug}', 'Farul de pe stâncă', 'Un far stins.', 'ro',
      (select id from public.categories where slug = 'fiction'), 'all_ages');`);
}

/** The writer's empty story and suspended_user's with two notes and marketing notes. */
function seedAll() {
  seedStory(writerId, slug);
  seedStory(suspendedUserId, 'atlas-ideas-seed02');
  runSql(`
    insert into public.story_ideas (story_id, user_id, kind, body, outcome, done_at)
    select id, user_id, 'question', 'Cine a stins farul?', '', null from public.stories where slug = 'atlas-ideas-seed02'
    union all
    select id, user_id, 'decision', 'Ana pleacă în capitolul 3', 'Da, cu barca.', now() from public.stories where slug = 'atlas-ideas-seed02';
    insert into public.story_marketing (story_id, user_id, back_cover_blurb, comparable_titles)
    select id, user_id, 'Un far stins și o insulă care tace.', 'Umbra vântului' from public.stories where slug = 'atlas-ideas-seed02';
    update public.story_plans set logline = 'O paznică de far caută lumina.'
    where story_id = (select id from public.stories where slug = 'atlas-ideas-seed02');`);
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

/** One of the writer's notes, read from the database as kind|body|outcome|done. */
function savedIdea(body: string): string {
  return runSql(`select kind || '|' || body || '|' || outcome || '|' || (done_at is not null)
    from public.story_ideas where body = '${body}'`);
}

/** One of the writer's marketing notes, read from the database. */
function savedMarketing(column: string): string {
  return runSql(`select ${column} from public.story_marketing
    where story_id = (select id from public.stories where slug = '${slug}')`);
}

/** The notes the list shows now, as their text boxes hold them. */
async function shownNotes(page: Page): Promise<string[]> {
  const boxes = page.getByTestId('atlas-idea-item').getByRole('textbox', { name: 'Note' });
  return boxes.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLInputElement).value),
  );
}

test.describe('Story Atlas questions and ideas, and marketing (S1-E17-27 to S1-E17-29)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    seedAll();
  });
  test.afterAll(cleanUp);

  test('a line typed in the quick-add box is added on Enter with its type, and the box clears', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', ideasAddress);
    await expect(page.getByText('Nothing open.', { exact: false })).toBeVisible();
    const line = page.getByRole('textbox', { name: 'Question or idea' });
    await line.fill('Who put the light out?');
    await line.press('Enter');
    await expect(line).toHaveValue('');
    await page.locator('#atlas-idea-kind').selectOption('todo');
    await line.fill('Check the tide tables');
    await line.press('Enter');
    await expect(line).toHaveValue('');
    expect(await shownNotes(page)).toEqual(['Check the tide tables', 'Who put the light out?']);
    expect(savedIdea('Who put the light out?')).toBe('question|Who put the light out?||false');
    expect(savedIdea('Check the tide tables')).toBe('todo|Check the tide tables||false');
    await expect(page.getByTestId('atlas-idea-item').first()).toContainText('To-do');
    // An empty line adds nothing and says so.
    await line.press('Enter');
    await expect(page.getByText('Write something first.')).toBeVisible();
    await expect(page.getByTestId('atlas-idea-item')).toHaveCount(2);
    await page.context().close();
  });

  test('ticking a note records the day it was done, and Open, Done and All filter the list', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', ideasAddress);
    await expect(page.getByRole('radio', { name: 'Open (2)' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.getByRole('checkbox', { name: 'Done: Who put the light out?' }).check();
    // Open hides it once it is done; Done shows it with the day, and All shows both.
    await expect(page.getByRole('radio', { name: 'Done (1)' })).toBeVisible();
    expect(await shownNotes(page)).toEqual(['Check the tide tables']);
    await page.getByRole('radio', { name: 'Done (1)' }).click();
    expect(await shownNotes(page)).toEqual(['Who put the light out?']);
    const today = new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date());
    await expect(page.getByTestId('atlas-idea-item')).toContainText(`Done on ${today}`);
    expect(savedIdea('Who put the light out?')).toBe('question|Who put the light out?||true');
    await page.getByRole('radio', { name: 'All (2)' }).click();
    expect(await shownNotes(page)).toEqual(['Check the tide tables', 'Who put the light out?']);
    await page.context().close();
  });

  test('a note’s text, outcome and type save by themselves, and it deletes after a second click', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', ideasAddress);
    await page.getByRole('radio', { name: 'All (2)' }).click();
    const item = page.getByTestId('atlas-idea-item').filter({ hasText: 'Done on' });
    const idBase = await item.getByRole('textbox', { name: 'Note' }).getAttribute('id');
    await item
      .getByRole('textbox', { name: 'Action or outcome' })
      .fill('The keeper did. Chapter 4.');
    await expect(page.locator(`#${idBase?.replace('-body', '-outcome')}-save`)).toHaveText('Saved');
    await item.getByRole('textbox', { name: 'Note' }).fill('Who put the lighthouse out?');
    await expect(page.locator(`#${idBase}-save`)).toHaveText('Saved');
    await item.getByLabel('Type', { exact: true }).selectOption('decision');
    await expect(item).toContainText('Decision');
    // The label changes on screen before the save reaches the database, so wait for the row.
    await expect
      .poll(() => savedIdea('Who put the lighthouse out?'))
      .toBe('decision|Who put the lighthouse out?|The keeper did. Chapter 4.|true');
    // Delete asks first; "Keep it" keeps it, "Yes, delete it" deletes it.
    const todo = page.getByTestId('atlas-idea-item').filter({ hasText: 'To-do' });
    await todo.getByRole('button', { name: 'Delete “Check the tide tables”' }).click();
    await todo.getByRole('button', { name: 'Keep it' }).click();
    await expect(page.getByTestId('atlas-idea-item')).toHaveCount(2);
    await todo.getByRole('button', { name: 'Delete “Check the tide tables”' }).click();
    await todo.getByRole('button', { name: 'Yes, delete it' }).click();
    await expect(page.getByTestId('atlas-idea-item')).toHaveCount(1);
    expect(savedIdea('Check the tide tables')).toBe('');
    await page.context().close();
  });

  test('every marketing field saves by itself, sharing the logline and genre with the story', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', marketingAddress);
    await expect(page.getByRole('heading', { level: 1, name: 'Marketing' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Logline' }).fill('A keeper hunts the light.');
    await expect(page.locator('#atlas-marketing-logline-save')).toHaveText('Saved');
    const notes = [
      ['back_cover_blurb', 'Back-cover blurb', 'A dark lighthouse and a quiet island.'],
      ['comparable_titles', 'Comparable titles', 'The Shadow of the Wind'],
      ['hooks_keywords', 'Hooks and keywords', 'lighthouse, island, mystery'],
      ['query_pitch', 'Query pitch', 'Dear agent, …'],
      ['launch_notes', 'Launch notes', 'Spring, the book club first.'],
    ] as const;
    for (const [column, label, value] of notes) {
      await page.getByRole('textbox', { name: label }).fill(value);
      await expect(page.locator(`#atlas-marketing-${column}-save`)).toHaveText('Saved');
    }
    await page.getByLabel('Genre').selectOption('poetry');
    await expect(page.locator('#atlas-marketing-genre-save')).toHaveText('Saved');
    await page.getByLabel('Publishing route').selectOption('complete_here');
    await expect(page.locator('#atlas-marketing-route-save')).toHaveText('Saved');
    for (const [column, , value] of notes) expect(savedMarketing(column)).toBe(value);
    expect(
      runSql(`select stories.title || '|' || categories.slug || '|' || story_plans.logline || '|' || story_plans.publishing_route
        from public.stories join public.categories on categories.id = stories.category_id
        join public.story_plans on story_plans.story_id = stories.id where stories.slug = '${slug}'`),
    ).toBe('Farul de pe stâncă|poetry|A keeper hunts the light.|complete_here');
    // The same logline shows on At a glance: one place for both.
    await page.goto(`/plan/s/${slug}`);
    await expect(page.getByRole('textbox', { name: 'Logline' })).toHaveValue(
      'A keeper hunts the light.',
    );
    await page.context().close();
  });

  test('"Back cover" opens a preview of the title, logline, blurb and comparable titles as text', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', marketingAddress);
    const toggle = page.getByRole('button', { name: 'Show the back cover' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('atlas-back-cover')).toHaveCount(0);
    await toggle.click();
    const cover = page.getByRole('figure', { name: 'Farul de pe stâncă' });
    await expect(cover).toBeVisible();
    await expect(cover).toContainText('A keeper hunts the light.');
    await expect(cover).toContainText('A dark lighthouse and a quiet island.');
    await expect(cover).toContainText('For readers of The Shadow of the Wind');
    await expect(page.getByRole('button', { name: 'Hide the back cover' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await page.getByRole('button', { name: 'Hide the back cover' }).click();
    await expect(page.getByTestId('atlas-back-cover')).toHaveCount(0);
    await page.context().close();
  });

  everyView([axeIdeasAddress, axeMarketingAddress]).forEach((view) => {
    test(`${view.address} passes axe at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      runSql(
        `update public.profiles set locale = '${view.language}' where id = '${suspendedUserId}';`,
      );
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('suspended_user')).session);
      const page = await context.newPage();
      await checkScreen(page, view);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectNoDoodleOverlap(page);
      await context.close();
    });
  });

  test('the open back cover passes axe and fits a phone', async ({ browser }) => {
    const page = await openAs(browser, 'suspended_user', axeMarketingAddress);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.getByRole('button', { name: 'Show the back cover' }).click();
    await expect(page.getByTestId('atlas-back-cover')).toContainText('Umbra vântului');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      ),
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    await page.context().close();
  });
});
