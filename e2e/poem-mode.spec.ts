/**
 * Poem mode in a real browser (bundle MUST-2; IDEA-20261106-1).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves (the idea's three criteria):
 * 1. the writer ticks "Poem mode"; Enter starts a new line, a second Enter a new stanza, and the
 *    spaces a line starts with are kept: the stored Markdown holds hard breaks and non-breaking
 *    spaces exactly where they were typed; a long line wraps under a hanging indent;
 * 2. a reader on a 390 px phone sees the stanzas apart and nothing scrolls sideways;
 * 3. a screen reader meets each stanza as a named group ("Stanza 1") and each line as its own
 *    block; the reader passes axe at 390, 768 and 1440 px, light and night, ro and en.
 * Test data: one chapter made in SQL on adult_writer's seed story "The girl who fixed radios";
 * only that chapter is removed after.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000002';
const slug = 'the-girl-who-fixed-radios-seed02';
const code = 'poemedt1';
const NBSP = ' ';

/** The personas' user IDs (supabase/seed.sql). Used only in SQL, never on screen. */
const personaIds: Partial<Record<SignInPersonaName, string>> = {
  adult_writer: '00000000-0000-4000-8000-000000000001',
  teacher: '00000000-0000-4000-8000-000000000007',
};

/** Removes this spec's chapter and puts the personas' language back. */
function cleanUp() {
  runSql(`delete from public.chapters where code = '${code}';`);
  const ids = Object.values(personaIds).map((id) => `'${id}'`);
  runSql(`update public.profiles set locale = 'ro' where id in (${ids.join(', ')});`);
}

/** An empty draft chapter, not yet a poem, for the writer to fill. */
function seedDraft() {
  cleanUp();
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status)
    values ('${storyId}', '${personaIds.adult_writer}', '${code}', 1, 'Ploaia', '', 0, 'draft');`);
}

/** Opens a page in English as a persona, in a fresh browser context. */
async function openAsPersona(browser: Browser, persona: SignInPersonaName, path: string) {
  runSql(`update public.profiles set locale = 'en' where id = '${personaIds[persona] ?? ''}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

/** The chapter's stored draft, as the database holds it. */
function storedDraft(): string {
  return runSql(`select draft_body from public.chapters where code = '${code}'`);
}

test.describe('poem mode (MUST-2)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedDraft);
  test.afterAll(cleanUp);

  test('a writer in poem mode keeps every line, stanza and indent as typed', async ({
    browser,
  }) => {
    const page = await openAsPersona(browser, 'adult_writer', `/write/s/${slug}/c/${code}`);
    const poemSwitch = page.getByRole('checkbox', { name: 'Poem mode' });
    await expect(poemSwitch).not.toBeChecked();
    await poemSwitch.check();
    await expect(poemSwitch).toBeChecked();
    await expect
      .poll(() => runSql(`select is_poem from public.chapters where code = '${code}'`))
      .toBe('t');

    // Enter is a new line, two Enters a new stanza, and the spaces before "încet" stay.
    const text = page.getByRole('textbox', { name: 'Chapter text' });
    await text.click();
    await page.keyboard.type('Plouă pe acoperiș,');
    await page.keyboard.press('Enter');
    await page.keyboard.type('    încet,');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Apoi tace.');
    await page.getByRole('textbox', { name: 'Chapter title' }).focus();
    await expect(page.getByRole('region', { name: 'Saving' }).getByRole('status')).toHaveText(
      /Saved at \d/,
    );
    expect(storedDraft()).toBe(`Plouă pe acoperiș,  \n${NBSP.repeat(4)}încet,\n\nApoi tace.`);
    await expectNoDoodles(page);
  });

  test('a reader sees named stanzas and lines, with a hanging indent, on a 390 px phone', async ({
    browser,
  }) => {
    // Publish the poem with a long line, so it has to wrap.
    const longLine = 'Și ploaia cade peste tot orașul adormit, '.repeat(4).trim();
    runSql(`update public.chapters set status = 'published', published_title = 'Ploaia',
        published_body = draft_body || chr(10) || chr(10) || '${longLine}',
        published_word_count = 30, first_published_at = now()
      where code = '${code}';`);
    const page = await openAsPersona(browser, 'teacher', `/s/${slug}/${code}`);
    await page.setViewportSize({ width: 390, height: 800 });

    const stanzas = page.getByRole('group', { name: /^Stanza \d$/ });
    await expect(stanzas).toHaveCount(3);
    const firstLines = stanzas.first().locator('.tmc-poem-line');
    await expect(firstLines).toHaveText(['Plouă pe acoperiș,', `${NBSP.repeat(4)}încet,`]);

    // The long line wraps under a hanging indent and nothing scrolls sideways.
    const long = page.getByRole('group', { name: 'Stanza 3' }).locator('.tmc-poem-line');
    const indent = await long.evaluate((line) => getComputedStyle(line).textIndent);
    expect(Number.parseFloat(indent)).toBeLessThan(0);
    expect((await long.boundingBox())?.height ?? 0).toBeGreaterThan(60);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    await expectNoDoodles(page);
  });

  test('the poem passes axe at every width, light and night, ro and en', async ({ browser }) => {
    test.setTimeout(240_000);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('teacher')).session);
    for (const view of everyView([`/s/${slug}/${code}`])) {
      runSql(
        `update public.profiles set locale = '${view.language}' where id = '${personaIds.teacher}';`,
      );
      const page = await context.newPage();
      await test.step(`axe at ${view.width} px, ${view.theme}, ${view.language}`, async () => {
        await checkScreen(page, view);
        await expect(page.locator('.tmc-poem')).toBeVisible();
      });
      await page.close();
    }
  });
});
