/**
 * Interface text and email templates in a real browser (stories S1-E11-18 and S1-E11-19).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - an admin finds the footer's Help link by its words, publishes a new English label, a visitor
 *   sees it, and Reset to default brings the file text back (criteria 1, 2, 5, 7 and 9);
 * - a text that drops a placeholder is refused with the problem named (criterion 8);
 * - the Email templates tab lists the email keys with their placeholders as chips (S1-E11-19);
 * - a moderator who types the address is told the page isn't theirs (criterion 12);
 * - both tabs pass axe at 390, 768 and 1440 px, light and night, ro and en.
 * Test data: seed personas only; everything this spec saves is deleted afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** Opens an address in English, as a persona or as a visitor. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Interface text and email templates (S1-E11-18, S1-E11-19)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`
      delete from public.interface_text_overrides;
      update public.profiles set locale = 'ro' where handle in ('admin', 'owner', 'moderator');`);
  });

  test('an admin changes a label, a visitor sees it, and Reset brings the default back', async ({
    browser,
  }) => {
    const page = await openAs(browser, 'admin', '/staff/website/interface-text');
    await page.getByRole('searchbox', { name: 'Find a text' }).fill('common:nav.help');
    await page.getByRole('button', { name: 'Edit common:nav.help' }).click();
    const english = page.getByRole('region', { name: 'English' });
    await english.getByRole('textbox', { name: 'Text in English' }).fill('Get help');
    await english.getByRole('button', { name: 'Publish' }).click();
    await expect(english.getByText(/Published\. It goes live on/)).toBeVisible();

    const visitor = await openAs(browser, null, '/contact');
    await expect(
      visitor.getByRole('contentinfo').getByRole('link', { name: 'Get help' }),
    ).toBeVisible();

    await page.reload();
    await page.getByRole('searchbox', { name: 'Find a text' }).fill('common:nav.help');
    await page.getByRole('button', { name: 'Edit common:nav.help' }).click();
    await page
      .getByRole('region', { name: 'English' })
      .getByRole('button', { name: 'Reset to default' })
      .click();
    await expect(page.getByText('Back to the default text from today.')).toBeVisible();
    const later = await openAs(browser, null, '/contact');
    await expect(
      later.getByRole('contentinfo').getByRole('link', { name: 'Help', exact: true }),
    ).toBeVisible();
  });

  test('an email text that drops a placeholder is refused, named', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/website/emails');
    await page.getByRole('searchbox', { name: 'Find a text' }).fill('confirmation.body');
    await page.getByRole('button', { name: 'Edit email:confirmation.body' }).click();
    const english = page.getByRole('region', { name: 'English' });
    await expect(english.getByText('productName').first()).toBeVisible();
    await english
      .getByRole('textbox', { name: 'Text in English' })
      .fill('Thanks for joining. Press the button.');
    await english.getByRole('button', { name: 'Save draft' }).click();
    await expect(
      english
        .getByText('Keep the same placeholders (the chips in the preview) as the default text.')
        .first(),
    ).toBeVisible();
  });

  test('a moderator is told the page is not theirs', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/website/interface-text');
    await expect(page.getByText('Only the owner and admins can edit the website.')).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Find a text' })).toHaveCount(0);
  });

  for (const view of everyView(['/staff/website/interface-text', '/staff/website/emails'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'owner';`);
      await useSessionInBrowser(page.context(), (await signInPersona('owner')).session);
      await checkScreen(page, view);
    });
  }
});
