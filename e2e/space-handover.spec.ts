/**
 * Handing a space over in a real browser (bundle 14d IDEAS-3, part e; idea IDEA-20261102-7).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - the owner offers the space to one of its moderators from Space settings, and sees the open
 *   offer;
 * - the moderator sees the offer at the top of the space and accepts: they become the owner and the
 *   old owner a moderator with every power (criterion 1);
 * - the new owner's log says who handed the space to whom (criterion 2);
 * - the space page with the offer passes axe at 390, 768 and 1440 px, light and night, ro and en.
 * Test data: adult_writer starts "Cercul de predare test" (open), teacher joins and is made a
 * moderator. Removed before and after; the name never ends in "e2e", so spaces.spec leaves it.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const slug = 'cercul-de-predare-test';
const spaceName = 'Cercul de predare test';
const ownerId = '00000000-0000-4000-8000-000000000001';
const teacherId = '00000000-0000-4000-8000-000000000007';
const people = `('adult_writer', 'teacher')`;

/** Removes the space with its forum, members, log and notifications. */
function cleanUp() {
  const space = `(select id from public.spaces where slug = '${slug}')`;
  runSql(`delete from public.notifications where space_id in ${space};
    delete from public.forums where space_id in ${space};
    delete from public.space_moderation_log where space_id in ${space};
    delete from public.space_members where space_id in ${space};
    delete from public.spaces where id in ${space};
    delete from public.rate_limit_events where user_id in (select id from public.profiles where handle in ${people});
    update public.profiles set locale = 'ro' where handle in ${people};`);
}

/** Runs SQL as a persona, through the same functions the screens call. */
function asPersona(userId: string, statement: string) {
  runSql(`select set_config('request.jwt.claims', '{"sub": "${userId}", "role": "authenticated"}', false);
    ${statement}`);
}

/** The space, with teacher as a moderator. */
function startSpace() {
  asPersona(
    ownerId,
    `select public.create_space('${spaceName}', 'Un spațiu de predat.', '', 'members', 'open', 'members', 'plum');`,
  );
  asPersona(teacherId, `select public.join_space('${slug}');`);
  asPersona(ownerId, `select public.set_space_moderator('${slug}', 'teacher', '{posts}');`);
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

test.describe('handing a space over (IDEAS-3e)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    cleanUp();
    startSpace();
  });
  test.afterAll(cleanUp);

  test('the owner offers the space to a moderator', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', `/spaces/${slug}/settings`);
    const card = page.getByRole('region', { name: 'Hand over this space' });
    await expect(card.getByLabel('The moderator to offer it to')).toBeVisible();
    await card.getByRole('button', { name: 'Offer the space' }).click();
    await expect(card.getByText(/You offered this space to/)).toBeVisible();
    await expect(card.getByRole('button', { name: 'Take back the offer' })).toBeVisible();
    await page.context().close();
  });

  for (const view of everyView([`/spaces/${slug}`])) {
    test(`axe: the offer at the top of the space at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      browser,
    }) => {
      // The account's language wins, so the profile follows the view.
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'teacher';`);
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('teacher')).session);
      const page = await context.newPage();
      await checkScreen(page, view, async (opened) => {
        await expect(opened.getByRole('button', { name: /^(Decline|Refuză)$/ })).toBeVisible();
      });
      await context.close();
    });
  }

  test('the moderator accepts and becomes the owner', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', `/spaces/${slug}`);
    const offer = page.getByRole('region', { name: new RegExp(`offered you ${spaceName}$`) });
    await offer.getByRole('button', { name: 'Accept and become the owner' }).click();
    await expect(offer).toHaveCount(0);
    expect(runSql(`select user_id from public.spaces where slug = '${slug}';`).trim()).toBe(
      teacherId,
    );
    expect(
      runSql(`select role || ':' || cardinality(powers) from public.space_members
        where user_id = '${ownerId}' and space_id = (select id from public.spaces where slug = '${slug}');`).trim(),
    ).toBe('moderator:4');
    await page.context().close();
  });

  test('the log says who handed the space to whom', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', `/spaces/${slug}/log`);
    await expect(page.getByText(/accepted the space from .* and is now its owner/)).toBeVisible();
    await expect(page.getByText(/offered the space to/)).toBeVisible();
    await page.context().close();
  });
});
