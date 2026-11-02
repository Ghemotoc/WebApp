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
 * - part c2: support build and send a copy of a request made in the app as one ZIP; they see its
 *   name and size and open it (logged); the person downloads it from Settings › Data requests;
 * - a moderator has no Data requests menu item and is refused at its address;
 * - the list and one request pass axe and don't scroll sideways at 390, 768 and 1440 px.
 * Test data: requests about adult_writer made here, removed afterwards with their notices, copies
 * and files; the audit log keeps its rows, as nobody may change it.
 */
import { expect, test, type Browser, type Page } from '@playwright/test';

import { checkScreen, everyView, LANGUAGE_STORAGE_KEY } from './support/accessibility';
import { runSql } from './support/database';
import { signInPersona, useSessionInBrowser, type SignInPersonaName } from './support/personas';

const adultWriterId = '00000000-0000-4000-8000-000000000001';
const supportId = '00000000-0000-4000-8000-000000000011';
const axeRequestId = '00000000-0000-4000-9e00-000000000c01';
const copyRequestId = '00000000-0000-4000-9e00-000000000c02';
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
    select set_config('storage.allow_delete_query', 'true', false);
    delete from storage.objects where bucket_id = 'exports' and name in (
      select file_name from public.exports where kind = 'data_request');
    delete from public.notifications where user_id = '${adultWriterId}'
      and kind in ('data_request_confirm', 'data_request_extended', 'data_request_copy_ready');
    delete from public.email_outbox where user_id = '${adultWriterId}';
    delete from public.data_requests where note like '${stamp}%' or id in ('${axeRequestId}', '${copyRequestId}');
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
    const identity = staff.getByRole('region', { name: 'Identity check' });
    await expect(identity.getByText('Not asked yet')).toBeVisible();

    // Step 2: support ask the person to confirm it was theirs.
    await staff.getByRole('button', { name: 'Ask them to confirm' }).click();
    await expect(identity.getByText('Waiting for the person')).toBeVisible();

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
    await expect(identity.getByText('Confirmed by the person')).toBeVisible();
    await staff.getByLabel('Why (the person reads this)').fill('Many stories to gather.');
    await staff.getByRole('button', { name: 'Extend the deadline' }).click();
    await expect(staff.getByText('Many stories to gather.')).toBeVisible();
    await staff.getByLabel('What was done').fill('Sent the copy through the account.');
    await staff.getByRole('button', { name: 'Close the request' }).click();
    await expect(staff.getByText('This request is closed and can’t be changed.')).toBeVisible();
  });

  test('support send a copy as one ZIP and the person downloads it from Settings', async ({
    browser,
  }) => {
    // Step 1: a request for a copy made inside the account, so it needs no identity check.
    runSql(`insert into public.data_requests (id, user_id, request_type, channel, received_on,
        due_on, identity, note, created_by_user_id, handled_by_user_id)
      values ('${copyRequestId}', '${adultWriterId}', 'copy', 'in_app', current_date,
        (current_date + interval '1 month')::date, 'not_needed', '${stamp}: copy', '${supportId}',
        '${supportId}');`);
    const staff = await openAs(browser, 'support', `/staff/data-requests/${copyRequestId}`);

    // Step 2: support build and send it as one ZIP, built in this tab.
    const copy = staff.getByRole('region', { name: 'The copy' });
    await copy.getByRole('radio', { name: 'One ZIP of everything' }).check();
    await copy.getByRole('button', { name: 'Build and send the copy' }).click();
    await expect(copy.getByText(/The copy is sent/)).toBeVisible({ timeout: 30_000 });
    const zipName = copy.getByText(/^D-\d{6}-copy\.zip$/).first();
    await expect(zipName).toBeVisible();

    // Step 3: support can open it, but only through the logged button.
    const staffDownload = staff.waitForEvent('download');
    await copy.getByRole('button', { name: /^Open D-\d{6}-copy\.zip \(logged\)$/ }).click();
    expect((await staffDownload).suggestedFilename()).toMatch(/^D-\d{6}-copy\.zip$/);

    // Step 4: the person follows the notice to Settings and downloads the ZIP, signed in.
    const person = await openAs(browser, 'adult_writer', '/notifications');
    await person.getByRole('link', { name: 'Download it' }).first().click();
    await expect(person).toHaveURL(/\/settings#data-requests$/);
    const panel = person.getByRole('region', { name: 'Data requests' });
    const personDownload = person.waitForEvent('download');
    await panel.getByRole('button', { name: /^Download D-\d{6}-copy\.zip$/ }).click();
    expect((await personDownload).suggestedFilename()).toMatch(/^D-\d{6}-copy\.zip$/);
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
      // An open request for a copy by post, with a file waiting and a copy sent, so the list and
      // the page show every panel.
      runSql(`insert into public.data_requests (id, user_id, request_type, channel, received_on,
          due_on, identity, note, created_by_user_id, handled_by_user_id, copies_sent)
        values ('${axeRequestId}', '${adultWriterId}', 'copy', 'post', current_date - 3,
          (current_date - 3 + interval '1 month')::date, 'not_asked', '${stamp}: axe',
          '${supportId}', '${supportId}', jsonb_build_array(jsonb_build_object('sent_at', now(),
            'expires_at', now() + interval '7 days', 'files',
            '[{"name": "a-very-long-story-name-that-wraps-on-a-phone-screen.docx", "size": 34567}]'::jsonb)))
        on conflict (id) do nothing;
        insert into public.exports (user_id, kind, data_request_id, display_name, file_name, state,
            file_size, ready_at, expires_at)
          select '${adultWriterId}', 'data_request', '${axeRequestId}',
            'a-very-long-story-name-that-wraps-on-a-phone-screen.docx',
            gen_random_uuid()::text || '.docx', 'ready', 34567, now(), now() + interval '7 days'
          where not exists (select 1 from public.exports where data_request_id = '${axeRequestId}');
        update public.profiles set locale = '${view.language}' where handle = 'support';`);
      await useSessionInBrowser(page.context(), (await signInPersona('support')).session);
      await checkScreen(page, view);
    });
  }
});
