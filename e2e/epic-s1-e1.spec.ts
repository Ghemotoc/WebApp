/**
 * Epic check for S1-E1, Foundations and delivery pipeline (story S1-E1-QA).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (the "e2e" job, with the local
 * Supabase running). It adds no feature: it walks the epic's main journeys across its stories.
 * - S1-E1-01 (repository, brand config, translations, CI) × S1-E1-03 (tokens, themes, shell)
 *   × S1-E1-04 (language): a visitor switches language and theme, and both survive a reload.
 * - S1-E1-02 (database baseline, account gate, seed personas) × S1-E1-04 (account language): the
 *   personas adult_writer, teen_17, kid_14_ok and kid_14_waiting sign in, read only their own data,
 *   are refused other people's, and keep their language on a second device.
 * - S1-E1-02 alone, from a real API client: signed-out reads of people's tables are refused; only public switches come back.
 * - Every screen of the epic (/ and /design) passes axe at 390, 768 and 1440 px, in light and
 *   night, in Romanian and English (CLAUDE.md rule 21; WCAG 2.2 AA).
 * Test data: seed personas only (supabase/seed.sql), never real accounts.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { brand } from '../src/config/brand';
import { THEME_STORAGE_KEY } from '../src/lib/theme';

import {
  makeTestClient,
  signInPersona,
  useSessionInBrowser,
  type PersonaName,
} from './support/personas';

/**
 * The language key in localStorage: the same value as LANGUAGE_STORAGE_KEY in
 * src/lib/language-preference.ts, written out here because that file pulls in the app's
 * translations, which the test runner can't load. If the two ever differ, the axe tests below fail
 * on their first check (the page's language).
 */
const LANGUAGE_STORAGE_KEY = 'interface-language';

/** The seed personas' user IDs (supabase/README.md). Used only in API calls, never on screen. */
const personaIds: Record<PersonaName, string> = {
  adult_writer: '00000000-0000-4000-8000-000000000001',
  teen_17: '00000000-0000-4000-8000-000000000002',
  kid_14_ok: '00000000-0000-4000-8000-000000000003',
  kid_14_waiting: '00000000-0000-4000-8000-000000000004',
};

/** The page background in each theme, from src/styles/tokens.css (--paper). */
const paperColour = { light: 'rgb(250, 248, 245)', night: 'rgb(30, 15, 36)' };

/** The home heading in each language. */
const homeHeading = {
  ro: `Bun venit la ${brand.productName}`,
  en: `Welcome to ${brand.productName}`,
};

/** Waits until every entrance animation has finished, so checks see the final colours. */
async function waitForAnimations(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState === 'finished'),
  );
}

/** The app frame's computed background colour (AppLayout's bg-paper: the --paper token in use). */
async function pageBackground(page: Page) {
  return page.evaluate(() => {
    const appFrame = document.querySelector('#root > div') ?? document.body;
    return getComputedStyle(appFrame).backgroundColor;
  });
}

/** Opens the app as a signed-in persona in a fresh browser context (one "device"). */
async function openAsPersona(browser: Browser, persona: PersonaName) {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  const page = await context.newPage();
  await page.goto('/');
  return { context, page };
}

/** Puts a persona back on Romanian, the seed state, so every test starts from the same place. */
async function resetLanguage(persona: PersonaName) {
  const { client } = await signInPersona(persona);
  const { error } = await client.rpc('set_my_locale', { new_locale: 'ro' });
  expect(error).toBeNull();
}

