/**
 * "Copied from a published work" reports in a real browser (story S1-E10-08).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a reader selects a passage on a story page and presses Report; with "Copied from a published
 *   work" the dialog shows the selected passage and asks, all optional, for the published work's
 *   title, author, ISBN or link and matching passage, and the report keeps them;
 * - the moderator sees the source and the two passages side by side on the case page, and asks
 *   the reporter for more details;
 * - the reporter finds the question in Settings, answers it, and the moderator sees the answer;
 * - the moderator decides "Add a public note", and every visitor then sees the note on the story;
 * - the copied-work case page passes axe and don't scroll sideways at 390, 768 and 1440 px.
 * Test data: seed personas; a chapter is made in SQL on adult_writer's first seed story, and the
 * report, case, question and note made here are removed afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, LANGUAGE_STORAGE_KEY, screenWidths } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000001';
const storyAddress = '/s/statia-meteo-seed01';
const storyTitle = 'Stația meteo';
const adultWriterId = '00000000-0000-4000-8000-000000000001';

/** Removes everything this spec made and puts the seed story back. */
function cleanUp() {
  runSql(`
    delete from public.copied_work_notes where story_id = '${storyId}';
    delete from public.report_detail_requests where case_id in (
      select case_id from public.reports where item_id = '${storyId}');
    delete from public.case_actions where case_id in (
      select case_id from public.reports where item_id = '${storyId}');
    create temporary table copied_work_cases on commit drop as
      select case_id from public.reports where item_id = '${storyId}';
    delete from public.reports where item_id = '${storyId}';
    delete from public.cases where id in (select case_id from copied_work_cases);
    delete from public.chapters where code like 'cwork%';
    update public.stories set first_published_at = null, last_chapter_published_at = null
      where id = '${storyId}';
    update public.profiles set locale = 'ro' where handle in ('teacher', 'moderator');`);
}

/** One published chapter, so the story page is open to readers. */
function publishChapter() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    values ('${storyId}', '${adultWriterId}', 'cworka01', 1, 'Unu', 'x', 3,
      'published', 'Unu', 'Primul capitol aici.', 3, now());
    update public.stories set first_published_at = now(), last_chapter_published_at = now()
      where id = '${storyId}';`);
}

/** Opens an address in English, as a persona or as a visitor, in a fresh browser context. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** The case the teacher's report opened. */
function caseId(): string {
  return runSql(`select case_id from public.reports where item_id = '${storyId}' limit 1`);
}

test.describe('copied-work reports (S1-E10-08)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(publishChapter);
  test.afterAll(cleanUp);

  test('a reader selects a passage, reports it as copied and names the published work', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'teacher', storyAddress);
    const heading = page.getByRole('heading', { level: 1, name: storyTitle });
    await expect(heading).toBeVisible();
    // Select the title on the page, the way a reader drags across text, then press Report.
    await heading.selectText();
    await page.getByRole('button', { name: `Report ${storyTitle}` }).click();

    const dialog = page.getByRole('dialog', { name: 'Report this story' });
    await expect(dialog).toBeVisible();
    // Click the chip's label as a reader would. Under a full parallel run the dialog's file can
    // still be settling on the first click, so the click is retried until the radio is checked.
    const copiedReason = dialog.getByRole('radio', { name: 'Copied from a published work' });
    await expect(async () => {
      await dialog.locator('label', { hasText: 'Copied from a published work' }).click();
      await expect(copiedReason).toBeChecked({ timeout: 1000 });
    }).toPass();
    const source = dialog.getByRole('group', { name: 'Where was it copied from? (all optional)' });
    await expect(source.getByText(storyTitle, { exact: true })).toBeVisible();
    await source.getByLabel('Title of the published work (optional)').fill('Ion');
    await source.getByLabel('Author (optional)').fill('Liviu Rebreanu');
    await source
      .getByLabel('The matching passage in the published work (optional)')
      .fill('Drumul pleacă din Armadia.');
    await dialog.getByRole('button', { name: 'Send report' }).click();
    await expect(dialog.getByText(/R-\d{6}/)).toBeVisible();

    // The report keeps the source and the selected passage.
    expect(
      runSql(`select concat_ws('|', copy_source_title, copy_source_author, reported_passage)
        from public.reports where item_id = '${storyId}'`),
    ).toBe(`Ion|Liviu Rebreanu|${storyTitle}`);
  });

  test('the moderator compares the passages and asks the reporter for more details', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'moderator', `/staff/moderation/cases/${caseId()}`);
    await expect(page.getByText('Source: Ion · Liviu Rebreanu')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'In the story' })).toBeVisible();
    await expect(page.getByText('Drumul pleacă din Armadia.')).toBeVisible();

    await page
      .getByRole('button', { name: /^Ask for more details from the reporter of R-\d{6}$/ })
      .click();
    await page.getByLabel('What do you need to know?').fill('Which page of the novel is it on?');
    await page.getByRole('button', { name: 'Send the question' }).click();
    await expect(page.getByText('Which page of the novel is it on?')).toBeVisible();
    await expect(page.getByText('Waiting for the reporter')).toBeVisible();
  });

  test('the reporter answers in Settings and the moderator sees the answer', async ({
    browser,
  }) => {
    const settings = await openAs(browser, 'teacher', '/settings');
    const section = settings.getByRole('region', { name: 'Questions about your reports' });
    await expect(section.getByText('Which page of the novel is it on?')).toBeVisible();
    await section.getByLabel('Your answer').fill('Page 12, the first chapter.');
    await section.getByRole('button', { name: 'Send answer' }).click();
    await expect(
      settings.getByText('Thank you. The moderation team has your answer.'),
    ).toBeVisible();

    const casePage = await openAs(browser, 'moderator', `/staff/moderation/cases/${caseId()}`);
    await expect(casePage.getByText('Page 12, the first chapter.')).toBeVisible();
  });

  test('the moderator adds a public note and every visitor sees it on the story', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'moderator', `/staff/moderation/cases/${caseId()}`);
    const form = page.getByRole('form', { name: 'Decision' });
    await form.getByRole('radio', { name: 'Add a public note' }).check({ force: true });
    await form
      .getByLabel('Note for the case log (required)')
      .fill('The opening copies the novel word for word; a note, not a removal.');
    await form
      .getByLabel('What we tell the person (required)')
      .fill('Parts of your story copy a published novel, so readers now see a note.');
    await form.getByRole('button', { name: 'Send decision' }).click();
    await expect(page.getByRole('status').getByText('Decision saved')).toBeVisible();

    const visitor = await openAs(browser, null, storyAddress);
    await expect(
      visitor.getByText('Moderators found that parts of this story copy a published work.'),
    ).toBeVisible();
  });

  for (const width of screenWidths) {
    for (const language of ['ro', 'en'] as const) {
      test(`axe: the copied-work case page at ${width} px, ${language}`, async ({ page }) => {
        runSql(`update public.profiles set locale = '${language}'
          where handle in ('moderator', 'teacher');`);
        await useSessionInBrowser(page.context(), (await signInPersona('moderator')).session);
        await checkScreen(page, {
          address: `/staff/moderation/cases/${caseId()}`,
          width,
          theme: 'light',
          language,
        });
      });
    }
  }
});
