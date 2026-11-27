/**
 * Class points in a real browser (bundle CLASS-POINTS, part 1; stories S1-E8-13, S1-E8-14 and
 * S1-E8-16).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - class points are off until the teacher turns them on in the class's settings;
 * - a pupil sees "10 points to give this week", gives 2 points and a line to a classmate's
 *   chapter at its end, and the class page then says "8 of 10 left";
 * - the writer sees the points and the line on their own chapter, never who gave them;
 * - the teacher gives teacher points and a private note on the chapter (the − and + stepper,
 *   board G10) and on an assignment reply, sees both numbers and the notes in the table with no
 *   rank and no giver, and reports a pupil's points with a reason (board G09); the pupil then
 *   reads "Teacher points: 7" and the note;
 * - a moderator finds the report, sees who gave the points, removes the gift with a reason and
 *   closes the flag;
 * - the class page, the chapter, the table and the staff page pass axe at 390, 768 and 1440 px,
 *   light and night, ro and en, and no doodle is drawn.
 * Test data: the teacher persona starts the class with SQL; pending_check (an invited adult is
 * fully active while adults_only is on) joins and writes the chapter; adult_writer joins as the
 * classmate. The journeys with teen_17 and kid_14_ok are in the bundle's closing check
 * (S1-E8-QA2). Everything is removed before and after.
 */
import { type Browser, type Page } from '@playwright/test';
import { expect, test } from './support/test';

import { THEME_STORAGE_KEY } from '../src/lib/theme';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectLookRules, expectLookRulesByDayAndNight } from './support/lookCheck';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The class and the story this spec makes. */
const className = 'Clasa a X-a puncte';
const classSlug = 'clasa-a-x-a-puncte';
const storyId = '00000000-0000-4000-9000-0000000c1a77';
const storyTitle = 'Caietul cu puncte';
/** The personas' user IDs, to act as them in SQL. */
const teacherId = '00000000-0000-4000-8000-000000000007';
const writerId = '00000000-0000-4000-8000-000000000005';
const classmateId = '00000000-0000-4000-8000-000000000001';

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
  runSql(`delete from public.reports where item_type in ('class_point_note', 'class_teacher_note');
    delete from public.class_point_flags where space_id in ${space};
    delete from public.class_point_gifts where space_id in ${space};
    delete from public.class_teacher_points where space_id in ${space};
    delete from public.class_chapter_opens where space_id in ${space};
    delete from public.chapters where story_id = '${storyId}';
    delete from public.stories where id = '${storyId}';
    delete from public.forum_posts where thread_id in (select forum_threads.id
      from public.forum_threads join public.forums on forums.id = forum_threads.forum_id
      where forums.space_id in ${space});
    delete from public.forum_threads where forum_id in (select id from public.forums where space_id in ${space});
    delete from public.forums where space_id in ${space};
    delete from public.space_moderation_log where space_id in ${space};
    delete from public.invites where space_id in ${space};
    delete from public.space_members where space_id in ${space};
    delete from public.spaces where slug = '${classSlug}';
    delete from public.rate_limit_events
      where user_id in ('${teacherId}', '${writerId}', '${classmateId}');
    update public.profiles set locale = 'ro'
      where handle in ('teacher', 'pending_check', 'adult_writer', 'moderator');`);
}

/** The story's address. */
function storySlug(): string {
  return runSql(`select slug from public.stories where id = '${storyId}';`).trim();
}

/** The chapter's code, for its address. */
function chapterCode(): string {
  return runSql(
    `select code from public.chapters where story_id = '${storyId}' order by position limit 1;`,
  ).trim();
}

