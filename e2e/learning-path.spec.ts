/**
 * The learning path in a real browser (bundle GAPS-12g; board WritersHub, "Learning path · Your
 * first chapter in 7 days").
 *
 * What it proves:
 * - the hub's card lists the seven days and starts at "Start day 1";
 * - a writer reads day 1's lesson and task, marks it done, goes on to day 2, and the hub then
 *   says "Continue day 2" with one of seven days done; the tick comes off again;
 * - a bad day in the address falls back to the first day still open;
 * - an admin changes a day's title at /staff/hub and writers see the new words;
 * - signed out, the page says to log in;
 * - the hub card, the lesson page and the staff page have no serious axe issue at phone and
 *   desktop width, and nothing scrolls sideways.
 * The database rules (who reads what, ticks, staff changes, the seven days) are in
 * supabase/tests/database/338-learning-path.test.sql.
 * Test data: the seed's adult_writer and admin, who read in Romanian; the ticks are removed and
 * the changed title is put back afterwards (the audit log keeps its rows: append-only).
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const writerId = '00000000-0000-4000-8000-000000000001';
const dayOne = { ro: 'Găsește ideea', en: 'Find your idea' };
const changedTitle = 'Găsește ideea (e2e)';

/** Removes the writer's ticks and puts day 1's Romanian title back. */
function cleanUp() {
  runSql(`delete from public.learning_path_progress where user_id = '${writerId}';
    update public.learning_path_steps set title_ro = '${dayOne.ro}', title_en = '${dayOne.en}' where day_number = 1;`);
}

/** Opens a page as a seed persona, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName, path: string, width = 1440) {
  // Other specs leave a persona reading in English; this one checks the Romanian words, so it
  // sets the language itself instead of counting on what ran before it.
  runSql(`update public.profiles set locale = 'ro' where handle = '${persona}';`);
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('the learning path (GAPS-12g)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('the hub lists the seven days and starts at day 1', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/hub');
    const card = page.getByRole('region', { name: 'Un prim capitol în 7 zile' });
    const days = card.getByRole('list', { name: 'Cele șapte zile' }).getByRole('listitem');
    await expect(days).toHaveCount(7);
    await expect(days.first()).toContainText(dayOne.ro);
    await expect(card.getByText('0 din 7 zile gata')).toBeVisible();
    await expect(card.getByRole('link', { name: 'Începe ziua 1' })).toHaveAttribute(
      'href',
      '/hub/path?day=1',
    );
    await page.context().close();
  });

  test('a writer reads day 1, marks it done and the hub moves on to day 2', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/hub/path?day=1', 390);
    const lesson = page.getByRole('article', { name: dayOne.ro });
    await expect(lesson.getByText('Ziua 1 din 7')).toBeVisible();
    await expect(lesson.getByText(/O poveste începe cu o întrebare/)).toBeVisible();
    await expect(lesson.getByText(/Scrie trei întrebări/)).toBeVisible();
    await lesson.getByRole('button', { name: 'Marchează ziua 1 ca gata' }).click();
    await expect(lesson.getByRole('button', { name: 'Marchează ca neterminată' })).toBeVisible();
    await expect(lesson.getByText('Ziua 1 din 7 · gata')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    // On to day 2, then back on the hub the card continues from there.
    await lesson.getByRole('link', { name: 'Mai departe, la ziua 2' }).click();
    await expect(page).toHaveURL(/\/hub\/path\?day=2$/);
    await expect(
      page.getByRole('article', { name: 'Cunoaște personajul principal' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Înapoi la Spațiul scriitorilor' }).click();
    const card = page.getByRole('region', { name: 'Un prim capitol în 7 zile' });
    await expect(card.getByRole('link', { name: 'Continuă ziua 2' })).toBeVisible();
    await expect(card.getByText('1 din 7 zile gata')).toBeVisible();
    await page.context().close();
  });

  test('a bad day in the address opens the first day still open, and a tick comes off', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', '/hub/path?day=99');
    await expect(
      page.getByRole('article', { name: 'Cunoaște personajul principal' }),
    ).toBeVisible();
    await page.goto('/hub/path?day=1');
    const lesson = page.getByRole('article', { name: dayOne.ro });
    await lesson.getByRole('button', { name: 'Marchează ca neterminată' }).click();
    await expect(lesson.getByRole('button', { name: 'Marchează ziua 1 ca gata' })).toBeVisible();
    await page.context().close();
  });

  test('an admin changes a day’s title and writers see it', async ({ browser }) => {
    const staffPage = await openAs(browser, 'admin', '/staff/hub');
    const section = staffPage.getByRole('region', { name: 'Traseu de învățare' });
    await section.getByRole('button', { name: `Editează: ${dayOne.en}` }).click();
    const title = section.getByLabel('Titlul în română');
    await title.fill('');
    await expect(section.getByRole('button', { name: 'Salvează' })).toBeDisabled();
    await title.fill(changedTitle);
    await section.getByRole('button', { name: 'Salvează' }).click();
    await expect(section.getByLabel('Titlul în română')).toHaveCount(0);
    await staffPage.context().close();
    const page = await openAs(browser, 'adult_writer', '/hub/path?day=1');
    await expect(page.getByRole('article', { name: changedTitle })).toBeVisible();
    await page.context().close();
  });

  test('signed out, the page says to log in', async ({ page }) => {
    await page.goto('/hub/path');
    const main = page.getByRole('main');
    await expect(main.getByText('Intră în cont ca să urmezi traseul de învățare.')).toBeVisible();
    await expect(main.getByRole('link', { name: 'Conectare' })).toHaveAttribute('href', '/sign-in');
    await expect(page.getByRole('article')).toHaveCount(0);
  });

  for (const view of [
    { persona: 'adult_writer', address: '/hub', width: 390, theme: 'night' },
    { persona: 'adult_writer', address: '/hub/path?day=4', width: 390, theme: 'night' },
    { persona: 'adult_writer', address: '/hub/path?day=4', width: 1440, theme: 'light' },
    { persona: 'admin', address: '/staff/hub', width: 1440, theme: 'light' },
  ] as const) {
    test(`no serious axe issue on ${view.address} at ${view.width} px, ${view.theme}`, async ({
      browser,
    }) => {
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona(view.persona)).session);
      const page = await context.newPage();
      await checkScreen(page, { ...view, language: 'ro' });
      await context.close();
    });
  }
});
