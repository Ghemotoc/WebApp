-- Database tests for sanctions (story S1-E10-06; CLAUDE.md rule 1).
-- What it proves:
-- - a suspension makes the account read-only (account_state() suspended, is_active_member()
--   false) until it ends or is lifted; the person can still read (the story's first criterion);
-- - a ban: Supabase's own ban is set, every session is ended, the email's keyed hash is kept and
--   a sign-up with that email is refused (second criterion); lifting the ban undoes all three;
-- - a reporting pause refuses the reporter's reports until it ends (third criterion);
-- - the decision carries the action out: warn, suspend (1, 7 or 30 days), ban, hide, remove;
--   restrict is refused on a profile (it is for stories, QA-9); a removed item answers is_moderated_away() true until
--   it is restored, with a reason;
-- - a staff account can't be sanctioned; a second live sanction of the same kind is refused;
-- - policies: sanctions_select_moderation, banned_email_hashes_select_moderation and
--   moderated_items_select_moderation (a moderator allowed; support, a member and a visitor
--   denied); my_sanctions() gives the person their own, without the note.
begin;

create extension if not exists pgtap with schema extensions;

select plan(51);

create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000002'::uuid as teen_17,
  '00000000-0000-4000-8000-000000000007'::uuid as teacher,
  '00000000-0000-4000-8000-000000000009'::uuid as admin,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator,
  '00000000-0000-4000-8000-000000000011'::uuid as support,
  '00000000-0000-4000-8000-000000000013'::uuid as suspended_user,
  '00000000-0000-4000-8000-000000000014'::uuid as banned_user,
  '00000000-0000-4000-8000-000000000015'::uuid as blocker;
grant select on ids to authenticated, anon;

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- The seed's cases on the accounts this test sanctions are cleared, so the test starts from a
-- known state; the seed's own sanctions on suspended_user and banned_user stay (section 6).
create temp table cleared as select id from public.cases
  where user_id in ((select teacher from ids), (select blocker from ids), (select teen_17 from ids));
-- Sanctions and moderated items point at cases (S1-E10-06), so they go first.
delete from public.banned_email_hashes where sanction_id in (select id from public.sanctions where case_id in (select id from cleared));
delete from public.sanctions where case_id in (select id from cleared);
delete from public.moderated_items where case_id in (select id from cleared);
delete from public.case_actions where case_id in (select id from cleared);
delete from public.reports where case_id in (select id from cleared);
delete from public.cases where id in (select id from cleared);

/* ---------- 1. A suspension ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
select throws_ok(
  $$ select public.admin_apply_sanction((select teacher from ids), 'suspension', 3, null, 'Three days') $$,
  '23514', null, 'a suspension lasts 1, 7 or 30 days, nothing else (Q7)');
select throws_ok(
  $$ select public.admin_apply_sanction((select teacher from ids), 'suspension', 7, null, '  ') $$,
  '23514', null, 'a sanction needs a note');
select throws_ok(
  $$ select public.admin_apply_sanction((select admin from ids), 'suspension', 7, null, 'Nope') $$,
  '23514', null, 'a staff account can''t be sanctioned');
create temp table suspension as
  select public.admin_apply_sanction((select teacher from ids), 'suspension', 7, null, 'Repeated insults') as id;
grant select on suspension to authenticated;
select throws_ok(
  $$ select public.admin_apply_sanction((select teacher from ids), 'suspension', 30, null, 'Again') $$,
  '23514', null, 'one live suspension at a time');
reset role;
select is(public.account_state((select teacher from ids))::text, 'suspended',
  'a suspended account is read-only: account_state() says suspended');
select results_eq(
  $$ select kind::text, ends_at > now() + interval '6 days' and ends_at < now() + interval '8 days'
     from public.sanctions where id = (select id from suspension) $$,
  $$ values ('suspension', true) $$,
  'the suspension ends in 7 days');
set local role authenticated;
select pg_temp.sign_in_as((select teacher from ids));
select ok(not public.is_active_member(), 'the suspended person can''t write');
select results_eq(
  $$ select kind::text from public.my_sanctions() $$, $$ values ('suspension') $$,
  'the person sees their own suspension (without the note)');
select is((select count(*)::integer from public.sanctions), 0,
  'denied: sanctions_select_moderation: a member reads no sanction rows, not even their own');
-- The suspension ends: the account writes again.
reset role;
update public.sanctions set ends_at = now() - interval '1 minute' where id = (select id from suspension);
select is(public.account_state((select teacher from ids))::text, 'active', 'once it ends, the account is active again');
update public.sanctions set ends_at = now() + interval '7 days' where id = (select id from suspension);
set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
select throws_ok($$ select public.admin_lift_sanction((select id from suspension), '') $$, '23514', null,
  'lifting needs a reason');
select ok(public.admin_lift_sanction((select id from suspension), 'Appeal upheld'), 'the moderator lifts it early');
select throws_ok($$ select public.admin_lift_sanction((select id from suspension), 'Again') $$, '23514', null,
  'a lifted sanction can''t be lifted twice');
reset role;
select is(public.account_state((select teacher from ids))::text, 'active', 'lifted: the account is active again');
select results_eq(
  $$ select action from public.audit_log where target_id = (select id::text from suspension) order by action $$,
  $$ values ('sanction.applied'), ('sanction.lifted') $$,
  'applying and lifting are both in the audit log');

/* ---------- 2. A ban ---------- */

-- The local seed sets the Vault secret, so the email hash can be made.
select isnt(public.banned_email_hash('someone@example.com'), null, 'the keyed email hash works with the Vault secret');
set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
-- A session to end.
reset role;
insert into auth.sessions (id, user_id, created_at, updated_at)
  values ('11111111-1111-4111-8111-111111111111', (select blocker from ids), now(), now());
set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
create temp table ban as
  select public.admin_apply_sanction((select blocker from ids), 'ban', null, null, 'Hate speech after a suspension') as id;
grant select on ban to authenticated;
reset role;
select is(public.account_state((select blocker from ids))::text, 'banned', 'a banned account answers banned');
select ok((select banned_until > now() from auth.users where id = (select blocker from ids)),
  'Supabase''s own ban is set, so sign-in is refused');
select is((select count(*)::integer from auth.sessions where user_id = (select blocker from ids)), 0,
  'every session of the banned account is ended');
select is((select count(*)::integer from public.banned_email_hashes where sanction_id = (select id from ban)), 1,
  'the email''s keyed hash is kept');
select ok(public.is_email_banned('blocker@personas.test'), 'the email is banned');
select ok(public.is_email_banned('  Blocker@Personas.Test '), 'however it is typed');
select ok(not public.is_email_banned('someone-else@example.com'), 'another email is not');
-- A sign-up with a banned email is refused by the trigger (nothing stored). The persona's own
-- email already has an account, so a fresh address is put on the list the way a ban would.
insert into public.banned_email_hashes (email_hash, sanction_id)
  values (public.banned_email_hash('came-back@example.com'), (select id from ban));
select throws_ok(
  $$ insert into auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data,
       raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
     values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
       'Came-Back@example.com', 'x', '{"provider": "email", "providers": ["email"]}',
       '{"birth_year": "1990", "invite_code": "PERSONAS-TEST-INVITE"}', now(), now(), '', '', '', '') $$,
  '23514', null, 'a sign-up with a banned email is refused, however the email is typed');
