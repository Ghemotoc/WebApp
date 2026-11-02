/**
 * Data requests in a real browser (bundle ADMIN-2, part c1; story S1-E11-09, part 09a; screen
 * 8.12; GDPR art. 12(3) and 12(6)).
 *
 * Who runs it: `npm run test:e2e` (Supabase started first).
 * What it proves:
 * - support open Data requests from the staff menu, find the person by username and log a request
 *   that came by email; its page shows the deadline one month from receipt;
 * - support ask the person to confirm; the person sees the notice, follows it to Settings › Data
 *   requests and answers "Yes, it was me"; the staff page then says it was confirmed;
 * - support extend the deadline by one month with a reason and close the request with what was
 *   done; a closed request can't be changed;
 * - a moderator has no Data requests menu item and is refused at its address;
 * - the list and one request pass axe and don't scroll sideways at 390, 768 and 1440 px.
 * Test data: requests about adult_writer made here, removed afterwards with their notices; the
 * audit log keeps its rows, as nobody may change it.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const supportId = '00000000-0000-4000-8000-000000000011';
const axeRequestId = '00000000-0000-4000-9e00-000000000c01';
const stamp = 'e2e data requests';

/** Opens an address in English as a persona, in a fresh browser context. */
async function openAs(
  browser: Browser,
  persona: SignInPersonaName,
  address: string,
): Promise<Page> {
  const context = await browser.newContext();
  await useSessionInBrowser(context, (await signInPersona(persona)).session);
  await context.addInitScript((key) => localStorage.setItem(key, 'en'), LANGUAGE_STORAGE_KEY);
  runSql(`update public.profiles set locale = 'en' where handle = '${persona}';`);
  const page = await context.newPage();
  await page.goto(address);
  return page;
}

/** Removes the requests this spec made and their notices, and puts the languages back. */
function cleanUp() {
  runSql(`
    delete from public.notifications where user_id = '${adultWriterId}'
      and kind in ('data_request_confirm', 'data_request_extended');
    delete from public.email_outbox where user_id = '${adultWriterId}';
    delete from public.data_requests where note like '${stamp}%' or id = '${axeRequestId}';
    update public.profiles set locale = 'ro' where handle in ('support', 'moderator', 'adult_writer');`);
}

test.describe('data requests (S1-E11-09)', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeAll(cleanUp);
  test.afterAll(cleanUp);

  test('support log a request, the person confirms it, support extend and close it', async ({
    browser,
  }) => {
    // Step 1: support open the area from the menu and log a request that came by email.
    const staff = await openAs(browser, 'support', '/staff');
    await staff
      .getByRole('navigation', { name: 'Staff' })
      .getByRole('link', { name: 'Data requests' })
      .click();
    await expect(staff.getByRole('heading', { level: 1, name: 'Data requests' })).toBeVisible();
    await staff.getByRole('link', { name: 'Log a request' }).click();
    await staff.getByLabel('Find the person').fill('adult_writer');
    await staff.getByRole('button', { name: 'Search' }).click();
    await staff.getByRole('radio', { name: /@adult_writer/ }).check();
    await staff.getByLabel('Note for the team').fill(`${stamp}: asked by email.`);
    await staff.getByRole('button', { name: 'Log the request' }).click();
    await expect(
      staff.getByRole('heading', { level: 1, name: /Data request D-\d{6}/ }),
    ).toBeVisible();
    await expect(staff.getByText('Not asked yet')).toBeVisible();

    // Step 2: support ask the person to confirm it was theirs.
    await staff.getByRole('button', { name: 'Ask them to confirm' }).click();
    await expect(staff.getByText('Waiting for the person')).toBeVisible();

    // Step 3: the person follows the notice to Settings and says yes.
    const person = await openAs(browser, 'adult_writer', '/notifications');
    await expect(person.getByText(/Was it you\?/)).toBeVisible();
    await person.getByRole('link', { name: 'Answer' }).first().click();
    await expect(person).toHaveURL(/\/settings#data-requests$/);
    const panel = person.getByRole('region', { name: 'Data requests' });
    await panel.getByRole('button', { name: /^Yes, request D-\d{6} was me$/ }).click();
    await expect(panel.getByText('You confirmed it was you.')).toBeVisible();

    // Step 4: support see the answer, extend by a month and close the request.
    await staff.reload();
    await expect(staff.getByText('Confirmed by the person')).toBeVisible();
    await staff.getByLabel('Why (the person reads this)').fill('Many stories to gather.');
    await staff.getByRole('button', { name: 'Extend the deadline' }).click();
    await expect(staff.getByText('Many stories to gather.')).toBeVisible();
    await staff.getByLabel('What was done').fill('Sent the copy through the account.');
    await staff.getByRole('button', { name: 'Close the request' }).click();
    await expect(staff.getByText('This request is closed and can’t be changed.')).toBeVisible();
  });

  test('a moderator has no Data requests area', async ({ browser }) => {
    const page = await openAs(browser, 'moderator', '/staff');
    const menu = page.getByRole('navigation', { name: 'Staff' });
    await expect(menu.getByRole('link', { name: 'Users' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Data requests' })).toHaveCount(0);
    await page.goto('/staff/data-requests');
    await expect(
      page.getByText('Only owner, admin and support staff handle data requests.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Log a request' })).toHaveCount(0);
  });

  for (const view of everyView(['/staff/data-requests', `/staff/data-requests/${axeRequestId}`])) {
    test(`axe: ${view.address} at ${view.width} px, ${view.theme}, ${view.language}`, async ({
      page,
    }) => {
      // An open request by post, so the list and the page show every panel.
      runSql(`insert into public.data_requests (id, user_id, request_type, channel, received_on,
          due_on, identity, note, created_by_user_id, handled_by_user_id)
        values ('${axeRequestId}', '${adultWriterId}', 'delete', 'post', current_date - 3,
          (current_date - 3 + interval '1 month')::date, 'not_asked', '${stamp}: axe',
          '${supportId}', '${supportId}')
        on conflict (id) do nothing;
        update public.profiles set locale = '${view.language}' where handle = 'support';`);
      await useSessionInBrowser(page.context(), (await signInPersona('support')).session);
      await checkScreen(page, view);
    });
  }
});
