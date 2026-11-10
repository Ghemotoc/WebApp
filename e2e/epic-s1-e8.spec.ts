/**
 * Epic check for S1-E8, forums and spaces (story S1-E8-QA; bundle CLASSES, part f).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * It adds no feature: it walks the epic's main journeys across its stories, in a real browser, as
 * the March test runs them (adults_only on, so an under-18 reads but can't post yet).
 * - Journey 1 (S1-E8-02 × S1-E8-03 × S1-E8-04, with the account gate): adult_writer starts a
 *   thread; teacher quotes it and replies; kid_14_ok reads both posts and the quote but is told
 *   their account can't post yet; teen_17 finds the thread under "New for you".
 * - Journey 2 (S1-E8-11 × S1-E8-02 × S1-E8-12, with notifications): the teacher's class has a
 *   thread; a student who joined with the code reads it and replies; kid_14_waiting, waiting for a
 *   parent, doesn't see it; adult_writer, not in the class, never finds the class; the teacher
 *   signs the student's certificate and the notification leads to My certificates.
 * The axe runs for every screen of the epic (390, 768 and 1440 px, light and night, ro and en)
 * live in each story's own spec (forum-*.spec.ts, space*.spec.ts, class-*.spec.ts,
 * certificates.spec.ts); the database journeys and every age are in
 * supabase/tests/database/237-epic-s1-e8.test.sql.
 * Test data: one thread and one class, removed before and after; pending_check is the student who
 * can post (an invited adult is fully active while adults_only is on).
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The forum thread journey 1 starts. */
const threadTitle = 'Where does chapter one begin, epic e8';
/** The class journey 2 uses; its name never ends in "e2e", so spaces.spec leaves it alone. */
const className = 'Clasa epic opt';
const classSlug = 'clasa-epic-opt';
const classThread = 'Tema de luni';
const programme = 'Reading circle 2027';
/** The personas' user IDs, to act as them in SQL. */
const teacherId = '00000000-0000-4000-8000-000000000007';
const studentId = '00000000-0000-4000-8000-000000000005';
const waitingId = '00000000-0000-4000-8000-000000000004';

/**
 * Runs SQL as one persona, signed in.
 *
 * @param userId - whose session
 * @param statements - what to run
 * @returns the last line psql prints
 */
function runAs(userId: string, statements: string): string {
  const output = runSql(`select set_config('role', 'authenticated', false),
      set_config('request.jwt.claims', '{"sub": "${userId}", "role": "authenticated"}', false);
    ${statements}`);
  return output.trim().split('\n').at(-1) ?? '';
}

/** Removes the thread, the class and everything in them, and puts the personas back in Romanian. */
function cleanUp() {
  const space = `(select id from public.spaces where slug = '${classSlug}')`;
  // Deleting a certificate keeps its code as retired, so the codes are read before the delete.
  runSql(`delete from public.forum_threads where title = '${threadTitle}';
    do $$
    declare gone_codes text[];
    begin
      select array_agg(code) into gone_codes from public.certificates where space_id in ${space};
      delete from public.certificates where space_id in ${space};
      delete from public.retired_certificate_codes where code = any (gone_codes);
    end $$;
    delete from public.notifications where kind = 'certificate_issued' and user_id = '${studentId}';
    delete from public.forum_threads where forum_id in (select id from public.forums where space_id in ${space});
    delete from public.forums where space_id in ${space};
    delete from public.space_moderation_log where space_id in ${space};
    delete from public.invites where space_id in ${space};
    delete from public.space_members where space_id in ${space};
    delete from public.spaces where slug = '${classSlug}';
    update public.profiles set locale = 'ro'
    where handle in ('adult_writer', 'teacher', 'kid_14_ok', 'teen_17', 'pending_check', 'kid_14_waiting');`);
}

