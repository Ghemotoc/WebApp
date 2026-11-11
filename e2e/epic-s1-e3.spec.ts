/**
 * Epic check for S1-E3, the writer editor and chapters (story S1-E3-QA).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * It adds no feature: it walks the epic's main journeys across its March stories, in a real browser.
 * - Journey 1, a writer's first story (S1-E3-01 × S1-E3-13 × S1-E3-06 × S1-E3-02a × S1-E3-03 ×
 *   S1-E3-04 × S1-E3-05): adult_writer creates a story with a rating and an automatic cover, writes
 *   chapter one (the autosave), publishes it, adds chapter two from Manage chapters and schedules
 *   it, moves it up, marks the story Completed; a signed-out reader sees the story with the
 *   published chapter, then both chapters in the new order once the job has run.
 * - Journey 2, the minors in March (S1-E2-02 × S1-E3-01): teen_17, kid_14_ok and kid_14_waiting
 *   can't create a story while adults_only is on; they are told so in plain words.
 * - Journey 3, every screen of the epic with real chapters and labels, in all 12 views (390, 768
 *   and 1440 px, light and night, Romanian and English): the story page as a reader sees it, the
 *   editor on a published chapter and Manage chapters; axe finds nothing serious, nothing scrolls
 *   sideways and no doodle is drawn. The other screens' 12 views live in
 *   their own specs (docs/epic-reports/S1-E3.md lists them).
 * - Journey 4, the editor's two dialogs in all 12 views: Preview (S1-E3-03) and Compare versions
 *   after a save conflict (S1-E3-02b), which their own specs check at 390 and 1440 px only.
 * The database half is supabase/tests/database/092-epic-s1-e3.test.sql.
 * Test data: seed personas; the story made here and the seed story's chapters are removed after.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The story journey 1 makes. */
const storyTitle = 'Verificarea epicului S1-E3';

/** The seed story journey 3 fills with chapters. */
const seedStoryId = '00000000-0000-4000-9000-000000000001';
const seedSlug = 'statia-meteo-seed01';

/** The personas' user IDs (supabase/seed.sql). Used only in SQL, never on screen. */
const personaIds: Partial<Record<SignInPersonaName, string>> = {
  adult_writer: '00000000-0000-4000-8000-000000000001',
  teen_17: '00000000-0000-4000-8000-000000000002',
  kid_14_ok: '00000000-0000-4000-8000-000000000003',
  kid_14_waiting: '00000000-0000-4000-8000-000000000004',
};

/** Removes what this spec made and puts the personas' language and the seed story back. */
function cleanUp() {
  runSql(
    `delete from public.jobs where kind = 'chapter_published' and payload ->> 'story_id' in (select id::text from public.stories where title = '${storyTitle}' or id = '${seedStoryId}');`,
  );
  runSql(`delete from public.stories where title = '${storyTitle}';`);
  runSql(`delete from public.chapters where story_id = '${seedStoryId}';`);
  runSql(
    `update public.stories set first_published_at = null, last_chapter_published_at = null, is_fan_fiction = false where id = '${seedStoryId}';`,
  );
  const ids = Object.values(personaIds).map((id) => `'${id}'`);
  runSql(`update public.profiles set locale = 'ro' where id in (${ids.join(', ')});`);
}

/** Opens a page in English as a persona, in a fresh browser context. */
async function openAsPersona(browser: Browser, persona: SignInPersonaName, path: string) {
  // The account's own language wins on every device (S1-E1-04), so it is set to English too.
  runSql(`update public.profiles set locale = 'en' where id = '${personaIds[persona] ?? ''}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

/** Types a chapter's title and text in the editor and waits for the autosave. */
async function writeChapter(page: Page, title: string, text: string) {
  await page.getByRole('textbox', { name: 'Chapter title' }).fill(title);
  await page.getByRole('textbox', { name: 'Chapter text' }).fill(text);
  await page.getByRole('textbox', { name: 'Chapter title' }).click();
  await expect(page.getByRole('region', { name: 'Saving' }).getByRole('status')).toHaveText(
    /Saved at \d/,
  );
}

/** The chapter titles a signed-out reader sees on a story page, in order. */
async function readerTitles(browser: Browser, slug: string): Promise<string[]> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/s/${slug}`);
  const chapters = page.getByRole('region', { name: /Capitole|Chapters/ });
  await expect(chapters).toBeVisible();
  const titles = await chapters.locator('li > p.font-heading').allTextContents();
  await context.close();
  return titles;
}

