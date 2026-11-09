/**
 * The age rules by country in a real browser (bundle MARKETS-1, stories S1-E2-20 to S1-E2-23;
 * Robert, 6 Nov 2026).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - a member who never said where they live is not asked: the country from the connection at
 *   sign-up stays (Robert, 8 Nov 2026, replacing "asked once" from S1-E2-20);
 * - Settings checks the new country's rule before saving: Australia refuses a 14-year-old and
 *   nothing changes (S1-E2-20, S1-E2-22);
 * - staff change a rule in Settings › Age rules by country with a reason, and it is audited
 *   (S1-E2-21);
 * - under the privacy notice, "Country" names the reader's country and its ages, and "Ages by
 *   country" lists Quebec's own 14 (S1-E2-23);
 * - the legal page passes axe and don't scroll sideways at 390 px (Romanian) and
 *   1440 px (English).
 * Test data: the seed personas; every change is put back afterwards.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { waitForAnimationsToFinish } from './support/animations';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The seed personas this spec changes. */
const writerId = '00000000-0000-4000-8000-000000000001';
const kidId = '00000000-0000-4000-8000-000000000003';

/** Opens an address, signed in as a persona or signed out, at a width, in a language. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
  view: { width: number; language: 'en' | 'ro'; fakeCountry?: string } = {
    width: 1440,
    language: 'en',
  },
): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: view.width, height: 1000 } });
  if (persona !== null) {
    runSql(`update public.profiles set locale = '${view.language}' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  if (view.fakeCountry !== undefined) {
    await context.setExtraHTTPHeaders({ 'X-Fake-Country': view.fakeCountry });
  }
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    view.language,
  ] as const);
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(address);
  return page;
}

/** Checks axe and the page width. */
async function expectAccessibleAndFitting(page: Page, width: number) {
  await waitForAnimationsToFinish(page);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious).toEqual([]);
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(width);
}

test.describe('the age rules by country (MARKETS-1)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`
      update public.profiles set country_code = 'RO', legal_region_code = '', country_chosen_at = now(),
        consent_grace_until = null, locale = 'ro'
        where id in ('${writerId}', '${kidId}');
      update public.profiles set locale = 'ro' where handle = 'admin';
      update public.country_age_rules set parental_consent_below = 13 where country_code = 'GB' and region_code = '';`);
  });

  test('a member who never said where they live is not asked; their country stays', async ({
    browser,
  }) => {
    // Robert, 8 Nov 2026: only the country is kept, taken from the connection at sign-up, so no
    // page asks where a member lives. Settings › Account is the one place to change it.
    runSql(`update public.profiles set country_chosen_at = null where id = '${writerId}';`);
    const page = await openAs(browser, 'adult_writer', '/discover');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('Which country do you live in?')).toHaveCount(0);
    await expect(page.getByLabel('Country you live in')).toHaveCount(0);
    expect(
      runSql(`select country_code from public.profiles where id = '${writerId}';`).trim(),
    ).toBe('RO');
    await page.context().close();
  });

  test('Settings checks the new country first: Australia refuses a 14-year-old', async ({
    browser,
  }) => {
    runSql(`update public.profiles set birth_year = extract(year from now())::integer - 15
      where id = '${kidId}';`);
    const page = await openAs(browser, 'kid_14_ok', '/settings');
    await page.getByRole('button', { name: 'Change country' }).click();
    await page.getByLabel('Country you live in').selectOption({ label: 'Australia' });
    await page.getByRole('button', { name: 'Save country' }).click();
    await expect(page.getByText(/People your age can’t use .+ in that country/)).toBeVisible();
    expect(runSql(`select country_code from public.profiles where id = '${kidId}';`).trim()).toBe(
      'RO',
    );
    await page.context().close();
  });

  test('staff change a rule with a reason, and it is audited', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/settings#age-rules');
    const section = page.getByRole('region', { name: 'Age rules by country' });
    await section.getByRole('button', { name: 'Edit United Kingdom' }).click();
    const editor = section.getByRole('form', { name: 'Age rule' });
    await editor.getByLabel('A parent agrees under age').fill('14');
    await editor.getByLabel('Why it changes').fill('e2e: a tested change');
    await editor.getByRole('button', { name: 'Save rule' }).click();
    await expect(section.getByText('Saved. New sign-ups follow the new rule now.')).toBeVisible();
    expect(
      runSql(`select count(*) from public.audit_log where action = 'age_rule.saved'
        and reason = 'e2e: a tested change' and after_values ->> 'parental_consent_below' = '14';`).trim(),
    ).toBe('1');
    await page.context().close();
  });

  test('the privacy notice ends with Your country and Ages by country', async ({ browser }) => {
    const page = await openAs(browser, null, '/legal/privacy', {
      width: 1440,
      language: 'en',
      fakeCountry: 'CA',
    });
    await page.getByText('Country: Canada').click();
    await expect(page.getByText('In Canada you can join from age 13.')).toBeVisible();
    await page.locator('summary', { hasText: 'Ages by country' }).click();
    const table = page.getByRole('table', { name: 'Ages by country' });
    const quebec = table.getByRole('row', { name: /Canada: Quebec/ });
    await expect(quebec.getByRole('cell').nth(1)).toHaveText('14');
    await expectAccessibleAndFitting(page, 1440);
    await page.context().close();
  });

  test('axe: the legal page at 390 px, in Romanian, with no country question', async ({
    browser,
  }) => {
    runSql(`update public.profiles set country_chosen_at = null where id = '${writerId}';`);
    const page = await openAs(browser, 'adult_writer', '/legal/terms', {
      width: 390,
      language: 'ro',
    });
    await expect(page.getByText('În ce țară locuiești?')).toHaveCount(0);
    await page.locator('summary', { hasText: 'Vârste pe țări' }).click();
    await expectAccessibleAndFitting(page, 390);
    await page.context().close();
  });
});
