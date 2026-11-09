/**
 * The chapter editor in a real browser (story S1-E3-02a).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - "Write chapter one" on a story card makes the chapter and opens the editor; typing a title
 *   and text saves on blur ("Saved at …") and the database holds the Markdown with ș and ț;
 * - the toolbar works by keyboard alone: one tab stop, arrows between buttons, every button
 *   named with its shortcut; Ctrl+B makes bold text, which is stored as **bold**;
 * - a typed "<script>" is stored as escaped text and shows as text, never runs;
 * - the autosave saves on its own within 10 seconds of a change;
 * - teen_17 can't open adult_writer's chapter; a signed-out visitor is asked to log in;
 * - the editor passes axe, fits the width and draws no doodle at 390, 768 and 1440 px,
 *   light and night, ro and en.
 * Test data: the seed story "Stația meteo" (adult_writer); its chapters are deleted after.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000001';
const slug = 'statia-meteo-seed01';
const writerId = '00000000-0000-4000-8000-000000000001';
const teenId = '00000000-0000-4000-8000-000000000002';

/** Removes the chapters this spec made and puts the personas' language back. */
function cleanUp() {
  runSql(`delete from public.chapters where story_id = '${storyId}';`);
  runSql(`update public.profiles set locale = 'ro' where id in ('${writerId}', '${teenId}');`);
}

/** The code of the seed story's first chapter, once it exists. */
function firstChapterCode(): string {
  return runSql(
    `select code from public.chapters where story_id = '${storyId}' order by position limit 1`,
  );
}

