/**
 * The Story Atlas's "find me" adds retire themselves, in a real browser (design books review,
 * item 18, "Hints that retire themselves": "Fourth visit: no hint").
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - on a writer's first three visits, "New character" and "Add a relationship" in the Atlas top
 *   bar show their words; moving between Atlas pages in one visit counts once;
 * - on the fourth visit both fold to 44 px icon buttons that keep their names for screen readers,
 *   and still work;
 * - the count is per account: a fresh browser (another device) doesn't start the hints again.
 * Test data: a story of teacher's, "Harta ascunsă"; teacher's remembered places are removed
 * before and after.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000007';
const storySlug = 'atlas-hints-e2e';

/** Removes the story and the writer's remembered places. */
function cleanUp() {
  runSql(`delete from public.remembered_places where user_id = '${writerId}';
    delete from public.stories where slug = '${storySlug}';
    update public.profiles set locale = 'ro' where id = '${writerId}';`);
}

/** The writer's story, with no chapters (the Atlas needs only the story). */
function seedStory() {
  cleanUp();
  runSql(`insert into public.stories (user_id, slug, title, blurb, language_code, category_id,
      completion_status, rating)
    values ('${writerId}', '${storySlug}', 'Harta ascunsă', 'x', 'ro',
      (select id from public.categories where slug = 'fiction'), 'ongoing', 'all_ages');
    update public.profiles set locale = 'en' where id = '${writerId}';`);
}

/** One visit: a fresh browser (a new session) on the story's Storyline. */
async function visit(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('teacher')).session);
  await context.addInitScript(([key]) => localStorage.setItem(key, 'en'), [
    LANGUAGE_STORAGE_KEY,
  ] as const);
  const page = await context.newPage();
  await page.goto(`/plan/s/${storySlug}/storyline`);
  return page;
}

/** The two adds in the top bar. */
function adds(page: Page) {
  return {
    newCharacter: page.getByRole('button', { name: 'New character' }),
    addRelationship: page.getByRole('link', { name: 'Add a relationship' }),
  };
}

/** The visits the account has counted. */
function countedVisits(): string {
  return runSql(
    `select coalesce((select place ->> 'visits' from public.remembered_places
      where user_id = '${writerId}' and kind = 'atlas_hint'), '0');`,
  ).trim();
}

test.describe('Atlas hints retire themselves (design books item 18)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(seedStory);
  test.afterAll(cleanUp);

  test('three visits show the words, the fourth folds them to icons that still work', async ({
    browser,
  }) => {
    // Visits 1 to 3: the words show. Moving to another Atlas page in a visit doesn't count again.
    for (let visitNumber = 1; visitNumber <= 3; visitNumber += 1) {
      const page = await visit(browser);
      await expect(adds(page).newCharacter).toContainText('New character');
      await expect(adds(page).addRelationship).toContainText('Add a relationship');
      await expect.poll(countedVisits).toBe(String(visitNumber));
      await page.goto(`/plan/s/${storySlug}/ideas`);
      await expect(adds(page).newCharacter).toBeVisible();
      expect(countedVisits()).toBe(String(visitNumber));
      await page.context().close();
    }
    // Visit 4: icons only, 44 px square, with the same names.
    const page = await visit(browser);
    const { newCharacter, addRelationship } = adds(page);
    await expect(newCharacter).toHaveCSS('width', '44px');
    await expect(addRelationship).toHaveCSS('width', '44px');
    await expect(newCharacter.getByText('New character')).toHaveClass(/sr-only/);
    // Folded, it still opens the Relationships page with its form open.
    await addRelationship.click();
    await expect(page).toHaveURL(new RegExp(`/plan/s/${storySlug}/connections`));
    await page.context().close();
  });
});
