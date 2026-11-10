/**
 * Live sessions in a real browser (bundle GAPS-12h; board WritersHub, "Live sessions · Remind
 * me").
 *
 * What it proves:
 * - an admin adds a session at /staff/hub (a link that isn't https keeps Save off) and it shows
 *   on the hub;
 * - an adult sees the sessions coming up with their language and age group, presses "Remind me"
 *   and the button stays pressed with a line saying when the notification comes; pressing again
 *   takes the reminder off;
 * - a 17-year-old never sees the session for adults;
 * - once the job has run in the hour before the start, the member's notifications name the
 *   session and lead back to the hub;
 * - the hub card and the staff page have no serious axe issue at phone and desktop width, and
 *   nothing scrolls sideways.
 * The database rules (who reads what, age groups, the job, staff changes) are in
 * supabase/tests/database/339-live-sessions.test.sql.
 * Test data: the seed's adult_writer, teen_17 and admin; the sessions, reminders and
 * notifications made here are removed afterwards (the audit log keeps its rows: append-only).
 */
import { expect, test, type Browser } from '@playwright/test';

import { checkScreen } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const everyone = { en: 'Ask a published author (e2e)', ro: 'Întreabă un autor publicat (e2e)' };
const adultsOnly = { en: 'Writing dark themes (e2e)', ro: 'Cum scrii teme întunecate (e2e)' };
const added = { en: 'First chapter clinic (e2e)', ro: 'Atelier: primul capitol (e2e)' };

/** Removes the sessions this spec made, with their reminders and notifications. */
function cleanUp() {
  runSql(`delete from public.notifications where kind = 'live_session_soon';
    delete from public.live_sessions where title_en like '%(e2e)';`);
}

/** Opens a page as a seed persona, in a fresh browser context. */
async function openAs(browser: Browser, persona: SignInPersonaName, path: string) {
  // Other specs leave a persona reading in English; this one checks the Romanian words, so it
  // sets the language itself instead of counting on what ran before it.
  runSql(`update public.profiles set locale = 'ro' where handle = '${persona}';`);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  const page = await context.newPage();
  await page.goto(path);
  return page;
}