/** The class with two pupils, the writer's chapter shared with it, and an assignment reply. */
function setUp() {
  runAs(teacherId, `select public.create_class_space('${className}', 'Atelier de scris.');`);
  const code = runAs(
    teacherId,
    `select public.make_class_invite('${classSlug}', 30, 10) ->> 'code';`,
  );
  const thread = runAs(
    teacherId,
    `select public.start_forum_thread('space-${classSlug}', 'Tema 1', 'Scrieți o pagină.') ->> 'thread_number';`,
  );
  runAs(writerId, `select public.join_class_space('${code}');`);
  runAs(classmateId, `select public.join_class_space('${code}');`);
  runAs(
    writerId,
    `select public.create_story('${storyTitle}', 'O poveste pentru clasă.', 'ro', 'fiction', '{}',
      '{"kind": "automatic"}', '${storyId}', '{"rating": "13_plus", "ai_disclosure": "no_ai"}');`,
  );
  runAs(writerId, `select public.create_chapter('${storySlug()}');`);
  runAs(
    writerId,
    `select public.save_chapter_draft('${chapterCode()}', 'Începutul', 'Prima zi de școală.', 1);
     select public.publish_chapter('${chapterCode()}');
     select public.set_story_class('${storySlug()}', '${classSlug}');
     select public.reply_to_forum_thread(${thread}, 'Tema mea, pe scurt.');`,
  );
  return thread;
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

/** The class points section at the end of a chapter. */
function pointsSection(page: Page) {
  // The box's heading says what the reader can do there (boards G05, G06 and the teacher's).
  return page.getByRole('region', {
    name: /^(Give class points|Points this chapter received|Class points|Teacher points)$/,
  });
}

test.describe('class points (CLASS-POINTS, S1-E8-13, 14 and 16)', () => {
  test.describe.configure({ mode: 'serial' });
  let threadNumber = '';

  test.beforeAll(() => {
    cleanUp();
    threadNumber = setUp();
  });
  test.afterAll(cleanUp);

  test('class points are off until the teacher turns them on', async ({ browser }) => {
    const pupil = await openAs(browser, 'adult_writer', `/spaces/${classSlug}`);
    await expect(pupil.getByRole('heading', { name: className })).toBeVisible();
    await expect(pupil.getByText('points to give this week')).toHaveCount(0);
    await pupil.context().close();

    const teacher = await openAs(browser, 'teacher', `/spaces/${classSlug}/settings`);
    await expect(teacher.getByText('Class points are off.')).toBeVisible();
    await teacher.getByRole('button', { name: 'Turn class points on' }).click();
    await expect(teacher.getByText('Class points are on.')).toBeVisible();
    await teacher.context().close();
  });

  test('a pupil gives 2 points and a line to a classmate’s chapter', async ({ browser }) => {
    const pupil = await openAs(browser, 'adult_writer', `/spaces/${classSlug}`);
    await expect(pupil.getByRole('heading', { name: '10 points to give this week' })).toBeVisible();
    await expect(pupil.getByText('10 of 10 left')).toBeVisible();

    await pupil.goto(`/s/${storySlug()}/${chapterCode()}`);
    const section = pointsSection(pupil);
    await expect(section).toBeVisible();
    // A classmate never sees a counter of what others gave (criterion 8).
    await expect(section.getByText('from classmates')).toHaveCount(0);
    await section.getByRole('radio', { name: '2 points' }).click();
    await section.getByLabel('What worked (optional)').fill('Mi-a plăcut finalul.');
    await section.getByRole('button', { name: 'Give 2 points' }).click();
    await expect(section.getByText('Saved. This chapter has 2 points')).toBeVisible();

    await pupil.goto(`/spaces/${classSlug}`);
    await expect(pupil.getByText('8 of 10 left')).toBeVisible();
    // Board G03: the box lists what was given this week, with Move back to the chapter.
    await expect(pupil.getByRole('heading', { name: 'Given this week' })).toBeVisible();
    await expect(pupil.getByRole('link', { name: storyTitle, exact: true })).toBeVisible();
    await expect(pupil.getByText('2 points', { exact: true })).toBeVisible();
    await expect(
      pupil.getByRole('link', { name: `Move the points given to ${storyTitle}` }),
    ).toHaveAttribute('href', new RegExp(`/s/${storySlug()}/`));
    await pupil.context().close();
  });

  test('the class page keeps to the look rules by day and at night (board G03)', async ({
    browser,
  }) => {
    for (const theme of ['day', 'night'] as const) {
      runSql(`update public.profiles set locale = 'en' where handle = 'adult_writer';`);
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
      await context.addInitScript(
        ([languageKey, themeKey, chosenTheme]) => {
          localStorage.setItem(languageKey, 'en');
          localStorage.setItem(themeKey, chosenTheme);
        },
        [LANGUAGE_STORAGE_KEY, THEME_STORAGE_KEY, theme] as const,
      );
      const pupil = await context.newPage();
      await pupil.goto(`/spaces/${classSlug}`);
      await expect(pupil.getByText('8 of 10 left')).toBeVisible();
      await pupil.waitForLoadState('networkidle');
      await test.step(theme, () => expectLookRules(pupil));
      await context.close();
    }
  });

  test('the writer sees the points and the line, never who gave them', async ({ browser }) => {
    const writer = await openAs(browser, 'pending_check', `/s/${storySlug()}/${chapterCode()}`);
    const section = pointsSection(writer);
    // Board G06: the figure, not a sentence; no name beside the note.
    await expect(
      section.getByRole('heading', { name: 'Points this chapter received' }),
    ).toBeVisible();
    await expect(section.getByRole('group', { name: 'Class points' })).toContainText('2');
    await expect(section.getByText('Mi-a plăcut finalul.')).toBeVisible();
    await expect(section.getByText('adult_writer')).toHaveCount(0);
    await expect(section.getByRole('button', { name: /Report/ })).toBeVisible();
    // Their own chapter offers no give control.
    await expect(section.getByRole('button', { name: /^Give/ })).toHaveCount(0);
    await writer.context().close();
  });

  test('the teacher gives points and a note, sees the table and reports a chapter', async ({
    browser,
  }) => {
    const teacher = await openAs(browser, 'teacher', `/s/${storySlug()}/${chapterCode()}`);
    const section = pointsSection(teacher);
    // Under the box: how many class points and notes, never who gave them (board G10).
    await expect(teacher.getByText('2 class points from classmates and')).toBeVisible();
    // The stepper: + raises the points one at a time, and the field takes a typed number too.
    await section.getByRole('button', { name: 'One point more' }).click();
    await expect(section.getByLabel('Teacher points (0 to 10)')).toHaveValue('1');
    await section.getByLabel('Teacher points (0 to 10)').fill('7');
    await section.getByLabel('Private note (optional)').fill('Dialog bun. Mai lucrează la final.');
    await expect(
      section.getByText('The writer sees Teacher points: 7 and the note.'),
    ).toBeVisible();
    await section.getByRole('button', { name: 'Save points and note' }).click();
    await expect(section.getByText('Teacher points saved.')).toBeVisible();

    // An assignment reply gets teacher points too.
    await teacher.goto(`/forums/space-${classSlug}/${threadNumber}`);
    await teacher.getByRole('button', { name: 'Teacher points for reply #2' }).click();
    await teacher.getByLabel('Teacher points (0 to 10)').fill('5');
    await teacher.getByRole('button', { name: 'Save points and note' }).click();
    await expect(teacher.getByText('Teacher points saved.')).toBeVisible();

    // The table: both numbers side by side, the notes, no rank, no giver (board G09).
    await teacher.goto(`/spaces/${classSlug}/points`);
    const table = teacher.getByRole('table', { name: 'Class points by pupil' });
    const writerRow = table.getByRole('row').filter({ hasText: 'pending_check' });
    await expect(writerRow.getByRole('cell').nth(0)).toHaveText('12');
    await expect(writerRow.getByRole('cell').nth(1)).toContainText('2');
    await expect(writerRow.getByRole('cell').nth(2)).toHaveText('1');
    const classmateRow = table.getByRole('row').filter({ hasText: 'Lia Scrie' });
    await expect(classmateRow.getByText('No class points yet')).toBeVisible();
    await expect(table.getByText(/rank|#1|1st/i)).toHaveCount(0);
    // A pupil's points are reported with a reason; a moderator checks who gave them.
    await teacher.getByRole('button', { name: 'Report points: pending_check' }).click();
    await teacher.getByRole('radio', { name: 'Swapped between friends' }).check();
    await teacher.getByLabel('What did you notice? (optional)').fill('Toate punctele într-o zi.');
    await teacher.getByRole('button', { name: 'Send report' }).click();
    await expect(
      teacher.getByText('Sent. A moderator checks the points pending_check received.'),
    ).toBeVisible();
    await teacher.context().close();

    const writer = await openAs(browser, 'pending_check', `/s/${storySlug()}/${chapterCode()}`);
    const teacherFigure = pointsSection(writer).getByRole('group', { name: 'Teacher points' });
    await expect(teacherFigure).toContainText('7');
    await expect(teacherFigure).toContainText('out of 10');
    await expect(
      pointsSection(writer).getByText('Dialog bun. Mai lucrează la final.'),
    ).toBeVisible();
    await writer.context().close();
  });

  test('the teacher’s class page and points page keep to the look rules (boards G08, G09)', async ({
    browser,
  }) => {
    runSql(`update public.profiles set locale = 'en' where handle = 'teacher';`);
    await expectLookRulesByDayAndNight(browser, 'teacher', `/spaces/${classSlug}`, (page) =>
      expect(page.getByRole('heading', { name: 'This week' })).toBeVisible(),
    );
    await expectLookRulesByDayAndNight(browser, 'teacher', `/spaces/${classSlug}/points`, (page) =>
      expect(page.getByRole('table', { name: 'Class points by pupil' })).toBeVisible(),
    );
  });

  test('axe: the class page, the chapter, the table and the staff page, every view', async ({
    browser,
  }) => {
    test.setTimeout(600_000);
    const chapterAddress = `/s/${storySlug()}/${chapterCode()}`;
    const screens: { persona: SignInPersonaName; addresses: string[] }[] = [
      { persona: 'adult_writer', addresses: [`/spaces/${classSlug}`, chapterAddress] },
      { persona: 'teacher', addresses: [`/spaces/${classSlug}/points`, chapterAddress] },
      { persona: 'moderator', addresses: ['/staff/schools/points'] },
    ];
    for (const screen of screens) {
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona(screen.persona)).session);
      const page = await context.newPage();
      for (const view of everyView(screen.addresses)) {
        runSql(
          `update public.profiles set locale = '${view.language}' where handle = '${screen.persona}';`,
        );
        await checkScreen(page, view);
        await expectNoDoodles(page);
      }
      await context.close();
    }
  });

  test('a moderator sees who gave the points, removes the gift and closes the flag', async ({
    browser,
  }) => {
    const moderator = await openAs(browser, 'moderator', '/staff/schools/points');
    const flag = moderator.getByRole('listitem').filter({ hasText: className });
    await expect(flag.getByText('Teacher’s report')).toBeVisible();
    await expect(flag.getByText(/^Teacher’s note: .*Toate punctele într-o zi\.$/)).toBeVisible();
    await flag.getByRole('button', { name: 'Show gifts' }).click();
    await expect(flag.getByRole('cell', { name: '@adult_writer', exact: true })).toBeVisible();
    await flag.getByLabel('Reason for removing (required)').fill('Puncte date la schimb.');
    await flag.getByRole('button', { name: 'Remove the gift from @adult_writer' }).click();
    await expect(flag.getByText('Removed: Puncte date la schimb.')).toBeVisible();
    await flag.getByRole('button', { name: 'Close flag' }).click();
    await expect(moderator.getByText('No open flags.')).toBeVisible();
    await moderator.context().close();

    // The giver has the points back while the week is open, and the writer's total dropped.
    const pupil = await openAs(browser, 'adult_writer', `/spaces/${classSlug}`);
    await expect(pupil.getByText('10 of 10 left')).toBeVisible();
    await pupil.context().close();
    const writer = await openAs(browser, 'pending_check', `/s/${storySlug()}/${chapterCode()}`);
    await expect(pointsSection(writer).getByRole('group', { name: 'Class points' })).toContainText(
      '0',
    );
    await writer.context().close();
  });
});
