-- Database tests for the waiting list (bundle WAITLIST-1, story S1-E2-24).
-- What it proves:
-- - the 'waitlist' flag is on and public, so the sign-up form can read it;
-- - while it is on, a sign-up without a code makes the account and puts it on the list, with the
--   "write, read or both" answer and the founding member badge; the news opt-in is kept only for
--   an adult who ticked it; a code still lets the person in at once; a code that doesn't work is
--   still refused;
-- - a confirmed account on the list is 'waitlisted': not an active member, but it may build its
--   avatar; it reads its own place (my_waitlist()) and changes its answer;
-- - Staff › Waitlist: only owner and admin list and let people in; letting someone in makes the
--   account active, sends the "You're in" notice (always emailed) and writes the audit row; a
--   wave takes the oldest confirmed people who fit, writers including "both";
-- - the badge on the public profile, the dashboard count, Download my data and deleting an
--   account all know the new table.
-- Policies covered: waitlist_entries_select_own and waitlist_entries_select_staff, allowed and
-- denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(48);

create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000008'::uuid as owner,
  '00000000-0000-4000-8000-000000000009'::uuid as admin,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator;
grant select on ids to authenticated, anon;

-- The accounts this test makes, by name.
create temp table people (name text primary key, user_id uuid);
grant select on people to authenticated, anon;

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- The sign-up data the form sends (as in 023), with the waiting list's answers.
create function pg_temp.sign_up_data(handle text, invite_code text, interest text, news text, birth_year text default '1990')
returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'handle', handle, 'invite_code', invite_code, 'birth_year', birth_year, 'locale', 'en',
    'waitlist_interest', interest, 'news_emails', news,
    'accepted_terms_version_id', (
      select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'terms' and versions.language = 'en'),
    'accepted_privacy_version_id', (
      select versions.id from public.legal_document_versions as versions
      join public.legal_documents as documents on documents.id = versions.document_id
      where documents.slug = 'privacy' and versions.language = 'en')));
$$;

-- Inserts an account the way Supabase Auth does and remembers it by name.
create function pg_temp.sign_up(name text, sign_up_data jsonb) returns uuid language plpgsql as $$
declare
  new_id uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data,
    raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
    name || '@waitlist.test', 'not-a-real-hash', '{"provider": "email", "providers": ["email"]}', sign_up_data,
    now(), now(), '', '', '', '');
  insert into people values (name, new_id);
  return new_id;
end;
$$;

-- Confirms an account's email, as the link in the confirmation email does.
create function pg_temp.confirm(name text) returns void language sql as $$
  update auth.users set email_confirmed_at = now() where id = (select user_id from people where people.name = confirm.name);
$$;

create function pg_temp.id_of(name text) returns uuid language sql as $$
  select user_id from people where people.name = id_of.name;
$$;

/* ---------- 1. The switch ---------- */

select ok((select is_enabled and is_public from public.feature_flags where key = 'waitlist'),
  'the waiting list is on, and the sign-up form may read the switch');

/* ---------- 2. Signing up while the list is on ---------- */

select lives_ok($$ select pg_temp.sign_up('wait_writer', pg_temp.sign_up_data('wait_writer', null, 'write', 'true')) $$,
  'without a code, sign-up still makes the account while the waiting list is on');
select results_eq(
  $$ select interest::text, admitted_at is null, admitted_by_code from public.waitlist_entries
     where user_id = pg_temp.id_of('wait_writer') $$,
  $$ values ('write', true, false) $$,
  'the person waits on the list with their answer');
select ok((select founding_member_since is not null and marketing_email_opt_in from public.profiles
           where id = pg_temp.id_of('wait_writer')),
  'they get the founding member badge, and news emails because an adult ticked the box');
select is(public.account_state(pg_temp.id_of('wait_writer'))::text, 'email_unconfirmed',
  'before the email is confirmed the account is unconfirmed, as for everyone');
