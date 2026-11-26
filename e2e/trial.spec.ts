/**
 * End-to-end tests for the trial's "Report a bug" tab and the computers-only gate (TRIAL-FEEDBACK
 * and TRIAL-DESKTOP; boards J30 to J33).
 * What it proves:
 * - with trial_feedback on, a signed-in member sees the tab, sends a report, reads the thank-you
 *   line, and the support inbox gets "Bug report" with the kind, page, browser and screen;
 * - a signed-out visitor sees no tab; with the flag off, nobody does;
 * - with desktop_only on, a phone sees "For now, the test runs on a computer" instead of the page,
 *   the Legal centre stays open, and a computer sees the page as usual;
 * - axe finds nothing serious on the panel or the computers-only page, in ro and en, day and night.
 * Who runs it: `npm run test:e2e`, and CI on every pull request. The flags are switched off again
 * after each test, so the specs after this one see the app as it ships.
 */
import { type Browser, type Page } from '@playwright/test';
import { expect, test } from './support/test';

import { brand } from '../src/config/brand';

import { checkScreen, LANGUAGE_STORAGE_KEY, type ScreenView } from './support/accessibility';
import { runSql } from './support/database';
import { waitForEmail } from './support/mailpit';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** A fresh word per run, so the Mailpit search finds this run's report. */
const stamp = String(Date.now());

/** Switches the trial flags. */
function setFlags(flags: { trialFeedback: boolean; desktopOnly: boolean }) {
  runSql(
    `update public.feature_flags set is_enabled = ${String(flags.trialFeedback)} where key = 'trial_feedback';
     update public.feature_flags set is_enabled = ${String(flags.desktopOnly)} where key = 'desktop_only';`,
  );
}

/**
 * Opens an address as adult_writer, on a computer, in one language. The account's own language
 * wins over the browser's once signed in, so both are set.
 */
async function openAsMember(
  browser: Browser,
  address: string,
  language: 'ro' | 'en' = 'en',
): Promise<Page> {
  runSql(`update public.profiles set locale = '${language}' where handle = 'adult_writer';`);
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('adult_writer')).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('the trial (TRIAL-FEEDBACK, TRIAL-DESKTOP)', () => {
  test.afterEach(() => setFlags({ trialFeedback: false, desktopOnly: false }));

  test('a member reports a bug from the tab and the support inbox gets it with the page details', async ({
    browser,
  }) => {
    setFlags({ trialFeedback: true, desktopOnly: false });
    const page = await openAsMember(browser, '/library');
    await page.getByRole('button', { name: 'Report a bug' }).click();
    const panel = page.getByRole('dialog', { name: 'Report a bug' });
    const send = panel.getByRole('button', { name: 'Send' });
    // Design books item 9: Send stays pressable; pressed with nothing written, it says what is
    // missing and sends nothing.
    await expect(send).toBeEnabled();
    await send.click();
    await expect(panel.getByText('Say what happened first.')).toBeVisible();
    await expect(panel.getByLabel('What happened?')).toBeFocused();
    await panel.getByRole('radio', { name: 'Something looks wrong' }).click();
    await panel.getByLabel('What happened?').fill(`The shelf overlaps the footer ${stamp}`);
    await send.click();
    await expect(panel.getByText(/Thank you\. We have your report/)).toBeVisible();

    const staffCopy = await waitForEmail(brand.supportEmail, 15_000, 'Bug report');
    expect(staffCopy.Text).toContain(`The shelf overlaps the footer ${stamp}`);
    // The email's lines end in CRLF, so each line is checked on its own.
    expect(staffCopy.Text).toContain('Kind: Something looks wrong');
    expect(staffCopy.Text).toContain('Page: /library');
    expect(staffCopy.Text).toMatch(/Browser: Chrome \d+ on /);
    expect(staffCopy.Text).toMatch(/Screen: \d+ × \d+ window, \d+ × \d+ screen/);
    expect(staffCopy.Text).toContain('@adult_writer');

    // Close: the panel goes, and focus is back on the tab.
    // The thank-you's own Close (the × at the top has the same name).
    await panel.getByRole('button', { name: 'Close', exact: true }).last().click();
    await expect(panel).toBeHidden();
    await expect(page.getByRole('button', { name: 'Report a bug' })).toBeFocused();
  });

  test('a visitor sees no tab, and nobody does while the flag is off', async ({
    browser,
    page,
  }) => {
    setFlags({ trialFeedback: true, desktopOnly: false });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Report a bug|Raportează o eroare/ }),
    ).toHaveCount(0);

    setFlags({ trialFeedback: false, desktopOnly: false });
    const member = await openAsMember(browser, '/library');
    await expect(member.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(member.getByRole('button', { name: 'Report a bug' })).toHaveCount(0);
  });

  test('a phone sees the computers-only page while desktop_only is on; a computer sees the page', async ({
    browser,
    page,
  }) => {
    setFlags({ trialFeedback: false, desktopOnly: true });
    const phone = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    await phone.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    const phonePage = await phone.newPage();
    await phonePage.goto('/library');
    await expect(
      phonePage.getByRole('heading', { level: 1, name: 'For now, the test runs on a computer' }),
    ).toBeVisible();
    await expect(phonePage.getByRole('button', { name: 'Copy link' })).toBeVisible();
    // The Legal centre stays open (a DSA contact point).
    await phonePage.goto('/legal/terms');
    await expect(phonePage.getByRole('heading', { level: 1 })).not.toHaveText(
      'For now, the test runs on a computer',
    );

    // A computer, even with a narrow window, sees the page itself.
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByText('For now, the test runs on a computer')).toHaveCount(0);
  });

  test('axe: the panel and the computers-only page, in ro and en, day and night', async ({
    browser,
  }) => {
    setFlags({ trialFeedback: true, desktopOnly: true });
    for (const language of ['ro', 'en'] as const) {
      for (const theme of ['light', 'night'] as const) {
        // The panel, on a computer at 1440 px.
        const member = await openAsMember(browser, '/library', language);
        const panelView: ScreenView = { address: '/library', width: 1440, theme, language };
        await checkScreen(member, panelView, async (opened) => {
          await opened.locator('[data-bug-report-tab]').click();
          await expect(opened.getByRole('dialog')).toBeVisible();
        });
        await member.context().close();
        // The computers-only page, on a phone.
        const phone = await browser.newContext({ hasTouch: true, isMobile: true });
        const phonePage = await phone.newPage();
        await checkScreen(phonePage, { address: '/library', width: 390, theme, language });
        await phone.close();
      }
    }
  });
});