/** The teacher's class with a thread, the student and kid_14_waiting joined with its code. */
function startClass() {
  runAs(teacherId, `select public.create_class_space('${className}', 'Cercul de lectură.');`);
  runAs(
    teacherId,
    `select public.start_forum_thread('space-${classSlug}', '${classThread}', 'Citiți primul capitol.');`,
  );
  const code = runAs(
    teacherId,
    `select public.make_class_invite('${classSlug}', 30, 10) ->> 'code';`,
  );
  runAs(studentId, `select public.join_class_space('${code}');`);
  runAs(waitingId, `select public.join_class_space('${code}');`);
}

/** Opens a page in English as a persona, with motion reduced. */
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

/** The address of journey 1's thread, read from the database. */
function threadAddress(): string {
  const number = runSql(
    `select thread_number from public.forum_threads where title = '${threadTitle}' and deleted_at is null;`,
  ).trim();
  return `/forums/first-chapters/${number}`;
}

test.describe('epic check: forums and spaces (S1-E8-QA)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    startClass();
  });
  test.afterAll(cleanUp);

  test('journey 1: a thread, a quote, an under-16 who reads, New for you', async ({ browser }) => {
    const writer = await openAs(browser, 'adult_writer', '/forums/first-chapters/new');
    await writer.getByLabel('Title').fill(threadTitle);
    await writer.getByLabel('Post').fill('I open on the **weather**, every time.');
    await writer.getByRole('button', { name: 'Post the thread' }).click();
    await expect(writer.getByRole('heading', { level: 1, name: threadTitle })).toBeVisible();
    await writer.context().close();

    const teacher = await openAs(browser, 'teacher', threadAddress());
    await teacher.locator('#post-1').getByRole('button', { name: 'Quote post 1' }).click();
    await teacher.getByRole('textbox', { name: 'Reply' }).fill('Try a voice instead.');
    await teacher.getByRole('button', { name: 'Post reply' }).click();
    await expect(
      teacher.locator('#post-2 blockquote').getByRole('link', { name: '#1' }),
    ).toBeVisible();
    await teacher.context().close();

    // While the March test is adults-only, an under-18 reads everything but can't post yet.
    const kid = await openAs(browser, 'kid_14_ok', threadAddress());
    await expect(kid.locator('#post-2').getByText('Try a voice instead.')).toBeVisible();
    await expect(kid.locator('#post-2 blockquote').getByText('weather')).toBeVisible();
    await expect(kid.getByText('This account can’t post yet.')).toBeVisible();
    await expect(kid.getByRole('textbox', { name: 'Reply' })).toHaveCount(0);
    await kid.context().close();

    const teen = await openAs(browser, 'teen_17', '/forums');
    const newForYou = teen.getByRole('region', { name: 'New for you' });
    await expect(newForYou.getByRole('link', { name: new RegExp(threadTitle) })).toBeVisible();
    await teen.context().close();
  });

  test('journey 2: a class, its thread and a certificate', async ({ browser }) => {
    const student = await openAs(browser, 'pending_check', `/spaces/${classSlug}`);
    await expect(student.getByRole('heading', { level: 1, name: className })).toBeVisible();
    await student.getByRole('link', { name: classThread }).click();
    await student.getByRole('textbox', { name: 'Reply' }).fill('Am citit capitolul.');
    await student.getByRole('button', { name: 'Post reply' }).click();
    await expect(student.locator('#post-2').getByText('Am citit capitolul.')).toBeVisible();

    const waiting = await openAs(browser, 'kid_14_waiting', `/spaces/${classSlug}`);
    await expect(waiting.getByText('You’re in this class.', { exact: false })).toBeVisible();
    await expect(waiting.getByRole('link', { name: classThread })).toHaveCount(0);
    await waiting.context().close();

    const outsider = await openAs(browser, 'adult_writer', `/spaces/${classSlug}`);
    await expect(outsider.getByText(className)).toHaveCount(0);
    await outsider.context().close();

    runAs(
      teacherId,
      `select public.issue_class_certificates('${classSlug}', '${programme}',
        '[{"handle": "pending_check", "result": "participant"}]');`,
    );
    await student.goto('/notifications');
    await student.getByRole('link', { name: 'Open certificates' }).first().click();
    await expect(student.getByRole('link', { name: `Open “${programme}”` })).toBeVisible();
    await student.context().close();
  });
});
