/**
 * The class invite sheet and "Who has replied" in a real browser (bundle 14d IDEAS-3, part b;
 * ideas IDEA-20261102-3 and IDEA-20261102-5).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a new class code shows a QR code of its joining link, and printing the page prints only the
 *   sheet: the class's name, the code, the QR code, the link and the date it stops working
 *   (idea 3, criterion 1);
 * - the QR code holds exactly the joining link, which opens "Join a class" for that code
 *   (idea 3, criterion 2);
 * - the teacher opens "Who has replied" beside a class thread and sees who has posted and who
 *   hasn't (idea 5, criterion 1); a student in the class sees no such panel (criterion 2);
 * - the thread page with the panel passes axe at 390, 768 and 1440 px, light and night, ro and en.
 * Test data: the teacher persona starts the class "Clasa a X-a B test" with one thread;
 * pending_check joins and replies, kid_14_waiting joins and doesn't. Removed before and after; the
 * name never ends in "e2e", so spaces.spec leaves it alone.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { qrModulesFor, qrPathFor } from '../src/features/spaces/lib/qrModules';
import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const className = 'Clasa a X-a B test';
const classSlug = 'clasa-a-x-a-b-test';
const teacherId = '00000000-0000-4000-8000-000000000007';

/** Removes the class with its forum, threads, posts, members, invites and log. */
function cleanUp() {
  const space = `(select id from public.spaces where slug = '${classSlug}')`;
  runSql(`delete from public.forum_posts where thread_id in (select forum_threads.id
      from public.forum_threads join public.forums on forums.id = forum_threads.forum_id
      where forums.space_id in ${space});
    delete from public.forum_threads where forum_id in (select id from public.forums where space_id in ${space});
    delete from public.forums where space_id in ${space};
    delete from public.space_moderation_log where space_id in ${space};
    delete from public.invites where space_id in ${space};
    delete from public.space_members where space_id in ${space};
    delete from public.spaces where slug = '${classSlug}';
    delete from public.rate_limit_events where user_id in (select id from public.profiles
      where handle in ('teacher', 'pending_check', 'kid_14_waiting'));
    update public.profiles set locale = 'ro' where handle in ('teacher', 'pending_check', 'kid_14_waiting');`);
}

/**
 * Starts the class as the teacher, with one thread.
 *
 * @returns the thread's address
 */
function startClass(): string {
  const output =
    runSql(`select set_config('request.jwt.claims', '{"sub": "${teacherId}", "role": "authenticated"}', false);
    select public.create_class_space('${className}', 'Atelier de scris.', 'Fii amabil.');
    select public.start_forum_thread('space-${classSlug}', 'Tema de luni', 'Scrieți o pagină.') ->> 'thread_number';`);
  return `/forums/space-${classSlug}/${output.trim().split('\n').at(-1) ?? ''}`;
}

/**
 * Joins the class as a student with the teacher's code, and replies to the thread if asked.
 *
 * @param handle - the student's username
 * @param code - the class code
 * @param threadAddress - the thread to reply to, or null to stay quiet
 */
function joinAs(handle: string, code: string, threadAddress: string | null) {
  const reply =
    threadAddress === null
      ? ''
      : `select public.reply_to_forum_thread(${threadAddress.split('/').at(-1) ?? '0'}, 'Am scris pagina.');`;
  runSql(`select set_config('request.jwt.claims', json_build_object('sub',
      (select id from public.profiles where handle = '${handle}'), 'role', 'authenticated')::text, false);
    select public.join_class_space('${code}');
    ${reply}`);
}

/** Opens a page as a persona in English, with motion reduced. */
async function openAs(browser: Browser, persona: SignInPersonaName, address: string) {
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

/**
 * Makes a code from the class settings, as the teacher would.
 *
 * @param page - the teacher's settings page
 * @returns the code and its joining link, as shown
 */
async function makeCode(page: Page) {
  const card = page.getByRole('region', { name: 'Invite your class' });
  await card.getByRole('button', { name: 'Make a code' }).click();
  const link = await card.getByLabel('Joining link').inputValue();
  return { card, link, code: link.split('/').at(-1) ?? '' };
}

test.describe('class invite sheet and who has replied (IDEAS-3b)', () => {
  test.describe.configure({ mode: 'serial' });
  let threadAddress = '';
  let code = '';

  test.beforeAll(() => {
    cleanUp();
    threadAddress = startClass();
  });
  test.afterAll(cleanUp);

  test('a new code has a QR code, and printing gives only the sheet', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', `/spaces/${classSlug}/settings`);
    const made = await makeCode(page);
    code = made.code;
    // Criterion 2: the QR code holds exactly the joining link (drawn in the browser).
    const drawn = made.card.getByRole('img', { name: 'QR code to join the class' });
    await expect(drawn).toBeVisible();
    await expect(drawn.locator('path')).toHaveAttribute('d', qrPathFor(qrModulesFor(made.link), 4));
    // On screen the sheet stays out of the way.
    const sheet = page.getByTestId('class-invite-sheet');
    await expect(sheet).toBeHidden();
    // Criterion 1: printing shows only the sheet, with everything a student needs.
    await page.emulateMedia({ media: 'print' });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText(className);
    await expect(sheet).toContainText(code);
    await expect(sheet).toContainText(made.link);
    await expect(sheet).toContainText('This code works until');
    await expect(sheet.getByTestId('class-invite-qr')).toBeVisible();
    await expect(made.card.getByRole('button', { name: 'Make a code' })).toBeHidden();
    await page.context().close();
  });

  test('the link in the QR code opens Join a class for that code', async ({ browser }) => {
    const page = await openAs(browser, 'pending_check', `/class/${code}`);
    await expect(page.getByRole('heading', { level: 1, name: className })).toBeVisible();
    await page.context().close();
    joinAs('pending_check', code, threadAddress);
    joinAs('kid_14_waiting', code, null);
  });

  test('the teacher sees who has replied and who hasn’t', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', threadAddress);
    const panel = page.getByRole('region', { name: 'Who has replied' });
    await expect(panel.getByText('1 of 2 in the class have posted here.')).toBeVisible();
    await panel.getByRole('button', { name: 'Show who has replied' }).click();
    await expect(panel.getByRole('list', { name: 'Replied (1)' })).toContainText('@pending_check');
    await expect(panel.getByRole('list', { name: 'Not yet (1)' })).toContainText('@kid_14_waiting');
    await page.context().close();
  });

  test('a student in the class sees no such panel', async ({ browser }) => {
    const page = await openAs(browser, 'pending_check', threadAddress);
    await expect(page.getByRole('heading', { level: 1, name: 'Tema de luni' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Who has replied' })).toHaveCount(0);
    await page.context().close();
  });

  // The thread's number is known only once the class is made, so each view's address is set then.
  for (const view of everyView(['/forums'])) {
    test(`axe: the class thread with the panel at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      // The account's language wins over the browser's, so the view's language goes on it too.
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'teacher';`);
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('teacher')).session);
      const page = await context.newPage();
      await checkScreen(page, { ...view, address: threadAddress }, async (opened) => {
        await opened.getByRole('button', { name: /who has replied|cine a răspuns/i }).click();
      });
      await context.close();
    });
  }
});
