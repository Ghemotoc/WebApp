/**
 * Story status, settings, deletion and the story page in a real browser (story S1-E3-05).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - adult_writer marks a story Completed and switches comments off in story settings; the card
 *   on Your writing shows "Completed" and the Ongoing / Completed filter works;
 * - the story page shows the status and the comments setting (to the owner, as a preview);
 *   teen_17 can't open adult_writer's unpublished story;
 * - deleting asks twice, hides the story at once (the page says it isn't available), lists it
 *   under "Recently deleted" and undoes it; the purge job removes it only after 30 days;
 * - the settings and story pages pass axe, don't scroll sideways and keep doodles off text at
 *   390, 768 and 1440 px, in light and night mode, in Romanian and English.
 * Test data: the seed story "Stația meteo" (adult_writer); it is put back as the seed made it.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { expectNoDoodleOverlap } from './support/doodles';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The seed story under test (supabase/seed.sql) and its owner. IDs are used only in SQL. */
const storyId = '00000000-0000-4000-9000-000000000001';
const slug = 'statia-meteo-seed01';
const writerId = '00000000-0000-4000-8000-000000000001';
const teenId = '00000000-0000-4000-8000-000000000002';

/** Puts the seed story and the personas' language back as the seed made them. */
function cleanUp() {
  runSql(`update public.stories set completion_status = 'ongoing', comments_enabled = true, deleted_at = null,
    title = 'Stația meteo' where id = '${storyId}';`);
  runSql(`update public.profiles set locale = 'ro' where id in ('${writerId}', '${teenId}');`);
}

/** Opens a page in English as a persona, in a fresh browser context. */
async function openAsPersona(browser: Browser, persona: SignInPersonaName, path: string) {
  const personaId = persona === 'teen_17' ? teenId : writerId;
  runSql(`update public.profiles set locale = 'en' where id = '${personaId}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('story status, settings and deletion (S1-E3-05)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('the writer marks the story Completed, switches comments off, and the card and filter follow', async ({
    browser,
  }) => {
    const page = await openAsPersona(browser, 'adult_writer', '/write');
    const card = page.getByRole('article', { name: 'Stația meteo' });
    await card.getByRole('link', { name: 'Story settings' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Stația meteo' })).toBeVisible();

    await page.getByRole('radio', { name: 'Completed' }).click();
    const commentsSwitch = page.getByRole('switch', { name: 'Comments' });
    await expect(commentsSwitch).toHaveAttribute('aria-checked', 'true');
    await commentsSwitch.click();
    await expect(
      page.getByText('Off. Existing comments are hidden', { exact: false }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    expect(
      runSql(
        `select completion_status || ' ' || comments_enabled from public.stories where id = '${storyId}'`,
      ),
    ).toBe('completed false');

    // The card shows the status; the filter keeps or drops it.
    await page.goto('/write');
    await expect(card.getByText('Completed')).toBeVisible();
    await page.getByRole('radio', { name: 'Ongoing' }).click();
    await expect(card).toHaveCount(0);
    await page.getByRole('radio', { name: 'Completed' }).click();
    await expect(card).toBeVisible();
  });

  test('the story page shows the status and comments setting to its owner; teen_17 can’t open it', async ({
    browser,
  }) => {
    const page = await openAsPersona(browser, 'adult_writer', `/s/${slug}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Stația meteo' })).toBeVisible();
    await expect(
      page.getByText('Only you can see this story until you publish', { exact: false }),
    ).toBeVisible();
    await expect(page.getByText('Lia Scrie').first()).toBeVisible();
    // The owner can't report their own story, so the shared Report button isn't shown to them
    // (S1-E10-01 replaced the e-mail link, architecture 1.7.11).
    await expect(page.getByRole('button', { name: 'Report Stația meteo' })).toHaveCount(0);
    const labels = page.getByText('Labels from the writer').locator('..');
    await expect(labels.getByText('Completed')).toBeVisible();
    await expect(labels.getByText('Off')).toBeVisible();

    const teenPage = await openAsPersona(browser, 'teen_17', `/s/${slug}`);
    await expect(
      teenPage.getByRole('heading', { name: 'This story isn’t available' }),
    ).toBeVisible();
  });

  test('deleting asks twice, hides the story at once, and can be undone; the purge waits 30 days', async ({
    browser,
  }) => {
    const page = await openAsPersona(browser, 'adult_writer', `/write/s/${slug}/settings`);
    await page.getByRole('button', { name: 'Delete story' }).click();
    await expect(page.getByText('Delete “Stația meteo” and all its chapters?')).toBeVisible();
    await page.getByRole('button', { name: 'Yes, delete story' }).click();
    await expect(page.getByText('Last check.')).toBeVisible();
    await page.getByRole('button', { name: 'Delete story', exact: true }).click();
    await expect(page.getByText('Story deleted.', { exact: false })).toBeVisible();
    expect(
      runSql(`select deleted_at is not null from public.stories where id = '${storyId}'`),
    ).toBe('t');

    // Hidden at once from readers (the owner's page says so too) and from the live list.
    await page.goto(`/s/${slug}`);
    await expect(page.getByRole('heading', { name: 'This story isn’t available' })).toBeVisible();
    await page.goto('/write');
    await expect(page.getByRole('article', { name: 'Stația meteo' })).toHaveCount(0);
    const deleted = page.getByRole('region', { name: 'Recently deleted' });
    await expect(deleted.getByText('Stația meteo')).toBeVisible();

    // The purge leaves it alone before 30 days; undo brings it back.
    expect(runSql('select public.purge_deleted_stories()')).toBe('0');
    await deleted.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('article', { name: 'Stația meteo' })).toBeVisible();
    expect(runSql(`select deleted_at is null from public.stories where id = '${storyId}'`)).toBe(
      't',
    );
  });

  test('a signed-out visitor sees "not available" for an unpublished story', async ({ page }) => {
    await page.goto(`/s/${slug}`);
    await expect(
      page.getByRole('heading', { name: /nu este disponibilă|isn’t available/ }),
    ).toBeVisible();
  });

  test.describe('every view is accessible, fits the width and keeps doodles off text', () => {
    for (const view of everyView([`/write/s/${slug}/settings`, `/s/${slug}`])) {
      test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
        page,
      }) => {
        // The account's own language wins over the device's (S1-E1-04), so it is set to the view's
        // language first; otherwise the check races the profile load.
        runSql(`update public.profiles set locale = '${view.language}' where id = '${writerId}';`);
        await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
        await checkScreen(page, view);
        await expectNoDoodleOverlap(page);
      });
    }
  });
});
