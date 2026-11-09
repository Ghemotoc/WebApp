/**
 * Joining a space in a real browser (bundle 14d IDEAS-3, part d; ideas IDEA-20261102-6 and
 * IDEA-20261102-9).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the owner saves a welcome note in Space settings, and a note with HTML is refused with a plain
 *   message (idea 6, criterion 2);
 * - a new member sees the note once at the top of the space, and after "Got it" it doesn't come
 *   back (idea 6, criterion 1);
 * - asking to join a space that approves each request takes an optional note (idea 9,
 *   criterion 1), and the owner sees it with the request, with its own Report button
 *   (criterion 2);
 * - the space page with the welcome note passes axe at 390, 768 and 1440 px, light and night, ro
 *   and en.
 * Test data: adult_writer starts "Cercul de bun venit test" (open) and "Cercul cu cereri test"
 * (each request approved); teacher joins the first, blocker asks to join the second. Removed
 * before and after; the names never end in "e2e", so spaces.spec leaves them alone.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const openSlug = 'cercul-de-bun-venit-test';
const approveSlug = 'cercul-cu-cereri-test';
const ownerId = '00000000-0000-4000-8000-000000000001';
const welcomeNote = 'Bine ai venit! Citește regulile înainte de prima postare.';
const requestNote = 'Scriu poezie și caut păreri sincere.';
const people = `('adult_writer', 'teacher', 'blocker')`;

/** Removes both spaces with their forums, members, notes and log. */
function cleanUp() {
  const spaces = `(select id from public.spaces where slug in ('${openSlug}', '${approveSlug}'))`;
  runSql(`delete from public.forums where space_id in ${spaces};
    delete from public.space_moderation_log where space_id in ${spaces};
    delete from public.space_join_notes where space_id in ${spaces};
    delete from public.space_members where space_id in ${spaces};
    delete from public.spaces where id in ${spaces};
    delete from public.rate_limit_events where user_id in (select id from public.profiles where handle in ${people});
    update public.profiles set locale = 'ro' where handle in ${people};`);
}

/** Starts the two spaces as their owner. */
function startSpaces() {
  runSql(`select set_config('request.jwt.claims', '{"sub": "${ownerId}", "role": "authenticated"}', false);
    select public.create_space('Cercul de bun venit test', 'Un spațiu deschis.', '', 'members', 'open', 'members', 'plum');
    select public.create_space('Cercul cu cereri test', 'Un spațiu cu cereri.', '', 'members', 'approve', 'members', 'cobalt');`);
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

test.describe('joining spaces (IDEAS-3d)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    cleanUp();
    startSpaces();
  });
  test.afterAll(cleanUp);

  test('the owner saves a welcome note, and HTML is refused', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', `/spaces/${openSlug}/settings`);
    const card = page.getByRole('region', { name: 'Welcome note' });
    const field = card.getByLabel('Welcome note');
    await field.fill('<b>Salut</b>');
    await card.getByRole('button', { name: 'Save welcome note' }).click();
    await expect(card.getByText('A welcome note can’t hold HTML tags.')).toBeVisible();
    await field.fill(welcomeNote);
    await card.getByRole('button', { name: 'Save welcome note' }).click();
    await expect(card.getByText('Your welcome note is saved.')).toBeVisible();
    await page.context().close();
  });

  test('a new member sees the welcome note once', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', `/spaces/${openSlug}`);
    await page.getByRole('button', { name: 'Join space' }).click();
    const note = page.getByRole('region', { name: 'Welcome to Cercul de bun venit test' });
    await expect(note).toContainText(welcomeNote);
    await note.getByRole('button', { name: 'Got it' }).click();
    await expect(note).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Cercul de bun venit test' }),
    ).toBeVisible();
    await expect(note).toHaveCount(0);
    await page.context().close();
  });

  test('a request to join carries a short note', async ({ browser }) => {
    const page = await openAs(browser, 'blocker', `/spaces/${approveSlug}`);
    await page.getByRole('button', { name: 'Join space' }).click();
    await page.getByLabel('A note for the people who run the space (optional)').fill(requestNote);
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByRole('button', { name: 'Take back request' })).toBeVisible();
    await page.context().close();
  });

  test('the owner reads the note with the request and can report it', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', `/spaces/${approveSlug}`);
    const requests = page.getByRole('region', { name: 'Requests to join' });
    await expect(requests.getByLabel(/^Note from/)).toContainText(requestNote);
    await expect(requests.getByRole('button', { name: /report/i })).toBeVisible();
    await page.context().close();
  });

  for (const view of everyView([`/spaces/${openSlug}`])) {
    test(`axe: the space with its welcome note at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      // The note shows until "Got it", so each view starts before it; the account's language wins.
      runSql(`update public.space_members set welcome_seen_at = null
          where user_id = (select id from public.profiles where handle = 'teacher')
            and space_id = (select id from public.spaces where slug = '${openSlug}');
        update public.profiles set locale = '${view.language}' where handle = 'teacher';`);
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('teacher')).session);
      const page = await context.newPage();
      await checkScreen(page, view, async (opened) => {
        await expect(opened.getByRole('button', { name: /got it|am înțeles/i })).toBeVisible();
      });
      await context.close();
    });
  }
});