select pg_temp.confirm('wait_writer');
select is(public.account_state(pg_temp.id_of('wait_writer'))::text, 'waitlisted',
  'once confirmed, the account is waitlisted');

select lives_ok($$ select pg_temp.sign_up('wait_reader', pg_temp.sign_up_data('wait_reader', null, 'read', null)) $$,
  'a reader joins the list too');
select ok((select not marketing_email_opt_in from public.profiles where id = pg_temp.id_of('wait_reader')),
  'no news emails without the tick');
select lives_ok($$ select pg_temp.sign_up('no_answer', pg_temp.sign_up_data('no_answer', null, null, null)) $$,
  'an older form without the question still signs up');
select is((select interest::text from public.waitlist_entries where user_id = pg_temp.id_of('no_answer')), 'both',
  'without an answer the person wants both');

select lives_ok($$ select pg_temp.sign_up('with_code', pg_temp.sign_up_data('with_code', 'PERSONAS-TEST-INVITE', 'both', null)) $$,
  'with a working code, sign-up works');
select results_eq(
  $$ select admitted_at is not null, admitted_by_code from public.waitlist_entries where user_id = pg_temp.id_of('with_code') $$,
  $$ values (true, true) $$,
  'an invitation code skips the queue');
select pg_temp.confirm('with_code');
select is(public.account_state(pg_temp.id_of('with_code'))::text, 'active',
  'the invited person is an active member once confirmed');
select throws_ok($$ select pg_temp.sign_up('bad_code', pg_temp.sign_up_data('bad_code', 'NOT-A-CODE', 'both', null)) $$,
  '23514', null, 'a code that doesn''t work is still refused, so the person can fix it');

/* ---------- 3. Waiting: the holding page ---------- */

set local role authenticated;
select pg_temp.sign_in_as(pg_temp.id_of('wait_writer'));
select is(public.is_active_member(), false, 'someone waiting can''t write, read or post');
-- may_change_own_avatar() is internal (the avatar save calls it), so it is asked as its owner.
reset role;
select is(public.may_change_own_avatar(), true, 'someone waiting may build their avatar on the holding page');
set local role authenticated;
select is(public.my_waitlist() - 'joined_at' - 'country' - 'market_open',
  '{"on_list": true, "waiting": true, "interest": "write", "admitted_at": null}'::jsonb,
  'they see that they wait, and their answer, never a place in the queue');
select results_eq($$ select count(*)::integer from public.waitlist_entries $$, $$ values (1) $$,
  'allowed: waitlist_entries_select_own: they read their own entry, and only it');
select lives_ok($$ select public.set_my_waitlist_interest('both') $$, 'they can change their answer');
select is((public.my_waitlist() ->> 'interest'), 'both', 'and the new answer is kept');
select throws_ok($$ update public.waitlist_entries set admitted_at = now() $$, '42501', null,
  'nobody lets themselves in by writing to the table');

select pg_temp.sign_in_as((select adult_writer from ids));
select is_empty($$ select id from public.waitlist_entries $$,
  'denied: waitlist_entries_select_own: a member reads nobody else''s entry');
select is(public.my_waitlist(), '{"on_list": false}'::jsonb, 'a member who never waited is not on the list');
select throws_ok($$ select public.set_my_waitlist_interest('read') $$, '23514', null,
  'a member who isn''t waiting can''t answer the question');

select pg_temp.sign_in_as((select moderator from ids));
select is_empty($$ select id from public.waitlist_entries $$,
  'denied: waitlist_entries_select_staff: a moderator reads no entries');
select throws_ok($$ select public.admin_waitlist() $$, '42501', null, 'a moderator can''t see the waiting list');
select throws_ok($$ select public.admin_admit_waitlist_wave(null, null, 5) $$, '42501', null,
  'a moderator can''t let people in');
select ok(not (public.staff_dashboard() ? 'waitlist'), 'a moderator''s dashboard has no waiting list number');

