/**
 * The class link stands in for the platform invitation, in a real browser (bundle 14d IDEAS-3,
 * part c; idea IDEA-20261102-4).
 *
 * Who runs it: `npm run test:e2e` (Supabase with Mailpit started first; invite_only is on, as in
 * the March test).
 * What it proves:
 * - a signed-out student opens the class link, picks "Create an account with this code", signs up
 *   with no other invitation and is a member of the class when the account is made (criterion 1);
 * - once the code's places are used up, the same link no longer opens sign-up: the page asks for a
 *   normal invitation instead (criterion 2);
 * - the signed-out "Join a class" page passes axe at 390, 768 and 1440 px, light and night, ro
 *   and en.
 * Test data: the teacher persona's class "Clasa a XII-a link test" with a one-place code and a
 * five-place code, and one synthetic @example.com student. Removed afterwards; the student's
 * profile stays because the append-only audit log names it (as in e2e/invite-links.spec.ts).
 */
import { expect, test, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';

const className = 'Clasa a XII-a link test';
const classSlug = 'clasa-a-xii-a-link-test';
const teacherId = '00000000-0000-4000-8000-000000000007';
const stamp = Date.now();
const studentEmail = `class-link-${stamp}@example.com`;

/** Removes the class, its codes and members, and the student's account where the log allows. */
function cleanUp() {
  const space = `(select id from public.spaces where slug = '${classSlug}')`;
  runSql(`delete from public.forum_threads where forum_id in (select id from public.forums where space_id in ${space});
    delete from public.forums where space_id in ${space};
    delete from public.space_moderation_log where space_id in ${space};
    delete from public.invites where space_id in ${space};
    delete from public.space_members where space_id in ${space};
    delete from public.spaces where slug = '${classSlug}';
    -- The teacher's space_create count: class-pilot-setup starts a class as the same teacher, so
    -- without this the two specs in one run hit the limit (QA-3).
    delete from public.rate_limit_events where user_id = '${teacherId}';
    delete from public.consents where user_id in (select id from auth.users where email = '${studentEmail}');
    delete from public.profiles where id in (select id from auth.users where email = '${studentEmail}')
      and id not in (select user_id from public.audit_log where user_id is not null);
    delete from auth.users where email = '${studentEmail}' and id not in (select id from public.profiles);`);
}

/**
 * Starts the class as the teacher and makes a code.
 *
 * @param places - how many people the code admits
 * @returns the code
 */
function makeCode(places: number): string {
  const output =
    runSql(`select set_config('request.jwt.claims', '{"sub": "${teacherId}", "role": "authenticated"}', false);
    select public.make_class_invite('${classSlug}', 30, ${places}) ->> 'code';`);
  return output.trim().split('\n').at(-1) ?? '';
}

/** Starts the class as the teacher. */
function startClass() {
  runSql(`select set_config('request.jwt.claims', '{"sub": "${teacherId}", "role": "authenticated"}', false);
    select public.create_class_space('${className}', 'Atelier de scris.', 'Fii amabil.');`);
}

/**
 * Opens a page signed out, in English.
 *
 * @param page - a fresh page
 * @param address - where to go
 */
async function openSignedOut(page: Page, address: string) {
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
}

test.describe('the class link as the invitation (IDEAS-3c)', () => {
  test.describe.configure({ mode: 'serial' });
  let onePlace = '';
  let fivePlaces = '';

  test.beforeAll(() => {
    cleanUp();
    startClass();
    onePlace = makeCode(1);
  });
  test.afterAll(cleanUp);

  test('a student signs up through the class link and is in the class', async ({ page }) => {
    await openSignedOut(page, `/class/${onePlace}`);
    await expect(page.getByRole('heading', { level: 1, name: className })).toBeVisible();
    await page.getByRole('link', { name: 'Create an account with this code' }).click();
    await expect(page).toHaveURL(new RegExp(`/join/${onePlace}$`));
    // The class code is the invitation: the form opens without asking for another code.
    await page.getByLabel('Email', { exact: true }).fill(studentEmail);
    await page.getByRole('textbox', { name: 'Username' }).fill(`class.link.${stamp}`);
    await page.getByLabel('Password', { exact: true }).fill('a long enough passphrase');
    await page.getByLabel('Confirm password').fill('a long enough passphrase');
    await page.getByRole('combobox', { name: 'Year of birth' }).selectOption('1990');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('status').getByText(/We sent a link/)).toBeVisible();
    // Criterion 1: the account is a member of the class from the start.
    const status = runSql(`select space_members.status from public.space_members
      join auth.users on users.id = space_members.user_id
      join public.spaces on spaces.id = space_members.space_id
      where users.email = '${studentEmail}' and spaces.slug = '${classSlug}';`);
    expect(status.trim().split('\n').at(-1)).toBe('active');
  });

  test('a used-up class code asks for a normal invitation instead', async ({ page }) => {
    await openSignedOut(page, `/join/${onePlace}`);
    await expect(page.getByText('This invitation has ended', { exact: false })).toBeVisible();
    await expect(page.getByLabel('Invitation code')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toHaveCount(0);
    // A new code for the accessibility views. Only now: a new code stops the old one at once.
    fivePlaces = makeCode(5);
  });

  // The code is made once the class exists, so each view's address is set then.
  for (const view of everyView(['/class'])) {
    test(`axe: Join a class, signed out, at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, { ...view, address: `/class/${fivePlaces}` });
      await expect(
        page.getByRole('link', { name: /Create an account|Creează un cont/ }),
      ).toBeVisible();
    });
  }
});
