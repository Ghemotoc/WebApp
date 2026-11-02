-- Database tests for the parent's or guardian's path of a data request (bundle ADMIN-2, part c3;
-- story S1-E11-09 criterion 5 and "for a parent, a one-time link to the checked email address";
-- GDPR art. 8 and 12(6)).
-- What it proves:
-- - staff ask the parent only through our server's signature, only about an under-16, only while
--   the check is open and only when a parent agreed (S1-E2-03); moderators can't;
-- - the parent's page shows the request from the link, never the user ID or an email; the parent
--   answers once; the person can't answer for them and isn't asked in Settings;
-- - the copy is allowed once the parent confirmed, never after "not ours"; the person gets no
--   notice and doesn't see the files;
-- - the copy link is signed, needs a ready copy, works for one hour after its first opening and
--   then says used; policy exports_select_parent_link lets a signed-out visitor download only
--   within that hour (allowed and denied).
-- Personas: adult_writer (…01), kid_14_ok (…03, a parent agreed), kid_14_waiting (…04, no parent
-- agreed yet), moderator (…10), support (…11). Rolled back.
begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('request.jwt.claims', '', true), set_config('role', 'anon', true);
$$;
create function pg_temp.as_postgres() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;
create function pg_temp.hashed(token text) returns text language sql as $$
  select encode(extensions.digest(token, 'sha256'), 'hex');
$$;
-- A link as server/data-request-parent.ts signs it, with the test secret below.
create function pg_temp.signed(purpose text, request_id uuid, token text) returns text language sql as $$
  select encode(extensions.hmac('data-request-' || purpose || '|' || request_id || '|' || pg_temp.hashed(token),
    'test-consent-secret', 'sha256'), 'hex');
$$;
create function pg_temp.ask(request_id uuid, token text) returns jsonb language sql as $$
  select public.admin_ask_data_request_parent(request_id, pg_temp.hashed(token),
    pg_temp.signed('ask', request_id, token));
$$;
create function pg_temp.send(request_id uuid, token text) returns jsonb language sql as $$
  select public.admin_send_data_request_parent_copy(request_id, pg_temp.hashed(token),
    pg_temp.signed('copy', request_id, token));
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

select vault.create_secret('test-consent-secret', 'parental_consent_secret')
  where not exists (select 1 from vault.secrets where name = 'parental_consent_secret');
select vault.update_secret(id, 'test-consent-secret') from vault.secrets
  where name = 'parental_consent_secret';

create temp table test_requests (name text primary key, id uuid, reference text);
create temp table opened_files (export_id uuid, file_name text, display_name text);
grant select, insert, delete on test_requests, opened_files to anon, authenticated;

