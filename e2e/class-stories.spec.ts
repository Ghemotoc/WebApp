/**
 * Stories shared only with a class, in a real browser (bundle CLASSES, part c; story S1-E8-11).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a student shares their story with their class from Story settings › "Share with a class";
 * - the teacher then finds it on the class page under "Stories shared with the class" and on its
 *   See all page, while an adult outside the class can't open the story at all;
 * - the Stories tab counts it; on the stories page (board G04) the teacher has no "Make public",
 *   the student makes it public there and shares it again with "Share a story";
 * - the student makes it public again from Story settings, and the outsider reads it;
 * - Story settings with the card, the class page with the shelf and the See all page pass axe at
 *   390, 768 and 1440 px, light and night, ro and en, and no doodle is drawn.
 * Test data: the teacher persona starts the class and makes a code with SQL; pending_check (an
 * invited adult is fully active while adults_only is on) joins with it and writes the story;
 * adult_writer is the outsider. Everything is removed before and after; the class's name never
 * ends in "e2e", so spaces.spec leaves it alone.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The class and the story this spec makes. */
const className = 'Clasa a XI-a povești';
const classSlug = 'clasa-a-xi-a-povesti';
const storyId = '00000000-0000-4000-9000-0000000c1a56';
const storyTitle = 'Caietul albastru';
/** The personas' user IDs, to act as them in SQL. */
const teacherId = '00000000-0000-4000-8000-000000000007';
const studentId = '00000000-0000-4000-8000-000000000005';

/**
 * Runs SQL as one persona, signed in.
 *
 * @param userId - whose session
 * @param statements - what to run
 * @returns the last line psql prints
 */
function runAs(userId: string, statements: string): string {
  const output = runSql(`select set_config('role', 'authenticated', false),
      set_config('request.jwt.claims', '{"sub": "${userId}", "role": "authenticated"}', false);
    ${statements}`);
  return output.trim().split('\n').at(-1) ?? '';
}

/** Removes the story and the class with everything in them. */
function cleanUp() {
  const space = `(select id from public.spaces where slug = '${classSlug}')`;
  runSql(`delete from public.chapters where story_id = '${storyId}';
    delete from public.stories where id = '${storyId}';
    delete from public.forums where space_id in ${space};
    delete from public.space_moderation_log where space_id in ${space};
    delete from public.invites where space_id in ${space};
    delete from public.space_members where space_id in ${space};
    delete from public.spaces where slug = '${classSlug}';
    delete from public.rate_limit_events where user_id in ('${teacherId}', '${studentId}');
    update public.profiles set locale = 'ro' where handle in ('teacher', 'pending_check', 'adult_writer');`);
}

/** The class with the student in it, and the student's story with one published chapter. */
function setUp() {
  runAs(teacherId, `select public.create_class_space('${className}', 'Cercul de lectură.');`);
  const code = runAs(
    teacherId,
    `select public.make_class_invite('${classSlug}', 30, 10) ->> 'code';`,
  );
  runAs(studentId, `select public.join_class_space('${code}');`);
  runAs(
    studentId,
    `select public.create_story('${storyTitle}', 'O poveste pentru clasă.', 'ro', 'fiction', '{}',
      '{"kind": "automatic"}', '${storyId}', '{"rating": "13_plus", "ai_disclosure": "no_ai"}');`,
  );
  const slug = storySlug();
  runAs(studentId, `select public.create_chapter('${slug}');`);
  const chapterCode = runSql(
    `select code from public.chapters where story_id = '${storyId}' order by position limit 1;`,
  ).trim();
  runAs(
    studentId,
    `select public.save_chapter_draft('${chapterCode}', 'Începutul', 'Prima zi.', 1);
     select public.publish_chapter('${chapterCode}');`,
  );
}

/** The story's address. */
function storySlug(): string {
  return runSql(`select slug from public.stories where id = '${storyId}';`).trim();
}

