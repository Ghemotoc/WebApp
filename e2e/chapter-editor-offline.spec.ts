/**
 * The chapter editor's safety nets in a real browser (story S1-E3-02b).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - offline, the Saving box says the words are kept on this device; closing the tab and coming
 *   back online, the editor opens with those words and saves them;
 * - two devices: the second save is a conflict with "Keep this version" and "Compare versions";
 *   Compare shows both versions side by side, "Keep this one" on the other device's loads it;
 *   "Keep this version" saves this device's words over the other's;
 * - pasting from Word keeps headings, bold, italic, lists and links, nothing else;
 * - the compare dialog passes axe at 390 and 1440 px.
 * Test data: chapters made in SQL on the seed story "Stația meteo"; deleted after.
 */
import { readFileSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const storyId = '00000000-0000-4000-9000-000000000001';
const slug = 'statia-meteo-seed01';
const writerId = '00000000-0000-4000-8000-000000000001';

/** Removes the chapters this spec made and puts the writer's language back. */
function cleanUp() {
  runSql(`delete from public.chapters where story_id = '${storyId}';`);
  runSql(`update public.profiles set locale = 'ro' where id = '${writerId}';`);
}

/** Makes a chapter with some text, the way create_chapter() would, and returns its code. */
function makeChapter(code: string, body: string): string {
  runSql(`insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body)
    values ('${storyId}', '${writerId}', '${code}',
      (select coalesce(max(position), 0) + 1 from public.chapters where story_id = '${storyId}'),
      'Capitol de test', '${body}');`);
  return code;
}

/** A signed-in browser for adult_writer in English: one "device". */
async function newDevice(browser: Browser): Promise<BrowserContext> {
  runSql(`update public.profiles set locale = 'en' where id = '${writerId}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  return context;
}

/** Opens the editor on a chapter and waits for the text to be ready. */
async function openEditor(context: BrowserContext, code: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`/write/s/${slug}/c/${code}`);
  await expect(page.getByRole('textbox', { name: 'Chapter text' })).toBeVisible();
  return page;
}

/** The Saving box's status line. */
function saveStatus(page: Page) {
  return page.getByRole('region', { name: 'Saving' }).getByRole('status');
}

/** Types at the end of the text, then leaves it so the save runs. */
async function typeAndLeave(page: Page, words: string) {
  await page.getByRole('textbox', { name: 'Chapter text' }).click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type(words);
  await page.getByRole('textbox', { name: 'Chapter title' }).focus();
}

/** The stored body of a chapter. */
function storedBody(code: string): string {
  return runSql(`select draft_body from public.chapters where code = '${code}'`);
}

test.describe('the chapter editor offline, in a conflict and on paste (S1-E3-02b)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('offline words are kept on the device and saved when the editor opens online again', async ({
    browser,
  }) => {
    const code = makeChapter('offline1', 'Început.');
    const device = await newDevice(browser);
    const page = await openEditor(device, code);
    await device.setOffline(true);
    await typeAndLeave(page, ' Scris fără internet.');
    await expect(saveStatus(page)).toHaveText(
      /You’re offline\. Your changes are kept on this device/,
    );
    expect(storedBody(code)).toBe('Început.');
    // Give the device copy its half second, then close the tab while still offline.
    await page.waitForTimeout(800);
    await page.close();
    await device.setOffline(false);

    const reopened = await openEditor(device, code);
    await expect(reopened.getByRole('textbox', { name: 'Chapter text' })).toContainText(
      'Scris fără internet.',
    );
    await expect(saveStatus(reopened)).toHaveText(/Saved at \d/);
    expect(storedBody(code)).toBe('Început. Scris fără internet.');
    await device.close();
  });

  test('a conflict offers both choices; Compare loads the other device’s version', async ({
    browser,
  }) => {
    const code = makeChapter('conflct1', 'Început.');
    const laptop = await newDevice(browser);
    const phone = await newDevice(browser);
    const phonePage = await openEditor(phone, code);
    const laptopPage = await openEditor(laptop, code);

    await typeAndLeave(laptopPage, ' De pe laptop.');
    await expect(saveStatus(laptopPage)).toHaveText(/Saved at \d/);
    await typeAndLeave(phonePage, ' De pe telefon.');
    await expect(saveStatus(phonePage)).toHaveText(/changed on another device/);
    const saving = phonePage.getByRole('region', { name: 'Saving' });
    await expect(saving.getByRole('button', { name: 'Keep this version' })).toBeVisible();

    await saving.getByRole('button', { name: 'Compare versions' }).click();
    const dialog = phonePage.getByRole('dialog', { name: 'Compare versions' });
    const thisDevice = dialog.getByRole('region', { name: 'This device' });
    const otherDevice = dialog.getByRole('region', { name: 'The other device' });
    await expect(thisDevice).toContainText('De pe telefon.');
    await expect(otherDevice).toContainText('De pe laptop.');
    await expect(otherDevice).toContainText(/Saved /);

    // The dialog is accessible at phone and desktop widths.
    for (const width of [390, 1440]) {
      await phonePage.setViewportSize({ width, height: 900 });
      await phonePage.waitForFunction(() =>
        document.getAnimations().every((animation) => animation.playState !== 'running'),
      );
      const results = await new AxeBuilder({ page: phonePage })
        .include('dialog')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
      ).toEqual([]);
    }

    await otherDevice.getByRole('button', { name: 'Keep this one' }).click();
    await expect(dialog).toBeHidden();
    const text = phonePage.getByRole('textbox', { name: 'Chapter text' });
    await expect(text).toContainText('De pe laptop.');
    await expect(text).not.toContainText('De pe telefon.');
    await expect(saveStatus(phonePage)).toHaveText('Nothing to save yet.');
    expect(storedBody(code)).toBe('Început. De pe laptop.');

    // The phone carries on from the laptop's version without another conflict.
    await typeAndLeave(phonePage, ' Apoi telefonul.');
    await expect(saveStatus(phonePage)).toHaveText(/Saved at \d/);
    expect(storedBody(code)).toBe('Început. De pe laptop. Apoi telefonul.');
    await laptop.close();
    await phone.close();
  });

  test('"Keep this version" saves this device’s words over the other’s', async ({ browser }) => {
    const code = makeChapter('conflct2', 'Început.');
    const laptop = await newDevice(browser);
    const phone = await newDevice(browser);
    const phonePage = await openEditor(phone, code);
    const laptopPage = await openEditor(laptop, code);
    await typeAndLeave(laptopPage, ' De pe laptop.');
    await expect(saveStatus(laptopPage)).toHaveText(/Saved at \d/);
    await typeAndLeave(phonePage, ' De pe telefon.');
    await expect(saveStatus(phonePage)).toHaveText(/changed on another device/);

    await phonePage
      .getByRole('region', { name: 'Saving' })
      .getByRole('button', { name: 'Keep this version' })
      .click();
    await expect(saveStatus(phonePage)).toHaveText(/Saved at \d/);
    expect(storedBody(code)).toBe('Început. De pe telefon.');
    await laptop.close();
    await phone.close();
  });

  test('pasting from Word keeps headings, bold, italic, lists and links, and nothing else', async ({
    browser,
  }) => {
    const code = makeChapter('pasted01', '');
    const device = await newDevice(browser);
    const page = await openEditor(device, code);
    const wordHtml = readFileSync('src/test/fixtures/paste/word.html', 'utf8');
    await page.getByRole('textbox', { name: 'Chapter text' }).click();
    // A real paste event, as the browser sends when the writer presses Ctrl+V.
    await page.getByRole('textbox', { name: 'Chapter text' }).evaluate((element, html) => {
      const clipboard = new DataTransfer();
      clipboard.setData('text/html', html);
      clipboard.setData('text/plain', 'fallback');
      element.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: clipboard, bubbles: true, cancelable: true }),
      );
    }, wordHtml);
    await page.getByRole('textbox', { name: 'Chapter title' }).focus();
    await expect(saveStatus(page)).toHaveText(/Saved at \d/);
    expect(storedBody(code)).toBe(
      [
        '## Stația meteo',
        '',
        '**Bunica** notează vremea *în fiecare* dimineață.',
        '',
        '- Temperatura',
        '- Vântul',
        '',
        'Un citat din caiet.',
        '',
        'Vezi [caietele](https://example.org/caiete).',
      ].join('\n'),
    );
    await device.close();
  });
});