/* ---------- Setting up ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
insert into test_requests
select made.name, (made.opened ->> 'id')::uuid, made.opened ->> 'reference'
from (values
  ('kid', public.admin_open_data_request('00000000-0000-4000-8000-000000000003', 'copy', 'email', current_date, '')),
  ('kid_no', public.admin_open_data_request('00000000-0000-4000-8000-000000000003', 'move', 'post', current_date, '')),
  ('kid_app', public.admin_open_data_request('00000000-0000-4000-8000-000000000003', 'copy', 'in_app', current_date, '')),
  ('waiting_kid', public.admin_open_data_request('00000000-0000-4000-8000-000000000004', 'copy', 'email', current_date, '')),
  ('adult', public.admin_open_data_request('00000000-0000-4000-8000-000000000001', 'copy', 'email', current_date, ''))
) as made (name, opened);

/* ---------- 1. Asking the parent ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select pg_temp.ask((select id from test_requests where name = 'kid'), 'ask-token-1') $$,
  '42501', null, 'a moderator can''t ask a parent');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_ask_data_request_parent((select id from test_requests where name = 'kid'),
    pg_temp.hashed('my-own-token'), 'not-a-signature') $$,
  '42501', 'This request wasn''t signed by our server.', 'staff can''t store a link of their own');
select throws_ok($$ select pg_temp.ask((select id from test_requests where name = 'adult'), 'ask-token-x') $$,
  '23514', 'This person is 16 or over.', 'an adult''s request isn''t sent to a parent');
select throws_ok($$ select pg_temp.ask((select id from test_requests where name = 'kid_app'), 'ask-token-y') $$,
  '23514', 'The request came from inside the account.', 'a request made in the account needs no parent');
select throws_ok($$ select pg_temp.ask((select id from test_requests where name = 'waiting_kid'), 'ask-token-z') $$,
  '23514', 'No parent or guardian agreed for this account.', 'without an agreed parent nobody is written to');
select is((select pg_temp.ask(id, 'ask-token-0') - 'reference' from test_requests where name = 'kid'),
  '{"parent_email": "parent.kid14ok@example.com", "language": "ro", "handle": "kid_14_ok", "request_type": "copy"}'::jsonb,
  'the server gets the parent''s address from the consent, never from the request');
-- Asking again replaces the link.
select lives_ok($$ select pg_temp.ask((select id from test_requests where name = 'kid'), 'ask-token-1') $$,
  'staff can send the parent a new link');
do $$ begin perform pg_temp.ask(id, 'ask-token-2') from test_requests where name = 'kid_no'; end $$;

select pg_temp.as_postgres();
select is((select count(*)::integer from public.audit_log where action = 'data_request.parent_asked'
    and target_id in (select id::text from test_requests) and after_values ->> 'method' = 'parent_link'
    and after_values::text not like '%@%'), 3, 'each ask is in the audit log, without the parent''s address');

/* ---------- 2. The parent's page and answer ---------- */

select pg_temp.sign_out();
select is(public.data_request_parent_link('ask-token-0'), '{"outcome": "gone"}'::jsonb,
  'the replaced link no longer works');
select is((public.data_request_parent_link('ask-token-1') - 'reference' - 'received_on'),
  '{"outcome": "ok", "link": "check", "language": "ro", "handle": "kid_14_ok", "request_type": "copy", "identity": "asked"}'::jsonb,
  'the parent sees which account and which request, signed out, and no user ID or email');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select throws_ok($$ select public.answer_data_request((select reference from test_requests where name = 'kid'), true) $$,
  '23514', 'We aren''t waiting for an answer.', 'the child can''t answer for their parent');
select is((select (request ->> 'identity') from jsonb_array_elements(public.my_data_requests()) as request
    where request ->> 'reference' = (select reference from test_requests where name = 'kid')),
  'not_asked', 'and Settings doesn''t ask the child to');

select pg_temp.sign_out();
select is(public.answer_data_request_parent('ask-token-1', true) ->> 'identity', 'confirmed',
  'the parent says they asked for it');
select is(public.answer_data_request_parent('ask-token-1', false), '{"outcome": "already_answered"}'::jsonb,
  'and can''t change the answer from the link');
select is(public.answer_data_request_parent('ask-token-2', false) ->> 'identity', 'denied',
  'another parent says they didn''t');
select is(public.answer_data_request_parent('not-a-token', true), '{"outcome": "gone"}'::jsonb,
  'a made-up link answers nothing');

