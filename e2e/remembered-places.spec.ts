/**
 * Coming back to the same place, in a real browser (design books review, item 17, "Don't start
 * from zero": "Leave and come back: the same place").
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves (each "another device" is a fresh browser with empty storage, so only the
 * account can know):
 * - a reader who picked Romanian for a story in two languages gets Romanian on another device,
 *   although an English page would open the English edition by itself;
 * - a link into a story's Atlas opens the section the writer had open last, on another device too,
 *   while the Atlas menu's "At a glance" still opens At a glance;
 * - Write puts the caret back where the writer left it in the chapter, on another device too.
 * Reading settings for a visitor (kept in the browser) are in reading-settings.spec.ts.
 * Test data: adult_writer's story "Locul păstrat" in Romanian and English, with one chapter each;
 * teen_17 reads it. Removed afterwards, with both personas' remembered places.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const readerId = '00000000-0000-4000-8000-000000000002';
const romanianSlug = 'locul-pastrat-e2e';
const englishSlug = 'the-kept-place-e2e';

/** Removes the spec's stories, their chapters and the personas' remembered places. */
function cleanUp() {
  runSql(`delete from public.remembered_places where user_id in ('${writerId}', '${readerId}');
    delete from public.chapters where code in ('pastra01', 'kepten01');
    delete from public.stories where slug = '${englishSlug}';
    delete from public.stories where slug = '${romanianSlug}';
    update public.profiles set locale = 'ro' where id in ('${writerId}', '${readerId}');`);
}

/** The story in Romanian with an English edition, one published chapter each. */
function seedStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at)
    values ('${writerId}', '${romanianSlug}', 'Locul păstrat', 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages', now(), now());
    insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating, first_published_at, last_chapter_published_at, edition_of_story_id)
    select '${writerId}', '${englishSlug}', 'The kept place', 'x', 'en', category_id, 'ongoing',
      'all_ages', now(), now(), id
    from public.stories where slug = '${romanianSlug}';
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at)
    select id, user_id, 'pastra01', 1, 'Capitolul unu', 'Primul rând.\n\nAl doilea rând.', 6,
      'published', 'Capitolul unu', 'Primul rând.\n\nAl doilea rând.', 6, now()
    from public.stories where slug = '${romanianSlug}';
    insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body,
      word_count, status, published_title, published_body, published_word_count, first_published_at,
      translation_of_chapter_id)
    select stories.id, stories.user_id, 'kepten01', 1, 'Chapter one', 'First line.', 2,
      'published', 'Chapter one', 'First line.', 2, now(), original.id
    from public.stories, public.chapters as original
    where stories.slug = '${englishSlug}' and original.code = 'pastra01';
    update public.profiles set locale = 'en' where id in ('${writerId}', '${readerId}');`);
}

/** Opens an address as a persona in a fresh browser (another device: empty storage). */
async function openOnNewDevice(browser: Browser, persona: SignInPersonaName, address: string) {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript(([key]) => localStorage.setItem(key, 'en'), [
    LANGUAGE_STORAGE_KEY,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/**
 * Records every caret place the page sends to the account, with the answer's status, so a failed
 * caret test can say whether the place was sent, what it was and whether the account took it.
 *
 * @param page - the editor page
 * @returns the list, filled as the page sends
 */
function recordSentCaretPlaces(page: Page): string[] {
  const sent: string[] = [];
  page.on('requestfinished', (request) => {
    if (!request.url().includes('/rpc/remember_place')) return;
    void request.response().then((response) => {
      sent.push(`${request.postData() ?? ''} -> ${response?.status() ?? 'no answer'}`);
    });
  });
  page.on('requestfailed', (request) => {
    if (request.url().includes('/rpc/remember_place'))
      sent.push(`failed: ${request.failure()?.errorText}`);
  });
  return sent;
}

/**
 * The caret test's failure message: the assertion's own words, then what the page sent, the
 * kept row and where the editor's caret is, so the cause shows in the CI log itself.
 *
 * @param page - the editor page
 * @param sentPlaces - from recordSentCaretPlaces
 * @param error - what the check threw
 * @returns the message
 */
async function describeCaretFailure(page: Page, sentPlaces: string[], error: unknown) {
  const caret = await page
    .evaluate(() => {
      const selection = window.getSelection();
      const active = document.activeElement;
      return `focus on ${active?.getAttribute('aria-label') ?? active?.tagName ?? 'nothing'}, caret in "${selection?.anchorNode?.textContent ?? ''}" at ${selection?.anchorOffset ?? -1}`;
    })
    .catch((reason: unknown) => `page not readable: ${String(reason)}`);
  const editorCaret = await editorCaretPosition(page).catch(
    (reason: unknown) => `not readable: ${String(reason)}`,
  );
  const row = runSql(
    `select place::text from public.remembered_places
     where user_id = '${writerId}' and kind = 'write_caret' and item_key = '${romanianSlug}';`,
  ).trim();
  return [
    error instanceof Error ? error.message : String(error),
    `Sent: ${sentPlaces.length === 0 ? 'nothing' : sentPlaces.join('; ')}`,
    `Kept: ${row === '' ? 'no row' : row}`,
    `Editor: ${caret}`,
    `The editor's own caret: ${editorCaret}`,
  ].join('\n');
}

/** Waits until the account holds a place of this kind for the persona. */
async function expectKeptInAccount(userId: string, kind: string) {
  await expect
    .poll(() =>
      runSql(
        `select count(*) from public.remembered_places where user_id = '${userId}' and kind = '${kind}';`,
      ).trim(),
    )
    .toBe('1');
}

