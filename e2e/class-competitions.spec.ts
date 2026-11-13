/**
 * Class competitions in a real browser (bundle CLASS-POINTS, part 2; stories S1-E8-15, S1-E8-17
 * and S1-E8-19).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the teacher sets the class's school year in the class settings;
 * - the teacher writes criteria with learning outcomes, saves them as a template, uses the
 *   template and starts a competition;
 * - a pupil reads the name, the dates and every criterion with its outcomes, chooses to join,
 *   can leave and join again, and never sees how many classmates joined;
 * - the teacher ends the competition, scores each entrant beside the outcomes checklist with
 *   class points as a guide only, picks one Winner, their chapter and a Finalist, and confirms;
 *   nobody is ranked anywhere;
 * - the class then sees the Winner card with the Winner's pen name and chapter and the Readers'
 *   choice pen name, each entrant reads only their own result, and each is told in
 *   Notifications;
 * - the class page, the form, the templates page and the results page pass axe at 390, 768 and
 *   1440 px, light and night, ro and en, and no doodle is drawn.
 * Test data: the teacher persona starts the class with SQL; pending_check and adult_writer
 * (invited adults are fully active while adults_only is on) join it and each shares a chapter
 * with it. The journeys with teen_17 and kid_14_ok are in the bundle's closing check
 * (S1-E8-QA2). Everything is removed before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The class, the competition and the two stories this spec makes. */
const className = 'Clasa a IX-a concurs';
const classSlug = 'clasa-a-ix-a-concurs';
const competitionName = 'Concursul de primăvară';
const templateName = 'Eseu narativ';
const writerStory = { id: '00000000-0000-4000-9000-0000000c0a01', title: 'Caietul de concurs' };
const classmateStory = { id: '00000000-0000-4000-9000-0000000c0a02', title: 'Lacul din nord' };
/** The personas' user IDs, to act as them in SQL. */
const teacherId = '00000000-0000-4000-8000-000000000007';
const writerId = '00000000-0000-4000-8000-000000000005';
const classmateId = '00000000-0000-4000-8000-000000000001';
/** The names the class sees: a pen name, or the username where there is none. */
const writerName = 'pending_check';
const classmateName = 'Lia Scrie';

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

