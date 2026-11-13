/**
 * Class points end to end, with a teacher and pupils under 18 (bundle CLASS-POINTS, part 3;
 * story S1-E8-QA2, the closing check of S1-E8-13 to S1-E8-17 and S1-E8-19).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves, as four journeys in one class:
 * 1. Points: the teacher turns class points on; kid_14_ok gives teen_17's chapter 3 points with
 *    the keyboard alone and reads "7 of 10 points left"; a 4th point and points for their own
 *    chapter are refused; when the week turns, the budget is whole again; teen_17 sees the
 *    points but never who gave them or the class's totals, in the screens and through the
 *    database with their own session (row-level security).
 * 2. Competition: the teacher saves criteria as a template and starts a competition from it;
 *    the three pupils choose to join; the teacher scores them, picks a Winner and a Finalist
 *    and confirms; the class sees one Winner card, and each pupil only their own result.
 * 3. Certificates: "Issue certificates" opens with Winner, Finalist and Contestant filled in,
 *    and Readers' choice as a second certificate; the Contestant's certificate says
 *    "Contestant".
 * 4. Archive: the teacher archives the class, nothing more can be given, and the retention job
 *    deletes the points and the competition 30 days later while certificates and the teacher's
 *    template stay.
 * Also: the pupils' screens pass axe at 390, 768 and 1440 px, light and night, ro and en, and
 * respect "Less motion" and "High contrast".
 * Test data: adults_only is switched off for this file (pupils under 18 are active only then)
 * and put back; teacher starts the class with SQL; teen_17, kid_14_ok and adult_writer join.
 * Everything is removed before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The class, the competition, the template and the stories this spec makes. */
const className = 'Clasa a IX-a final';
const classSlug = 'clasa-a-ix-a-final';
const competitionName = 'Concursul de toamnă';
const templateName = 'Povestire scurtă';
const teenStory = { id: '00000000-0000-4000-9000-0000000c0b01', title: 'Jurnalul de toamnă' };
const kidStory = { id: '00000000-0000-4000-9000-0000000c0b02', title: 'Casa din copac' };
const adultStory = { id: '00000000-0000-4000-9000-0000000c0b03', title: 'Drumul spre mare' };
/** The personas' user IDs, to act as them in SQL. */
const teacherId = '00000000-0000-4000-8000-000000000007';
const teenId = '00000000-0000-4000-8000-000000000002';
const kidId = '00000000-0000-4000-8000-000000000003';
const adultId = '00000000-0000-4000-8000-000000000001';
/** The names the class sees: a pen name, or the username where there is none. */
const teenName = 'teen_17';
const kidName = 'kid_14_ok';
const adultName = 'Lia Scrie';
/** Everyone this spec signs in as. */
const everyone = `('teacher', 'teen_17', 'kid_14_ok', 'adult_writer')`;

/** Whether adults_only was on before this file, so it is put back as it was. */
let wasAdultsOnly = '';

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

/** Removes the stories, the class with everything in it and the teacher's templates. */
function cleanUp() {
  const space = `(select id from public.spaces where slug = '${classSlug}')`;
  const competitions = `(select id from public.class_competitions where space_id in ${space})`;
  const stories = `('${teenStory.id}', '${kidStory.id}', '${adultStory.id}')`;
  // Deleting a certificate keeps its code as retired, so the codes are read before the delete.
  runSql(`do $$
    declare gone_codes text[];
    begin
      select array_agg(code) into gone_codes from public.certificates where space_id in ${space};
      delete from public.certificates where space_id in ${space};
      delete from public.retired_certificate_codes where code = any (gone_codes);
    end $$;
    delete from public.notifications where kind in ('class_competition_won',
      'class_competition_results', 'class_readers_choice', 'certificate_issued', 'class_archived')
      and user_id in ('${teacherId}', '${teenId}', '${kidId}', '${adultId}');
    delete from public.email_outbox where user_id = '${teacherId}';
    delete from public.class_competition_results where competition_id in ${competitions};
    delete from public.class_competition_scores where competition_id in ${competitions};
    delete from public.class_competition_entrants where competition_id in ${competitions};
    delete from public.class_competition_criteria where competition_id in ${competitions};
    delete from public.class_competitions where space_id in ${space};
    delete from public.class_criteria_templates where user_id = '${teacherId}';
    delete from public.class_point_flags where space_id in ${space};
    delete from public.class_point_gifts where space_id in ${space};
    delete from public.class_teacher_points where space_id in ${space};
    delete from public.class_chapter_opens where space_id in ${space};
    delete from public.chapters where story_id in ${stories};
    delete from public.stories where id in ${stories};
    delete from public.forums where space_id in ${space};
    delete from public.space_moderation_log where space_id in ${space};
    delete from public.invites where space_id in ${space};
    delete from public.space_members where space_id in ${space};
    delete from public.spaces where slug = '${classSlug}';
    delete from public.rate_limit_events
      where user_id in ('${teacherId}', '${teenId}', '${kidId}', '${adultId}');
    update public.profiles
      set less_motion = false, high_contrast = false, appearance_saved_at = null
      where handle = 'kid_14_ok';
    update public.profiles set locale = 'ro' where handle in ${everyone};`);
}

