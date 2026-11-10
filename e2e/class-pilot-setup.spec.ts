/**
 * The staff pilot set-up and archiving a class, in a real browser (bundle CLASSES, part d; story
 * S1-E8-11 criteria 8 and 10).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a moderator with the Schools permission sets up a class on Staff › Schools › Class spaces
 *   with the teacher as owner and the school's name, and makes a code to print (criterion 10);
 * - staff correct the school's name;
 * - the teacher archives the class from its settings, after a "for good" question; the class
 *   page says it is archived, nobody can start a thread and "Unlock the space" is gone
 *   (criterion 8);
 * - the staff page and a class's settings pass axe at 390, 768 and 1440 px, light and night, ro
 *   and en, and no doodle is drawn.
 * Test data: the moderator and teacher personas. The class is removed before and after; its name
 * never ends in "e2e", so spaces.spec leaves it alone.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The class this spec sets up. */
const className = 'Clasa a VI-a pilot';
const classSlug = 'clasa-a-vi-a-pilot';

/** Removes the class with its forum, members, invites and log. */
function cleanUp() {
  const space = `(select id from public.spaces where slug = '${classSlug}')`;
  runSql(`delete from public.forum_threads where forum_id in (select id from public.forums where space_id in ${space});
    delete from public.forums where space_id in ${space};
    delete from public.space_moderation_log where space_id in ${space};
    delete from public.invites where space_id in ${space};
    delete from public.space_members where space_id in ${space};
    delete from public.spaces where slug = '${classSlug}';
    -- The teacher's space_create count, shared with class-link-sign-up (QA-3).
    delete from public.rate_limit_events where user_id in (select id from public.profiles where handle = 'teacher');
    update public.profiles set locale = 'ro' where handle in ('teacher', 'moderator');`);
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

test.describe('class pilot set-up (CLASSES-d, S1-E8-11)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('staff set up a class for a teacher and make a code to print', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/schools/classes');
    await expect(page.getByRole('heading', { level: 1, name: 'Class spaces' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Verify teachers' })).toBeVisible();
    await page.getByLabel('Teacher', { exact: true }).fill('@teacher');
    await page.getByLabel('Name of the class').fill(className);
    await page.getByLabel('School', { exact: true }).fill('Școala Gimnazială nr. 7');
    await page.getByLabel('What the class is for').fill('Cercul de scriere.');
    await page.getByRole('button', { name: 'Set up the class' }).click();
    await expect(page.getByText('The class is ready.')).toBeVisible();

    const card = page.getByRole('listitem').filter({ hasText: className });
    await expect(card.getByText('Școala Gimnazială nr. 7')).toBeVisible();
    await card.getByRole('button', { name: 'Make a code to print' }).click();
    await expect(card.getByRole('button', { name: 'Print', exact: true })).toBeVisible();

    await card.getByRole('button', { name: 'Change the school' }).click();
    await card.getByLabel('School', { exact: true }).fill('Școala Gimnazială nr. 8');
    await card.getByRole('button', { name: 'Save the school' }).click();
    await expect(card.getByText('Școala Gimnazială nr. 8')).toBeVisible();
    await page.context().close();

    const owner = runSql(`select profiles.handle from public.spaces
      join public.profiles on profiles.id = spaces.user_id where spaces.slug = '${classSlug}';`);
    expect(owner.trim()).toBe('teacher');
  });

  test('the teacher archives the class for good', async ({ browser }) => {
    const page = await openAs(browser, 'teacher', `/spaces/${classSlug}/settings`);
    const card = page.getByRole('region', { name: 'Archive the class' });
    await card.getByRole('button', { name: 'Archive the class' }).click();
    await card.getByRole('button', { name: 'Yes, archive it' }).click();
    await expect(card.getByText('This class is archived.', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unlock the space' })).toHaveCount(0);

    await page.goto(`/spaces/${classSlug}`);
    await expect(page.getByText('This class is archived.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Start a thread' })).toHaveCount(0);
    await page.context().close();
  });

  test('axe: the staff page and an archived class’s settings, every view', async ({ browser }) => {
    test.setTimeout(500_000);
    for (const persona of ['moderator', 'teacher'] as const) {
      const address =
        persona === 'moderator' ? '/staff/schools/classes' : `/spaces/${classSlug}/settings`;
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona(persona)).session);
      const page = await context.newPage();
      for (const view of everyView([address])) {
        runSql(
          `update public.profiles set locale = '${view.language}' where handle = '${persona}';`,
        );
        await checkScreen(page, view);
        await expectNoDoodles(page);
      }
      await context.close();
    }
  });
});