set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
select ok(public.admin_lift_sanction((select id from ban), 'Mistaken identity'), 'the ban is lifted');
reset role;
select ok((select banned_until is null from auth.users where id = (select blocker from ids)),
  'lifting clears Supabase''s ban');
select ok(not public.is_email_banned('blocker@personas.test'), 'and the email can sign up again');

/* ---------- 3. The reporting pause ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
create temp table pause as
  select public.admin_pause_reporting('adult_writer', null, 'Five unfounded reports in a month') as id;
grant select on pause to authenticated;
select throws_ok($$ select public.admin_pause_reporting('no_such_person', null, 'x') $$, '23514', null,
  'pausing an unknown username is refused');
select pg_temp.sign_in_as((select adult_writer from ids));
select throws_ok($$ select * from public.report_item('profile', 'teacher', 'spam') $$, '55000', null,
  'a paused reporter''s report is refused');
reset role;
select results_eq(
  $$ select ends_at > now() + interval '29 days' from public.sanctions where id = (select id from pause) $$,
  $$ values (true) $$, 'the pause lasts 30 days (Q7)');
update public.sanctions set ends_at = now() - interval '1 minute' where id = (select id from pause);
set local role authenticated;
select pg_temp.sign_in_as((select adult_writer from ids));
select lives_ok($$ select * from public.report_item('profile', 'teacher', 'spam', 'Advert') $$,
  'once the pause ends, reporting works again');

/* ---------- 4. The decision carries the action out ---------- */

