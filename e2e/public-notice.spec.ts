/**
 * The public report form and the removal-order contact point in a real browser (story
 * S1-E10-02; DSA art. 16; Regulation (EU) 2021/784 art. 15).
 *
 * Who runs it: `npm run test:e2e` (Supabase with Mailpit started first; the preview server signs
 * notices with NOTICE_SECRET from playwright.config.ts, which this file puts in Vault).
 * What it proves:
 * - the footer reaches /report; a visitor's notice needs the kind, the link, the explanation, a
 *   name, an email and the good-faith statement, each refused in plain words;
 * - a sent notice shows "Report received" with an N- reference and the time, and the visitor gets
 *   the acknowledgement email with the same reference;
 * - child sexual content can be reported without a name or email;
 * - an authority's removal order needs no good-faith box and no waiting, gets a TCO- reference
 *   and the time of receipt, the authority and the support inbox are emailed, and the on-call
 *   alert is logged;
 * - the page passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: synthetic @example.com addresses and addresses we don't host, so no seed case
 * changes; the rows are removed at the end.
 */
import { expect, test, type Page } from '@playwright/test';

import { brand } from '../src/config/brand';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { waitForEmail } from './support/mailpit';

/** A fresh mark per run, so Mailpit searches and the clean-up find this run's rows only. */
const stamp = Date.now();

/**
 * Opens /report in English with the page's clock ten seconds behind, so the form looks opened
 * long enough ago for the server's "faster than a person" check without the test waiting.
 */
async function openReportForm(page: Page) {
  await page.clock.install({ time: Date.now() - 10_000 });
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  await page.goto('/report');
  await expect(
    page.getByRole('heading', { name: 'Report illegal content', level: 1 }),
  ).toBeVisible();
}

test.describe('public report form (S1-E10-02)', () => {
  test.beforeAll(() => {
    // The secret the preview server signs with (playwright.config.ts), as Robert sets it in Vault.
    runSql(`
      select vault.create_secret('local-e2e-notice-secret', 'public_notice_secret')
        where not exists (select 1 from vault.secrets where name = 'public_notice_secret');
      select vault.update_secret(id, 'local-e2e-notice-secret') from vault.secrets where name = 'public_notice_secret';`);
  });

  test.afterAll(() => {
    runSql(`
      delete from public.on_call_alerts where notice_id in
        (select id from public.public_notices where content_url like '%elsewhere.example/${stamp}%');
      delete from public.public_notices where content_url like '%elsewhere.example/${stamp}%';`);
  });

  test('the footer reaches the form, and a visitor’s notice is refused until it is complete', async ({
    page,
  }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.goto('/');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Report content' }).click();
    await expect(page).toHaveURL(/\/report$/);

    const form = page.getByRole('form', { name: 'Your report' });
    await form.getByRole('button', { name: 'Send report' }).click();
    await expect(form.getByText('Choose what kind of content it is.')).toBeVisible();
    await expect(form.getByText('Paste the exact link to the content.')).toBeVisible();
    await expect(form.getByText('Say why you think it’s illegal.')).toBeVisible();
    await expect(form.getByText('Write your name.')).toBeVisible();
    await expect(form.getByText('Tick the good-faith statement to send the report.')).toBeVisible();
    // Focus goes to the first problem: the kind.
    await expect(form.getByRole('radio').first()).toBeFocused();
  });

  test('a visitor sends a notice and the receipt carries the reference', async ({ page }) => {
    await openReportForm(page);
    const form = page.getByRole('form', { name: 'Your report' });
    await form.getByRole('radio', { name: 'Copyright' }).click();
    await form
      .getByLabel('Exact link to the content (required)')
      .fill(`https://elsewhere.example/${stamp}/poem`);
    await form
      .getByLabel('Why do you think it’s illegal? (required)')
      .fill('My poem, copied without asking.');
    await form.getByLabel('Your name (required)').fill('Ana Test');
    await form.getByLabel('Your email (required)').fill(`notifier-${stamp}@example.com`);
    await form.getByLabel(/I believe, in good faith/).check();
    await form.getByRole('button', { name: 'Send report' }).click();

    const received = page.getByRole('region', { name: 'Report received' });
    await expect(received).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Report received' })).toBeFocused();
    const reference = /N-\d{6}/.exec(await received.innerText())?.[0] ?? '';
    expect(reference).toMatch(/^N-\d{6}$/);
    await expect(received.getByText(`notifier-${stamp}@example.com`)).toBeVisible();

    const receipt = await waitForEmail(`notifier-${stamp}@example.com`, 15_000, reference);
    expect(receipt.Subject).toContain(`We've received your report (${reference})`);
  });

  test('child sexual content can be reported without a name or email', async ({ page }) => {
    await openReportForm(page);
    const form = page.getByRole('form', { name: 'Your report' });
    await form.getByRole('radio', { name: 'Sexual content involving a minor' }).click();
    await expect(form.getByLabel('Your name (optional)')).toBeVisible();
    await form
      .getByLabel('Exact link to the content (required)')
      .fill(`https://elsewhere.example/${stamp}/csam`);
    await form
      .getByLabel('Why do you think it’s illegal? (required)')
      .fill('A child is described sexually.');
    await form.getByLabel(/I believe, in good faith/).check();
    await form.getByRole('button', { name: 'Send report' }).click();
    const received = page.getByRole('region', { name: 'Report received' });
    await expect(received.getByText(/You didn’t give an email/)).toBeVisible();
  });

  test('an authority’s removal order is acknowledged at once and the on-call alert is logged', async ({
    page,
  }) => {
    // No clock trick: an order never meets the bot check, however fast it is sent.
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.goto('/report?kind=removal_order');
    const form = page.getByRole('form', { name: 'Removal order' });
    await expect(
      form.getByRole('radio', { name: 'Removal order from an authority' }),
    ).toBeChecked();
    await expect(form.getByLabel(/I believe, in good faith/)).toHaveCount(0);
    await form.getByLabel('Issuing authority (required)').fill('Test authority');
    await form.getByLabel('The order’s reference (optional)').fill(`RO-${stamp}`);
    await form
      .getByLabel('Exact link to the content (required)')
      .fill(`https://elsewhere.example/${stamp}/order`);
    await form
      .getByLabel('The order, or a summary of it (required)')
      .fill('Removal order under Regulation (EU) 2021/784.');
    await form
      .getByLabel('Email for our acknowledgement (required)')
      .fill(`orders-${stamp}@example.com`);
    await form.getByRole('button', { name: 'Send removal order' }).click();

    const received = page.getByRole('region', { name: 'Report received' });
    await expect(received.getByText(/Time of receipt: .*\(Romania time\)/)).toBeVisible();
    const reference = /TCO-\d{4,}/.exec(await received.innerText())?.[0] ?? '';
    expect(reference).toMatch(/^TCO-\d{4,}$/);

    const acknowledgement = await waitForEmail(`orders-${stamp}@example.com`, 15_000, reference);
    expect(acknowledgement.Text).toContain('Time of receipt');
    const inbox = await waitForEmail(brand.supportEmail, 15_000, reference);
    expect(inbox.Subject).toBe(`[${reference}] Removal order received: act within one hour`);
    expect(
      runSql(`select count(*) from public.on_call_alerts join public.public_notices
                on public_notices.id = on_call_alerts.notice_id where public_notices.reference = '${reference}';`),
    ).toBe('1');
  });

  for (const view of everyView(['/report'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }
});