test.describe('journey 1: a visitor switches language and theme (S1-E1-01, 03, 04)', () => {
  test.use({ locale: 'en-GB', colorScheme: 'light' });

  test('Romanian and light first; English and night after switching; both kept after a reload', async ({
    page,
  }) => {
    // First visit: Romanian whatever the browser language, light tokens on a light device.
    await page.goto('/');
    await waitForAnimations(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(homeHeading.ro);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await pageBackground(page)).toBe(paperColour.light);

    // English from the top bar, Night from the footer.
    await page.getByRole('banner').getByRole('combobox', { name: 'Limbă' }).selectOption('en');
    await page
      .getByRole('contentinfo')
      .getByRole('combobox', { name: 'Theme' })
      .selectOption('night');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(homeHeading.en);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
    expect(await pageBackground(page)).toBe(paperColour.night);

    // Both choices are kept in this browser and survive a reload, on every screen of the epic.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(homeHeading.en);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
    expect(await page.evaluate((key) => localStorage.getItem(key), LANGUAGE_STORAGE_KEY)).toBe(
      'en',
    );
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY)).toBe(
      'night',
    );
    await page.goto('/design');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'night');
  });
});

test.describe('journeys 2 to 4: the personas (S1-E1-02 × S1-E1-04)', () => {
  // These tests change the personas' saved language, so they run one after another.
  test.describe.configure({ mode: 'serial' });

  test.afterEach(async () => {
    for (const persona of Object.keys(personaIds) as PersonaName[]) await resetLanguage(persona);
  });

  test('adult_writer: an active member whose language follows them from device to device', async ({
    browser,
  }) => {
    // Their account already says English (chosen earlier, on another device).
    const { client } = await signInPersona('adult_writer');
    expect((await client.rpc('set_my_locale', { new_locale: 'en' })).error).toBeNull();
    expect((await client.rpc('is_active_member')).data).toBe(true);

    // Device 1 opens in English, then they switch to Română from the footer.
    const firstDevice = await openAsPersona(browser, 'adult_writer');
    await expect(firstDevice.page.getByRole('heading', { level: 1 })).toHaveText(homeHeading.en);
    await firstDevice.page
      .getByRole('contentinfo')
      .getByRole('combobox', { name: 'Language' })
      .selectOption('ro');
    await expect(firstDevice.page.getByText('Limba a fost salvată în contul tău.')).toBeAttached();

    // Device 2 opens in Romanian.
    const secondDevice = await openAsPersona(browser, 'adult_writer');
    await expect(secondDevice.page.getByRole('heading', { level: 1 })).toHaveText(homeHeading.ro);
    await firstDevice.context.close();
    await secondDevice.context.close();
  });

  test('teen_17: reads only their own profile, may not write in March, and can still pick a language', async ({
    browser,
  }) => {
    const { client } = await signInPersona('teen_17');

    // Own profile only: the policy hides everyone else's, even when asked by ID.
    const ownProfiles = await client.from('profiles').select('id');
    expect(ownProfiles.data).toEqual([{ id: personaIds.teen_17 }]);
    const adultsProfile = await client
      .from('profiles')
      .select('id')
      .eq('id', personaIds.adult_writer);
    expect(adultsProfile.data).toEqual([]);

    // Under 18 while adults_only is on (decided 17 Oct 2026, 12:44): not an active member.
    expect((await client.rpc('age_band')).data).toBe('16_to_17');
    expect((await client.rpc('is_active_member')).data).toBe(false);

    // The language still saves: a read-only account can choose how the app talks to it.
    const device = await openAsPersona(browser, 'teen_17');
    await device.page
      .getByRole('banner')
      .getByRole('combobox', { name: 'Limbă' })
      .selectOption('en');
    await expect(device.page.getByText('Language saved to your account.')).toBeAttached();
    await device.context.close();
  });

  for (const persona of ['kid_14_ok', 'kid_14_waiting'] as const) {
    test(`${persona}: an under-16 who is read-only, sees no staff data and can still pick a language`, async ({
      browser,
    }) => {
      const { client } = await signInPersona(persona);

      // Under 16: read-only until S1-E2-03 (consent) and the minors' launch gate.
      expect((await client.rpc('age_band')).data).toBe('13_to_15');
      expect((await client.rpc('is_active_member')).data).toBe(false);

      // No staff data, and no way to write to the audit log.
      expect((await client.from('staff_roles').select('id')).data).toEqual([]);
      expect((await client.from('audit_log').select('id')).data).toEqual([]);
      const auditWrite = await client.rpc('log_staff_action', {
        action_taken: 'test.action',
        target_table: 'profiles',
      });
      expect(auditWrite.error?.code).toBe('42501');

      // The language still saves to their account and opens on a second device.
      const firstDevice = await openAsPersona(browser, persona);
      await firstDevice.page
        .getByRole('banner')
        .getByRole('combobox', { name: 'Limbă' })
        .selectOption('en');
      await expect(firstDevice.page.getByText('Language saved to your account.')).toBeAttached();
      const secondDevice = await openAsPersona(browser, persona);
      await expect(secondDevice.page.getByRole('heading', { level: 1 })).toHaveText(homeHeading.en);
      await firstDevice.context.close();
      await secondDevice.context.close();
    });
  }
});

