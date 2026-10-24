/**
 * Ratings and labels in a real browser (story S1-E3-06).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - the new story form refuses to save without a rating and an AI answer, and a story about
 *   abuse or coercion without 16+ or 18+ and a content note; with them it saves, and the
 *   preview and the card show the pills;
 * - once published (set in SQL, as publish_chapter() will from S1-E3-03), a 16+ story shows its
 *   rating row and content note to teen_17 and is "not available" to kid_14_ok and to a
 *   signed-out visitor (who counts as under 16);
 * - the writer changes the rating in story settings and the story page follows.
 * Test data: a story made here and deleted after; the personas' language is put back.
 */
import { expect, test, type Browser } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const storyTitle = 'Casa cu ferestre oarbe (test S1-E3-06)';

const personaIds: Partial<Record<SignInPersonaName, string>> = {
  adult_writer: '00000000-0000-4000-8000-000000000001',
  teen_17: '00000000-0000-4000-8000-000000000002',
  kid_14_ok: '00000000-0000-4000-8000-000000000003',
};

/** Deletes the test story for good and puts the personas' language back. */
function cleanUp() {
  runSql(`delete from public.stories where title = '${storyTitle.replace(/'/g, "''")}';`);
  runSql(
    `update public.profiles set locale = 'ro' where id in ('${personaIds.adult_writer}', '${personaIds.teen_17}', '${personaIds.kid_14_ok}');`,
  );
}

/** The test story's public address, once it exists. */
function storySlug(): string {
  return runSql(
    `select slug from public.stories where title = '${storyTitle.replace(/'/g, "''")}'`,
  );
}

/** Opens a page in English as a persona, in a fresh browser context. */
async function openAsPersona(browser: Browser, persona: SignInPersonaName, path: string) {
  runSql(`update public.profiles set locale = 'en' where id = '${personaIds[persona] ?? ''}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('ratings and labels (S1-E3-06)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('the form asks for a rating and an AI answer, and a content note for an abuse theme', async ({
    browser,
  }) => {
    const page = await openAsPersona(browser, 'adult_writer', '/write/new');
    await page.getByRole('textbox', { name: 'Title' }).fill(storyTitle);
    await page.getByRole('button', { name: 'Create and write chapter one' }).click();
    await expect(page.getByText('Pick a rating.')).toBeVisible();
    await expect(page.getByText('Say whether you used AI.')).toBeVisible();
    expect(runSql(`select count(*) from public.stories where title = '${storyTitle}'`)).toBe('0');

    // Abuse or coercion at 13+ is refused; 16+ with a note is accepted.
    await page.getByRole('checkbox', { name: 'Deals with abuse or coercion' }).check();
    await page.getByRole('radio', { name: '13+', exact: true }).click();
    await page.getByRole('radio', { name: 'No AI', exact: true }).click();
    await page.getByRole('button', { name: 'Create and write chapter one' }).click();
    await expect(
      page.getByText('A story about abuse or coercion must be rated 16+ or 18+.'),
    ).toBeVisible();
    await page.getByRole('radio', { name: '16+', exact: true }).click();
    await expect(page.getByText('Hidden from anyone under 16', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Create and write chapter one' }).click();
    await expect(
      page.getByText('Add a content note for a story about abuse or coercion.'),
    ).toBeVisible();
    await page
      .getByRole('textbox', { name: 'Content note' })
      .fill('Violență în familie, povestită din perspectiva unui copil.');
    await page.getByRole('checkbox', { name: 'Fan fiction' }).check();

    // The preview shows the pills before saving; the card shows them after.
    const preview = page.getByRole('complementary');
    await expect(preview.getByText('16+', { exact: true })).toBeVisible();
    await expect(preview.getByText('Fan fiction', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Create and write chapter one' }).click();
    // The editor opens on chapter one (S1-E3-02a); the card is on Your writing.
    await expect(page).toHaveURL(/\/c\/[a-z0-9]{8}$/);
    await page.goto('/write');
    const card = page.getByRole('article', { name: storyTitle });
    await expect(card).toBeVisible();
    await expect(card.getByText('16+', { exact: true })).toBeVisible();
    await expect(card.getByText('Fan fiction', { exact: true })).toBeVisible();
    expect(
      runSql(
        `select rating || ' ' || is_fan_fiction || ' ' || deals_with_abuse_or_coercion || ' ' || ai_disclosure from public.stories where title = '${storyTitle}'`,
      ),
    ).toBe('16_plus true true no_ai');
  });

  test('a published 16+ story opens for teen_17 and is hidden from kid_14_ok and visitors', async ({
    browser,
    page,
  }) => {
    // Published as publish_chapter() will mark it (S1-E3-03).
    runSql(`update public.stories set first_published_at = now() where title = '${storyTitle}';`);
    const slug = storySlug();

    const teenPage = await openAsPersona(browser, 'teen_17', `/s/${slug}`);
    await expect(teenPage.getByRole('heading', { level: 1, name: storyTitle })).toBeVisible();
    await expect(teenPage.getByText('16+ · hidden from readers under 16')).toBeVisible();
    await expect(teenPage.getByText('Violență în familie', { exact: false })).toBeVisible();

    const kidPage = await openAsPersona(browser, 'kid_14_ok', `/s/${slug}`);
    await expect(
      kidPage.getByRole('heading', { name: 'This story isn’t available' }),
    ).toBeVisible();

    await page.goto(`/s/${slug}`);
    await expect(
      page.getByRole('heading', { name: /nu este disponibilă|isn’t available/ }),
    ).toBeVisible();
  });

  test('the writer changes the rating in story settings and the page follows', async ({
    browser,
  }) => {
    const slug = storySlug();
    const page = await openAsPersona(browser, 'adult_writer', `/write/s/${slug}/settings`);
    await page.getByRole('checkbox', { name: 'Deals with abuse or coercion' }).uncheck();
    await page.getByRole('radio', { name: '18+', exact: true }).click();
    await page.getByRole('radio', { name: 'Partly AI-written', exact: true }).click();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();

    await page.goto(`/s/${slug}`);
    await expect(page.getByText('18+ · hidden from readers under 18')).toBeVisible();
    await expect(page.getByText('Partly AI-written').first()).toBeVisible();

    // teen_17 can't open an 18+ story.
    const teenPage = await openAsPersona(browser, 'teen_17', `/s/${slug}`);
    await expect(
      teenPage.getByRole('heading', { name: 'This story isn’t available' }),
    ).toBeVisible();
  });
});