/** axe on the page as it is now (an open dialog), against WCAG 2.2 A and AA. */
async function expectNoSeriousAxeIssue(page: Page) {
  // Reduce motion ends every animation at once, so axe measures the colours the screen
  // settles on, not a fade half-way through (as in e2e/support/accessibility.ts; FINAL-1).
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
  ).toEqual([]);
}

/** Opens Preview, checks it and closes it. */
async function checkPreviewDialog(page: Page) {
  await page.getByRole('button', { name: /^(Preview|Previzualizare)$/ }).click();
  const dialog = page.getByRole('dialog', { name: /^(Preview|Previzualizare)$/ });
  await expect(dialog).toBeVisible();
  await expectNoSeriousAxeIssue(page);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}

/** Makes a save conflict (another device saved first), opens Compare versions and checks it. */
async function checkCompareDialog(page: Page, chapterCode: string) {
  runSql(
    `update public.chapters set draft_version = draft_version + 1 where code = '${chapterCode}';`,
  );
  const text = page.getByRole('textbox', { name: /^(Chapter text|Textul capitolului)$/ });
  await text.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' x');
  await page.getByRole('textbox', { name: /^(Chapter title|Titlul capitolului)$/ }).click();
  await page.getByRole('button', { name: /^(Compare versions|Compară versiunile)$/ }).click();
  const dialog = page.getByRole('dialog', { name: /^(Compare versions|Compară versiunile)$/ });
  await expect(
    dialog.getByRole('button', { name: /^(Keep this one|Păstrează aceasta)$/ }),
  ).toHaveCount(2);
  await expectNoSeriousAxeIssue(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    page.viewportSize()?.width ?? 0,
  );
}