/* ---------- 3. The copy ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_data_request_export((select id from test_requests where name = 'kid_no')) $$,
  '23514', 'The person said this request wasn''t theirs.', 'no copy after the parent said "not ours"');
select throws_ok($$ select pg_temp.send((select id from test_requests where name = 'kid'), 'copy-token-0') $$,
  '23514', 'There is no copy to send.', 'no link before the copy is sent');
select lives_ok($$ select public.admin_data_request_export((select id from test_requests where name = 'kid')) $$,
  'the copy is allowed once the parent confirmed');
insert into opened_files
select (file ->> 'export_id')::uuid, file ->> 'file_name', file ->> 'display_name'
from jsonb_array_elements(public.admin_open_data_request_copy((select id from test_requests where name = 'kid'),
  '[{"display_name": "D-copy.zip"}]'::jsonb)) as file;
insert into storage.objects (bucket_id, name, owner_id, metadata)
  select 'exports', file_name, auth.uid()::text, '{"size": 42}' from opened_files;
select lives_ok($$ select public.admin_finish_data_request_copy((select id from test_requests where name = 'kid')) $$,
  'staff send the copy');

select pg_temp.as_postgres();
select is((select count(*)::integer from public.notifications
    where user_id = '00000000-0000-4000-8000-000000000003' and kind = 'data_request_copy_ready'), 0,
  'the child gets no notice: the copy goes to the parent');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000003');
select is((select request -> 'files' from jsonb_array_elements(public.my_data_requests()) as request
    where request ->> 'reference' = (select reference from test_requests where name = 'kid')),
  '[]'::jsonb, 'and doesn''t see the files in Settings');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select public.admin_send_data_request_parent_copy((select id from test_requests where name = 'kid'),
    pg_temp.hashed('copy-token-1'), pg_temp.signed('ask', (select id from test_requests where name = 'kid'), 'copy-token-1')) $$,
  '42501', 'This request wasn''t signed by our server.', 'a signature for the ask link doesn''t make a copy link');
select throws_ok($$ select pg_temp.send((select id from test_requests where name = 'adult'), 'copy-token-x') $$,
  '23514', 'The parent hasn''t confirmed this request.', 'only a parent''s confirmed request gets a copy link');
select is((select pg_temp.send(id, 'copy-token-1') ->> 'parent_email' from test_requests where name = 'kid'),
  'parent.kid14ok@example.com', 'the copy link goes to the checked parent''s address');

/* ---------- 4. The one-time link ---------- */

select pg_temp.sign_out();
select is(public.data_request_parent_link('copy-token-1') ->> 'state', 'ready', 'the link is ready, not opened');
select is((select count(*)::integer from storage.objects where bucket_id = 'exports'
    and name in (select file_name from opened_files)), 0,
  'denied: exports_select_parent_link: nothing can be downloaded before the link is opened');
select is(public.open_data_request_parent_copy('ask-token-1'), '{"outcome": "gone"}'::jsonb,
  'the check link doesn''t open the files');
select is(jsonb_array_length(public.open_data_request_parent_copy('copy-token-1') -> 'files'), 1,
  'the parent opens the files');
select is((select count(*)::integer from storage.objects where bucket_id = 'exports'
    and name in (select file_name from opened_files)), 1,
  'allowed: exports_select_parent_link: signed out, the parent downloads the file within the hour');
select is(public.open_data_request_parent_copy('copy-token-1') ->> 'outcome', 'ok',
  'opening again within the hour still works');
select is(public.data_request_parent_link('copy-token-1') ->> 'state', 'open', 'the page says the link is open');

-- An hour later.
select pg_temp.as_postgres();
update public.data_requests set parent_copy_opened_at = now() - interval '61 minutes'
  where id = (select id from test_requests where name = 'kid');
select pg_temp.sign_out();
select is(public.open_data_request_parent_copy('copy-token-1'), '{"outcome": "used"}'::jsonb,
  'after the hour the link is used');
select is((select count(*)::integer from storage.objects where bucket_id = 'exports'
    and name in (select file_name from opened_files)), 0,
  'denied: exports_select_parent_link: and the file can''t be downloaded any more');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from storage.objects where bucket_id = 'exports'
    and name in (select file_name from opened_files)), 0,
  'denied: exports_select_parent_link: another signed-in member never reads it');

-- Staff can send a fresh link, which starts afresh.
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
do $$ begin perform pg_temp.send(id, 'copy-token-2') from test_requests where name = 'kid'; end $$;
select pg_temp.sign_out();
select is(public.data_request_parent_link('copy-token-1'), '{"outcome": "gone"}'::jsonb,
  'the old copy link stops working');
select is(public.data_request_parent_link('copy-token-2') ->> 'state', 'ready', 'the new one is ready');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select is((select (public.admin_data_request(id) ->> 'goes_to_parent')::boolean from test_requests where name = 'kid'),
  true, 'staff see the request goes through the parent');

select * from finish();
rollback;