/** Opens a page as a persona in English, with motion reduced. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
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

test.describe('class stories (CLASSES-c, S1-E8-11)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    cleanUp();
    setUp();
  });
  test.afterAll(cleanUp);

  test('a student shares their story only with the class', async ({ browser }) => {
    const page = await openAs(browser, 'pending_check', `/write/s/${storySlug()}/settings`);
    // Board D07 names the class card "Share with a class".
    const card = page
      .getByRole('group', { name: 'Share with a class' })
      .filter({ hasText: 'one of your classes' });
    await expect(card).toBeVisible();
    await card.getByLabel('Class').selectOption({ label: className });
    await card.getByRole('button', { name: 'Share only with this class' }).click();
    await expect(card.getByText(`Only ${className} can read it now.`)).toBeVisible();
    await page.context().close();
  });

  test('the teacher finds it on the class page; an adult outside the class can’t open it', async ({
    browser,
  }) => {
    const teacher = await openAs(browser, 'teacher', `/spaces/${classSlug}`);
    await expect(
      teacher.getByRole('heading', { name: 'Stories shared with the class' }),
    ).toBeVisible();
    await expect(teacher.getByRole('link', { name: new RegExp(storyTitle) })).toBeVisible();
    // Board G04: the Stories tab counts them and opens the list.
    await teacher.getByRole('link', { name: 'Stories 1' }).click();
    await expect(teacher).toHaveURL(new RegExp(`/spaces/${classSlug}/stories$`));
    await expect(
      teacher.getByRole('heading', { level: 1, name: 'Stories shared with the class' }),
    ).toBeVisible();
    await expect(teacher.getByText('1 story', { exact: true })).toBeVisible();
    await expect(teacher.getByRole('link', { name: new RegExp(storyTitle) })).toBeVisible();
    // A teacher can never make a pupil's story public (S1-E8-11).
    await expect(teacher.getByRole('button', { name: /public/ })).toHaveCount(0);
    await teacher.context().close();

    const outsider = await openAs(browser, 'adult_writer', `/s/${storySlug()}`);
    await expect(outsider.locator('main')).toBeVisible();
    await expect(outsider.getByRole('heading', { level: 1, name: storyTitle })).toHaveCount(0);
    await outsider.context().close();
  });

  test('axe: Story settings, the class page and its See all page, every view', async ({
    browser,
  }) => {
    test.setTimeout(500_000);
    const slug = storySlug();
    const writerContext = await browser.newContext();
    await useSessionInBrowser(writerContext, (await signInPersona('pending_check')).session);
    const writerPage = await writerContext.newPage();
    const addresses = [
      `/write/s/${slug}/settings`,
      `/spaces/${classSlug}`,
      `/spaces/${classSlug}/stories`,
    ];
    for (const view of everyView(addresses)) {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'pending_check';`,
      );
      await checkScreen(writerPage, view);
      await expectNoDoodles(writerPage);
    }
    await writerContext.close();
  });

  test('on the stories page the student makes it public, then shares it from the class page', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'pending_check', `/spaces/${classSlug}/stories`);
    const list = page.getByRole('list', { name: 'Stories shared with the class' });
    await list.getByRole('button', { name: `Make public: ${storyTitle}` }).click();
    await expect(
      page.getByText('No stories shared yet. Share one, or wait for homework.'),
    ).toBeVisible();

    // "Share a story" (boards G03 and G04) puts it back in the class.
    await page.getByRole('button', { name: 'Share a story' }).click();
    await page.getByLabel('Story to share').selectOption({ label: storyTitle });
    await page.getByRole('button', { name: 'Share only with this class' }).click();
    await expect(list.getByRole('link', { name: new RegExp(storyTitle) })).toBeVisible();
    await page.context().close();
  });

  test('the student makes it public again, and the outsider reads it', async ({ browser }) => {
    const page = await openAs(browser, 'pending_check', `/write/s/${storySlug()}/settings`);
    // Board D07 names the class card "Share with a class".
    const card = page
      .getByRole('group', { name: 'Share with a class' })
      .filter({ hasText: 'one of your classes' });
    await card.getByRole('button', { name: 'Make it public' }).click();
    await expect(
      card.getByText('Right now everyone may read it, within its rating.'),
    ).toBeVisible();
    await page.context().close();

    const outsider = await openAs(browser, 'adult_writer', `/s/${storySlug()}`);
    await expect(outsider.getByRole('heading', { level: 1, name: storyTitle })).toBeVisible();
    await outsider.context().close();
  });
});
