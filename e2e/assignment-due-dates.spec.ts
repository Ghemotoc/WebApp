/**
 * Due dates for class assignments in a real browser (bundle MUST-1, part d; IDEA-20261108-8).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the teacher sets a due date in the thread's "Who has replied" panel, and the thread then shows
 *   "Due <day>" (criterion 1);
 * - a student in the class sees the assignment in the "Assignments" card on the class space page
 *   (criterion 2);
 * - the class space page with the card passes axe at 390, 768 and 1440 px, light and night.
 * The reminder the day before and the late marks are proved in the database test
 * (349-assignment-due-dates), where the clock can be fixed.
 * Test data: the teacher persona starts the class "Clasa a IX-a teme" with one thread; kid_14_ok
 * joins it. The `adults_only` flag is switched off for the student (Playwright runs one worker)
 * and put back afterwards. Removed before and after; the name never ends in "e2e", so spaces.spec
 * leaves it alone.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, screenWidths } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const className = 'Clasa a IX-a teme';
const classSlug = 'clasa-a-ix-a-teme';
const threadTitle = 'Tema de vineri';
const teacherId = '00000000-0000-4000-8000-000000000007';

/** Removes the class with its forum, thread, posts, reminders, members, invites and log. */
function cleanUp() {
  const space = `(select id from public.spaces where slug = '${classSlug}')`;
  const threads = `(select forum_threads.id from public.forum_threads
      join public.forums on forums.id = forum_threads.forum_id where forums.space_id in ${space})`;
  runSql(`delete from public.assignment_reminders where thread_id in ${threads};
    delete from public.notifications where forum_thread_id in ${threads};
    delete from public.forum_posts where thread_id in ${threads};
    delete from public.forum_threads where forum_id in (select id from public.forums where space_id in ${space});
    delete from public.forums where space_id in ${space};
    delete from public.space_moderation_log where space_id in ${space};
    delete from public.invites where space_id in ${space};
    delete from public.space_members where space_id in ${space};
    delete from public.spaces where slug = '${classSlug}';
    delete from public.rate_limit_events where user_id in (select id from public.profiles
      where handle in ('teacher', 'kid_14_ok'));
    update public.profiles set locale = 'ro' where handle in ('teacher', 'kid_14_ok');`);
}

/**
 * Starts the class as the teacher, with one thread, and lets kid_14_ok join it.
 *
 * @returns the thread's address
 */
function startClass(): string {
  // Step 1: the teacher makes the class, its first thread and a code.
  const output =
    runSql(`select set_config('request.jwt.claims', '{"sub": "${teacherId}", "role": "authenticated"}', false);
    select public.create_class_space('${className}', 'Atelier de scris.', 'Fii amabil.');
    select public.start_forum_thread('space-${classSlug}', '${threadTitle}', 'Scrieți o pagină.') ->> 'thread_number';
    select public.make_class_invite('${classSlug}', 30, 10) ->> 'code';`);
  const lines = output.trim().split('\n');
  const code = lines.at(-1) ?? '';
  const threadNumber = lines.at(-2) ?? '';
  // Step 2: the student joins with that code (minors take part in a class, so the age gate is on).
  runSql(`update public.feature_flags set is_enabled = false where key = 'adults_only';
    select set_config('request.jwt.claims', json_build_object('sub',
      (select id from public.profiles where handle = 'kid_14_ok'), 'role', 'authenticated')::text, false);
    select public.join_class_space('${code}');`);
  return `/forums/space-${classSlug}/${threadNumber}`;
}

/** Opens a page as a persona in English, with motion reduced. */
async function openAs(browser: Browser, persona: SignInPersonaName, address: string) {
  const context = await browser.newContext();
  // The profile's language wins over the browser's, so set it first.
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
  return page;
}

/** Five days from today in Romanian time, as the date field writes it ("2026-11-15"). */
function fiveDaysAhead(): string {
  const later = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(later);
}

test.describe('due dates for class assignments (MUST-1d)', () => {
  test.describe.configure({ mode: 'serial' });
  let threadAddress = '';

  test.beforeAll(() => {
    cleanUp();
    threadAddress = startClass();
  });
  test.afterAll(() => {
    cleanUp();
    // Put the March default back: invited adults only.
    runSql(`update public.feature_flags set is_enabled = true where key = 'adults_only';`);
  });

  test('the teacher sets a due date and the thread shows it', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', threadAddress);
    const panel = page.getByRole('region', { name: 'Who has replied' });
    await panel.getByLabel('Due date').fill(fiveDaysAhead());
    await panel.getByRole('button', { name: 'Save date' }).click();
    await expect(panel.getByRole('status')).toHaveText('Saved.');
    // Criterion 1: the thread says when it is due, under its title.
    await expect(page.getByText(/^Due \w+day \d{1,2} \w{3}$/)).toBeVisible();
    await page.context().close();
  });

  test('a student sees it in the class space’s assignments', async ({ browser }) => {
    const page = await openAs(browser, 'kid_14_ok', `/spaces/${classSlug}`);
    // Criterion 2: the card lists the assignment, with a link to it and its day.
    const card = page.getByRole('region', { name: 'Assignments' });
    await expect(card.getByRole('link', { name: threadTitle })).toHaveAttribute(
      'href',
      threadAddress,
    );
    await expect(card).toContainText('Due ');
    await page.context().close();
  });

  // The class space page with the card, at each width, light and night, in English.
  for (const width of screenWidths) {
    for (const theme of ['light', 'night'] as const) {
      test(`axe: the class space with its assignments at ${width} px, ${theme}`, async ({
        browser,
      }) => {
        const context = await browser.newContext();
        await useSessionInBrowser(context, (await signInPersona('kid_14_ok')).session);
        const page = await context.newPage();
        const view = { address: `/spaces/${classSlug}`, width, theme, language: 'en' } as const;
        await checkScreen(page, view, async (opened) => {
          await expect(opened.getByRole('region', { name: 'Assignments' })).toBeVisible();
        });
        await context.close();
      });
    }
  }
});
