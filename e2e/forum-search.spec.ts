/**
 * Forum search in a real browser (bundle FORUMS-1, part f; story S1-E8-10; board 5.1's search
 * field).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the search field on the forum index opens the results page; a thread whose title matches
 *   comes first, posts with the words follow, and each result opens at its post (criterion 1);
 * - search works without diacritics ("povesti" finds "Poveștile");
 * - the forum and author filters narrow the results and stay in the address;
 * - a post by someone who blocks the reader is not found (criterion 2);
 * - the results page passes axe at 390, 768 and 1440 px, light and night, ro and en, with no
 *   doodle drawn.
 * Test data: two threads this spec writes to the database, removed before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The threads; the ending marks their rows for clean-up. */
const dragonTitle = 'Poveștile cu dragoni e2e search';
const mapTitle = 'Hărți pentru lumi noi e2e search';
/** adult_writer, teacher and blocker (who blocks blocked). */
const writerId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';
const blockerId = '00000000-0000-4000-8000-000000000015';

/** Removes this spec's threads and puts the personas back in Romanian. */
function cleanUp() {
  runSql(`delete from public.forum_threads where title like '%e2e search';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'blocked');`);
}

/**
 * Writes one thread in a forum with its posts in order.
 *
 * @param forumSlug - the forum
 * @param title - the thread's title
 * @param posts - each post's author and words, #1 first
 */
function addThread(forumSlug: string, title: string, posts: [string, string][]) {
  const values = posts
    .map(([author, words], index) => `('${author}', ${index + 1}, '${words}')`)
    .join(', ');
  runSql(`with thread as (
      insert into public.forum_threads (user_id, forum_id, title, last_post_number)
      select '${posts[0]?.[0] ?? writerId}', forums.id, '${title}', ${posts.length}
      from public.forums where slug = '${forumSlug}' returning id)
    insert into public.forum_posts (user_id, thread_id, post_number, body)
    select written.author::uuid, thread.id, written.number, written.words
    from thread, (values ${values}) as written (author, number, words);`);
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

/** The results' titles with their kind, top to bottom, keeping only this spec's threads. */
async function resultsShown(page: Page): Promise<string[]> {
  const list = page.getByRole('region', { name: 'Results' }).getByRole('listitem');
  await expect(list.first()).toBeVisible();
  const rows = await list.allInnerTexts();
  return rows
    .filter((row) => row.includes('e2e search'))
    .map((row) => row.split('\n').slice(0, 2).join(' '));
}

test.describe('forum search (FORUMS-1f, S1-E8-10)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    addThread('first-chapters', dragonTitle, [
      [writerId, 'Cum încep o poveste fără prolog?'],
      [teacherId, 'Eu încep cu un dragon care strănută.'],
      [blockerId, 'Și eu scriu despre dragoni, dar cu hărți.'],
    ]);
    addThread('worldbuilding', mapTitle, [[teacherId, 'Desenez harta, cu dragoni pe margini.']]);
  });
  test.afterAll(cleanUp);

  test('the index search finds threads and posts, thread titles first', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/forums');
    await page.getByRole('searchbox', { name: 'Search forum threads and posts' }).fill('dragoni');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/\/forums\/search\?q=dragoni$/);
    const shown = await resultsShown(page);
    expect(shown[0]).toBe(`Thread ${dragonTitle}`);
    expect(shown).toContain(`Post #3 ${dragonTitle}`);
    expect(shown).toContain(`Post #1 ${mapTitle}`);
    // A result opens the thread at its post.
    await page
      .getByRole('listitem')
      .filter({ hasText: 'Post #3' })
      .getByRole('link', { name: dragonTitle })
      .click();
    await expect(page.locator('#post-3')).toBeFocused();
    await page.context().close();
  });

  test('without diacritics, and with the forum and author filters', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/forums/search?q=povesti');
    await expect.poll(() => resultsShown(page)).toEqual([`Thread ${dragonTitle}`]);
    await page.goto('/forums/search?q=dragoni');
    await page.getByLabel('Forum', { exact: true }).selectOption('worldbuilding');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/forum=worldbuilding/);
    await expect.poll(() => resultsShown(page)).toEqual([`Post #1 ${mapTitle}`]);
    await page.getByLabel('Forum', { exact: true }).selectOption('');
    await page.getByLabel('Author', { exact: true }).fill('@teacher');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/author=%40teacher/);
    await expect
      .poll(async () => (await resultsShown(page)).sort())
      .toEqual([`Post #1 ${mapTitle}`, `Post #2 ${dragonTitle}`].sort());
    await page.context().close();
  });

  test('a post by someone who blocks the reader is not found', async ({ browser }) => {
    const page = await openAs(browser, 'blocked', '/forums/search?q=h%C4%83r%C8%9Bi');
    const shown = await resultsShown(page);
    expect(shown).not.toContain(`Post #3 ${dragonTitle}`);
    // The other thread's title has the word, so it is found as a thread.
    expect(shown).toContain(`Thread ${mapTitle}`);
    await page.context().close();
  });

  test('a term that finds nothing says so', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/forums/search?q=zzqqxx');
    await expect(page.getByText('Nothing found for “zzqqxx”.', { exact: false })).toBeVisible();
    await page.context().close();
  });

  test('axe: the results page, every view', async ({ page }) => {
    test.setTimeout(180_000);
    for (const view of everyView(['/forums/search?q=dragoni'])) {
      await checkScreen(page, view);
      await expectNoDoodles(page);
    }
  });
});