set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select throws_ok($$ select public.my_waitlist() $$, '42501', null, 'a visitor has no place to see');

/* ---------- 4. Staff › Waitlist ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select admin from ids));
select ok((select count(*) >= 3 from public.waitlist_entries),
  'allowed: waitlist_entries_select_staff: an admin reads every entry');
select is((public.admin_waitlist() -> 'counts' ->> 'waiting')::integer, 3,
  'the admin sees three people waiting');
select is(jsonb_array_length(public.admin_waitlist('write') -> 'people'), 2,
  'writers first: the "write" filter includes people who want both');
select ok(not (public.admin_waitlist() -> 'people' -> 0 ? 'user_id'),
  'the list never shows the user ID');
select is((public.staff_dashboard() -> 'waitlist' ->> 'waiting')::integer, 3,
  'the admin''s dashboard counts the people waiting');

select is(public.admin_admit_from_waitlist(array[(select id from public.waitlist_entries where user_id = pg_temp.id_of('wait_writer'))]),
  1, 'the admin lets one person in');
-- What happened is checked as the tables' owner: account_state() and the outbox are internal.
reset role;
select is(public.account_state(pg_temp.id_of('wait_writer'))::text, 'active', 'the person is now an active member');
select results_eq(
  $$ select kind::text, is_required from public.notifications where user_id = pg_temp.id_of('wait_writer') $$,
  $$ values ('waitlist_admitted', true) $$,
  'they get the "You''re in" notice, which can''t be switched off');
select is((select delivery from public.email_outbox where user_id = pg_temp.id_of('wait_writer')), 'required',
  'and the "You''re in" email is queued as always sent');
select results_eq(
  $$ select user_id, action, target_user_id from public.audit_log where action = 'waitlist.admitted' $$,
  $$ values ((select admin from ids), 'waitlist.admitted', pg_temp.id_of('wait_writer')) $$,
  'the audit log names the admin who let them in');
set local role authenticated;
select is(public.admin_admit_from_waitlist(array[(select id from public.waitlist_entries where user_id = pg_temp.id_of('wait_writer'))]),
  0, 'letting the same person in twice changes nothing');
select throws_ok($$ select public.admin_admit_from_waitlist('{}'::uuid[]) $$, '23514', null,
  'letting nobody in is refused');

-- A wave: the reader is confirmed, the person with no answer (both) is not.
reset role;
select pg_temp.confirm('wait_reader');
set local role authenticated;
select throws_ok($$ select public.admin_admit_waitlist_wave(null, null, 0) $$, '23514', null,
  'a wave of nobody is refused');
select is(public.admin_admit_waitlist_wave('write', null, 10), 0,
  'a writers'' wave skips readers and anyone who hasn''t confirmed their email');
select is(public.admin_admit_waitlist_wave(null, null, 10), 1,
  'a wave of everyone lets in the one confirmed person still waiting');

/* ---------- 5. Everywhere else ---------- */

select is((public.get_writer_profile('with_code') ->> 'is_founding_member')::boolean, true,
  'an early member''s profile shows the founding member badge');
select is((public.get_writer_profile('adult_writer') ->> 'is_founding_member')::boolean, false,
  'a member from before the list has no badge');
reset role;
select ok(exists (select 1 from public.data_export_tables() where table_name = 'waitlist_entries' and is_included)
  and exists (select 1 from public.account_deletion_rules() where table_name = 'waitlist_entries' and action = 'delete'),
  'Download my data includes the entry, and deleting the account deletes it');

-- A staff account that also has an entry (signed up before being given a role) never sees the
-- holding page, so staff can always reach Staff › Waitlist.
insert into public.waitlist_entries (user_id) values ((select owner from ids));
set local role authenticated;
select pg_temp.sign_in_as((select owner from ids));
select is((public.my_waitlist() ->> 'waiting')::boolean, false,
  'a staff account with an entry is never shown as waiting');

select * from finish();
rollback;
