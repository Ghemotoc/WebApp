-- Database tests for the data request log (bundle ADMIN-2, part c1; story S1-E11-09, part 09a;
-- GDPR art. 12(3), 12(6) and 5(2)).
-- What it proves:
-- - only support, admin and the owner log, list, open, extend, ask about and close requests; a
--   moderator, the content editor and members are refused; the table is read only by those staff
--   (policy data_requests_select_staff: allowed and denied);
-- - the deadline is one month from receipt, even at the end of a month (31 January → 28 February);
-- - an extension is one or two more months, needs a reason, only within the first month, and the
--   person gets a required notice (emailed) with the new deadline and the reason;
-- - asking the person to confirm sends a required notice; only the person, signed in, answers it,
--   once; the answer is in the audit log; a request made in the app needs no check; a request
--   about an under-16 goes to the parent instead (part c2);
-- - closing needs what was done and keeps the user ID, type, dates and identity check; a closed
--   request can't be changed; the person's own list never shows staff notes.
-- Personas: adult_writer (…01), kid_14_ok (…03), teacher (…07), owner (…08), admin (…09),
-- moderator (…10), support (…11), editor (…12). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(44);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.as_visitor() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '{"role": "anon"}', true);
$$;
-- Internal functions (notification_json()) aren't granted to members, so they are called as postgres
-- with a member's claims: auth.uid() is still that member.
create function pg_temp.server_for(persona_id text) returns void language sql as $$
  select set_config('role', 'postgres', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- The requests the tests open, by name.
create temp table test_requests (name text primary key, id uuid, reference text);
grant select, insert on test_requests to authenticated;

/* ---------- 1. Who may log a request ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select public.admin_open_data_request('00000000-0000-4000-8000-000000000001',
  'copy', 'email', public.romania_today(), '') $$, '42501', null, 'a moderator can''t log a data request');
select throws_ok($$ select public.admin_data_requests(false) $$, '42501', null,
  'a moderator can''t list data requests');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000012');
select throws_ok($$ select public.admin_open_data_request('00000000-0000-4000-8000-000000000001',
  'copy', 'email', public.romania_today(), '') $$, '42501', null, 'the content editor can''t log a data request');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select public.admin_open_data_request('00000000-0000-4000-8000-000000000001',
  'copy', 'email', public.romania_today(), '') $$, '42501', null, 'a member can''t use the staff function');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_open_data_request('00000000-0000-4000-8000-0000000000ff',
  'copy', 'email', public.romania_today(), '') $$, '23514', null, 'a request needs an account that exists');
select throws_ok($$ select public.admin_open_data_request('00000000-0000-4000-8000-000000000001',
  'copy', 'email', public.romania_today() + 1, '') $$, '23514', null, 'the date received can''t be in the future, in Romanian time');
select throws_ok($$ select public.admin_open_data_request('00000000-0000-4000-8000-000000000001',
  'copy', 'email', public.romania_today(), repeat('x', 2001)) $$, '23514', null, 'a note over 2000 characters is refused');

-- Support log a request by email for a copy, received today.
insert into test_requests
select 'by_email', (opened ->> 'id')::uuid, opened ->> 'reference'
from (select public.admin_open_data_request('00000000-0000-4000-8000-000000000001', 'copy', 'email',
        public.romania_today(), 'Asked by email from the account''s address.') as opened) as made;
select is((select public.admin_data_request(id) ->> 'due_on' from test_requests where name = 'by_email'),
  ((public.romania_today() + interval '1 month')::date)::text, 'support log a request, due one month from receipt');
select is((select public.admin_data_request(id) ->> 'identity' from test_requests where name = 'by_email'),
  'not_asked', 'a request by email still needs the identity check');
select ok((select reference from test_requests where name = 'by_email') ~ '^D-[0-9]{6}$',
  'a request gets a reference like D-000001');

-- Admin log one received on 31 January 2026, and the owner one made in the app.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
insert into test_requests
select 'end_of_month', (opened ->> 'id')::uuid, opened ->> 'reference'
from (select public.admin_open_data_request('00000000-0000-4000-8000-000000000001', 'delete', 'post',
        date '2026-01-31', '') as opened) as made;
select is((select public.admin_data_request(id) ->> 'due_on' from test_requests where name = 'end_of_month'),
  '2026-02-28', 'admin log a request; received on 31 January it is due on 28 February');
select is((select public.admin_data_request(id) ->> 'urgency' from test_requests where name = 'end_of_month'),
  'overdue', 'a request past its deadline is overdue');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
insert into test_requests
select 'in_app', (opened ->> 'id')::uuid, opened ->> 'reference'
from (select public.admin_open_data_request('00000000-0000-4000-8000-000000000001', 'correct', 'in_app',
        public.romania_today(), '') as opened) as made;
select is((select public.admin_data_request(id) ->> 'identity' from test_requests where name = 'in_app'),
  'not_needed', 'the owner log a request made in the app, which needs no identity check');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
insert into test_requests
select 'under_16', (opened ->> 'id')::uuid, opened ->> 'reference'
from (select public.admin_open_data_request('00000000-0000-4000-8000-000000000003', 'copy', 'email',
        public.romania_today(), '') as opened) as made;

-- Support can't read the audit log (architecture 1.8.3), so the log is checked as the server.
select pg_temp.as_postgres();
select is((select count(*)::integer from public.audit_log where action = 'data_request.opened'
           and target_id in (select id::text from test_requests)
           and target_user_id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003')),
  4, 'each new request is in the audit log with the person''s user ID');

/* ---------- 2. Who may read the table (policy data_requests_select_staff) ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select count(*)::integer from public.data_requests where id in (select id from test_requests)), 4,
  'allowed: data_requests_select_staff: support read every data request');
select is(jsonb_array_length(public.admin_data_requests(true)) >= 4, true, 'support list the open requests');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.data_requests), 0,
  'denied: data_requests_select_staff: a moderator reads no data requests');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.data_requests), 0,
  'denied: data_requests_select_staff: the person can''t read the table, only their own list');
select pg_temp.as_visitor();
select throws_ok($$ select count(*) from public.data_requests $$, '42501', null,
  'a signed-out visitor can''t read data requests');

/* ---------- 3. Extending the deadline ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_extend_data_request((select id from test_requests where name = 'by_email'),
  1, ' ') $$, '23514', null, 'an extension needs a reason');
select throws_ok($$ select public.admin_extend_data_request((select id from test_requests where name = 'by_email'),
  3, 'Many stories.') $$, '23514', null, 'an extension is at most two more months');
select throws_ok($$ select public.admin_extend_data_request((select id from test_requests where name = 'end_of_month'),
  1, 'Many stories.') $$, '23514', null, 'after the first month the deadline can''t be extended');
select is((select public.admin_extend_data_request(id, 1, 'Many stories to gather.') ->> 'deadline'
           from test_requests where name = 'by_email'),
  ((public.romania_today() + interval '2 months')::date)::text, 'support extend a request by one more month');
select throws_ok($$ select public.admin_extend_data_request((select id from test_requests where name = 'by_email'),
  1, 'Again.') $$, '23514', null, 'a second extension must go further than the first');
select is((select public.admin_extend_data_request(id, 2, 'Many stories to gather.') ->> 'deadline'
           from test_requests where name = 'by_email'),
  ((public.romania_today() + interval '3 months')::date)::text, 'support extend it to two more months in all');

select pg_temp.as_postgres();
select is((select count(*)::integer from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000001' and kind = 'data_request_extended'
             and is_required and data_request_id = (select id from test_requests where name = 'by_email')), 2,
  'the person is told of each extension, and can''t switch it off');
select is(public.email_delivery_for('00000000-0000-4000-8000-000000000001', 'data_request_extended'), 'required',
  'the extension notice is always emailed');
select pg_temp.server_for('00000000-0000-4000-8000-000000000001');
select is((select public.notification_json(notifications) -> 'data_request' ->> 'extension_reason'
           from public.notifications where user_id = '00000000-0000-4000-8000-000000000001'
             and kind = 'data_request_extended' limit 1),
  'Many stories to gather.', 'the notice gives the reason for the extension');

/* ---------- 4. The identity check ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_ask_data_request_confirmation((select id from test_requests where name = 'in_app')) $$,
  '23514', null, 'a request made in the app needs no confirmation');
select throws_ok($$ select public.admin_ask_data_request_confirmation((select id from test_requests where name = 'under_16')) $$,
  '23514', null, 'a request about an under-16 goes to the parent, not the account');
select is((select public.admin_ask_data_request_confirmation(id) ->> 'identity' from test_requests where name = 'by_email'),
  'asked', 'support ask the person to confirm the request was theirs');

select pg_temp.as_postgres();
select is((select count(*)::integer from public.notifications
           where user_id = '00000000-0000-4000-8000-000000000001' and kind = 'data_request_confirm' and is_required), 1,
  'the person gets a notice they can''t switch off');
select is(public.email_delivery_for('00000000-0000-4000-8000-000000000001', 'data_request_confirm'), 'required',
  'the confirmation notice is emailed to the account''s own address');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000007');
select throws_ok($$ select public.answer_data_request((select reference from test_requests where name = 'by_email'), true) $$,
  '23514', null, 'someone else can''t answer for the person');
select pg_temp.as_visitor();
select throws_ok($$ select public.answer_data_request('D-000001', true) $$, '42501', null,
  'a signed-out visitor can''t answer');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select public.answer_data_request(reference, true) from test_requests where name = 'by_email'),
  'confirmed', 'the person, signed in, confirms the request was theirs');
select throws_ok($$ select public.answer_data_request((select reference from test_requests where name = 'by_email'), false) $$,
  '23514', null, 'an answer can''t be changed afterwards');
select ok(not exists (select 1 from jsonb_array_elements(public.my_data_requests()) as listed(request)
                      where listed.request ? 'note' or listed.request ? 'handled_by_handle'),
  'the person''s own list never shows staff notes or who handled it');

select pg_temp.as_postgres();
select is((select after_values ->> 'identity' from public.audit_log where action = 'data_request.identity_answered'
           and target_id = (select id::text from test_requests where name = 'by_email')), 'confirmed',
  'the answer is in the audit log');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_ask_data_request_confirmation((select id from test_requests where name = 'by_email')) $$,
  '23514', null, 'staff can''t ask again once the person has answered');

/* ---------- 5. Closing ---------- */

select throws_ok($$ select public.admin_close_data_request((select id from test_requests where name = 'by_email'), ' ') $$,
  '23514', null, 'closing needs what was done');
select is((select public.admin_close_data_request(id, 'Sent the copy.') ->> 'state' from test_requests where name = 'by_email'),
  'closed', 'support close a request with what was done');
select is((select row(user_id, request_type, received_on, identity, handled_by_user_id)::text
           from public.data_requests where id = (select id from test_requests where name = 'by_email')),
  row('00000000-0000-4000-8000-000000000001'::uuid, 'copy'::public.data_request_type, public.romania_today(),
      'confirmed'::public.data_request_identity, '00000000-0000-4000-8000-000000000011'::uuid)::text,
  'a closed request keeps the user ID, type, dates, identity check and who handled it');
select throws_ok($$ select public.admin_extend_data_request((select id from test_requests where name = 'by_email'),
  2, 'Late.') $$, '23514', null, 'a closed request can''t be changed');

select * from finish();

rollback;
