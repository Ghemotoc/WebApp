/**
 * Private class spaces and their invite codes in a real browser (bundle CLASSES, part a; story
 * S1-E8-11).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the teacher makes an invite code with a period and a number of places from the class's
 *   settings, sees it once with its link, and the card then shows how many places are used
 *   (criterion 4);
 * - a student opens the link, sees which class it is for, joins and lands in the class with its
 *   threads (criterion 5);
 * - a student whose account isn't ready yet joins but is told they will read once it is
 *   (criterion 5);
 * - another adult never finds the class: its address says it isn't here (criterion 3);
 * - a used-up code and a stopped code say so on the join page (criterion 4);
 * - the settings with the invite card and the join page pass axe at 390, 768 and 1440 px, light
 *   and night, ro and en, and no doodle touches text or a control.
 * Test data: the teacher persona (with the Teacher badge) starts the class through
 * create_class_space(), as the class option (part b) will. pending_check is the student who can
 * read (an invited adult is active while adults_only is on); kid_14_waiting is the one who waits.
 * The class is removed before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodleOverlap } from './support/doodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The class this spec starts; its name never ends in "e2e", so spaces.spec leaves it alone. */
const className = 'Clasa a VII-a B test';
const classSlug = 'clasa-a-vii-a-b-test';
const classAddress = `/spaces/${classSlug}`;
/** The teacher persona's user ID, for create_class_space(). */
const teacherId = '00000000-0000-4000-8000-000000000007';

/** Removes the class with its forum, threads, members, invites and log. */
function cleanUp() {
  runSql(`delete from public.forum_threads where forum_id in
      (select forums.id from public.forums join public.spaces on spaces.id = forums.space_id
       where spaces.slug = '${classSlug}');
    delete from public.forums where space_id in (select id from public.spaces where slug = '${classSlug}');
    delete from public.space_moderation_log where space_id in (select id from public.spaces where slug = '${classSlug}');
    delete from public.invites where space_id in (select id from public.spaces where slug = '${classSlug}');
    delete from public.space_members where space_id in (select id from public.spaces where slug = '${classSlug}');
    delete from public.spaces where slug = '${classSlug}';
    delete from public.rate_limit_events where user_id in (select id from public.profiles
      where handle in ('teacher', 'pending_check', 'kid_14_waiting'));
    update public.profiles set locale = 'ro' where handle in ('teacher', 'pending_check', 'kid_14_waiting', 'adult_writer');`);
}

/** Starts the class as the teacher, with one thread for the students to read. */
function startClass() {
  runSql(`select set_config('request.jwt.claims', '{"sub": "${teacherId}", "role": "authenticated"}', false);
    select public.create_class_space('${className}', 'Cercul de lectură al clasei.', 'Fii amabil.');
    select public.start_forum_thread('space-${classSlug}', 'Tema de vineri', 'Citiți primul capitol.');`);
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

test.describe('class spaces (CLASSES-a, S1-E8-11)', () => {
  test.describe.configure({ mode: 'serial' });
  /** The joining link the teacher made, kept for the students' tests. */
  let inviteLink = '';

  test.beforeAll(() => {
    cleanUp();
    startClass();
  });
  test.afterAll(cleanUp);

  test('the teacher makes a code and sees it once, with its link', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', `${classAddress}/settings`);
    const card = page.getByRole('region', { name: 'Invite your class' });
    await expect(card.getByText('There is no working code.', { exact: false })).toBeVisible();
    await card.getByLabel('Works for').selectOption('14');
    await card.getByLabel('Number of places').fill('2');
    await card.getByRole('button', { name: 'Make a code' }).click();
    await expect(
      card.getByText(`Here is the code for ${className}.`, { exact: false }),
    ).toBeVisible();
    inviteLink = await card.getByLabel('Joining link').inputValue();
    expect(inviteLink).toMatch(/\/class\/[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    await expect(card.getByText('0 of 2 places used.', { exact: false })).toBeVisible();
    // The settings form shows the class note in place of the choices about posting and joining.
    await expect(page.getByRole('heading', { name: 'A class space' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Who can post' })).toHaveCount(0);
    await page.context().close();
  });

  test('another adult never finds the class', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', classAddress);
    await expect(page.getByText(className)).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).not.toHaveText(className);
    await page.context().close();
  });

  test('a student joins with the link and reads the class', async ({ browser }) => {
    const page = await openAs(browser, 'pending_check', new URL(inviteLink).pathname);
    await expect(page.getByText(`You’re invited to join ${className}.`)).toBeVisible();
    await page.getByRole('button', { name: 'Join the class' }).click();
    await expect(page).toHaveURL(new RegExp(`${classAddress}$`));
    await expect(page.getByRole('heading', { level: 1, name: className })).toBeVisible();
    await expect(page.getByText('Class space', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tema de vineri' })).toBeVisible();
    await page.context().close();
  });

  test('a student whose account isn’t ready joins and is told why they wait', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'kid_14_waiting', new URL(inviteLink).pathname);
    await page.getByRole('button', { name: 'Join the class' }).click();
    await expect(page.getByText(`You’re in ${className}.`, { exact: false })).toBeVisible();
    await page.goto(classAddress);
    await expect(page.getByText('You’re in this class.', { exact: false })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tema de vineri' })).toHaveCount(0);
    await page.context().close();
  });

  test('a used-up code and a stopped code say so', async ({ browser }) => {
    // Both places are taken, so the first code no longer works.
    const visitor = await openAs(browser, null, new URL(inviteLink).pathname);
    await expect(
      visitor.getByText('This code doesn’t work any more.', { exact: false }),
    ).toBeVisible();
    await visitor.context().close();

    const teacher = await openAs(browser, 'teacher', `${classAddress}/settings`);
    const card = teacher.getByRole('region', { name: 'Invite your class' });
    await expect(card.getByText('There is no working code.', { exact: false })).toBeVisible();
    await card.getByRole('button', { name: 'Make a code' }).click();
    const secondLink = await card.getByLabel('Joining link').inputValue();
    await card.getByRole('button', { name: 'Stop the code' }).click();
    await expect(card.getByText('There is no working code.', { exact: false })).toBeVisible();
    await teacher.goto(new URL(secondLink).pathname);
    await expect(
      teacher.getByText('This code doesn’t work any more.', { exact: false }),
    ).toBeVisible();
    await teacher.context().close();
  });

  test('axe: the settings with the invite card and the join page, every view', async ({
    browser,
  }) => {
    // 24 views of two pages in one signed-in browser take longer than one test's usual 30 s.
    test.setTimeout(300_000);
    const context = await browser.newContext();
    await useSessionInBrowser(context, (await signInPersona('teacher')).session);
    const page = await context.newPage();
    const addresses = [`${classAddress}/settings`, new URL(inviteLink).pathname];
    for (const view of everyView(addresses)) {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'teacher';`);
      await checkScreen(page, view);
      await expectNoDoodleOverlap(page);
    }
    await context.close();
  });
});
