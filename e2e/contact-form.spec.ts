/**
 * The Contact us form in a real browser (story S1-E14-04).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase with Mailpit started
 * first; the preview server sends the form's emails into Mailpit).
 * What it proves:
 * - a visitor sends a message with an email: "Message sent" shows a reference, the support inbox
 *   gets the message with the reference in the subject and reply-to set to the visitor, and the
 *   visitor gets a Romanian or English acknowledgement with the same reference;
 * - a signed-in person needs no email field: the account's email, username and user ID go with
 *   the message (and nothing about age);
 * - an empty message and a bad email are refused in plain words; a filled honeypot sends nothing;
 * - the page passes axe and doesn't scroll sideways at 390, 768 and 1440 px, signed in and out.
 * Test data: seed personas and synthetic @example.com addresses.
 */
import { expect, test, type Page } from '@playwright/test';

import { brand } from '../src/config/brand';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { waitForEmail } from './support/mailpit';
import { signInPersona, useSessionInBrowser } from './support/personas';

/** A fresh address per run, so Mailpit searches find this run's emails only. */
const stamp = Date.now();

/** Opens the contact page in English. */
async function openContact(page: Page) {
  await page.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  await page.goto('/contact');
  await expect(page.getByRole('heading', { name: 'Write to us' })).toBeVisible();
}

test.describe('contact form (S1-E14-04)', () => {
  test('a visitor sends a message and both emails carry the reference', async ({ page }) => {
    await openContact(page);
    const form = page.getByRole('form', { name: 'Your message' });
    await form.getByRole('button', { name: 'Send message' }).click();
    await expect(form.getByText('Write your message first.')).toBeVisible();
    await form.getByLabel('Message', { exact: true }).fill('Hello, how do I change my pen name?');
    await form.getByLabel('Your email').fill('not an email');
    await form.getByRole('button', { name: 'Send message' }).click();
    await expect(form.getByText('Check the email address.')).toBeVisible();

    await form.getByText('A question', { exact: true }).click();
    await form.getByLabel('Your email').fill(`visitor-${stamp}@example.com`);
    await form.getByRole('button', { name: 'Send message' }).click();
    const sent = page.getByRole('status', { name: 'Message sent' });
    await expect(sent).toBeVisible();
    const reference = /C-\d{4}-\d{4}/.exec((await sent.innerText()) ?? '')?.[0] ?? '';
    expect(reference).toMatch(/^C-\d{4}-\d{4}$/);

    const acknowledgement = await waitForEmail(`visitor-${stamp}@example.com`, 15_000, reference);
    expect(acknowledgement.Subject).toContain(`We've received your message (${reference})`);
    const staffCopy = await waitForEmail(brand.supportEmail, 15_000, reference);
    expect(staffCopy.Subject).toBe(`[${reference}] Question`);
    expect(staffCopy.Text).toContain(`visitor-${stamp}@example.com (not signed in)`);
    expect(staffCopy.Text).toContain('Hello, how do I change my pen name?');
  });

  test('a signed-in person’s username and user ID go with the message, never their age', async ({
    page,
  }) => {
    await useSessionInBrowser(page.context(), (await signInPersona('adult_writer')).session);
    runSql(`update public.profiles set locale = 'en' where handle = 'adult_writer';`);
    await openContact(page);
    const form = page.getByRole('form', { name: 'Your message' });
    await expect(form.getByLabel('Your email')).toHaveCount(0);
    await expect(form.getByText(/We’ll reply to adult_writer@personas.test/)).toBeVisible();
    await form.getByText('A problem with my account', { exact: true }).click();
    await form.getByLabel('Message', { exact: true }).fill(`Signed-in test ${stamp}`);
    await form.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByRole('heading', { name: 'Message sent' })).toBeVisible();
    const staffCopy = await waitForEmail(brand.supportEmail, 15_000, 'Account problem');
    expect(staffCopy.Text).toContain(
      '@adult_writer (user ID 00000000-0000-4000-8000-000000000001)',
    );
    expect(staffCopy.Text).not.toMatch(/birth|age check/i);
    runSql(`update public.profiles set locale = 'ro' where handle = 'adult_writer';`);
  });

  test('a filled honeypot gets a reference and sends nothing', async ({ page }) => {
    const before = await (await fetch('http://127.0.0.1:54324/api/v1/messages?limit=1')).json();
    await openContact(page);
    await page.getByLabel('Message', { exact: true }).fill('spam spam');
    await page.getByLabel('Your email').fill(`bot-${stamp}@example.com`);
    await page.locator('#contact-website').fill('http://spam.example', { force: true });
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByRole('heading', { name: 'Message sent' })).toBeVisible();
    const after = await (await fetch('http://127.0.0.1:54324/api/v1/messages?limit=1')).json();
    expect((after as { total: number }).total).toBe((before as { total: number }).total);
  });

  for (const view of everyView(['/contact'])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      await checkScreen(page, view);
    });
  }
});