/** The chapter editor's text box. */
function chapterText(page: Page) {
  return page.getByRole('textbox', { name: 'Chapter text' });
}

/**
 * Where the chapter editor itself thinks the caret is: TipTap puts its editor on the text's
 * element, and its selection is what the page keeps. The browser's caret can be somewhere else
 * for a moment, until the editor has read the browser's selection change.
 *
 * @param page - the editor page
 * @returns the caret's position in the text, or -1 when there is no editor on the page
 */
async function editorCaretPosition(page: Page): Promise<number> {
  return chapterText(page).evaluate((element) => {
    const editor = (
      element as HTMLElement & { editor?: { state: { selection: { head: number } } } }
    ).editor;
    return editor === undefined ? -1 : editor.state.selection.head;
  });
}

test.describe('coming back to the same place (design books item 17)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('the language a reader picked opens on another device', async ({ browser }) => {
    // The page is in English, so with nothing remembered the story moves to its English edition
    // by itself, a moment after it opens (story_opening_edition()). The test waits for that move
    // first and then picks Romanian, the edition a fresh English page would never open alone:
    // only the account can bring it back on another device. (Picking English, as this test did
    // before, raced that move: it passed only when the Romanian heading was caught before it,
    // and the second device proved nothing, since English opened there anyway; CI, 25 Nov 2026.)
    const page = await openOnNewDevice(browser, 'teen_17', `/s/${romanianSlug}`);
    await expect(page).toHaveURL(new RegExp(`/s/${englishSlug}$`));
    await expect(page.getByRole('heading', { level: 1, name: 'The kept place' })).toBeVisible();
    await page.getByRole('button', { name: /^Read in:/ }).click();
    await page.getByRole('link', { name: /^Română ·/ }).click();
    await expect(page).toHaveURL(new RegExp(`/s/${romanianSlug}$`));
    await expectKeptInAccount(readerId, 'story_edition');
    await page.context().close();
    // Another device, from the English address: the account's Romanian wins.
    const again = await openOnNewDevice(browser, 'teen_17', `/s/${englishSlug}`);
    await expect(again).toHaveURL(new RegExp(`/s/${romanianSlug}$`));
    await expect(again.getByRole('heading', { level: 1, name: 'Locul păstrat' })).toBeVisible();
    await again.context().close();
  });

  test('a link into the Atlas opens the section the writer had open last', async ({ browser }) => {
    const page = await openOnNewDevice(
      browser,
      'adult_writer',
      `/plan/s/${romanianSlug}/storyline`,
    );
    await expect(page.getByRole('link', { name: 'Storyline' }).first()).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expectKeptInAccount(writerId, 'atlas_section');
    await page.context().close();
    // Another device, from a link outside the Atlas: Storyline again.
    const again = await openOnNewDevice(browser, 'adult_writer', `/plan/s/${romanianSlug}?resume`);
    await expect(again).toHaveURL(new RegExp(`/plan/s/${romanianSlug}/storyline$`));
    // The menu's At a glance still opens At a glance.
    await again.goto(`/plan/s/${romanianSlug}`);
    await expect(again).toHaveURL(new RegExp(`/plan/s/${romanianSlug}$`));
    await again.context().close();
  });

  test('Write puts the caret back where the writer left it', async ({ browser }) => {
    const address = `/write/s/${romanianSlug}/c/pastra01`;
    const page = await openOnNewDevice(browser, 'adult_writer', address);
    // Put the caret at the end of the second line, then leave the text (that keeps it at once).
    // The editor can still be settling its first content when the click lands, which puts the
    // caret back at the start; so the steps are tried again until the kept place is past the
    // first line (positions count from the text's start). The check reads this story's place
    // only: an editor page an earlier spec left open in the same browser can still keep a caret
    // for another story of the same writer, and two rows never read as one 't' (CI, 25 Nov 2026:
    // it failed only in a worker that had run other specs first, never on the retry). It came
    // back on 25 Nov 2026 with one row of this story still 'f', so a failure now also says what
    // the page sent and where its caret was (see describeCaretFailure).
    const sentPlaces = recordSentCaretPlaces(page);
    try {
      await expect(async () => {
        await chapterText(page).getByText('Al doilea rând.').click();
        await page.keyboard.press('End');
        // The editor reads the browser's caret when the browser says the selection changed. If
        // the focus leaves first, the editor drops that change and keeps its old caret, the
        // text's start (CI, 25 Nov 2026: every try sent position 1). A writer's hand is never
        // that quick, so wait until the editor holds the caret before leaving the text.
        await expect.poll(() => editorCaretPosition(page), { timeout: 3000 }).toBeGreaterThan(20);
        await page.getByRole('textbox', { name: 'Chapter title' }).focus();
        await expect
          .poll(
            () =>
              runSql(
                `select (place ->> 'position')::integer > 20 from public.remembered_places
                 where user_id = '${writerId}' and kind = 'write_caret'
                   and item_key = '${romanianSlug}';`,
              ).trim(),
            { timeout: 3000 },
          )
          .toBe('t');
      }).toPass({ timeout: 15000 });
    } catch (error) {
      throw new Error(await describeCaretFailure(page, sentPlaces, error));
    }
    await page.context().close();
    // Another device: the text has the focus, and typing lands at the end.
    const again = await openOnNewDevice(browser, 'adult_writer', address);
    await expect(chapterText(again)).toBeFocused();
    await again.keyboard.type('!');
    await expect(chapterText(again)).toContainText('Al doilea rând.!');
    await again.context().close();
  });
});
