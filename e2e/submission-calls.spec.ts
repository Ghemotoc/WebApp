/**
 * Calls for submissions in a real browser (bundle GAPS-12d; board WritersHub, "Calls for
 * submissions").
 *
 * What it proves:
 * - an admin adds a paid call at /staff/hub; Save stays off until the address starts with
 *   https:// and every field is in;
 * - an adult sees the call on the Writers' hub with "Paid", how long it stays open, and a link
 *   that opens the organiser's page in a new tab with rel="nofollow noopener noreferrer";
 * - a 17-year-old sees the unpaid call and never the paid one;
 * - the hub with the list in has no serious axe issue at phone and desktop width.
 * The database rules (who may write calls, what the link may be, closed calls) are in
 * supabase/tests/database/335-submission-calls.test.sql.
 * Test data: the seed's admin, adult_writer and teen_17, who read in Romanian; an unpaid call
 * made in SQL; everything is removed afterwards (the audit log keeps its rows: append-only).
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const paidCall = { en: 'Winter anthology (e2e)', ro: 'Antologie de iarnă (e2e)' };
const unpaidCall = { en: 'School magazine (e2e)', ro: 'Revista școlii (e2e)' };

/** Removes the calls this spec made. */
function cleanUp() {
  runSql(`delete from public.submission_calls where title_en like '%(e2e)';`);
}

/** Opens a page as a seed persona, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName, path: string) {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('calls for submissions (GAPS-12d)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    runSql(`insert into public.submission_calls (title_ro, title_en, details_ro, details_en, link_url, closes_on)
      values ('${unpaidCall.ro}', '${unpaidCall.en}', 'Poezii și proză scurtă de la elevi.',
        'Poems and short fiction from students.', 'https://example.org/school', public.romania_today() + 30);`);
  });
  test.afterAll(cleanUp);

  test('an admin adds a paid call on the staff page', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/hub');
    await page.setViewportSize({ width: 1440, height: 900 });
    const section = page.getByRole('region', { name: 'Apeluri de texte' });
    await section.getByRole('button', { name: 'Adaugă un apel' }).click();
    await section.getByLabel('Titlul în engleză').fill(paidCall.en);
    await section.getByLabel('Titlul în română').fill(paidCall.ro);
    await section.getByLabel('Detalii în engleză').fill('Short fiction, up to 3,000 words.');
    await section.getByLabel('Detalii în română').fill('Proză scurtă, până la 3.000 de cuvinte.');
    await section
      .getByLabel('Ultima zi', { exact: true })
      .fill(runSql(`select public.romania_today() + 9;`).trim());
    await section.getByLabel('Organizatorul plătește textele').check();
    // An address that isn't https keeps Save off.
    await section.getByLabel('Pagina organizatorului').fill('http://example.org/winter');
    await expect(section.getByRole('button', { name: 'Salvează' })).toBeDisabled();
    await section.getByLabel('Pagina organizatorului').fill('https://example.org/winter');
    await section.getByRole('button', { name: 'Salvează' }).click();
    const list = section.getByRole('list', {
      name: 'Apeluri de texte, de la ultima zi cea mai îndepărtată',
    });
    await expect(list.getByText(paidCall.en)).toBeVisible();
    await expect(list.getByText('https://example.org/winter')).toBeVisible();
    await page.context().close();
  });

  test('an adult sees the paid call with a safe link to the organiser', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/hub');
    await page.setViewportSize({ width: 390, height: 900 });
    const calls = page.getByRole('region', { name: 'Apeluri de texte' });
    const link = calls.getByRole('link', {
      name: new RegExp(`^${paidCall.ro.replace(/[()]/g, '\\$&')}`),
    });
    await expect(link).toHaveAttribute('href', 'https://example.org/winter');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'nofollow noopener noreferrer');
    const row = calls.getByRole('listitem').filter({ hasText: paidCall.ro });
    await expect(row.getByText('Plătit', { exact: true })).toBeVisible();
    await expect(row.getByText('Se închide în 9 zile')).toBeVisible();
    // Soonest closing first: the paid call (9 days) sits above the unpaid one (30 days).
    await expect(calls.getByRole('listitem').first()).toContainText(paidCall.ro);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();
  });

  test('a 17-year-old sees the unpaid call and never the paid one', async ({ browser }) => {
    const page = await openAs(browser, 'teen_17', '/hub');
    const calls = page.getByRole('region', { name: 'Apeluri de texte' });
    await expect(calls.getByText(unpaidCall.ro)).toBeVisible();
    await expect(calls.getByText(paidCall.ro)).toHaveCount(0);
    await expect(calls.getByText('Plătit', { exact: true })).toHaveCount(0);
    await page.context().close();
  });

  for (const view of [
    { persona: 'adult_writer', address: '/hub', width: 390, theme: 'night' },
    { persona: 'adult_writer', address: '/hub', width: 1440, theme: 'light' },
    { persona: 'admin', address: '/staff/hub', width: 390, theme: 'night' },
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