test.describe('live sessions (GAPS-12h)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(() => {
    cleanUp();
    runSql(`insert into public.live_sessions (title_ro, title_en, starts_at, language_code, rating, place_ro, place_en, link_url)
      values ('${everyone.ro}', '${everyone.en}', now() + interval '2 days', 'ro', '13_plus',
          'Camera vocală a forumului', 'Forum voice room', null),
        ('${adultsOnly.ro}', '${adultsOnly.en}', now() + interval '3 days', 'en', '18_plus',
          'Întâlnire video', 'Video call', 'https://example.org/dark-themes');`);
  });
  test.afterAll(cleanUp);

  test('an admin adds a session on the staff page', async ({ browser }) => {
    const page = await openAs(browser, 'admin', '/staff/hub');
    const section = page.getByRole('region', { name: 'Sesiuni live' });
    await section.getByRole('button', { name: 'Adaugă o sesiune' }).click();
    await section.getByLabel('Titlu în engleză').fill(added.en);
    await section.getByLabel('Titlu în română').fill(added.ro);
    await section.getByLabel('Unde, în engleză').fill('Forum voice room');
    await section.getByLabel('Unde, în română').fill('Camera vocală a forumului');
    await section.getByLabel('Început', { exact: true }).fill('2031-05-09T18:00');
    await section.getByLabel('Cea mai mică grupă de vârstă').selectOption('16_plus');
    // A link that isn't https keeps Save off; an empty one is fine.
    await section.getByLabel('Link către sesiune (opțional)').fill('http://example.org/clinic');
    await expect(section.getByRole('button', { name: 'Salvează' })).toBeDisabled();
    await section.getByLabel('Link către sesiune (opțional)').fill('');
    await section.getByRole('button', { name: 'Salvează' }).click();
    const list = section.getByRole('list', { name: 'Sesiuni live, cele mai târzii primele' });
    const item = list.getByRole('listitem').filter({ hasText: added.en });
    await expect(item).toContainText('18:00');
    await expect(item).toContainText('16+');
    await page.context().close();
  });

  test('an adult sees the sessions and sets a reminder, then takes it off', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/hub');
    const card = page.getByRole('region', { name: 'Sesiuni live' });
    // Only this spec's sessions, so a session another spec lists can't change the count.
    const rows = card.getByRole('listitem').filter({ hasText: '(e2e)' });
    await expect(rows).toHaveCount(3);
    // Soonest first, with the language and the age group on each row.
    await expect(rows.nth(0)).toContainText(everyone.ro);
    await expect(rows.nth(0)).toContainText('· Română · 13+');
    await expect(rows.nth(0)).toContainText('Camera vocală a forumului');
    await expect(rows.nth(1)).toContainText('· Engleză · 18+');
    // The link staff added opens in a new tab and vouches for nothing.
    const link = rows.nth(1).getByRole('link', { name: /Deschide sesiunea/ });
    await expect(link).toHaveAttribute('href', 'https://example.org/dark-themes');
    await expect(link).toHaveAttribute('rel', 'nofollow noopener noreferrer');

    const remind = rows.nth(0).getByRole('button', { name: `Amintește-mi: ${everyone.ro}` });
    await expect(remind).toHaveAttribute('aria-pressed', 'false');
    await remind.click();
    await expect(remind).toHaveAttribute('aria-pressed', 'true');
    await expect(rows.nth(0).getByText(/Memento setat/)).toBeVisible();
    // The reminder survives a reload: it is in the database, not only on the page.
    await page.reload();
    await expect(remind).toHaveAttribute('aria-pressed', 'true');
    await remind.click();
    await expect(remind).toHaveAttribute('aria-pressed', 'false');
    await expect(rows.nth(0).getByText(/Memento setat/)).toHaveCount(0);
    await page.context().close();
  });

  test('a 17-year-old never sees the session for adults', async ({ browser }) => {
    const page = await openAs(browser, 'teen_17', '/hub');
    const card = page.getByRole('region', { name: 'Sesiuni live' });
    await expect(card.getByText(everyone.ro)).toBeVisible();
    await expect(card.getByText(added.ro)).toBeVisible();
    await expect(card.getByText(adultsOnly.ro)).toHaveCount(0);
    await page.context().close();
  });

  test('in the hour before the start, the notification names the session', async ({ browser }) => {
    const page = await openAs(browser, 'adult_writer', '/hub');
    const card = page.getByRole('region', { name: 'Sesiuni live' });
    const remind = card.getByRole('button', { name: `Amintește-mi: ${everyone.ro}` });
    await remind.click();
    await expect(remind).toHaveAttribute('aria-pressed', 'true');
    // The session moves to half an hour away and the job runs, as pg_cron does every ten minutes.
    runSql(`update public.live_sessions set starts_at = now() + interval '30 minutes' where title_en = '${everyone.en}';
      select public.send_live_session_reminders();`);
    await page.goto('/notifications');
    const row = page.getByRole('listitem').filter({ hasText: everyone.ro });
    await expect(row).toContainText(/începe la \d{2}:\d{2}\./);
    await expect(row.getByRole('link', { name: 'Deschide Spațiul scriitorilor' })).toHaveAttribute(
      'href',
      '/hub#hub-sessions',
    );
    await page.context().close();
  });

  for (const view of [
    { persona: 'adult_writer', address: '/hub', width: 390, theme: 'night' },
    { persona: 'adult_writer', address: '/hub', width: 1440, theme: 'light' },
    { persona: 'admin', address: '/staff/hub', width: 390, theme: 'night' },
    { persona: 'admin', address: '/staff/hub', width: 1440, theme: 'light' },
  ] as const) {
    test(`no serious axe issue on ${view.address} at ${view.width} px, ${view.theme}`, async ({
      browser,
    }) => {
      const context = await browser.newContext();
      await useSessionInBrowser(context, (await signInPersona(view.persona)).session);
      const page = await context.newPage();
      await checkScreen(page, { ...view, language: 'ro' });
      await context.close();
    });
  }
});
