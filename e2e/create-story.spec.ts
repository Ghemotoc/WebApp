/**
 * Creating a story in a real browser (story S1-E3-01).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - adult_writer goes through the five-step wizard (CALM-9, board D02) and creates a story with
 *   tags "Fantezie" and "fantezie": one tag, shown as "Fantasy" in the English interface (CMS-1e),
 *   set in Romania (its own field, not a tag), the genre Cosy mystery picked by typing (S1-E3-01;
 *   the 18+ genres are offered to adults only), a drawn cover
 *   with a long title at phone width, recoloured within the palette, and sees it on Your writing;
 * - Next refuses to leave the basics without a title;
 * - the upload tab is not offered while picture_uploads is off (no uploads in the demo);
 * - teen_17 (read-only while the test is adults only) can't create a story, never sees
 *   adult_writer's new story and is never offered an 18+ genre (rule 18);
 * - the Write button leads to /write, and a signed-out visitor is asked to log in;
 * - /write and /write/new pass axe, don't scroll sideways and draw no doodle at 390,
 *   768 and 1440 px, in light and night mode, in Romanian and English.
 * Test data: the seed personas; the story this test makes is deleted at the end.
 */
import { type Browser } from '@playwright/test';
import { expect, test } from './support/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { goToLastNewStoryStep, goToNewStoryStep } from './support/newStoryWizard';
import { expectNoDoodles } from './support/noDoodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** A title long enough to need the smallest cover size (over 40 characters). */
const longTitle = 'Fata care repara radiouri și alte povești din atelierul bunicului';

/** The two personas' user IDs (supabase/seed.sql). Used only in SQL, never on screen. */
const personaIds: Partial<Record<SignInPersonaName, string>> = {
  adult_writer: '00000000-0000-4000-8000-000000000001',
  teen_17: '00000000-0000-4000-8000-000000000002',
};

/** Removes the stories this test made and puts the personas' language back to the seed's. */
function cleanUp() {
  runSql(`delete from public.stories where title like 'Fata care repara radiouri%';`);
  runSql(
    `update public.profiles set locale = 'ro' where id in ('${personaIds.adult_writer}', '${personaIds.teen_17}');`,
  );
}

