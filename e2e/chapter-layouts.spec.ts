/**
 * The Layout per chapter in a real browser (LAYOUTS-1; Robert, 27 Nov 2026, 17:34 UTC; boards
 * D14-EditorPlay and D15-EditorPoem).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * 1. "Layout" with Prose, Play and Poem sits on the paper; picking Play saves it, and the chapter
 *    list says "Play · Draft"; a reload keeps it;
 * 2. a break test: a layout given to someone else's chapter in a forged call changes nothing;
 * 3. the editor passes axe at 390, 768 and 1440 px, light and night, ro and en, and the look
 *    check by day and at night.
 * Test data: one draft chapter made in SQL on adult_writer's seed story "The girl who fixed
 * radios"; only that chapter is removed after.
 */
import { type Browser } from '@playwright/test';
import { expect, test } from './support/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectLookRulesByDayAndNight } from './support/lookCheck';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000002';
const slug = 'the-girl-who-fixed-radios-seed02';
const code = 'layout01';
const writerId = '00000000-0000-4000-8000-000000000001';
const editorAddress = `/write/s/${slug}/c/${code}`;

/** The chapter's layout as stored. */
function storedLayout(): string {
  return runSql(`select layout from public.chapters where code = '${code}'`);
}

/** Removes this spec's chapter and puts the writer's language back. */
function cleanUp() {
  runSql(`delete from public.chapters where code = '${code}';`);
  runSql(`update public.profiles set locale = 'ro' where id = '${writerId}';`);
}

/** An empty prose draft for the writer. */
function seedDraft() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, layout)
    values ('${storyId}', '${writerId}', '${code}', 1, 'Epilog', '', 0, 'draft', 'prose');`);
}

/** Opens the editor in English as the writer, 1440 px wide. */
async function openEditor(browser: Browser) {
  runSql(`update public.profiles set locale = 'en' where id = '${writerId}';`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(editorAddress);
  return page;
}

test.describe('chapter layouts (LAYOUTS-1)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedDraft);
  test.afterAll(cleanUp);

  test('the writer picks Play on the paper, and the chapter list says so', async ({ browser }) => {
    const page = await openEditor(browser);
    const layout = page.getByRole('group', { name: 'Layout' });
    await expect(layout.getByRole('radio', { name: 'Prose' })).toBeChecked();
    await layout.getByText('Play', { exact: true }).click();
    await expect(layout.getByRole('radio', { name: 'Play' })).toBeChecked();
    await expect.poll(storedLayout).toBe('play');
    // The chapter list on the left (board D14: "16. Epilogue: Spring / Play · Draft").
    const list = page.getByRole('navigation', { name: 'Chapters of this story' });
    await expect(list.getByRole('link', { name: /Epilog/ })).toContainText('Play · Draft');
    // The Poem button left the formatting bar.
    await expect(page.getByRole('button', { name: 'Poem', exact: true })).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole('group', { name: 'Layout' }).getByRole('radio', { name: 'Play' }),
    ).toBeChecked();
    await expectNoDoodles(page);
  });

  test("a forged call can't change someone else's chapter", async () => {
    // Break test: another member calls the database function directly with this chapter's code.
    const answer = runSql(`begin;
      select set_config('role', 'authenticated', true),
        set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000007", "role": "authenticated"}', true);
      select public.set_chapter_layout('${code}', 'poem');
      commit;`);
    expect(answer).toContain('not_found');
    expect(storedLayout()).toBe('play');
  });

  test('the editor passes axe on every screen and the look check by day and at night', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
    const page = await context.newPage();
    for (const view of everyView([editorAddress])) {
      runSql(`update public.profiles set locale = '${view.language}' where id = '${writerId}';`);
      await checkScreen(page, view);
    }
    await context.close();
    await expectLookRulesByDayAndNight(browser, 'adult_writer', editorAddress, (ready) =>
      expect(ready.getByRole('group', { name: 'Layout' })).toBeVisible(),
    );
  });
});
