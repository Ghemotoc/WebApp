-- Database tests for invite links (story S1-E11-17; the table and the sign-up step are S1-E2-01).
-- What it proves:
-- - owner and admin make, list and revoke links; moderator, support, editor and members are
--   refused (42501) and the read policy, now on the invites area, keeps refusing them;
-- - the limits: 1 to 50 people, 1 to 90 days, a note of at most 80 characters and never an "@";
-- - the code is returned once and stored only as its hash; the list never shows a code or who
--   used a link, only the note, the uses, the expiry, the status and the maker;
-- - the statuses active, used_up, expired and revoked;
-- - make, revoke and used-up each write one audit row; a second revoke changes nothing;
-- - use_platform_invite() takes the last place once: the next try is refused and the link has
--   ended (the one conditional UPDATE is what stops two people taking it at the same time; the
--   browser test e2e/invite-links.spec.ts races two sign-ups to show it).
-- Policy covered: invites_select_admin (allowed and denied, here and in 022).
begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000008'::uuid as owner,
  '00000000-0000-4000-8000-000000000009'::uuid as admin,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator,
  '00000000-0000-4000-8000-000000000011'::uuid as support,
  '00000000-0000-4000-8000-000000000012'::uuid as editor;
grant select on ids to authenticated, anon;

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- Keeps what admin_create_invite() returned, so later steps can use the code.
create temp table made (name text, invite_id uuid, code text, expires_at timestamptz);
grant all on made to authenticated;

/* ---------- 1. Refused: everyone but owner and admin ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select moderator from ids));
select throws_ok($$ select * from public.admin_create_invite() $$, '42501', null,
  'a moderator can''t make an invite link');
select throws_ok($$ select * from public.admin_list_invites() $$, '42501', null,
  'a moderator can''t list invite links');
select is_empty($$ select id from public.invites $$,
  'denied: invites_select_admin: a moderator reads no invites');
select pg_temp.sign_in_as((select support from ids));
select throws_ok($$ select * from public.admin_create_invite() $$, '42501', null,
  'support can''t make an invite link');
select pg_temp.sign_in_as((select editor from ids));
select throws_ok($$ select * from public.admin_list_invites() $$, '42501', null,
  'a content editor can''t list invite links');
select pg_temp.sign_in_as((select adult_writer from ids));
select throws_ok($$ select public.admin_revoke_invite(gen_random_uuid(), 'no') $$, '42501', null,
  'a member can''t revoke an invite link');

/* ---------- 2. Making links, with the limits ---------- */

select pg_temp.sign_in_as((select admin from ids));
insert into made select 'one_use', * from public.admin_create_invite(1, 14, 'Ana, beta tester');
insert into made select 'ten_uses', * from public.admin_create_invite(10, 30, null);
select matches((select code from made where name = 'one_use'), '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$',
  'the code is 12 letters and digits without look-alikes, in groups of four');
select isnt((select code from made where name = 'one_use'), (select code from made where name = 'ten_uses'),
  'every link gets its own code');
select ok((select expires_at from made where name = 'one_use') between now() + interval '13 days 23 hours' and now() + interval '14 days 1 hour',
  'the link expires in the number of days asked for');
select throws_ok($$ select * from public.admin_create_invite(0, 14) $$, '23514', null, 'a link admits at least 1 person');
select throws_ok($$ select * from public.admin_create_invite(51, 14) $$, '23514', null, 'a link admits at most 50 people');
select throws_ok($$ select * from public.admin_create_invite(1, 91) $$, '23514', null, 'a link lasts at most 90 days');
select throws_ok($$ select * from public.admin_create_invite(1, 14, 'ana@example.com') $$, '23514', null,
  'a note with an email address is refused');
select throws_ok($$ select * from public.admin_create_invite(1, 14, repeat('x', 81)) $$, '23514', null,
  'a note longer than 80 characters is refused');

/* ---------- 3. The hash, the list and the statuses ---------- */

select is_empty(
  $$ select 1 from public.invites where code_hash = (select code from made where name = 'one_use')
       or note like '%' || (select replace(code, '-', '') from made where name = 'one_use') || '%' $$,
  'the code is never stored in the clear');
select is(
  (select code_hash from public.invites where id = (select invite_id from made where name = 'one_use')),
  public.invite_code_hash((select code from made where name = 'one_use')),
  'only the hash of the code is stored');
select results_eq(
  $$ select note, max_uses, use_count, status, made_by_handle from public.admin_list_invites()
     where id = (select invite_id from made where name = 'one_use') $$,
  $$ values ('Ana, beta tester', 1, 0, 'active', 'admin') $$,
  'the list shows the note, the uses, the status and who made it');
select ok(not exists (
    select 1 from information_schema.columns
    where table_name = 'invites' and column_name in ('used_by_user_id', 'email', 'invitee_email')),
  'an invite never records who used it or any email');
select set_eq(
  $$ select status from public.admin_list_invites() where note like 'Seed:%' $$,
  $$ values ('active'), ('expired'), ('used_up'), ('revoked') $$,
  'the seed''s four links show the four statuses');
select is(public.check_invite((select code from made where name = 'one_use')), 'valid',
  'a fresh link is valid for sign-up');

/* ---------- 4. The last place goes once ---------- */

reset role;
select lives_ok($$ select public.use_platform_invite((select code from made where name = 'one_use')) $$,
  'the first sign-up takes the last place');
select throws_ok($$ select public.use_platform_invite((select code from made where name = 'one_use')) $$,
  '23514', null, 'the second sign-up is refused: no place left');
select is(public.check_invite((select code from made where name = 'one_use')), 'ended',
  'the link has ended');
select results_eq(
  $$ select user_id, action, after_values ->> 'note' from public.audit_log
     where action = 'invite.used_up' and target_id = (select invite_id from made where name = 'one_use')::text $$,
  $$ values ('00000000-0000-4000-8000-000000000009'::uuid, 'invite.used_up', 'Ana, beta tester') $$,
  'the used-up link is in the audit log, on behalf of its maker, without naming the new account');

/* ---------- 5. Revoking ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select owner from ids));
select throws_ok($$ select public.admin_revoke_invite((select invite_id from made where name = 'ten_uses'), ' ') $$,
  '23514', null, 'revoking needs a reason');
select ok(public.admin_revoke_invite((select invite_id from made where name = 'ten_uses'), 'Workshop cancelled'),
  'the owner revokes a link');
select ok(not public.admin_revoke_invite((select invite_id from made where name = 'ten_uses'), 'Again'),
  'revoking it again changes nothing');
select is((select status from public.admin_list_invites() where id = (select invite_id from made where name = 'ten_uses')),
  'revoked', 'a revoked link shows as revoked');
select results_eq(
  $$ select action, count(*)::integer from public.audit_log
     where created_at = now() and action like 'invite.%' group by action order by action $$,
  $$ values ('invite.created', 2), ('invite.revoked', 1), ('invite.used_up', 1) $$,
  'every make, revoke and used-up is in the audit log once');

select * from finish();

rollback;
