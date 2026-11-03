/**
 * The age rule on ratings in a real browser (bundle ADMIN-2, part e1; brief
 * bundle-12-pictures-bans-avatars-brief.md, Robert, 2 Nov 2026).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a writer under 16 (kid_14_ok) sees only the All ages and 13+ ratings on a new story, with
 *   a line saying why;
 * - a writer aged 16 or 17 (teen_17) sees every rating, 18+ included, and no such line.
 * The database refuses a higher rating from an under-16 as well (test 247); this spec covers the
 * screen. The "Drawings and illustrations only" note is covered by chapter-pictures.spec.ts and
 * chapter-drawings.spec.ts.
 * Test data: none is saved; the personas' language is put back.
 */
import { expect, test, type Browser } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const personaIds: Partial<Record<SignInPersonaName, string>> = {
  teen_17: '00000000-0000-4000-8000-000000000002',
  kid_14_ok: '00000000-0000-4000-8000-000000000003',
};

/** Puts the personas' language back to Romanian, the seed's value. */
function cleanUp() {
  runSql(
    `update public.profiles set locale = 'ro' where id in ('${personaIds.teen_17}', '${personaIds.kid_14_ok}');`,
  );
}

/** Opens the new story form in English as a persona, in a fresh browser context. */
async function openNewStoryAs(browser: Browser, persona: SignInPersonaName) {
  runSql(`update public.profiles set locale = 'en' where id = '${personaIds[persona] ?? ''}';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto('/write/new');
  return page;
}

test.describe('ratings a writer may give, by age (ADMIN-2e1)', () => {
  test.afterAll(cleanUp);

  test('a 14-year-old writer can only pick All ages or 13+, and is told why', async ({
    browser,
  }) => {
    const page = await openNewStoryAs(browser, 'kid_14_ok');
    await expect(page.getByRole('radio', { name: '13+', exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'All ages', exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: '16+', exact: true })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: '18+', exact: true })).toHaveCount(0);
    await expect(
      page.getByText('Writers under 16 can rate a story All ages or 13+.'),
    ).toBeVisible();
    await page.context().close();
  });

  test('a 17-year-old writer can pick every rating, 18+ included', async ({ browser }) => {
    const page = await openNewStoryAs(browser, 'teen_17');
    await expect(page.getByRole('radio', { name: '18+', exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { name: '16+', exact: true })).toBeVisible();
    await expect(page.getByText('Writers under 16 can rate a story All ages or 13+.')).toHaveCount(
      0,
    );
    await page.context().close();
  });
});
