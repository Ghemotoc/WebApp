/**
 * The prompt of the week in a real browser (bundle GAPS-12c; board WritersHub, "Prompt of the
 * week").
 *
 * What it proves:
 * - an admin adds a prompt at /staff/hub and sees it in the list;
 * - the Writers' hub shows it as the prompt of the week; "Another prompt" pages to an earlier
 *   one and back;
 * - "Write from this prompt" opens the new-story screen with the prompt in sight, the story made
 *   there remembers its prompt, and the hub then says one writer tried it;
 * - the hub with the card in and the staff page have no serious axe issue at phone and desktop
 *   width, by day and at night.
 * The database rules (who may write prompts, upcoming prompts hidden, one prompt per story) are
 * in supabase/tests/database/334-writing-prompts.test.sql.
 * Test data: the seed's admin and adult_writer, who both read in Romanian; an earlier prompt
 * made in SQL; everything is removed afterwards (the audit log keeps its rows: append-only).
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const thisWeek = {
  en: 'A letter that arrives too late (e2e).',
  ro: 'O scrisoare care ajunge prea târziu (e2e).',
};
const earlier = { en: 'The last night train (e2e).', ro: 'Ultimul tren de noapte (e2e).' };
const storyTitle = 'Scrisoarea întârziată (e2e)';

/** Removes the story and the prompts this spec made. */
function cleanUp() {
  runSql(`delete from public.stories where title = '${storyTitle}';
    delete from public.writing_prompts where prompt_en like '%(e2e).';`);
}

/** Opens a page as a seed persona, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName, path: string) {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('the prompt of the week (GAPS-12c)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    // An earlier prompt, so "Another prompt" has somewhere to go.
    runSql(`insert into public.writing_prompts (prompt_ro, prompt_en, starts_on)
      values ('${earlier.ro}', '${earlier.en}', public.romania_today() - 21);`);
  });
  test.afterAll(cleanUp);

  test('an admin adds this week’s prompt on the staff page', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/hub');
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(
      page.getByRole('heading', { level: 1, name: 'Spațiul scriitorilor' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Adaugă o temă' }).click();
    // Save stays off until both texts and the day are in.
    await expect(page.getByRole('button', { name: 'Salvează' })).toBeDisabled();
    await page.getByLabel('Tema în engleză').fill(thisWeek.en);
    await page.getByLabel('Tema în română').fill(thisWeek.ro);
    await page.getByLabel('Ziua de început').fill(runSql(`select public.romania_today();`).trim());
    await page.getByRole('button', { name: 'Salvează' }).click();
    const list = page.getByRole('list', { name: 'Teme de scris, de la cea mai nouă' });
    await expect(list.getByText(thisWeek.en)).toBeVisible();
    await expect(list.getByText(earlier.en)).toBeVisible();
    // A second prompt on the same day is refused in plain words.
    await page.getByRole('button', { name: 'Adaugă o temă' }).click();
    await page.getByLabel('Tema în engleză').fill('Twice (e2e).');
    await page.getByLabel('Tema în română').fill('De două ori (e2e).');
    await page.getByLabel('Ziua de început').fill(runSql(`select public.romania_today();`).trim());
    await page.getByRole('button', { name: 'Salvează' }).click();
    await expect(
      page.getByText('O altă temă începe deja în ziua aceea. Alege altă zi.'),
    ).toBeVisible();
    await page.context().close();
  });

  test('a writer pages through the prompts and starts a story from this week’s', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'adult_writer', '/hub');
    await page.setViewportSize({ width: 390, height: 900 });
    const card = page.getByRole('region', { name: 'Tema săptămânii' });
    await expect(card.getByText(thisWeek.ro)).toBeVisible();
    await expect(card.getByText('se încheie în 6 zile')).toBeVisible();
    // "Another prompt" shows the earlier one, which is no longer running, and then wraps round.
    await card.getByRole('button', { name: 'Altă temă' }).click();
    const earlierCard = page.getByRole('region', { name: 'Temă mai veche' });
    await expect(earlierCard.getByText(earlier.ro)).toBeVisible();
    await expect(earlierCard.getByText(/se încheie/)).toHaveCount(0);
    await earlierCard.getByRole('button', { name: 'Altă temă' }).click();
    await expect(card.getByText(thisWeek.ro)).toBeVisible();
    // The new-story screen keeps the prompt in sight.
    await card.getByRole('link', { name: 'Scrie pornind de la temă' }).click();
    await expect(page).toHaveURL(/\/write\/new\?prompt=[0-9a-f-]{36}$/);
    await expect(page.getByText('Scrii pornind de la tema aceasta')).toBeVisible();
    await expect(page.getByText(thisWeek.ro)).toBeVisible();
    await page.getByRole('textbox', { name: 'Titlu' }).fill(storyTitle);
    await page.getByRole('radio', { name: 'Toate vârstele', exact: true }).click();
    await page.getByRole('radio', { name: 'Fără AI', exact: true }).click();
    await page.getByRole('button', { name: 'Creează și scrie primul capitol' }).click();
    await expect(page).toHaveURL(/\/write\/s\/[a-z0-9-]+\/c\/[a-z0-9]{8}$/);
    // The story remembers its prompt, and the hub counts its writer.
    expect(
      runSql(`select prompt_en from public.stories join public.writing_prompts
        on writing_prompts.id = stories.writing_prompt_id where stories.title = '${storyTitle}';`).trim(),
    ).toBe(thisWeek.en);
    await page.goto('/hub');
    await expect(card.getByText('1 scriitor a încercat-o · se încheie în 6 zile')).toBeVisible();
    await page.context().close();
  });

  for (const view of [
    { persona: 'adult_writer', address: '/hub', width: 390, theme: 'night' },
    { persona: 'adult_writer', address: '/hub', width: 1440, theme: 'light' },
    { persona: 'admin', address: '/staff/hub', width: 390, theme: 'light' },
    { persona: 'admin', address: '/staff/hub', width: 1440, theme: 'night' },
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
