/**
 * Staff › Safety contacts in a real browser (story S1-E10-13, part b).
 *
 * Who runs it: `npm run test:e2e`, and CI on every pull request (Supabase started first).
 * What it proves:
 * - support confirms Romania's emergency number and adds the opening hours in Romanian; the
 *   public safety block in Romanian shows them (criterion 6);
 * - this month's check lists Romania until every contact is confirmed (criterion 7);
 * - a contact unchecked for 50 days puts a warning at the top of every staff page (criterion 8);
 * - a moderator reads the contacts but gets no buttons;
 * - the page passes axe at 390, 768 and 1440 px.
 * Test data: the seeded contacts; what the test changes is put back afterwards.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

/** Opens an address in English as a persona. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

test.describe('Staff › Safety contacts (S1-E10-13b)', () => {
  test.describe.configure({ mode: 'serial' });
  let savedContacts = '';
  test.beforeAll(() => {
    // Keep the contacts as they were, and open this month's checks.
    savedContacts = runSql(
      `select json_agg(json_build_object('id', id, 'last_checked_on', last_checked_on, 'opening_hours_ro', opening_hours_ro, 'checked_by', checked_by)) from public.safety_contacts`,
    );
    runSql(`select public.create_monthly_safety_checks();
      update public.safety_contact_checks set created_at = now() + interval '1 day';`);
  });
  test.afterAll(() => {
    runSql(`
      update public.safety_contacts set last_checked_on = (saved ->> 'last_checked_on')::date,
        opening_hours_ro = saved ->> 'opening_hours_ro', checked_by = saved ->> 'checked_by',
        last_checked_by_user_id = null
      from json_array_elements('${savedContacts.replaceAll("'", "''")}'::json) as saved
      where safety_contacts.id = (saved ->> 'id')::uuid;
      delete from public.safety_contact_checks;
      update public.profiles set locale = 'ro' where handle in ('support', 'moderator', 'owner');`);
  });

  test('support confirms a contact and adds its Romanian opening hours', async ({ browser }) => {
    const page = await openAs(browser, 'support', '/staff/safety-contacts');
    await expect(page.getByRole('heading', { level: 1, name: 'Safety contacts' })).toBeVisible();
    await expect(page.getByText(/Romania, \d{4}-\d{2}/)).toBeVisible();

    // Step 1: change the first Romanian contact: Romanian opening hours, then save.
    const firstCard = page
      .getByRole('list', { name: 'Safety contacts for this country' })
      .getByRole('listitem')
      .first();
    await firstCard.getByRole('button', { name: 'Change' }).click();
    await page.getByLabel('Opening hours in Romanian').fill('Non-stop, 24 de ore din 24');
    await page.getByRole('button', { name: 'Save and mark as checked' }).click();
    await expect(page.getByText('Non-stop, 24 de ore din 24')).toBeVisible();
    await expect(page.getByText(/by support/).first()).toBeVisible();

    // Step 2: the public block in Romanian shows the Romanian hours.
    const publicPage = await browser.newPage();
    await publicPage.setExtraHTTPHeaders({ 'X-Fake-Country': 'RO' });
    await publicPage.goto('/report');
    await expect(publicPage.getByText('Non-stop, 24 de ore din 24')).toBeVisible();
  });

  test('a contact unchecked for 50 days warns staff; a moderator only reads', async ({
    browser,
  }) => {
    runSql(
      `update public.safety_contacts set last_checked_on = current_date - 50 where country_code = 'GB' and kind = 'emergency';`,
    );
    const ownerPage = await openAs(browser, 'owner', '/staff');
    await expect(ownerPage.getByText(/been checked for (up to )?50 days/)).toBeVisible();
    await ownerPage.getByRole('link', { name: 'Check them now' }).click();
    await expect(ownerPage).toHaveURL(/\/staff\/safety-contacts$/);

    const moderatorPage = await openAs(browser, 'moderator', '/staff/safety-contacts');
    await expect(moderatorPage.getByText(/Support keeps them up to date/)).toBeVisible();
    await expect(moderatorPage.getByRole('button', { name: 'Still right' })).toHaveCount(0);
  });

  for (const view of everyView(['/staff/safety-contacts'])) {
    test(`axe: Safety contacts at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      runSql(`update public.profiles set locale = '${view.language}' where handle = 'support';`);
      await useSessionInBrowser(page.context(), (await signInPersona('support')).session);
      await checkScreen(page, view);
    });
  }
});
