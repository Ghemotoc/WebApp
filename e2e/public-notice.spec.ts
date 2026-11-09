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
 * - moderators see the order on the queue, its notice on the case page, and the unmatched notices
 *   to check by hand, which they close with a note;
 * - the page passes axe and doesn't scroll sideways at 390, 768 and 1440 px.
 * Test data: synthetic @example.com addresses and addresses we don't host, so no seed case
 * changes; the rows are removed at the end.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { brand } from '../src/config/brand';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { waitForEmail } from './support/mailpit';
import { signInPersona, useSessionInBrowser } from './support/personas';

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

/** Opens a staff address in English as the moderator persona. */
async function openAsModerator(browser: Browser, address: string): Promise<Page> {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona('moderator')).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = 'moderator';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
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
        (select id from public.public_notices where explanation like '%${stamp}%' or content_url like '%elsewhere.example/${stamp}%');
      create temp table run_cases as select case_id from public.public_notices
        where explanation like '%${stamp}%' and case_id is not null;
      delete from public.public_notices where explanation like '%${stamp}%' or content_url like '%elsewhere.example/${stamp}%';
      delete from public.cases where id in (select case_id from run_cases);`);
  });

  test('the footer reaches the form, and a visitor’s notice is refused until it is complete', async ({
    page,
  }) => {
    await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
    await page.goto('/');
    await page.getByRole('contentinfo').getByRole('link', { name: 'Report content' }).click();
    await expect(page).toHaveURL(/\/report$/);

    const form = page.getByRole('form', { name: 'Report' });
    await form.getByRole('button', { name: 'Send report' }).click();
    await expect(form.getByText('Choose what kind of content it is.')).toBeVisible();
    await expect(form.getByText('Paste the exact link to the content.')).toBeVisible();
    await expect(form.getByText('Say why you think it’s illegal.')).toBeVisible();
    await expect(form.getByText('Write a name.')).toBeVisible();
    await expect(form.getByText('Tick the good-faith statement to send the report.')).toBeVisible();
    // Focus goes to the first problem: the kind.
    await expect(form.getByRole('radio').first()).toBeFocused();
  });

  test('a visitor sends a notice and the receipt carries the reference', async ({ page }) => {
    await openReportForm(page);
    const form = page.getByRole('form', { name: 'Report' });
    await form.getByRole('radio', { name: 'Copyright' }).click();
    await form
      .getByLabel('Exact link to the content (required)')
      .fill(`https://elsewhere.example/${stamp}/poem`);
    await form
      .getByLabel('Why do you think it’s illegal? (required)')
      .fill('My poem, copied without asking.');
    await form.getByLabel('Name (required)').fill('Ana Test');
    await form.getByLabel('Email (required)').fill(`notifier-${stamp}@example.com`);
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
    const form = page.getByRole('form', { name: 'Report' });
    await form.getByRole('radio', { name: 'Sexual content involving a minor' }).click();
    await expect(form.getByLabel('Name (optional)')).toBeVisible();
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
      .getByLabel('Email for the acknowledgement (required)')
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

  test('moderators see an order on the queue and its case, and close a notice we don’t host', async ({
    browser,
    request,
  }) => {
    // Two orders straight to the server: one about a profile we host, one about an address we don't.
    const order = {
      kind: 'removal_order',
      explanation: `Order text ${stamp}`,
      authorityName: 'Test authority',
      notifierEmail: `orders-${stamp}@example.com`,
      language: 'en',
    };
    const hosted = await request.post('/api/notice', {
      data: { ...order, contentUrl: '/u/teacher' },
    });
    const hostedReference = ((await hosted.json()) as { reference: string }).reference;
    await request.post('/api/notice', {
      data: { ...order, contentUrl: `https://elsewhere.example/${stamp}/staff` },
    });

    const page = await openAsModerator(browser, '/staff/moderation');
    const orders = page.getByRole('region', { name: /Removal orders received/ });
    await orders.getByRole('link', { name: `Open case ${hostedReference}` }).click();
    const fromForm = page.getByRole('region', { name: 'From the public form' });
    await expect(fromForm.getByText(/Removal order from Test authority/)).toBeVisible();
    await expect(fromForm.getByText('/u/teacher')).toBeVisible();

    await page.goto('/staff/moderation');
    const unmatched = page.getByRole('region', { name: 'Notices to check by hand' });
    const card = unmatched
      .getByRole('listitem')
      .filter({ hasText: `elsewhere.example/${stamp}/staff` });
    await card.getByRole('button', { name: /^Close notice/ }).click();
    await card.getByLabel('What did you find?').fill('Not hosted by us; nothing to remove.');
    await card.getByRole('button', { name: 'Close the notice' }).click();
    await expect(card).toHaveCount(0);
  });

  for (const view of everyView(['/report'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }
});