reset role;
create temp table opened as select id from public.cases where user_id = (select teacher from ids) and status = 'open';
grant select on opened to authenticated;
set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
select throws_ok($$ select public.admin_decide_case((select id from opened), 'restrict', 'Later') $$, '23514', null,
  'restrict is for a story only, so a case about a profile is refused (QA-9)');
select ok(public.admin_decide_case((select id from opened), 'suspend', 'Spam again', 30), 'suspend, 30 days, from the case');
reset role;
select results_eq(
  $$ select kind::text, case_id = (select id from opened), ends_at > now() + interval '29 days'
     from public.sanctions where user_id = (select teacher from ids) and lifted_at is null and kind = 'suspension' $$,
  $$ values ('suspension', true, true) $$,
  'the decision made the 30-day suspension, linked to the case');
-- Remove, then restore, teen_17's profile through a fresh case.
set local role authenticated;
select pg_temp.sign_in_as((select blocker from ids));
select lives_ok($$ select * from public.report_item('profile', 'teen_17', 'hate', 'Slurs in the bio') $$, 'a report on teen_17');
reset role;
create temp table hate_case as select id from public.cases where user_id = (select teen_17 from ids) and status = 'open';
grant select on hate_case to authenticated;
set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
select ok(public.admin_decide_case((select id from hate_case), 'remove', 'Slurs removed; the writer was told'), 'remove, from the case');
select ok(public.is_moderated_away('profile', (select teen_17 from ids)), 'the item is moderated away (shared contract)');
select is(public.moderated_state_of('profile', (select teen_17 from ids))::text, 'removed', 'and its state is removed');
select ok(public.admin_restore_item(
  (select id from public.moderated_items where item_id = (select teen_17 from ids) and restored_at is null),
  'The slurs were a quotation; restored'), 'the moderator restores it with a reason');
select ok(not public.is_moderated_away('profile', (select teen_17 from ids)), 'restored: no longer moderated away');

/* ---------- 5. Who reads what ---------- */

select pg_temp.sign_in_as((select moderator from ids));
select isnt_empty($$ select id from public.sanctions $$, 'allowed: sanctions_select_moderation: a moderator reads sanctions');
select isnt_empty($$ select id from public.moderated_items $$, 'allowed: moderated_items_select_moderation: and moderated items');
select lives_ok($$ select id from public.banned_email_hashes $$, 'allowed: banned_email_hashes_select_moderation: and the hashes');
select results_eq(
  $$ select kind::text, applied_by_handle, is_live from public.admin_account_sanctions((select teacher from ids)) order by is_live $$,
  $$ values ('suspension', 'moderator', false), ('suspension', 'moderator', true) $$,
  'the account''s sanction history, with who applied each and whether it is live');
select pg_temp.sign_in_as((select support from ids));
select is_empty($$ select id from public.sanctions $$, 'denied: sanctions_select_moderation: support reads none');
select is_empty($$ select id from public.moderated_items $$, 'denied: moderated_items_select_moderation: support reads none');
select is_empty($$ select id from public.banned_email_hashes $$, 'denied: banned_email_hashes_select_moderation: support reads none');
select throws_ok($$ select public.admin_apply_sanction((select teacher from ids), 'warning', null, null, 'x') $$, '42501', null,
  'support can''t sanction');
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select throws_ok($$ select id from public.sanctions $$, '42501', null, 'denied: sanctions_select_moderation: a visitor has no read at all');

/* ---------- 6. The seed personas ---------- */

reset role;
select is(public.account_state((select suspended_user from ids))::text, 'suspended', 'the seed''s suspended_user is suspended');
select is(public.account_state((select banned_user from ids))::text, 'banned', 'the seed''s banned_user is banned');

select * from finish();

rollback;
