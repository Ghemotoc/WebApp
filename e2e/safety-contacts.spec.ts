/**
 * The "Is someone in danger right now?" block in a real browser (story S1-E10-13a).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request.
 * What it proves:
 * - adult_writer (Romania) sees 112, Telefonul Copilului 116 111 and Ora de Net in the report
 *   dialog, each from the database, with "Official site" links that open in a new tab;
 * - a signed-out visitor from Great Britain (faked connection) sees British contacts on
 *   /legal/contact, and "Wrong country?" switches to Romania;
 * - a visitor from a country with no row (France) sees "Call your local emergency number", the
 *   two international directories (Child Helpline International, INHOPE) and
 *   the gap is counted for staff;
 * - on a phone the number is a tel: link, on a desktop plain text;
 * - /legal/contact with the block passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: seed personas; the France gap row is removed afterwards.
 */
import { expect, test, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** Opens an address in English, with the connection's country faked for the local server. */
async function openFrom(page: Page, country: string, address: string) {
  await page.setExtraHTTPHeaders({ 'X-Fake-Country': country });
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  await page.goto(address);
}

test.describe('safety contacts (S1-E10-13a)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`delete from public.safety_contact_gaps where country_code = 'FR';
      update public.profiles set locale = 'ro' where handle = 'adult_writer';`);
  });

  test('adult_writer sees Romania’s contacts in the report dialog', async ({ page }) => {
    await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
    runSql(`update public.profiles set locale = 'en' where handle = 'adult_writer';`);
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.goto('/design#report');
    await page.getByRole('button', { name: 'Report @adult_writer' }).click();
    const block = page.getByRole('region', { name: 'Is someone in danger right now?' });
    await expect(block).toContainText('Contacts for Romania');
    await expect(block).toContainText('112');
    await expect(block).toContainText('Telefonul Copilului');
    await expect(block).toContainText('116 111');
    await expect(block).toContainText('Mon to Fri 10:00 to 20:00');
    // Telefonul Copilului is listed twice on purpose: the children's helpline and the youth crisis line.
    const site = block.getByRole('link', { name: /Official site: Telefonul Copilului/ }).first();
    await expect(site).toHaveAttribute('href', 'https://www.telefonulcopilului.ro');
    await expect(site).toHaveAttribute('target', '_blank');
    await expect(site).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(block).toContainText('Ora de Net');
    // No adult-only line (decided 23 Oct 2026, Q9a) and the number is text on a desktop.
    await expect(block).not.toContainText('Alianța Română');
    await expect(block.getByRole('link', { name: /^Call / })).toHaveCount(0);
  });

  test('a signed-out visitor from Great Britain sees British contacts and can switch country', async ({
    page,
  }) => {
    await openFrom(page, 'GB', '/legal/contact');
    const block = page.getByRole('region', { name: 'Is someone in danger right now?' });
    await expect(block).toContainText('Contacts for United Kingdom');
    await expect(block).toContainText('999');
    await block.getByRole('combobox', { name: 'Wrong country?' }).selectOption('RO');
    await expect(block).toContainText('Contacts for Romania');
    await expect(block).toContainText('116 111');
  });

  test('a visitor from a country with no row sees the fallback and the gap is counted', async ({
    page,
  }) => {
    const before = Number(
      runSql(
        `select coalesce(sum(times_seen), 0) from public.safety_contact_gaps where country_code = 'FR'`,
      ),
    );
    await openFrom(page, 'FR', '/legal/contact');
    const block = page.getByRole('region', { name: 'Is someone in danger right now?' });
    await expect(block).toContainText('Call the local emergency number.');
    await expect(block).toContainText('We don’t have checked contacts for your country yet.');
    // The two international directories, checked by the CTO on 24 Oct 2026 (Q9c).
    await expect(block).toContainText('International directories, checked October 24, 2026:');
    await expect(
      block.getByRole('link', { name: /Child Helpline International: find a child helpline/ }),
    ).toHaveAttribute('href', 'https://childhelplineinternational.org/helplines/');
    await expect(
      block.getByRole('link', { name: /INHOPE: find your national hotline/ }),
    ).toHaveAttribute('href', 'https://inhope.org');
    await expect
      .poll(() =>
        Number(
          runSql(
            `select coalesce(sum(times_seen), 0) from public.safety_contact_gaps where country_code = 'FR'`,
          ),
        ),
      )
      .toBe(before + 1);
  });

  test('on a phone the number is a tappable link', async ({ browser }) => {
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await phone.newPage();
    await openFrom(page, 'RO', '/legal/contact');
    const block = page.getByRole('region', { name: 'Is someone in danger right now?' });
    await expect(
      block.getByRole('link', { name: 'Call Telefonul Copilului on 116 111' }),
    ).toHaveAttribute('href', 'tel:116111');
    await phone.close();
  });

  for (const view of everyView(['/legal/contact'])) {
    test(`axe: ${view.address} with the block at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await page.setExtraHTTPHeaders({ 'X-Fake-Country': 'RO' });
      await checkScreen(page, view);
      await expect(page.getByText('116 111').first()).toBeVisible();
    });
  }
});
