/**
 * A teacher's class tools in a real browser (bundle CLASSES, part b; story S1-E8-11).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a teacher with the badge picks "Class space" on the new space form, gets the class form
 *   (name, grade, school; board G07, BOOKS-8b), which names what is missing, and lands in a
 *   private class with its first code; "How a class space starts" is in the class settings
 *   (criterion 1);
 * - a student types the teacher's code on Forums › Join a class and is shown the class
 *   (criterion 5);
 * - the teacher sees who is waiting to read and why, never their age (criterion 5);
 * - the class has a lock date at the end of the school year; "Lock the space now" stops posting
 *   for everyone while members still read, and "Unlock the space" brings posting back;
 * - the new space form, the code form, the class settings and a locked class pass axe at 390, 768
 *   and 1440 px, light and night, ro and en, and no doodle is drawn; the class form keeps to the
 *   look rules by day and at night (board G07).
 * Test data: the teacher persona (with the Teacher badge) makes the class in the browser.
 * pending_check is the student who can read (an invited adult is active while adults_only is on);
 * kid_14_waiting is the one who waits. Codes come from make_class_invite() as the teacher. The
 * class is removed before and after; its name never ends in "e2e", so spaces.spec leaves it alone.
 */
import { type Browser, type Page } from '@playwright/test';
import { expect, test } from './support/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectLookRulesByDayAndNight } from './support/lookCheck';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The class this spec starts. */
const className = 'Clasa a IX-a C test';
const classSlug = 'clasa-a-ix-a-c-test';
const classAddress = `/spaces/${classSlug}`;
/** The teacher persona's user ID, to make codes as the teacher. */
const teacherId = '00000000-0000-4000-8000-000000000007';

/** Removes the class with its forum, threads, members, invites and log. */
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
 * Makes a class code as the teacher.
 *
 * @returns the code, shown this once
 */
function makeCode(): string {
  const output =
    runSql(`select set_config('request.jwt.claims', '{"sub": "${teacherId}", "role": "authenticated"}', false);
    select public.make_class_invite('${classSlug}', 30, 40) ->> 'code';`);
  // psql prints the set_config() value first, then the code on the last line.
  const lines = output.trim().split('\n');
  return lines.at(-1) ?? '';
}

