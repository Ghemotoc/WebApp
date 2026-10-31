/**
 * The Legal centre in a real browser (story S1-E14-01).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (the local Supabase is started first).
 * What it proves:
 * - a signed-out visitor reaches the terms, privacy notice and guidelines from the footer, in
 *   Romanian (the draft translation, said so) and in English, with the draft status, the
 *   after-the-test labels and the version history;
 * - after a new important version of the terms, adult_writer sees "We've updated our Terms", can
 *   still read, accepts, and the notice goes;
 * - axe finds no serious issue and nothing scrolls sideways at 390, 768 and 1440 px.
 * Test data: seed personas only. The new version is added with SQL and removed afterwards.
 * Run it on its own when the suite is split across parallel runs on one database: while the new
 * version exists every signed-in persona sees the notice, so other specs fail at random.
 */
import { expect, test } from '@playwright/test';

import { checkScreen, everyView } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

test('a signed-out visitor opens the terms from the footer, in Romanian, marked as a draft', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Termeni' }).click();

  await expect(page).toHaveURL(/\/legal\/terms$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Regulile, pe înțelesul tuturor' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Termeni de utilizare' }),
  ).toHaveAttribute('lang', 'ro');
  await expect(
    page.getByText('Ciornă: un avocat român o verifică înainte de lansare'),
  ).toBeVisible();
  await expect(page.getByText(/Traducerea în română este o ciornă/)).toBeVisible();
  await expect(page.getByText('După testul cu invitație').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Istoricul versiunilor' })).toBeVisible();
});

test('each document opens from the row of documents, and English is one choice away', async ({
  page,
}) => {
  await page.goto('/legal/terms');
  await page.getByRole('banner').getByRole('combobox', { name: 'Limbă' }).selectOption('en');
  await expect(page.getByRole('heading', { level: 2, name: 'Terms of use' })).toBeVisible();

  const documents = page.getByRole('navigation', { name: 'Legal documents' });
  await documents.getByRole('link', { name: 'Privacy notice' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Privacy notice' })).toBeVisible();
  // The corrected provider list (decided 17 Oct 2026, 19:43).
  await expect(
    page.getByText(/Supabase \(our database, sign-in and file storage\), in the EU \(Ireland\)/),
  ).toBeVisible();

  await documents.getByRole('link', { name: 'Community guidelines' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Community guidelines' })).toBeVisible();
  // The minors-in-fiction rule (decided 17 Oct 2026, 10:36).
  await expect(
    page.getByText(/no story may describe sexual activity involving anyone under 18/),
  ).toBeVisible();
});

test.describe('after a new important version of the terms', () => {
  test.beforeEach(() => {
    runSql(`
      insert into public.legal_document_versions
        (document_id, version_label, language, title, body_markdown, is_material, published_at, change_summary)
      select id, 'e2e-0.2', 'en', 'Terms of use', '## In short\n\n- Test version.', true,
        now() - interval '1 second', 'A test change'
      from public.legal_documents where slug = 'terms';`);
  });

  test.afterEach(() => {
    runSql(`
      delete from public.consents where legal_document_version_id in
        (select id from public.legal_document_versions where version_label = 'e2e-0.2');
      delete from public.legal_document_versions where version_label = 'e2e-0.2';`);
  });

  test('adult_writer sees the notice, can still read, accepts, and the notice goes', async ({
    browser,
  }) => {
    const { session } = await signInPersona('adult_writer');
    const context = await browser.newContext();
    await useSessionInBrowser(context, session);
    const page = await context.newPage();

    await page.goto('/');
    const notice = page.getByRole('region', { name: 'Am actualizat Termenii' });
    await expect(notice).toBeVisible();
    await expect(notice.getByText(/A test change/)).toBeVisible();

    // Reading never stops: the new version opens from the notice.
    await notice.getByRole('link', { name: 'Citește ce s-a schimbat' }).click();
    await expect(page).toHaveURL(/\/legal\/terms$/);

    await page.getByRole('button', { name: 'Accept și continui' }).click();
    await expect(page.getByRole('region', { name: 'Am actualizat Termenii' })).toHaveCount(0);
    expect(runSql(`select account_state('00000000-0000-4000-8000-000000000001')`)).toBe('active');
    await context.close();
  });
});

for (const view of everyView([
  '/legal/terms',
  '/legal/privacy',
  '/legal/guidelines',
  '/legal/contact',
])) {
  test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
    page,
  }) => {
    await checkScreen(page, view);
  });
}