/** Opens a page in English as a persona, in a fresh browser context. */
async function openAsPersona(browser: Browser, persona: SignInPersonaName, path: string) {
  // The account's own language wins on every device (S1-E1-04), so it is set to English too.
  runSql(`update public.profiles set locale = 'en' where id = '${personaIds[persona] ?? ''}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('create a story (S1-E3-01)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(cleanUp);

  test('adult_writer creates a story with a drawn cover at phone width', async ({ browser }) => {
    const page = await openAsPersona(browser, 'adult_writer', '/write');
    await page.setViewportSize({ width: 390, height: 900 });

    // The Write button is the current page; "New story" opens the form.
    await expect(page.getByRole('link', { name: 'Write', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await page.getByRole('link', { name: 'New story', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Start a new story' })).toBeVisible();

    // No upload tab while picture_uploads is off (decided 23 Oct 2026).
    await expect(page.getByText('Upload a picture')).toHaveCount(0);

    // The basics.
    await page.getByRole('textbox', { name: 'Title' }).fill(longTitle);
    await page.getByLabel('Blurb').fill('O vară în atelierul bunicului din Ploiești.');
    await page.getByLabel('Language of the story').selectOption('ro');
    await expect(page.locator('li[aria-current="step"] h2')).toHaveText('The basics');

    // Step 2: category, tags and setting. The basics fold to their summary with a Change button.
    await goToNewStoryStep(page, 'Category, tags and setting');
    await expect(page.getByText(`${longTitle} · Română`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Change The basics' })).toBeVisible();
    await page.getByRole('radio', { name: 'Fiction' }).click();

    // "Set in" (board D02): Romania is a country chip with a pin, not a tag, and the preview says
    // so on its own line.
    const setInField = page.getByRole('combobox', { name: 'Set in' });
    await setInField.fill('Romania');
    await setInField.press('Enter');
    await expect(page.getByRole('button', { name: 'Remove Romania' })).toBeVisible();
    await expect(page.getByRole('complementary').getByText('Set in Romania')).toBeVisible();

    // Genres (S1-E3-01): typing a few letters pops up the matching genres; picking one adds it
    // as a chip. An adult is offered the 18+ genres too.
    const genreField = page.getByRole('combobox', { name: 'Genres' });
    await expect(page.locator('datalist option[value="Cosy mystery"]')).toHaveCount(1);
    await expect(page.locator('datalist option[value="Erotica"]')).toHaveCount(1);
    await genreField.fill('Cosy mystery');
    await expect(page.getByRole('button', { name: 'Remove Cosy mystery' })).toBeVisible();
    await expect(page.getByText('1 of 3 genres.', { exact: false })).toBeVisible();

    // Tags: Fantezie and fantezie are one tag, the recommended Fantasy, named in the interface
    // language (CMS-1e); the counter says so.
    const tagField = page.getByPlaceholder('Add a tag');
    await tagField.fill('Fantezie');
    await tagField.press('Enter');
    await tagField.fill('fantezie');
    await tagField.press('Enter');
    await expect(
      page.getByRole('button', { name: 'Remove tag Fantasy', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Remove tag Fantezie', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText('1 of 10 tags.', { exact: false })).toBeVisible();

    // Step 3: the cover.
    await goToNewStoryStep(page, 'Cover');

    // A drawn cover: Starry night, recoloured to a Sky background; the preview carries the
    // full long title with no clipping, and the pen name.
    await page.getByRole('radio', { name: 'Starry night' }).click();
    await page.getByRole('radio', { name: 'Background: Sky' }).click();
    const preview = page.getByRole('img', { name: /Cover preview: Starry night, Sky background/ });
    await expect(preview).toBeVisible();
    await expect(preview.getByText(longTitle)).toBeVisible();
    await expect(preview.getByText('Lia Scrie')).toBeVisible();
    const previewTitle = preview.getByText(longTitle);
    const isClipped = await previewTitle.evaluate(
      (element) => element.scrollWidth > element.clientWidth + 1,
    );
    expect(isClipped).toBe(false);
    await expect(page.getByRole('button', { name: 'Use the automatic cover' })).toBeVisible();

    // Nothing scrolls sideways on the phone.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );

    // Step 4 can be skipped (the story stays public); step 5 holds the labels.
    await goToNewStoryStep(page, 'Who can read it');
    await page.getByRole('button', { name: 'Skip this step' }).click();
    await expect(page.locator('li[aria-current="step"] h2')).toHaveText('Labels, rating and AI');
    // Every story needs a rating and an AI answer before it saves (S1-E3-06).
    await page.getByRole('radio', { name: 'All ages', exact: true }).click();
    await page.getByRole('radio', { name: 'No AI', exact: true }).click();
    // Create: the story appears on Your writing, only to its writer until published.
    await page.getByRole('button', { name: 'Create and write chapter one' }).click();
    // Chapter one is made with the story and the editor opens on it (S1-E3-02a).
    await expect(page).toHaveURL(/\/write\/s\/[a-z0-9-]+\/c\/[a-z0-9]{8}$/);
    await expect(page.getByRole('textbox', { name: 'Chapter text' })).toBeVisible();
    await page.goto('/write');
    const card = page.getByRole('article', { name: longTitle });
    await expect(card).toBeVisible();
    // The card's meta line names the category; tags live on the story page and in settings
    // since board D01 (user story 5.1), and the one tag is checked in the database below.
    await expect(card.getByText('Fiction', { exact: true })).toBeVisible();
    await expect(
      card.getByText('Only you can see this story until you publish its first chapter.'),
    ).toBeVisible();

    // In the database: owned by adult_writer's user ID, with the chosen cover, one tag and
    // Romania in "Set in".
    expect(
      runSql(
        `select user_id || ' ' || cover_kind || ' ' || cover_design || ' ' || cover_background
         from public.stories where title = '${longTitle}'`,
      ),
    ).toBe('00000000-0000-4000-8000-000000000001 drawn starry sky');
    expect(
      runSql(
        `select count(*) from public.story_tags where story_id = (select id from public.stories where title = '${longTitle}')`,
      ),
    ).toBe('1');
    expect(
      runSql(
        `select array_to_string(set_in_countries, ',') from public.stories where title = '${longTitle}'`,
      ),
    ).toBe('RO');
    expect(
      runSql(
        `select array_to_string(genre_slugs, ',') from public.stories where title = '${longTitle}'`,
      ),
    ).toBe('cosy_mystery');
  });

  test('teen_17 cannot create a story and does not see adult_writer’s new story', async ({
    browser,
  }) => {
    const page = await openAsPersona(browser, 'teen_17', '/write');
    await expect(page.getByText(longTitle)).toHaveCount(0);
    // The seed gives teen_17 one draft story, so the list is not empty.
    await expect(page.getByRole('article', { name: 'Scrisori din cutia poștală' })).toBeVisible();

    await page.goto('/write/new');
    await page.getByRole('textbox', { name: 'Title' }).fill('Fata care repara radiouri (teen)');
    // The genre list has loaded, and holds no 18+ genre for a 17-year-old (genres_select_public).
    await goToNewStoryStep(page, 'Category, tags and setting');
    await expect(page.locator('datalist option[value="Cosy mystery"]')).toHaveCount(1);
    await expect(page.locator('datalist option[value="Erotica"]')).toHaveCount(0);
    await goToLastNewStoryStep(page);
    // Every story needs a rating and an AI answer before it saves (S1-E3-06).
    await page.getByRole('radio', { name: 'All ages', exact: true }).click();
    await page.getByRole('radio', { name: 'No AI', exact: true }).click();
    await page.getByRole('button', { name: 'Create and write chapter one' }).click();
    await expect(
      page.getByText('Your account can’t create stories yet.', { exact: false }),
    ).toBeVisible();
    expect(runSql(`select count(*) from public.stories where title like '%(teen)'`)).toBe('0');
  });

  test('the form refuses an empty title before asking the database', async ({ browser }) => {
    const page = await openAsPersona(browser, 'adult_writer', '/write/new');
    // The wizard's first step won't move on without a title (CALM-9, board D02).
    await page.getByRole('button', { name: 'Next: category, tags and setting' }).click();
    await expect(page.getByText('Give the story a title.')).toBeVisible();
    await expect(page.locator('li[aria-current="step"] h2')).toHaveText('The basics');
    await expect(page.getByRole('textbox', { name: 'Title' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  test('a signed-out visitor is asked to log in', async ({ page }) => {
    await page.goto('/write/new');
    await expect(page.getByText(/Conectează-te|Log in/)).toBeVisible();
  });

  test.describe('every view is accessible, fits the width and draws no doodle', () => {
    for (const view of everyView(['/write', '/write/new'])) {
      test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
        page,
      }) => {
        // The account's own language wins over the device's (S1-E1-04), so it is set to the view's
        // language first; otherwise the check races the profile load.
        runSql(
          `update public.profiles set locale = '${view.language}' where id = '${personaIds.adult_writer ?? ''}';`,
        );
        await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
        await checkScreen(page, view);
        await expectNoDoodles(page);
      });
    }
  });
});