/**
 * Writes a story with one published chapter and shares it with the class.
 *
 * @param userId - the pupil who writes it
 * @param story - the story's ID and title
 * @param chapterTitle - the chapter's title
 */
function shareStory(userId: string, story: { id: string; title: string }, chapterTitle: string) {
  runAs(
    userId,
    `select public.create_story('${story.title}', 'O poveste pentru clasă.', 'ro', 'fiction', '{}',
      '{"kind": "automatic"}', '${story.id}', '{"rating": "all_ages", "ai_disclosure": "no_ai"}');`,
  );
  const slug = runSql(`select slug from public.stories where id = '${story.id}';`).trim();
  runAs(userId, `select public.create_chapter('${slug}');`);
  const code = runSql(`select code from public.chapters where story_id = '${story.id}';`).trim();
  runAs(
    userId,
    `select public.save_chapter_draft('${code}', '${chapterTitle}', 'Prima pagină.', 1);
     select public.publish_chapter('${code}');
     select public.set_story_class('${slug}', '${classSlug}');`,
  );
}

/** The class in the 9th grade with three pupils and one chapter from each. */
function setUp() {
  runAs(teacherId, `select public.create_class_space('${className}', 'Atelier de scris.');`);
  const code = runAs(
    teacherId,
    `select public.make_class_invite('${classSlug}', 30, 10) ->> 'code';`,
  );
  for (const pupilId of [teenId, kidId, adultId]) {
    runAs(pupilId, `select public.join_class_space('${code}');`);
  }
  runAs(teacherId, `select public.set_class_grade('${classSlug}', 9);`);
  shareStory(teenId, teenStory, 'Frunze');
  shareStory(kidId, kidStory, 'Scara');
  shareStory(adultId, adultStory, 'Gara');
}

/** One story's chapter: its ID and its address. */
function chapterOf(story: { id: string }): { id: string; address: string } {
  const [id = '', code = '', slug = ''] = runSql(
    `select chapters.id, chapters.code, stories.slug from public.chapters
     join public.stories on stories.id = chapters.story_id where stories.id = '${story.id}';`,
  ).split('|');
  return { id, address: `/s/${slug}/${code}` };
}

/** The class's one competition. */
function competitionId(): string {
  return runSql(
    `select id from public.class_competitions
     where space_id = (select id from public.spaces where slug = '${classSlug}');`,
  ).trim();
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
  return page.getByRole('region', { name: 'Class points' });
}

/**
 * Scores one entrant on the template's one criterion and saves.
 *
 * @param page - the teacher's results page
 * @param name - the entrant's name as the class sees it
 * @param score - the points for Limbaj
 */
async function scoreEntrant(page: Page, name: string, score: string) {
  const card = page.getByRole('form', { name });
  await card.getByLabel('Score for Limbaj (0 to 20)').fill(score);
  await card.getByRole('button', { name: `Save scores for ${name}` }).click();
  await expect(card.getByText('Scores saved.')).toBeVisible();
}

