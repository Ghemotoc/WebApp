/**
 * Automatic covers in a real browser (story S1-E3-13).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the cover step says "Skip this and we’ll give your story one of these covers
 *   automatically…", names the design the story would get ("Right now: …") and, once a design
 *   is picked, offers "Use the automatic cover";
 * - a story made with the automatic cover shows exactly that design on Your writing, drawn from
 *   the story's ID; nothing about the cover is stored;
 * - the seed's automatic story shows the same design on every visit;
 * - the design named in the form is the one the card shows, whatever the title.
 * Test data: the seed personas; the stories this test makes are deleted at the end.
 */
import { expect, test, type Browser } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** adult_writer's user ID (supabase/seed.sql). Used only in SQL, never on screen. */
const writerId = '00000000-0000-4000-8000-000000000001';

/** The title this test uses; long, so the cover's title sizing is exercised too. */
const title = 'Automatic cover test: o poveste fără copertă aleasă de mine';

/** Removes the stories this test made and puts the language back. */
function cleanUp() {
  runSql(`delete from public.stories where title like 'Automatic cover test%';`);
  runSql(`update public.profiles set locale = 'ro' where id = '${writerId}';`);
}

/** Opens a page in English as adult_writer, in a fresh browser context. */
async function openAsWriter(browser: Browser, path: string) {
  runSql(`update public.profiles set locale = 'en' where id = '${writerId}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('automatic covers (S1-E3-13)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(cleanUp);

  test('the cover step names the automatic design and the story gets exactly that one', async ({
    browser,
  }) => {
    const page = await openAsWriter(browser, '/write/new');

    // The automatic-cover box, with the design the story would get.
    await expect(
      page.getByText('Skip this and we’ll give your story one of these covers automatically.', {
        exact: false,
      }),
    ).toBeVisible();
    const rightNow = page.getByText(/Right now: .+, picked for you automatically\./);
    await expect(rightNow).toBeVisible();
    const namedDesign = (await rightNow.textContent())?.match(/Right now: (.+), picked/)?.[1];
    expect(namedDesign).toBeTruthy();

    // The preview already draws that design (its data attribute is the design key).
    const preview = page.getByRole('img', { name: /^Cover preview:/ });
    const previewDesign = await preview
      .locator('[data-cover-design]')
      .getAttribute('data-cover-design');
    expect(previewDesign).toBeTruthy();

    // Picking a design, then going back to the automatic one.
    await page.getByRole('radio', { name: 'Gold stripes' }).click();
    await expect(page.getByText('You chose your own cover.')).toBeVisible();
    await page.getByRole('button', { name: 'Use the automatic cover' }).click();
    await expect(rightNow).toBeVisible();

    // The title changes nothing: the same design is named after typing a long title.
    await page.getByRole('textbox', { name: 'Title' }).fill(title);
    await expect(
      page.getByText(`Right now: ${namedDesign ?? ''}, picked for you automatically.`),
    ).toBeVisible();

    // Create with the automatic cover: the card on Your writing draws the same design, with the
    // full title, and the database stores nothing for the cover.
    await page.getByRole('radio', { name: 'Română' }).click();
    await page.getByRole('button', { name: 'Create and write chapter one' }).click();
    await expect(page).toHaveURL(/\/write$/);
    const card = page.getByRole('article', { name: title });
    await expect(card).toBeVisible();
    await expect(card.locator('[data-cover-design]')).toHaveAttribute(
      'data-cover-design',
      previewDesign ?? '',
    );
    await expect(card.locator('[data-cover-design]').getByText(title)).toBeVisible();
    expect(
      runSql(
        `select cover_kind || ' ' || coalesce(cover_design, 'none') || ' ' || coalesce(cover_tall_path, 'none')
         from public.stories where title = '${title}'`,
      ),
    ).toBe('automatic none none');
  });

  test('the seed’s automatic story shows the same design on every visit', async ({ browser }) => {
    const page = await openAsWriter(browser, '/write');
    const card = page.getByRole('article', { name: 'The Girl Who Fixed Radios' });
    const first = await card.locator('[data-cover-design]').getAttribute('data-cover-design');
    expect(first).toBeTruthy();
    await page.reload();
    await expect(card.locator('[data-cover-design]')).toHaveAttribute(
      'data-cover-design',
      first ?? '',
    );
  });
});
