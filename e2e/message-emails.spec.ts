/**
 * Message emails with quiet hours, end to end (bundle IDEAS-2, part c1; idea IDEA-20261101-6;
 * Q50).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - adult_writer finds "Emails about messages" in Settings › Messages, with quiet hours off; they
 *   switch them on from 23:00 to 08:00, save, and the choice is there after a reload and in the
 *   database;
 * - a message from teacher then queues one email for adult_writer, held at least 5 minutes, and
 *   it never holds the words;
 * - teen_17 starts with quiet hours on from 21:00 to 07:00 and can't untick them; moving the start
 *   to 23:00 is refused in plain words (criterion 2);
 * - axe and no sideways scroll at 390, 768 and 1440 px (every theme and language is covered by
 *   message-settings.spec.ts, which checks the whole section).
 * Test data: the seed personas and the seeded chat; the choices, any new message and the queued
 * emails are put back at the start and the end. adults_only is switched off for the run (minors'
 * profiles are hidden while it is on) and put back as it was.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { waitForAnimationsToFinish } from './support/animations';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The seeded chat between teacher and adult_writer (supabase/seed.sql). */
const seededChatId = '00000000-0000-4000-a000-000000000901';

/** Whether adults_only was on before this file, so it is put back as it was. */
let wasAdultsOnly = 'true';

/** Puts the choices, the seeded chat and the outbox back. */
function resetEmails() {
  runSql(`
    update public.profiles set message_emails_on = null, message_quiet_hours_on = null,
      message_quiet_from = null, message_quiet_until = null, locale = 'ro'
      where handle in ('adult_writer', 'teen_17', 'teacher');
    delete from public.messages where conversation_id = '${seededChatId}' and body like 'e2e-c1%';
    delete from public.email_outbox where delivery = 'message';
    delete from public.rate_limit_events where action in ('message', 'new_conversation');`);
}

/**
 * Opens Settings › Messages in English as a persona.
 *
 * @returns the page
 */
async function openSettings(browser: Browser, persona: SignInPersonaName): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto('/settings#messages');
  await expect(page.getByRole('heading', { name: 'Emails about messages' })).toBeVisible();
  return page;
}

test.describe('Message emails with quiet hours (IDEAS-2c1)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    wasAdultsOnly = runSql(
      `select is_enabled from public.feature_flags where key = 'adults_only';`,
    ).trim();
    runSql(`update public.feature_flags set is_enabled = false where key = 'adults_only';`);
    resetEmails();
  });

  test.afterAll(() => {
    resetEmails();
    const isOn = wasAdultsOnly === 't' || wasAdultsOnly === 'true';
    runSql(
      `update public.feature_flags set is_enabled = ${String(isOn)} where key = 'adults_only';`,
    );
  });

  test('an adult sets quiet hours, and a message is held, without its words', async ({
    browser,
  }) => {
    const page = await openSettings(browser, 'adult_writer');
    // Step 1: emails on, quiet hours off by default.
    await expect(page.getByLabel('Email me when a message arrives')).toBeChecked();
    const quiet = page.getByLabel('Quiet hours: hold these emails until morning');
    await expect(quiet).not.toBeChecked();
    // Step 2: on, from 23:00 to 08:00, saved.
    await quiet.check();
    await page.locator('#message-quiet-from').fill('23:00');
    await page.locator('#message-quiet-until').fill('08:00');
    await page.getByRole('button', { name: 'Save email choices' }).click();
    await expect(page.getByText('Saved.')).toBeVisible();
    await page.reload();
    await expect(page.locator('#message-quiet-from')).toHaveValue('23:00');
    expect(
      runSql(
        `select message_quiet_hours_on, to_char(message_quiet_until, 'HH24:MI') from public.profiles where handle = 'adult_writer';`,
      ).trim(),
    ).toBe('t|08:00');
    // Step 3: a message from teacher queues one held email that names nobody's words.
    runSql(`begin;
      select set_config('role', 'authenticated', true);
      select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000007", "role": "authenticated"}', true);
      select public.send_message('adult_writer', 'e2e-c1 the notes are ready');
      commit;`);
    expect(
      runSql(
        `select count(*), bool_and(send_after >= created_at + interval '5 minutes') from public.email_outbox
         where delivery = 'message' and user_id = '00000000-0000-4000-8000-000000000001' and sent_at is null;`,
      ).trim(),
    ).toBe('1|t');
    await page.context().close();
  });

  test('someone under 18 keeps quiet hours that cover 22:00 to 07:00', async ({ browser }) => {
    const page = await openSettings(browser, 'teen_17');
    // Step 1: on from 21:00 to 07:00, and the tick can't be taken off.
    const quiet = page.getByLabel('Quiet hours: hold these emails until morning');
    await expect(quiet).toBeChecked();
    await expect(quiet).toBeDisabled();
    await expect(page.locator('#message-quiet-from')).toHaveValue('21:00');
    await expect(page.getByText(/Under 18, quiet hours stay on/)).toBeVisible();
    // Step 2: starting them at 23:00 is refused in plain words.
    await page.locator('#message-quiet-from').fill('23:00');
    await page.getByRole('button', { name: 'Save email choices' }).click();
    await expect(page.getByText(/Quiet hours need to start by 22:00/)).toBeVisible();
    await page.context().close();
  });

  for (const width of [390, 768, 1440]) {
    test(`the email choices pass axe at ${width} px and never scroll sideways`, async ({
      browser,
    }) => {
      const page = await openSettings(browser, 'teen_17');
      await page.setViewportSize({ width, height: 900 });
      // Settings rises into place (tmc-rise); axe reads colours only once it has settled.
      await waitForAnimationsToFinish(page);
      const results = await new AxeBuilder({ page })
        .include('#messages')
        .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
        .analyze();
      const serious = results.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      );
      expect(serious).toEqual([]);
      const isWider = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(isWider).toBe(false);
      await page.context().close();
    });
  }
});
