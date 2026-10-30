/**
 * The website CMS and the public home page in a real browser (stories S1-E11-06, S1-E11-10,
 * S1-E11-12 and S1-E5-08).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - a visitor sees the CMS home page (hero, safety lines, questions) and opens a question;
 * - an admin changes the English line under the headline, sees the counter, publishes, and a
 *   visitor reading in English sees it; the publish is in the audit log (S1-E11-06);
 * - an empty field stops the publish with the field named (criterion 5);
 * - an admin publishes a notice; it shows on every page, and closing it hides it for the visit
 *   (S1-E11-10);
 * - Help lists the seeded pages and opens one (S1-E11-12);
 * - a moderator who types the address is told the page isn't theirs;
 * - the home page, Help and Staff › Website pass axe at 390, 768 and 1440 px.
 * Test data: the seeded version 1. Everything this spec publishes is deleted afterwards, so the
 * seeded copy is live again for the other specs.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** Opens an address in a language, as a persona or as a visitor. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName | null,
  address: string,
  language: 'en' | 'ro' = 'en',
): Promise<Page> {
  const context = await browser.newContext();
  if (persona !== null) {
    runSql(`update public.profiles set locale = '${language}' where handle = '${persona}';`);
    await useSessionInBrowser(context, (await signInPersona(persona)).session);
  }
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    language,
  ] as const);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Website CMS (S1-E11-06, S1-E11-10, S1-E11-12, S1-E5-08)', () => {
  test.describe.configure({ mode: 'serial' });
  test.afterAll(() => {
    runSql(`
      delete from public.cms_versions where user_id is not null or is_removal;
      update public.profiles set locale = 'ro' where handle in ('admin', 'owner', 'moderator');`);
  });

  test('a visitor reads the home page from the CMS', async ({ browser }) => {
    const page = await openAs(browser, null, '/', 'ro');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Scrie povești. Fii citit.');
    await expect(page.getByText('Yoti face verificarea vârstei.', { exact: false })).toBeVisible();
    // The questions open one at a time.
    await page.getByText('Ce e un spațiu de clasă?').click();
    await expect(
      page.getByText('Un spațiu privat pentru o singură clasă.', { exact: false }),
    ).toBeVisible();
  });

  test('an admin publishes a new line and visitors see it, logged', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/website');
    await expect(page.getByRole('heading', { level: 1, name: 'Website' })).toBeVisible();
    await page.getByLabel('Language of the content').selectOption('en');
    const lede = page.getByRole('textbox', { name: 'Line under the headline' });
    await expect(lede).toHaveValue(/Post your stories/);
    // Step 1: an empty field stops the publish, named.
    await lede.fill('');
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText('Fix these fields before publishing')).toBeVisible();
    await expect(page.getByText('Line under the headline: Fill this in.')).toBeVisible();
    // Step 2: a new line, with its counter, goes live today.
    await lede.fill('Share a chapter today and meet your readers.');
    await expect(page.getByText('44 of 170 characters')).toBeVisible();
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText(/Published\. It goes live on/)).toBeVisible();

    const visitor = await openAs(browser, null, '/', 'en');
    await expect(visitor.getByText('Share a chapter today and meet your readers.')).toBeVisible();
    expect(
      runSql(`select count(*) from public.audit_log where action = 'website.published'
              and after_values -> 'content' ->> 'lede' = 'Share a chapter today and meet your readers.'`),
    ).toBe('1');
  });

  test('an admin publishes a notice and a visitor can close it', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/website/notices');
    await page.getByRole('button', { name: 'New notice' }).click();
    await page
      .getByRole('textbox', { name: 'Text in Română' })
      .fill('Avem rafturi noi în Descoperă.');
    await page
      .getByRole('textbox', { name: 'Text in English' })
      .fill('There are new shelves on Discover.');
    await page.getByRole('textbox', { name: 'Link (optional)' }).fill('/discover');
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByText(/Published\. It goes live on/)).toBeVisible();

    const visitor = await openAs(browser, null, '/legal/terms', 'en');
    const notice = visitor.getByRole('region', { name: 'Notice' });
    await expect(notice.getByText('There are new shelves on Discover.')).toBeVisible();
    await notice.getByRole('button', { name: 'Close this notice' }).click();
    await expect(notice).toHaveCount(0);
    await visitor.goto('/contact');
    await expect(visitor.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(visitor.getByRole('region', { name: 'Notice' })).toHaveCount(0);
  });

  test('Help lists the help pages and opens one', async ({ browser }) => {
    const page = await openAs(browser, null, '/help', 'en');
    await expect(page.getByRole('heading', { level: 1, name: 'How can we help?' })).toBeVisible();
    await page.getByRole('link', { name: 'Reporting and safety' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Reporting and safety' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'report something without an account' }),
    ).toHaveAttribute('href', '/report');
  });

  test('a moderator is told the page is not theirs', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff/website');
    await expect(page.getByText('Only the owner and admins can edit the website.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish' })).toHaveCount(0);
  });

  for (const view of everyView(['/', '/help', '/help/getting-started'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }

  for (const view of everyView(['/staff/website'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'owner';`);
      await useSessionInBrowser(page.context(), (await signInPersona('owner')).session);
      await checkScreen(page, view);
    });
  }
});