test("journey 5: signed out, the API returns no one's data, only the public switches (S1-E1-02)", async () => {
  const signedOutClient = makeTestClient();

  // Tables about people: refused outright, because anon holds no grant on them (S1-E1-02 fix,
  // 17 Oct 2026), the same as on staging and production.
  for (const tableName of ['profiles', 'staff_roles', 'audit_log'] as const) {
    const { data, error } = await signedOutClient.from(tableName).select('id');
    expect(error?.code).toBe('42501');
    expect(data).toBeNull();
  }

  // Switches and settings: only the rows marked public, with the March switches on.
  const flags = await signedOutClient.from('feature_flags').select('key, is_enabled, is_public');
  expect(flags.data?.every((flag) => flag.is_public)).toBe(true);
  expect(flags.data).toContainEqual({ key: 'adults_only', is_enabled: true, is_public: true });
  const settings = await signedOutClient.from('settings').select('key, is_public');
  expect(settings.data?.every((setting) => setting.is_public)).toBe(true);

  // Saving a language needs an account.
  const signedOutSave = await signedOutClient.rpc('set_my_locale', { new_locale: 'en' });
  expect(signedOutSave.error).not.toBeNull();
});

/** One screen as one visitor sees it: address, width, theme and language. */
interface ScreenView {
  address: string;
  width: number;
  theme: 'light' | 'night';
  language: 'ro' | 'en';
}

/**
 * Lists every screen of the epic (/ and /design) at 390, 768 and 1440 px, in light and night, in
 * Romanian and English: 24 views.
 *
 * @returns the views, one per axe test
 */
function everyEpicScreenView(): ScreenView[] {
  const views: ScreenView[] = [];
  for (const address of ['/', '/design']) {
    for (const width of [390, 768, 1440]) {
      for (const theme of ['light', 'night'] as const) {
        views.push(
          { address, width, theme, language: 'ro' },
          { address, width, theme, language: 'en' },
        );
      }
    }
  }
  return views;
}

for (const { address, width, theme, language } of everyEpicScreenView()) {
  test(`axe: ${address} at ${width} px, ${theme}, ${language}: no serious or critical issues, no sideways scroll`, async ({
    page,
  }) => {
    // Choose the theme and language the way a returning visitor's browser would have them.
    await page.addInitScript(
      ([themeKey, themeValue, languageKey, languageValue]) => {
        localStorage.setItem(themeKey, themeValue);
        localStorage.setItem(languageKey, languageValue);
      },
      [THEME_STORAGE_KEY, theme, LANGUAGE_STORAGE_KEY, language] as const,
    );
    await page.setViewportSize({ width, height: 900 });
    await page.goto(address);
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await waitForAnimations(page);

    // axe checks the page against WCAG 2.0, 2.1 and 2.2, levels A and AA.
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const seriousIssues = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(seriousIssues).toEqual([]);

    // Nothing may scroll sideways at any width (CLAUDE.md rule 21).
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth).toBeLessThanOrEqual(width);
  });
}
