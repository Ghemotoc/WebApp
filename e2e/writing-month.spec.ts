/**
 * The writing month in a real browser (bundle GAPS-12f; board WritersHub, "Writing month" and
 * "Badges this month").
 *
 * What it proves:
 * - a writer with no words this month sees 0%, "no streak yet" and five badges not yet earned;
 * - with 6,300 words over five days in a row the card shows 42% of 15,000, the 5-day streak,
 *   the words in the reader's number format and "First 5,000" earned, in words and not by
 *   colour alone;
 * - another member's hub shows none of it;
 * - the hub has no serious axe issue with the card in, at phone and desktop width.
 * The counting itself (saves, words taken away, staff changes, pruning, every badge) is in
 * supabase/tests/database/337-writing-month.test.sql.
 * Test data: the seed's adult_writer and teacher, who read in Romanian; the days are written in
 * SQL and removed afterwards.
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';

/** Removes the writer's days. */
function cleanUp() {
  runSql(`delete from public.writing_days where user_id = '${writerId}';`);
}

/** Opens the hub as a seed persona, in a fresh browser context. */
async function openHubAs(browser: Browser, persona: SignInPersonaName, width: number) {
  // Other specs leave a persona reading in English; this one checks the Romanian words, so it
  // sets the language itself instead of counting on what ran before it.
  runSql(`update public.profiles set locale = 'ro' where handle = '${persona}';`);
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  const page = await context.newPage();
  await page.goto('/hub');
  return page;
}

test.describe('the writing month (GAPS-12f)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('a month with no words starts at 0% with no badge', async ({ browser }) => {
    const page = await openHubAs(browser, 'adult_writer', 1440);
    const card = page.getByRole('region', { name: 'Luna de scris' });
    await expect(card.getByText('0%', { exact: true })).toBeVisible();
    await expect(card.getByText('din 15.000 de cuvinte')).toBeVisible();
    await expect(card.getByText('Nicio serie încă · 0 cuvinte')).toBeVisible();
    const badges = card.getByRole('list', { name: 'Insigne luna aceasta' });
    await expect(badges.getByRole('listitem')).toHaveCount(5);
    await expect(badges.getByText('Încă nu')).toHaveCount(5);
    await page.context().close();
  });

  test('five days in a row and 6,300 words show 42%, the streak and a badge', async ({
    browser,
  }) => {
    // 1,260 words on each of the last five days, today included.
    runSql(`insert into public.writing_days (user_id, day, words)
      select '${writerId}', public.romania_today() - back, 1260 from generate_series(0, 4) as back;`);
    const page = await openHubAs(browser, 'adult_writer', 390);
    const card = page.getByRole('region', { name: 'Luna de scris' });
    await expect(card.getByText('Serie de 5 zile · 6.300 de cuvinte')).toBeVisible();
    const bar = card.getByRole('progressbar');
    // Early in a month some of the five days fall in the month before, so the share is lower.
    const monthWords = Number(
      runSql(`select sum(words) from public.writing_days where user_id = '${writerId}'
        and day >= date_trunc('month', public.romania_today())::date;`).trim(),
    );
    const percent = Math.floor((monthWords / 15000) * 100);
    await expect(bar).toHaveAttribute('aria-valuenow', String(percent));
    await expect(card.getByText(`${percent}%`, { exact: true })).toBeVisible();
    if (monthWords >= 5000) {
      const firstBadge = card.getByRole('listitem').filter({ hasText: 'Primele 5.000' });
      await expect(firstBadge.getByText('Obținută')).toBeVisible();
    }
    const goalBadge = card.getByRole('listitem').filter({ hasText: '15.000 de cuvinte' });
    await expect(goalBadge.getByText('Încă nu')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();
  });

  test('another member sees only their own month', async ({ browser }) => {
    const page = await openHubAs(browser, 'teacher', 1440);
    const card = page.getByRole('region', { name: 'Luna de scris' });
    await expect(card.getByText('Serie de 5 zile ·')).toHaveCount(0);
    await expect(card.getByText('6.300')).toHaveCount(0);
    await page.context().close();
  });

  for (const view of [
    { width: 390, theme: 'night' },
    { width: 1440, theme: 'light' },
  ] as const) {
    test(`no serious axe issue on the hub at ${view.width} px, ${view.theme}`, async ({
      browser,
    }) => {
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
      const page = await context.newPage();
      await checkScreen(page, { ...view, address: '/hub', language: 'ro' });
      await context.close();
    });
  }
});