test.describe('epic S1-E8 class points journeys (S1-E8-QA2)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    wasAdultsOnly = runSql(
      `select is_enabled from public.feature_flags where key = 'adults_only';`,
    ).trim();
    runSql(`update public.feature_flags set is_enabled = false where key = 'adults_only';`);
    cleanUp();
    setUp();
  });

  test.afterAll(() => {
    cleanUp();
    const isOn = wasAdultsOnly === 't' || wasAdultsOnly === 'true';
    runSql(
      `update public.feature_flags set is_enabled = ${String(isOn)} where key = 'adults_only';`,
    );
  });

  test('journey 1a: a 14-year-old gives 3 points with the keyboard alone', async ({ browser }) => {
    // Step 1: the teacher turns class points on.
    const teacher = await openAs(browser, 'teacher', `/spaces/${classSlug}/settings`);
    await teacher.getByRole('button', { name: 'Turn class points on' }).click();
    await expect(teacher.getByText('Class points are on.')).toBeVisible();
    await teacher.context().close();

    // Step 2: the pupil opens the classmate's chapter and gives 3 points without a mouse.
    const kid = await openAs(browser, 'kid_14_ok', chapterOf(teenStory).address);
    const section = pointsSection(kid);
    await section.getByRole('radio', { name: 'None' }).focus();
    await kid.keyboard.press('ArrowRight');
    await kid.keyboard.press('ArrowRight');
    await kid.keyboard.press('ArrowRight');
    await expect(section.getByRole('radio', { name: '3 points' })).toBeChecked();
    // The cap for one chapter is 3 (decision 8): no larger choice is offered.
    await expect(section.getByRole('radio')).toHaveCount(4);
    await kid.keyboard.press('Tab');
    await expect(section.getByLabel('A line for the writer (optional)')).toBeFocused();
    await kid.keyboard.type('Frumos final.');
    await kid.keyboard.press('Enter');
    await expect(section.getByText('Saved. This chapter has 3 points')).toBeVisible();

    // Step 3: what is left is real text a screen reader reads, on the chapter and the class.
    await expect(section.getByText('7 of 10 points left this week.')).toBeVisible();
    await kid.goto(`/spaces/${classSlug}`);
    await expect(kid.getByText('7 of 10 points left', { exact: true })).toBeVisible();

    // Step 4: their own chapter offers nothing to give.
    await kid.goto(chapterOf(kidStory).address);
    await expect(kid.getByRole('heading', { name: 'Scara' })).toBeVisible();
    await expect(kid.getByRole('button', { name: 'Give points' })).toHaveCount(0);
    await kid.context().close();
  });

  test('journey 1b: the cap, their own chapter and the week boundary, in the database', () => {
    const teenChapter = chapterOf(teenStory).id;
    // A 4th point for the same chapter in the same week is refused.
    expect(() => runAs(kidId, `select public.give_class_points('${teenChapter}', 4, '');`)).toThrow(
      /Too many points for one chapter/,
    );
    // So are points for their own chapter.
    expect(() =>
      runAs(kidId, `select public.give_class_points('${chapterOf(kidStory).id}', 1, '');`),
    ).toThrow(/Points can't be given here/);
    // Last week's points don't count against this week: the budget is whole again.
    runSql(`update public.class_point_gifts
      set week_start = week_start - 7, created_at = created_at - interval '7 days'
      where chapter_id = '${teenChapter}';`);
    const week = runAs(
      kidId,
      `select public.class_chapter_points('${teenChapter}') -> 'giving' ->> 'left';`,
    );
    expect(week).toBe('10');
    // This week the pupil gives 3 again; teen_17 now holds 6 points over two weeks.
    runAs(kidId, `select public.give_class_points('${teenChapter}', 3, '');`);
  });

  test('journey 1c: the writer sees the points, never who gave them or the totals', async ({
    browser,
  }) => {
    // In the screens: the points and the line, no name, and no table.
    const teen = await openAs(browser, 'teen_17', chapterOf(teenStory).address);
    const section = pointsSection(teen);
    await expect(section.getByText('6 points from classmates')).toBeVisible();
    await expect(section.getByText('Frumos final.')).toBeVisible();
    await expect(section.getByText(kidName)).toHaveCount(0);
    await teen.goto(`/spaces/${classSlug}/points`);
    await expect(teen.getByText('Only the teacher of this class sees this page.')).toBeVisible();
    await expect(teen.getByRole('table')).toHaveCount(0);
    await teen.context().close();

    // Through the database with the pupil's own session: row-level security answers the same.
    const { client } = await signInPersona('teen_17');
    const gifts = await client.from('class_point_gifts').select('id, user_id');
    expect(gifts.data ?? []).toHaveLength(0);
    const table = await client.rpc('class_points_table', { slug: classSlug });
    // The teacher's table answers a pupil with nothing at all.
    expect(table.data).toBeNull();
    const results = await client.from('class_competition_results').select('id');
    expect(results.data ?? []).toHaveLength(0);
  });

  test('journey 2a: the teacher saves a template and starts a competition from it', async ({
    browser,
  }) => {
    const teacher = await openAs(browser, 'teacher', `/spaces/${classSlug}/competition`);
    // Step 1: write one criterion and save it as a template.
    const first = teacher.getByRole('group', { name: 'Criterion 1' });
    await first.getByLabel('Label', { exact: true }).fill('Limbaj');
    await first.getByLabel('Maximum points').fill('20');
    await first.getByLabel('Description', { exact: true }).fill('Cum este scris textul.');
    await first.getByLabel('Outcome 1 of criterion 1').fill('folosește dialogul');
    await teacher.getByLabel('Template name').fill(templateName);
    await teacher.getByRole('button', { name: 'Save as template' }).click();
    await expect(teacher.getByText(`Template “${templateName}” saved.`)).toBeVisible();

    // Step 2: a new form starts empty; the template fills it in.
    await teacher.reload();
    await expect(
      teacher.getByRole('group', { name: 'Criterion 1' }).getByLabel('Label', { exact: true }),
    ).toHaveValue('');
    await teacher
      .getByRole('combobox', { name: 'Start from a template' })
      .selectOption({ label: templateName });
    await teacher.getByRole('button', { name: 'Use template' }).click();
    await expect(
      teacher.getByRole('group', { name: 'Criterion 1' }).getByLabel('Label', { exact: true }),
    ).toHaveValue('Limbaj');
    await teacher.getByLabel('Name', { exact: true }).fill(competitionName);
    await teacher.getByRole('button', { name: 'Start the competition' }).click();
    await expect(teacher.getByRole('heading', { name: competitionName })).toBeVisible();
    await teacher.context().close();
  });

  test('journey 2b: pupils choose to join, the teacher scores them and confirms', async ({
    browser,
  }) => {
    // Step 1: nobody is entered until they choose to; teen_17 joins in the screen.
    const teen = await openAs(browser, 'teen_17', `/spaces/${classSlug}`);
    const card = teen.getByRole('region', { name: competitionName });
    await expect(card.getByText('Joined.')).toHaveCount(0);
    await card.getByRole('button', { name: 'Join the competition' }).click();
    await expect(card.getByText('Joined.')).toBeVisible();
    await teen.context().close();
    runAs(kidId, `select public.join_class_competition('${competitionId()}');`);
    runAs(adultId, `select public.join_class_competition('${competitionId()}');`);

    // Step 2: the teacher ends it and scores each entrant.
    const teacher = await openAs(browser, 'teacher', `/spaces/${classSlug}`);
    await expect(teacher.getByText('3 pupils joined')).toBeVisible();
    await teacher.getByRole('button', { name: 'End the competition now' }).click();
    await teacher.getByRole('button', { name: 'End it' }).click();
    await teacher.getByRole('link', { name: 'Assess the entries' }).click();
    await scoreEntrant(teacher, kidName, '19');
    await scoreEntrant(teacher, teenName, '16');
    await scoreEntrant(teacher, adultName, '12');

    // Step 3: one Winner, their chapter and one Finalist; the third pupil stays a Contestant.
    await teacher
      .getByRole('group', { name: 'Winner' })
      .getByRole('radio', { name: kidName })
      .check();
    await teacher
      .getByRole('combobox', { name: 'Winning chapter shown to the class' })
      .selectOption({ label: 'Scara' });
    await teacher
      .getByRole('group', { name: 'Finalists' })
      .getByRole('checkbox', { name: teenName })
      .check();
    await teacher.getByRole('button', { name: 'Confirm the results' }).click();
    await teacher.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(teacher.getByText('Results are confirmed and locked.')).toBeVisible();
    await teacher.context().close();
  });

  test('journey 2c: the class sees one Winner card and each pupil only their own result', async ({
    browser,
  }) => {
    // The Finalist: the Winner's pen name and chapter, their own result, no numbers.
    const teen = await openAs(browser, 'teen_17', `/spaces/${classSlug}`);
    const teenCard = teen.getByRole('region', { name: competitionName });
    await expect(teenCard.getByText(kidName, { exact: true }).first()).toBeVisible();
    await expect(teenCard.getByRole('link', { name: 'Scara, in Casa din copac' })).toBeVisible();
    await expect(teenCard.getByText('Result: Finalist')).toBeVisible();
    await expect(teenCard.getByText('Also Readers’ choice')).toBeVisible();
    await expect(teenCard.getByText(adultName)).toHaveCount(0);
    await expect(teenCard.getByText(/\d+ of \d+|\d+ points?/)).toHaveCount(0);
    await teen.context().close();

    // The Winner is told; the Contestant reads "Contestant" and nobody else's result.
    const kid = await openAs(browser, 'kid_14_ok', '/notifications');
    await expect(kid.getByText('you are the Winner of the class competition')).toBeVisible();
    await kid.context().close();
    const adult = await openAs(browser, 'adult_writer', `/spaces/${classSlug}`);
    const adultCard = adult.getByRole('region', { name: competitionName });
    await expect(adultCard.getByText('Result: Contestant')).toBeVisible();
    await expect(adultCard.getByText('Finalist')).toHaveCount(0);
    await adult.context().close();
  });

  test('journey 3: certificates come filled in with Winner, Finalist and Contestant', async ({
    browser,
  }) => {
    const teacher = await openAs(browser, 'teacher', `/spaces/${classSlug}`);
    await teacher.getByRole('link', { name: 'Issue certificates' }).click();
    const results = teacher.getByRole('region', { name: 'Confirmed results' });
    const rowOf = (name: string) => results.getByRole('listitem').filter({ hasText: name });
    await expect(rowOf(kidName).getByText('Winner', { exact: true })).toBeVisible();
    await expect(rowOf(teenName).getByText('Finalist', { exact: true })).toBeVisible();
    await expect(rowOf(teenName).getByText('Readers’ choice', { exact: true })).toBeVisible();
    await expect(rowOf(adultName).getByText('Contestant', { exact: true })).toBeVisible();
    await teacher.getByRole('button', { name: 'Approve and sign' }).click();
    await expect(teacher.getByText('Signed: 4 certificates made or changed.')).toBeVisible();
    await teacher.context().close();

    // The Contestant's certificate says "Contestant", and the competition is the programme.
    const adult = await openAs(browser, 'adult_writer', '/certificates');
    await expect(adult.getByText('Contestant', { exact: true })).toBeVisible();
    await adult.getByRole('link', { name: `Open “${competitionName}”` }).click();
    const sheet = adult.getByRole('article', { name: 'Certificate' });
    await expect(sheet.getByText(`“${competitionName}”`, { exact: false }).first()).toBeVisible();
    await expect(sheet.getByText(/Contestant · \d{4}/)).toBeVisible();
    await expect(sheet.getByText('teacher', { exact: true })).toBeVisible();
    await adult.context().close();
  });

  test('the pupils’ screens respect Less motion and High contrast and pass axe', async ({
    browser,
  }) => {
    test.setTimeout(600_000);
    // Step 1: with both settings on, the page is marked and the chips don't animate.
    // (A saved choice carries a date; without one the device keeps its own.)
    runSql(`update public.profiles
      set less_motion = true, high_contrast = true, appearance_saved_at = now()
      where handle = 'kid_14_ok';`);
    const kid = await openAs(browser, 'kid_14_ok', chapterOf(teenStory).address);
    await expect(pointsSection(kid)).toBeVisible();
    await expect(kid.locator('html')).toHaveAttribute('data-motion', 'less');
    await expect(kid.locator('html')).toHaveAttribute('data-contrast', 'more');
    const chip = pointsSection(kid).getByRole('radio', { name: '3 points' });
    const duration = await chip.evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.001);
    await kid.context().close();
    runSql(`update public.profiles
      set less_motion = false, high_contrast = false, appearance_saved_at = null
      where handle = 'kid_14_ok';`);

    // Step 2: axe on what a pupil under 18 sees, at every width, theme and language.
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('teen_17')).session);
    const page = await context.newPage();
    const addresses = [`/spaces/${classSlug}`, chapterOf(kidStory).address, '/certificates'];
    for (const view of everyView(addresses)) {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'teen_17';`);
      await checkScreen(page, view);
    }
    await expectNoDoodles(page);
    await context.close();
  });

  test('journey 4: the class is archived, and the retention job clears it 30 days later', async ({
    browser,
  }) => {
    // Step 1: the teacher archives the class; a pupil can give nothing more.
    runAs(teacherId, `select public.archive_class_space('${classSlug}');`);
    const kid = await openAs(browser, 'kid_14_ok', chapterOf(teenStory).address);
    await expect(kid.getByRole('heading', { name: 'Frunze' })).toBeVisible();
    await expect(kid.getByRole('button', { name: /^(Give points|Save)$/ })).toHaveCount(0);
    await kid.context().close();
    expect(() =>
      runAs(kidId, `select public.give_class_points('${chapterOf(teenStory).id}', 1, '');`),
    ).toThrow();

    // Step 2: 31 days later the nightly job deletes the points and the competition.
    const space = `(select id from public.spaces where slug = '${classSlug}')`;
    runSql(`update public.spaces set archived_at = now() - interval '31 days'
      where slug = '${classSlug}';
      select public.purge_class_points();`);
    const left = runSql(`select
        (select count(*) from public.class_point_gifts where space_id in ${space}) || ',' ||
        (select count(*) from public.class_competitions where space_id in ${space}) || ',' ||
        (select count(*) from public.class_competition_results) || ',' ||
        (select count(*) from public.certificates where space_id in ${space}) || ',' ||
        (select count(*) from public.class_criteria_templates where user_id = '${teacherId}');`);
    // Points, the competition and its results are gone; 4 certificates and 1 template stay.
    expect(left).toBe('0,0,0,4,1');
  });
});