/** Opens a page in English as a persona, in a fresh browser context. */
async function openAsPersona(browser: Browser, persona: SignInPersonaName, path: string) {
  const personaId = persona === 'teen_17' ? teenId : writerId;
  runSql(`update public.profiles set locale = 'en' where id = '${personaId}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('chapter editor (S1-E3-02a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('"Write chapter one" opens the editor; the title and text save on blur with ș and ț', async ({
    browser,
  }) => {
    const page = await openAsPersona(browser, 'adult_writer', '/write');
    const card = page.getByRole('article', { name: 'Stația meteo' });
    await card.getByRole('button', { name: 'Write chapter one' }).click();
    await expect(page).toHaveURL(new RegExp(`/write/s/${slug}/c/[a-z0-9]{8}$`));
    await expect(page.getByText('Chapter 1')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Saving' }).getByRole('status')).toHaveText(
      'Nothing to save yet.',
    );

    await page.getByRole('textbox', { name: 'Chapter title' }).fill('Caietele bunicii');
    const text = page.getByRole('textbox', { name: 'Chapter text' });
    await text.click();
    await page.keyboard.type('Bunica mea notează vremea în fiecare dimineaţă.');
    await expect(page.getByRole('region', { name: 'Saving' }).getByRole('status')).toHaveText(
      'Unsaved changes.',
    );
    // Leaving the text saves at once.
    await page.getByRole('textbox', { name: 'Chapter title' }).focus();
    await expect(page.getByRole('region', { name: 'Saving' }).getByRole('status')).toHaveText(
      /Saved at \d/,
    );
    expect(
      runSql(
        `select draft_title || ' | ' || draft_body from public.chapters where code = '${firstChapterCode()}'`,
      ),
    ).toBe('Caietele bunicii | Bunica mea notează vremea în fiecare dimineață.');
    await expect(page.getByText('7 words')).toBeVisible();
  });

  test('the toolbar works by keyboard, bold is stored as Markdown, and a typed <script> stays text', async ({
    browser,
  }) => {
    const code = firstChapterCode();
    const page = await openAsPersona(browser, 'adult_writer', `/write/s/${slug}/c/${code}`);
    const text = page.getByRole('textbox', { name: 'Chapter text' });
    await expect(text).toContainText('Bunica mea');

    // Every button is named and carries its shortcut.
    const toolbar = page.getByRole('toolbar', { name: 'Formatting' });
    for (const [name, keys] of [
      ['Bold', 'Control+B'],
      ['Italic', 'Control+I'],
      ['Heading', 'Control+Alt+2'],
      ['Quote', 'Control+Shift+9'],
      ['List', 'Control+Shift+8'],
      ['Link', 'Control+K'],
      ['Scene break', 'Control+Enter'],
    ]) {
      await expect(toolbar.getByRole('button', { name, exact: true })).toHaveAttribute(
        'aria-keyshortcuts',
        keys ?? '',
      );
    }
    // One tab stop, arrows move along the bar.
    await toolbar.getByRole('button', { name: 'Bold', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(toolbar.getByRole('button', { name: 'Italic', exact: true })).toBeFocused();
    await page.keyboard.press('End');
    await expect(toolbar.getByRole('button', { name: 'Scene break', exact: true })).toBeFocused();

    // Bold through the shortcut; a typed tag stays text.
    await text.click();
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Control+b');
    await page.keyboard.type('Important');
    await page.keyboard.press('Control+b');
    await page.keyboard.type(' <script>alert(1)</script>');
    await expect(toolbar.getByRole('button', { name: 'Bold', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await page.getByRole('textbox', { name: 'Chapter title' }).focus();
    await expect(page.getByRole('region', { name: 'Saving' }).getByRole('status')).toHaveText(
      /Saved at \d/,
    );
    const stored = runSql(`select draft_body from public.chapters where code = '${code}'`);
    expect(stored).toContain('**Important**');
    expect(stored).toContain('\\<script\\>alert(1)\\</script\\>');
    expect(stored).not.toContain('<script>');
    await expect(text).toContainText('<script>alert(1)</script>');
  });

  test('the autosave saves on its own within 10 seconds', async ({ browser }) => {
    const code = firstChapterCode();
    const page = await openAsPersona(browser, 'adult_writer', `/write/s/${slug}/c/${code}`);
    const text = page.getByRole('textbox', { name: 'Chapter text' });
    await text.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' Încă o propoziție.');
    await expect(page.getByRole('region', { name: 'Saving' }).getByRole('status')).toHaveText(
      'Unsaved changes.',
    );
    // No blur: the 10-second tick saves it.
    await expect(page.getByRole('region', { name: 'Saving' }).getByRole('status')).toHaveText(
      /Saved at \d/,
      { timeout: 15_000 },
    );
    expect(runSql(`select draft_body from public.chapters where code = '${code}'`)).toContain(
      'Încă o propoziție.',
    );
    await expect(page.getByRole('link', { name: 'Continue chapter 1' })).toHaveCount(0);
  });

  test('teen_17 can’t open adult_writer’s chapter; a visitor is asked to log in', async ({
    browser,
    page,
  }) => {
    const code = firstChapterCode();
    const teenPage = await openAsPersona(browser, 'teen_17', `/write/s/${slug}/c/${code}`);
    await expect(teenPage.getByText('We can’t find this chapter among yours.')).toBeVisible();
    await page.goto(`/write/s/${slug}/c/${code}`);
    await expect(page.getByText(/Intră în cont ca să scrii|Log in to write/)).toBeVisible();
  });

  test('"Continue chapter 1" on the card opens the editor again', async ({ browser }) => {
    const page = await openAsPersona(browser, 'adult_writer', '/write');
    const card = page.getByRole('article', { name: 'Stația meteo' });
    await card.getByRole('link', { name: 'Continue chapter 1' }).click();
    await expect(page.getByRole('textbox', { name: 'Chapter title' })).toHaveValue(
      'Caietele bunicii',
    );
  });

  test.describe('every view is accessible, fits the width and draws no doodle', () => {
    for (const view of everyView(['/write/s/statia-meteo-seed01/c/__CODE__'])) {
      test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
        page,
      }) => {
        // The account's own language wins over the device's (S1-E1-04), so it is set to the view's
        // language first; otherwise the check races the profile load.
        runSql(`update public.profiles set locale = '${view.language}' where id = '${writerId}';`);
        await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
        await checkScreen(page, {
          ...view,
          address: view.address.replace('__CODE__', firstChapterCode()),
        });
        await expectNoDoodles(page);
      });
    }
  });
});