/** Removes the stories and the class with everything in them, and the teacher's templates. */
function cleanUp() {
  const space = `(select id from public.spaces where slug = '${classSlug}')`;
  const competitions = `(select id from public.class_competitions where space_id in ${space})`;
  const stories = `('${writerStory.id}', '${classmateStory.id}')`;
  runSql(`delete from public.notifications where kind in
      ('class_competition_won', 'class_competition_results', 'class_readers_choice');
    delete from public.class_competition_results where competition_id in ${competitions};
    delete from public.class_competition_scores where competition_id in ${competitions};
    delete from public.class_competition_entrants where competition_id in ${competitions};
    delete from public.class_competition_criteria where competition_id in ${competitions};
    delete from public.class_competitions where space_id in ${space};
    delete from public.class_criteria_templates where user_id = '${teacherId}';
    delete from public.class_point_gifts where space_id in ${space};
    delete from public.class_chapter_opens where space_id in ${space};
    delete from public.chapters where story_id in ${stories};
    delete from public.stories where id in ${stories};
    delete from public.forums where space_id in ${space};
    delete from public.space_moderation_log where space_id in ${space};
    delete from public.invites where space_id in ${space};
    delete from public.space_members where space_id in ${space};
    delete from public.spaces where slug = '${classSlug}';
    delete from public.rate_limit_events
      where user_id in ('${teacherId}', '${writerId}', '${classmateId}');
    update public.profiles set locale = 'ro'
      where handle in ('teacher', 'pending_check', 'adult_writer');`);
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
    `select public.create_story('${story.title}', 'O poveste pentru concurs.', 'ro', 'fiction', '{}',
      '{"kind": "automatic"}', '${story.id}', '{"rating": "13_plus", "ai_disclosure": "no_ai"}');`,
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

/** The class with two pupils, class points on, and one chapter from each pupil. */
function setUp() {
  runAs(teacherId, `select public.create_class_space('${className}', 'Atelier de scris.');`);
  const code = runAs(
    teacherId,
    `select public.make_class_invite('${classSlug}', 30, 10) ->> 'code';`,
  );
  runAs(writerId, `select public.join_class_space('${code}');`);
  runAs(classmateId, `select public.join_class_space('${code}');`);
  runAs(teacherId, `select public.set_class_points('${classSlug}', true);`);
  shareStory(writerId, writerStory, 'Începutul');
  shareStory(classmateId, classmateStory, 'Malul');
}

/** The classmate opens the writer's chapter and gives it 3 class points. */
function giveClassPoints() {
  const chapter = runSql(
    `select id from public.chapters where story_id = '${writerStory.id}';`,
  ).trim();
  runAs(
    classmateId,
    `select public.class_chapter_points('${chapter}');
     select public.give_class_points('${chapter}', 3, '');`,
  );
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

/** The results page of the class's one competition. */
function resultsAddress(): string {
  const id = runSql(
    `select id from public.class_competitions
     where space_id = (select id from public.spaces where slug = '${classSlug}');`,
  ).trim();
  return `/spaces/${classSlug}/competition/${id}/results`;
}

/**
 * Runs axe on some screens for one persona, at every width, theme and language.
 *
 * @param browser - the test's browser
 * @param persona - who looks
 * @param addresses - the screens
 */
async function checkScreens(browser: Browser, persona: SignInPersonaName, addresses: string[]) {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  const page = await context.newPage();
  for (const view of everyView(addresses)) {
    runSql(`update public.profiles set locale = '${view.language}' where handle = '${persona}';`);
    await checkScreen(page, view);
    await expectNoDoodles(page);
  }
  await context.close();
}

/** Fills the first criterion of the form. */
async function fillFirstCriterion(page: Page) {
  const first = page.getByRole('group', { name: 'Criterion 1' });
  await first.getByLabel('Label', { exact: true }).fill('Limbaj');
  await first.getByLabel('Maximum points').fill('20');
  await first.getByLabel('Description', { exact: true }).fill('Cum este scris textul.');
  await first.getByLabel('Outcome 1 of criterion 1').fill('folosește dialogul pentru personaje');
  await first.getByRole('button', { name: 'Add an outcome' }).click();
  await first.getByLabel('Outcome 2 of criterion 1').fill('variază lungimea propozițiilor');
}

/** Adds and fills the second criterion of the form. */
async function fillSecondCriterion(page: Page) {
  await page.getByRole('button', { name: 'Add a criterion' }).click();
  const second = page.getByRole('group', { name: 'Criterion 2' });
  await second.getByLabel('Label', { exact: true }).fill('Structură');
  await second.getByLabel('Maximum points').fill('10');
  await second.getByLabel('Description', { exact: true }).fill('Cum este construită povestea.');
  await second.getByLabel('Outcome 1 of criterion 2').fill('are început, mijloc și final');
}

/**
 * Scores one entrant on both criteria and saves.
 *
 * @param page - the teacher's results page
 * @param name - the entrant's name as the class sees it
 * @param scores - the points for Limbaj and Structură
 */
async function scoreEntrant(page: Page, name: string, scores: [string, string]) {
  const card = page.getByRole('form', { name });
  await card.getByLabel('Score for Limbaj (0 to 20)').fill(scores[0]);
  await card.getByLabel('Score for Structură (0 to 10)').fill(scores[1]);
  await card.getByRole('button', { name: `Save scores for ${name}` }).click();
  await expect(card.getByText('Scores saved.')).toBeVisible();
}

test.describe('class competitions (CLASS-POINTS, S1-E8-15, 17 and 19)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    cleanUp();
    setUp();
  });
  test.afterAll(cleanUp);

  test('the teacher sets the school year in the class settings', async ({ browser }) => {
    const teacher = await openAs(browser, 'teacher', `/spaces/${classSlug}`);
    // No school year yet: the card sends the teacher to the settings.
    await expect(
      teacher.getByText('Set the school year in the class settings first.'),
    ).toBeVisible();
    await teacher.getByRole('link', { name: 'Open class settings' }).click();
    await teacher.getByRole('combobox', { name: 'School year' }).selectOption('9');
    await teacher.getByRole('button', { name: 'Save school year' }).click();
    await expect(teacher.getByText('School year saved.')).toBeVisible();
    await teacher.context().close();
  });

  test('the teacher writes criteria, saves a template, uses it and starts a competition', async ({
    browser,
  }) => {
    const teacher = await openAs(browser, 'teacher', `/spaces/${classSlug}`);
    await teacher.getByRole('link', { name: 'Start a class competition' }).click();
    await expect(teacher.getByRole('heading', { name: 'Start a class competition' })).toBeVisible();
    // The app ships no templates: the teacher's list starts empty (S1-E8-19).
    await expect(teacher.getByText('No templates yet.')).toBeVisible();
    await teacher.getByLabel('Name', { exact: true }).fill(competitionName);
    await fillFirstCriterion(teacher);
    await fillSecondCriterion(teacher);

    await teacher.getByLabel('Template name').fill(templateName);
    await teacher.getByRole('button', { name: 'Save as template' }).click();
    await expect(teacher.getByText(`Template “${templateName}” saved.`)).toBeVisible();

    // Using the template copies its criteria back into the form.
    await teacher.getByRole('button', { name: 'Remove criterion 2' }).click();
    await teacher
      .getByRole('combobox', { name: 'Start from a template' })
      .selectOption({ label: templateName });
    await teacher.getByRole('button', { name: 'Use template' }).click();
    await expect(teacher.getByText(`Criteria copied from “${templateName}”.`)).toBeVisible();
    await expect(
      teacher.getByRole('group', { name: 'Criterion 2' }).getByLabel('Label', { exact: true }),
    ).toHaveValue('Structură');

    await teacher.getByRole('button', { name: 'Start the competition' }).click();
    await expect(teacher).toHaveURL(new RegExp(`/spaces/${classSlug}$`));
    await expect(teacher.getByRole('heading', { name: competitionName })).toBeVisible();
    await expect(teacher.getByText('0 pupils joined')).toBeVisible();

    // The template is on the teacher's templates page.
    await teacher.goto(`/spaces/${classSlug}/competition/templates`);
    await expect(teacher.getByText(templateName, { exact: true })).toBeVisible();
    await expect(teacher.getByText('(2 criteria)')).toBeVisible();
    await teacher.context().close();
  });

  test('a pupil reads the criteria and chooses to join, leave and join again', async ({
    browser,
  }) => {
    const pupil = await openAs(browser, 'pending_check', `/spaces/${classSlug}`);
    const card = pupil.getByRole('region', { name: competitionName });
    await expect(card.getByText('Open until')).toBeVisible();
    // Every criterion with its description and outcomes, from the start (criterion 5).
    await expect(card.getByText('Limbaj')).toBeVisible();
    await expect(card.getByText('(20 points)')).toBeVisible();
    await expect(card.getByText('folosește dialogul pentru personaje')).toBeVisible();
    await expect(card.getByText('are început, mijloc și final')).toBeVisible();
    // Nobody is added automatically, and a pupil never sees how many joined.
    await expect(card.getByText('Joined.')).toHaveCount(0);
    await expect(card.getByText(/pupils? joined/)).toHaveCount(0);

    await card.getByRole('button', { name: 'Join the competition' }).click();
    await expect(card.getByText('Joined.')).toBeVisible();
    await card.getByRole('button', { name: 'Leave the competition' }).click();
    await expect(card.getByText('Joined.')).toHaveCount(0);
    await card.getByRole('button', { name: 'Join the competition' }).click();
    await expect(card.getByText('Joined.')).toBeVisible();
    await pupil.context().close();

    const classmate = await openAs(browser, 'adult_writer', `/spaces/${classSlug}`);
    await classmate.getByRole('button', { name: 'Join the competition' }).click();
    await expect(classmate.getByText('Joined.')).toBeVisible();
    await classmate.context().close();
    giveClassPoints();
  });

  test('the teacher ends the competition and scores each entrant beside the outcomes', async ({
    browser,
  }) => {
    const teacher = await openAs(browser, 'teacher', `/spaces/${classSlug}`);
    await expect(teacher.getByText('2 pupils joined')).toBeVisible();
    await teacher.getByRole('button', { name: 'End the competition now' }).click();
    await teacher.getByRole('button', { name: 'End it' }).click();
    await expect(teacher.getByText('Ended. The teacher is assessing the entries.')).toBeVisible();
    await teacher.getByRole('link', { name: 'Assess the entries' }).click();

    const writerCard = teacher.getByRole('form', { name: writerName });
    // Class points are a guide beside the criteria, and the outcomes are a checklist.
    await expect(writerCard.getByText('Guide: 3 class points, 0 teacher points')).toBeVisible();
    await expect(writerCard.getByText('Începutul, in Caietul de concurs')).toBeVisible();
    await writerCard.getByRole('checkbox', { name: 'folosește dialogul pentru personaje' }).check();
    await expect(writerCard.getByText('Not scored on every criterion yet.')).toBeVisible();

    // A score above the criterion's maximum is refused in plain words.
    await writerCard.getByLabel('Score for Limbaj (0 to 20)').fill('21');
    await writerCard.getByRole('button', { name: `Save scores for ${writerName}` }).click();
    await expect(writerCard.getByText('A score is a whole number from 0')).toBeVisible();

    await scoreEntrant(teacher, writerName, ['15', '8']);
    await expect(writerCard.getByText('Total: 23 of 30')).toBeVisible();
    await scoreEntrant(teacher, classmateName, ['18', '9']);
    // No place numbers or leaderboard, and the app suggests no Winner: no radio is chosen.
    await expect(teacher.getByText(/1st|#1|top three|leaderboard/i)).toHaveCount(0);
    for (const radio of await teacher.getByRole('radio').all()) {
      await expect(radio).not.toBeChecked();
    }
    await expect(teacher.getByRole('button', { name: 'Confirm the results' })).toBeDisabled();
    await teacher.context().close();
  });

  test('axe while assessing: the class page, the results page and the templates page', async ({
    browser,
  }) => {
    test.setTimeout(600_000);
    await checkScreens(browser, 'pending_check', [`/spaces/${classSlug}`]);
    await checkScreens(browser, 'teacher', [
      resultsAddress(),
      `/spaces/${classSlug}/competition/templates`,
      `/spaces/${classSlug}/settings`,
    ]);
  });

  test('the teacher picks one Winner, their chapter and a Finalist, and confirms', async ({
    browser,
  }) => {
    const teacher = await openAs(browser, 'teacher', resultsAddress());
    const winners = teacher.getByRole('group', { name: 'Winner' });
    await winners.getByRole('radio', { name: classmateName }).check();
    await teacher
      .getByRole('combobox', { name: 'Winning chapter shown to the class' })
      .selectOption({ label: 'Malul' });
    const finalists = teacher.getByRole('group', { name: 'Finalists' });
    // The Winner is not offered as a Finalist.
    await expect(finalists.getByRole('checkbox', { name: classmateName })).toHaveCount(0);
    await finalists.getByRole('checkbox', { name: writerName }).check();
    await teacher.getByRole('button', { name: 'Confirm the results' }).click();
    await expect(teacher.getByText('Results can’t change after this.')).toBeVisible();
    await teacher.getByRole('button', { name: 'Confirm', exact: true }).click();

    await expect(teacher.getByText('Results are confirmed and locked.')).toBeVisible();
    const table = teacher.getByRole('table', { name: 'Results by entrant' });
    const winnerRow = table.getByRole('row').filter({ hasText: classmateName });
    await expect(winnerRow.getByRole('cell').nth(0)).toHaveText('Winner');
    await expect(winnerRow.getByRole('cell').nth(1)).toHaveText('Total: 27 of 30');
    const finalistRow = table.getByRole('row').filter({ hasText: writerName });
    await expect(finalistRow.getByRole('cell').nth(0)).toHaveText('Finalist, Readers’ choice');
    // Locked: no score field and no Confirm button are left.
    await expect(teacher.getByRole('textbox')).toHaveCount(0);
    await expect(teacher.getByRole('button', { name: 'Confirm the results' })).toHaveCount(0);

    // The teacher can start the next competition; the Winner card links to the certificates.
    await teacher.goto(`/spaces/${classSlug}`);
    await expect(teacher.getByRole('link', { name: 'Issue certificates' })).toBeVisible();
    await expect(teacher.getByRole('link', { name: 'Start a class competition' })).toBeVisible();
    await teacher.context().close();
  });

  test('the class sees the Winner card and each entrant only their own result', async ({
    browser,
  }) => {
    const writer = await openAs(browser, 'pending_check', `/spaces/${classSlug}`);
    const card = writer.getByRole('region', { name: competitionName });
    await expect(card.getByText(classmateName)).toBeVisible();
    await expect(card.getByRole('link', { name: 'Malul, in Lacul din nord' })).toBeVisible();
    await expect(card.getByText('Readers’ choice:', { exact: true })).toBeVisible();
    await expect(card.getByText('Result: Finalist')).toBeVisible();
    await expect(card.getByText('Also Readers’ choice')).toBeVisible();
    // No score, total or count reaches a pupil.
    await expect(card.getByText(/\d+ of \d+|\d+ points?/)).toHaveCount(0);
    await writer.goto('/notifications');
    await expect(writer.getByText('Readers’ choice.')).toBeVisible();
    await writer.context().close();

    const winner = await openAs(browser, 'adult_writer', `/spaces/${classSlug}`);
    await expect(
      winner.getByRole('region', { name: competitionName }).getByText('Result: Winner'),
    ).toBeVisible();
    await winner.goto('/notifications');
    await expect(winner.getByText('you are the Winner of the class competition')).toBeVisible();
    await winner.context().close();
  });

  test('axe once results are out: the class page, the results and the next form', async ({
    browser,
  }) => {
    test.setTimeout(600_000);
    await checkScreens(browser, 'pending_check', [`/spaces/${classSlug}`]);
    await checkScreens(browser, 'teacher', [
      `/spaces/${classSlug}`,
      resultsAddress(),
      `/spaces/${classSlug}/competition`,
    ]);
  });
});