test.describe('epic S1-E3 journeys', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('journey 1: a writer creates, writes, publishes, schedules, reorders and completes a story', async ({
    browser,
  }) => {
    test.setTimeout(90_000);
    // Create, with a rating, the AI answer and the automatic cover (S1-E3-01, S1-E3-06, S1-E3-13).
    const page = await openAsPersona(browser, 'adult_writer', '/write/new');
    await page.getByRole('textbox', { name: 'Title' }).fill(storyTitle);
    await page.getByRole('radio', { name: 'Română' }).click();
    await page.getByRole('radio', { name: 'Fiction' }).click();
    await page.getByRole('radio', { name: 'All ages', exact: true }).click();
    await page.getByRole('radio', { name: 'No AI', exact: true }).click();
    await page.getByRole('button', { name: 'Create and write chapter one' }).click();

    // Chapter one opens in the editor; write it and publish it now (S1-E3-02a, S1-E3-03).
    await expect(page).toHaveURL(/\/write\/s\/[a-z0-9-]+\/c\/[a-z0-9]{8}$/);
    const slug = new URL(page.url()).pathname.split('/')[3] ?? '';
    await writeChapter(page, 'Dimineața', 'Bunica notează vremea în fiecare dimineață.');
    const publishPanel = page.getByRole('region', { name: 'Publish' });
    await publishPanel.getByRole('button', { name: 'Publish chapter', exact: true }).click();
    await expect(publishPanel.getByText(/^Published /)).toBeVisible();
    expect(await readerTitles(browser, slug)).toEqual(['Dimineața']);

    // The breadcrumb's story link opens Manage chapters; add chapter two and schedule it.
    await page.getByRole('navigation').getByRole('link', { name: storyTitle }).click();
    await expect(page.getByRole('heading', { name: 'Manage chapters', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'New chapter' }).click();
    await writeChapter(page, 'Seara', 'Vântul se întoarce spre seară.');
    await publishPanel.getByRole('radio', { name: 'Schedule for later' }).check();
    await publishPanel.getByLabel('Date').fill(`${new Date().getFullYear() + 1}-01-01`);
    await publishPanel.getByLabel('Time').fill('09:30');
    await publishPanel.getByRole('button', { name: 'Schedule chapter' }).click();
    await expect(publishPanel.getByText(/^Scheduled for /)).toBeVisible();
    expect(await readerTitles(browser, slug)).toEqual(['Dimineața']);

    // Move chapter two up on Manage chapters (S1-E3-04).
    await page.goto(`/write/s/${slug}/chapters`);
    await page.getByRole('button', { name: 'Move chapter 2 up' }).click();
    await expect(
      page.getByRole('list', { name: 'Chapters in reading order' }).getByRole('listitem').first(),
    ).toContainText('Seara');

    // Mark the story Completed in its settings (S1-E3-05).
    await page.goto(`/write/s/${slug}/settings`);
    await page.getByRole('radio', { name: 'Completed' }).click();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.', { exact: true })).toBeVisible();

    // Its time comes (the every-minute job, run here directly): readers get both, in the new order.
    runSql(
      `update public.chapters set scheduled_for = now() - interval '1 minute' where status = 'scheduled' and story_id = (select id from public.stories where slug = '${slug}');`,
    );
    runSql('select public.publish_due_chapters();');
    expect(await readerTitles(browser, slug)).toEqual(['Seara', 'Dimineața']);
    expect(runSql(`select completion_status from public.stories where slug = '${slug}'`)).toBe(
      'completed',
    );
  });

  test('journey 2: teen_17, kid_14_ok and kid_14_waiting are read-only writers in March', async ({
    browser,
  }) => {
    for (const persona of ['teen_17', 'kid_14_ok', 'kid_14_waiting'] as const) {
      const page = await openAsPersona(browser, persona, '/write/new');
      await page.getByRole('textbox', { name: 'Title' }).fill(`${storyTitle} (${persona})`);
      await page.getByRole('radio', { name: 'All ages', exact: true }).click();
      await page.getByRole('radio', { name: 'No AI', exact: true }).click();
      await page.getByRole('button', { name: 'Create and write chapter one' }).click();
      await expect(
        page.getByText('Your account can’t create stories yet.', { exact: false }),
      ).toBeVisible();
      await page.context().close();
    }
    expect(runSql(`select count(*) from public.stories where title like '${storyTitle} (%'`)).toBe(
      '0',
    );
  });

  test('journey 3: the story page, the editor and Manage chapters pass every view', async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    // A published chapter (edited since), a draft, and a fan-fiction label on the seed story.
    runSql(`update public.stories set is_fan_fiction = true where id = '${seedStoryId}';`);
    runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
        word_count, status, published_title, published_body, published_word_count,
        first_published_at, edited_at)
      values ('${seedStoryId}', '${personaIds.adult_writer}', 'epice3p1', 1, 'Caietele bunicii',
        'Bunica mea **notează** vremea.', 4, 'published', 'Caietele bunicii',
        'Bunica mea **notează** vremea.', 4, now() - interval '9 days', now() - interval '2 days'),
      ('${seedStoryId}', '${personaIds.adult_writer}', 'epice3d2', 2, 'Vântul de miercuri',
        'Încă o ciornă.', 3, 'draft', null, null, null, null, null);`);

    const reader = await browser.newContext();
    const writer = await browser.newContext();
    await useSessionInBrowser(writer, (await signInPersona('adult_writer')).session);
    const screens: { address: string; context: typeof reader }[] = [
      { address: `/s/${seedSlug}`, context: reader },
      { address: `/write/s/${seedSlug}/c/epice3p1`, context: writer },
      { address: `/write/s/${seedSlug}/chapters`, context: writer },
    ];
    for (const screen of screens) {
      for (const view of everyView([screen.address])) {
        // The account's own language wins (S1-E1-04), so it follows the view's language.
        runSql(
          `update public.profiles set locale = '${view.language}' where id = '${personaIds.adult_writer}';`,
        );
        const page = await screen.context.newPage();
        await test.step(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async () => {
          await checkScreen(page, view);
          await expectNoDoodles(page);
        });
        await page.close();
      }
    }
  });

  test('journey 4: Preview and Compare versions pass every view', async ({ browser }) => {
    test.setTimeout(300_000);
    const writer = await browser.newContext();
    await useSessionInBrowser(writer, (await signInPersona('adult_writer')).session);
    for (const view of everyView([`/write/s/${seedSlug}/c/epice3p1`])) {
      runSql(
        `update public.profiles set locale = '${view.language}' where id = '${personaIds.adult_writer}';`,
      );
      const page = await writer.newPage();
      await test.step(`dialogs at ${view.width} px, ${view.theme}, ${view.language}`, async () => {
        await checkScreen(page, view);
        await checkPreviewDialog(page);
        await checkCompareDialog(page, 'epice3p1');
      });
      await page.close();
    }
  });
});
