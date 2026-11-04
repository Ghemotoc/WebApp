/**
 * "No thanks" to a message request, and what a teen's parent or guardian agreed to, end to end
 * (bundle IDEAS-2, part c2; ideas IDEA-20261101-7 and -8).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - idea 7: blocker answers adult_writer's request with "No thanks"; it leaves blocker's
 *   requests, and adult_writer sees the fixed, polite reply with the day they may ask again, and
 *   "Said no thanks for now" in their list (criterion 1);
 * - idea 8: kid_14_ok sees "Your parent or guardian agreed on …" in Settings with what it covers
 *   (criterion 1); after the consent is withdrawn, every page tells them plainly, and Settings
 *   lists what they can still do (criterion 2);
 * - axe and no sideways scroll on the consent section at 390, 768 and 1440 px.
 * Test data: the seed personas; the request, the consent's status and the flags are put back at
 * the start and the end. adults_only is switched off for the run (minors' profiles are hidden
 * while it is on) and parental_consent switched on for the withdrawal, both put back as they were.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** The flags as they were before this file, so they are put back. */
const flagsBefore = { adultsOnly: 'true', parentalConsent: 'false' };

/** Reads one flag. */
function flag(key: string): string {
  return runSql(`select is_enabled from public.feature_flags where key = '${key}';`).trim();
}

/** Sets one flag. */
function setFlag(key: string, value: string) {
  const isOn = value === 't' || value === 'true';
  runSql(`update public.feature_flags set is_enabled = ${String(isOn)} where key = '${key}';`);
}

/** Puts the chats, the consent and the locales back as the seed has them. */
function resetState() {
  runSql(`
    delete from public.conversations
      where '00000000-0000-4000-8000-000000000015' in (user_id, recipient_user_id);
    delete from public.rate_limit_events where action in ('message', 'new_conversation');
    delete from public.email_outbox where delivery = 'message';
    update public.parental_consents set status = 'agreed', decided_at = now()
      where user_id = '00000000-0000-4000-8000-000000000003';
    update public.profiles set locale = 'ro' where handle in ('adult_writer', 'blocker', 'kid_14_ok');`);
}

/**
 * Opens an address in English as a persona.
 *
 * @returns the page
 */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('"No thanks" and what a parent agreed to (IDEAS-2c2)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    flagsBefore.adultsOnly = flag('adults_only');
    flagsBefore.parentalConsent = flag('parental_consent');
    setFlag('adults_only', 'false');
    resetState();
  });

  test.afterAll(() => {
    resetState();
    setFlag('adults_only', flagsBefore.adultsOnly);
    setFlag('parental_consent', flagsBefore.parentalConsent);
  });

  test('"No thanks" closes a request and the sender sees a kind, fixed reply', async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    // Step 1: adult_writer's request to blocker, sent as adult_writer.
    runSql(`begin;
      select set_config('role', 'authenticated', true);
      select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);
      select public.send_message('blocker', 'Would you read my first chapter?');
      commit;`);
    // Step 2: blocker says "No thanks"; the request leaves their chat.
    const recipient = await openAs(browser, 'blocker', '/messages/adult_writer');
    await recipient.getByRole('button', { name: 'No thanks' }).click();
    await expect(recipient.getByRole('button', { name: 'No thanks' })).toHaveCount(0);
    await recipient.context().close();
    // Step 3: adult_writer sees the fixed reply, when to ask again, and the list's line.
    const sender = await openAs(browser, 'adult_writer', '/messages/blocker');
    await expect(
      sender.getByText('“Thanks for writing, but I’d rather not chat right now.”', {
        exact: false,
      }),
    ).toBeVisible();
    await expect(sender.getByText(/You can send a new request from/)).toBeVisible();
    await expect(sender.getByText('Said no thanks for now')).toBeVisible();
    await sender.context().close();
  });

  test('a teen sees what their parent agreed to, and is told plainly when it is withdrawn', async ({
    browser,
  }) => {
    test.setTimeout(60_000);
    // Step 1: agreed: the date and what it covers.
    const page = await openAs(browser, 'kid_14_ok', '/settings#parent-consent');
    const section = page.getByRole('region', { name: 'What your parent or guardian agreed to' });
    await expect(section.getByText(/Your parent or guardian agreed on/)).toBeVisible();
    await expect(section.getByText(/You can publish stories, comment/)).toBeVisible();
    await page.context().close();
    // Step 2: withdrawn, while consent is needed: the notice on every page says so plainly.
    setFlag('parental_consent', 'true');
    runSql(`update public.parental_consents set status = 'withdrawn', decided_at = now()
      where user_id = '00000000-0000-4000-8000-000000000003';`);
    const after = await openAs(browser, 'kid_14_ok', '/');
    await expect(
      after.getByRole('heading', { name: 'Your parent or guardian withdrew their consent' }),
    ).toBeVisible();
    await expect(after.getByText(/Your account is read-only from now on/)).toBeVisible();
    await after.getByRole('link', { name: 'What you can still do' }).click();
    const summary = after.getByRole('region', { name: 'What your parent or guardian agreed to' });
    await expect(summary.getByText(/withdrew their consent on/)).toBeVisible();
    await expect(summary.getByText(/report anything that worries you/)).toBeVisible();
    await after.context().close();
    setFlag('parental_consent', flagsBefore.parentalConsent);
    resetState();
  });

  for (const width of [390, 768, 1440]) {
    test(`the consent section passes axe at ${width} px and never scrolls sideways`, async ({
      browser,
    }) => {
      const page = await openAs(browser, 'kid_14_ok', '/settings#parent-consent');
      await page.setViewportSize({ width, height: 900 });
      await expect(page.locator('#parent-consent')).toBeVisible();
      const results = await new AxeBuilder({ page })
        .include('#parent-consent')
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
