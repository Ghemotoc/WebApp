/**
 * Notification emails and the one-click unsubscribe, in a real browser (story S1-E7-02; board
 * Settings 6.3).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase with Mailpit started
 * first). Local pg_cron never calls out, so the test wakes the worker itself, with the seeded
 * local worker key (EMAIL_WORKER_KEY in playwright.config.ts, email_worker_key in the Vault).
 * What it proves:
 * - Settings › Notifications shows each kind with its default and saves a change (criterion 1);
 * - a reply is emailed at once, with an unsubscribe link and the one-click headers (RFC 8058);
 * - the link's page stops every optional email with one press, signed out (criterion 2), and so
 *   does a mail app's one-click POST;
 * - axe finds nothing serious and nothing scrolls sideways at 390, 768 and 1440 px.
 * Test data: the support persona (…11, which no other spec signs in to Settings with), a seeded
 * reply notification from teen_17; the persona's choices and emails are removed afterwards.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { waitForAnimationsToFinish } from './support/animations';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser } from './support/personas';

const personaId = '00000000-0000-4000-8000-000000000011';
const personaEmail = 'support@personas.test';
const workerKey = 'local-only-email-worker-key-not-for-staging';
const mailpitUrl = 'http://127.0.0.1:54324/api/v1';

/** Puts the persona back to the defaults, with no emails waiting and none in Mailpit. */
async function cleanUp() {
  runSql(`delete from public.notification_email_settings where user_id = '${personaId}';
    delete from public.email_outbox;
    delete from public.notifications where user_id = '${personaId}' and kind = 'comment_reply';
    update public.profiles set locale = 'ro' where id = '${personaId}';`);
  await fetch(`${mailpitUrl}/search?query=${encodeURIComponent(`to:"${personaEmail}"`)}`, {
    method: 'DELETE',
  });
}

/** Opens Settings as the persona, in English, at a width. */
async function openSettings(browser: Browser, width = 1440): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where id = '${personaId}';`);
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona('support')).session);
  await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
    LANGUAGE_STORAGE_KEY,
    'en',
  ] as const);
  const page = await context.newPage();
  await page.goto('/settings#notifications');
  await expect(page.getByRole('combobox', { name: 'Email for New followers' })).toBeVisible();
  return page;
}

/** Waits for the newest email to the persona and returns its text and headers. */
async function waitForNotificationEmail() {
  const query = encodeURIComponent(`to:"${personaEmail}"`);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const { messages } = (await (await fetch(`${mailpitUrl}/search?query=${query}`)).json()) as {
      messages: { ID: string; Subject: string }[];
    };
    const newest = messages[0];
    if (newest !== undefined) {
      const message = (await (await fetch(`${mailpitUrl}/message/${newest.ID}`)).json()) as {
        Text: string;
      };
      const headers = (await (
        await fetch(`${mailpitUrl}/message/${newest.ID}/headers`)
      ).json()) as Record<string, string[]>;
      return { subject: newest.Subject, text: message.Text, headers };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('No notification email reached the persona in Mailpit.');
}

/** Checks axe and the width of whatever page is open. */
async function expectAccessibleAndFitting(page: Page, width: number) {
  // The page rises in; axe would read the colours half-way through.
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

test.describe('Notification emails', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('Settings shows each kind with its default and saves a change', async ({ browser }) => {
    const page = await openSettings(browser);
    const section = page.getByRole('region', { name: 'Notifications' });
    await expect(
      section.getByRole('combobox', { name: 'Email for Replies to my comments' }),
    ).toHaveValue('instant');
    await expect(section.getByRole('combobox', { name: 'Email for New followers' })).toHaveValue(
      'daily',
    );
    await expect(section.getByRole('row', { name: /Account, safety and legal/ })).toContainText(
      'Always sent',
    );
    await section.getByRole('combobox', { name: 'Email for New followers' }).selectOption('off');
    await expect
      .poll(() =>
        runSql(`select delivery from public.notification_email_settings
          where user_id = '${personaId}' and kind = 'new_follower';`).trim(),
      )
      .toBe('off');
    await page.reload();
    await expect(section.getByRole('combobox', { name: 'Email for New followers' })).toHaveValue(
      'off',
    );
    await page.context().close();
  });

  test('a reply is emailed at once and the link stops the emails, signed out', async ({
    browser,
    request,
  }) => {
    // A reply from teen_17 queues an instant email; the test wakes the worker as pg_cron would.
    runSql(`update public.profiles set locale = 'en' where id = '${personaId}';
      insert into public.notifications (user_id, kind, actor_user_ids, actor_count)
      values ('${personaId}', 'comment_reply', array['00000000-0000-4000-8000-000000000002'::uuid], 1);`);
    const refused = await request.post('/api/notification-emails', {
      headers: { Authorization: 'Bearer wrong' },
    });
    expect(refused.status()).toBe(401);
    const worker = await request.post('/api/notification-emails', {
      headers: { Authorization: `Bearer ${workerKey}` },
    });
    expect(worker.ok()).toBe(true);

    const email = await waitForNotificationEmail();
    expect(email.subject).toContain('replied to your comment');
    expect(email.headers['List-Unsubscribe-Post']).toEqual(['List-Unsubscribe=One-Click']);
    const link = /\/unsubscribe\?key=([0-9a-f]{48})/.exec(email.text);
    expect(link).not.toBeNull();

    // The page behind the link, signed out: one press stops every optional email.
    const context = await browser.newContext();
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [
      LANGUAGE_STORAGE_KEY,
      'en',
    ] as const);
    const page = await context.newPage();
    await page.goto(`/unsubscribe?key=${link?.[1] ?? ''}`);
    await page.getByRole('button', { name: 'Stop these emails' }).click();
    await expect(page.getByText('We won’t send you notification emails any more.')).toBeVisible();
    expect(
      runSql(`select string_agg(distinct delivery::text, ',') from public.notification_email_settings
        where user_id = '${personaId}';`).trim(),
    ).toBe('off');
    await context.close();

    // A mail app's one-click POST from the header works too.
    const oneClick = await request.post(`/api/unsubscribe?key=${link?.[1] ?? ''}`, {
      form: { 'List-Unsubscribe': 'One-Click' },
    });
    expect(oneClick.status()).toBe(200);
  });

  for (const width of [390, 768, 1440]) {
    test(`Settings and the unsubscribe page pass axe and fit at ${width} px`, async ({
      browser,
    }) => {
      const page = await openSettings(browser, width);
      await expectAccessibleAndFitting(page, width);
      await page.goto('/unsubscribe?key=0000');
      await expect(
        page.getByRole('heading', { level: 1, name: 'Stop notification emails' }),
      ).toBeVisible();
      await expectAccessibleAndFitting(page, width);
      await page.context().close();
    });
  }
});