/** Opens a page as a persona (or a visitor) in English, with motion reduced. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    // The profile's language wins over the browser's, so set it first.
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
  return page;
}

test.describe('class tools (CLASSES-b, S1-E8-11)', () => {
  test.describe.configure({ mode: 'serial' });
  /** A working code, kept for the students' tests. */
  let code = '';

  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('a teacher starts a class space from the new space form', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/spaces/new');
    // Picking "Class space" opens the class form in its place (board G07).
    await page.getByRole('radio', { name: 'Class space' }).click();
    await expect(page).toHaveURL(/\/spaces\/new\?kind=class$/);
    await expect(page.getByRole('heading', { name: 'Create a class space' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Who can post' })).toHaveCount(0);
    // "Create the class" stays pressable and names what is missing, focusing it (DoD).
    await page.getByRole('button', { name: 'Create the class' }).click();
    await expect(page.getByText('Give the class a name.')).toBeVisible();
    await expect(page.getByLabel('Class name')).toBeFocused();
    await page.getByLabel('Class name').fill(className);
    await page.getByRole('button', { name: 'Create the class' }).click();
    await expect(page.getByText('Choose the class’s grade.')).toBeVisible();
    await page.getByRole('combobox', { name: 'Grade' }).selectOption('9');
    await page.getByLabel('School', { exact: true }).fill('Liceul Teoretic Ploiești');
    await page.getByLabel('Description').fill('Cercul de lectură al clasei.');
    await page.getByRole('button', { name: 'Create the class' }).click();
    await expect(page).toHaveURL(new RegExp(`${classAddress}$`));
    await expect(page.getByRole('heading', { level: 1, name: className })).toBeVisible();
    // The class's first code is shown straight away, and the facts say the grade (board G08).
    await expect(page.getByText('The class is ready. Share its code')).toBeVisible();
    await expect(page.getByText('grade 9')).toBeVisible();
    await page.goto(`${classAddress}/settings`);
    await expect(page.getByRole('heading', { name: 'How a class space starts' })).toBeVisible();
    // The lock moment (the start of 1 July, Romanian time) shows on the browser's own clock, with
    // its time (CALM-7d), so the day depends on where the browser is.
    await expect(page.getByText(/It locks on .+ \d{4} at \d{2}:\d{2}\./).first()).toBeVisible();
    await page.context().close();
    code = makeCode();
  });

  test('the class form keeps to the look rules by day and at night (board G07)', async ({
    browser,
  }) => {
    await expectLookRulesByDayAndNight(browser, 'teacher', '/spaces/new?kind=class', (page) =>
      expect(page.getByRole('heading', { name: 'What the grade changes' })).toBeVisible(),
    );
  });

  test('a student types the code on Join a class', async ({ browser }) => {
    const page = await openAs(browser, 'pending_check', '/forums');
    await page.getByRole('link', { name: 'Join a class' }).click();
    await expect(page).toHaveURL(/\/class$/);
    await page.getByRole('button', { name: 'Find the class' }).click();
    await expect(page.getByText('Type the code from the teacher.')).toBeVisible();
    // A code no class has is said under the field, and the page stays put (user story 8.1).
    await page.getByLabel('Class code').fill('ZZZZ-ZZZZ-ZZZZ');
    await page.getByRole('button', { name: 'Find the class' }).click();
    await expect(
      page.getByText('No class has this code. Check it with the teacher.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/class$/);
    await expect(page.getByLabel('Class code')).toHaveValue('ZZZZ-ZZZZ-ZZZZ');
    await page.getByLabel('Class code').fill(` ${code.toLowerCase()} `);
    await page.getByRole('button', { name: 'Find the class' }).click();
    await expect(page.getByRole('heading', { level: 1, name: className })).toBeVisible();
    await page.getByRole('button', { name: 'Join the class' }).click();
    await expect(page).toHaveURL(new RegExp(`${classAddress}$`));
    await page.context().close();
  });

  test('a teacher on Join a class is led to a new class space', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', '/class');
    const createLink = page.getByRole('link', { name: 'Create a class space' });
    // Wait for the badge check: until it answers, the same words link to the Teacher badge in
    // Settings (ClassJoinTeacherLine), so a click before then goes there instead.
    await expect(createLink).toHaveAttribute('href', '/spaces/new?kind=class');
    await createLink.click();
    await expect(page).toHaveURL(/\/spaces\/new\?kind=class$/);
    await expect(page.getByRole('heading', { name: 'Create a class space' })).toBeVisible();
    await page.context().close();
  });

  test('the teacher sees who is waiting and why', async ({ browser }) => {
    const student = await openAs(browser, 'kid_14_waiting', `/class/${code}`);
    await student.getByRole('button', { name: 'Join the class' }).click();
    await expect(
      student.getByText('You’re in. You can read the class once a parent or guardian says yes.'),
    ).toBeVisible();
    await student.context().close();

    const page = await openAs(browser, 'teacher', `${classAddress}/settings`);
    const card = page.getByRole('region', { name: 'Waiting to join' });
    await expect(card.getByText('@kid_14_waiting')).toBeVisible();
    // While the March test is adults-only (the adults_only flag), an under-18 waits for the account
    // itself; database test 233 covers the parent's consent reason with the flag off.
    await expect(card.getByText('Account not ready yet')).toBeVisible();
    // Only those who can't read yet are listed.
    await expect(card.getByText('@pending_check')).toHaveCount(0);
    await page.context().close();
  });

  test('the teacher locks the class, posting stops, and unlocking brings it back', async ({
    browser,
  }) => {
    const teacher = await openAs(browser, 'teacher', `${classAddress}/settings`);
    const card = teacher.getByRole('region', { name: 'When the class locks' });
    // A new class locks at the start of 1 July, Romanian time (UTC+3 in summer). The form shows
    // that moment on the browser's own clock (CALM-7d), so read the two boxes back as a moment.
    await expect(card.getByLabel('Lock date')).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
    const typedDate = await card.getByLabel('Lock date').inputValue();
    const typedTime = await card.getByLabel('Lock time').inputValue();
    const lockMoment = await teacher.evaluate(
      ([date, time]) => new Date(`${date}T${time}`).toISOString(),
      [typedDate, typedTime],
    );
    expect(lockMoment).toMatch(/^\d{4}-06-30T21:00:00\.000Z$/);
    await card.getByRole('button', { name: 'Lock the space now' }).click();
    await expect(card.getByText('The space is locked.', { exact: false })).toBeVisible();

    const student = await openAs(browser, 'pending_check', classAddress);
    await expect(student.getByText('This space is locked.', { exact: false })).toBeVisible();
    await expect(student.getByText('Locked', { exact: true })).toBeVisible();
    await expect(student.getByRole('link', { name: 'New thread' })).toHaveCount(0);
    // The code stops working while the class is locked.
    await student.goto(`/class/${code}`);
    await expect(
      student.getByText('This code doesn’t work any more.', { exact: false }),
    ).toBeVisible();

    await card.getByRole('button', { name: 'Unlock the space' }).click();
    await expect(card.getByText('The space has no lock date.')).toBeVisible();
    await student.goto(classAddress);
    await expect(student.getByRole('heading', { level: 1, name: className })).toBeVisible();
    await expect(student.getByText('This space is locked.', { exact: false })).toHaveCount(0);
    await expect(student.getByRole('link', { name: 'New thread' })).toBeVisible();
    await student.context().close();
    await teacher.context().close();
  });

  test('axe: the class form, the code form and the class settings, every view', async ({
    browser,
  }) => {
    test.setTimeout(400_000);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('teacher')).session);
    const page = await context.newPage();
    const addresses = ['/spaces/new', '/class', `${classAddress}/settings`];
    for (const view of everyView(addresses)) {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'teacher';`);
      await checkScreen(page, view);
      await expectNoDoodles(page);
    }
    await context.close();
  });

  test('axe: a locked class, every view', async ({ browser }) => {
    test.setTimeout(300_000);
    runSql(
      `update public.spaces set locks_at = now() - interval '1 minute' where slug = '${classSlug}';`,
    );
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('pending_check')).session);
    const page = await context.newPage();
    for (const view of everyView([classAddress])) {
      runSql(
        `update public.profiles set locale = '${view.language}' where handle = 'pending_check';`,
      );
      await checkScreen(page, view);
      await expectNoDoodles(page);
    }
    await context.close();
  });
});
