-- Database tests for picking the account when granting a role (story S1-E11-01b; CLAUDE.md
-- rule 1; Robert's request of 24 Oct 2026).
-- What it proves:
-- - admin_find_accounts(): owner and admin find existing accounts by the start of a username, any
--   part of a pen name, or a whole email address; an email is never matched in part and comes
--   back masked; two characters at least; moderator, support and a member are refused;
-- - finding an account by its email is a logged sensitive read that names the account, never the
--   address; admin_reveal_email() returns the address and logs sensitive_read.email_revealed;
-- - every refusal of a role change names its problem in a HINT (not_allowed, own_role,
--   owner_only_role, reason_missing, no_such_account, not_staff, last_owner), the rules themselves
--   unchanged; the last-owner guard is called directly with the last owner as target, because no
--   screen can reach it (CTO, 24 Oct 2026).
-- No new table or policy: the functions read profiles and auth.users as security definer.
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000007'::uuid as teacher,
  '00000000-0000-4000-8000-000000000008'::uuid as owner,
  '00000000-0000-4000-8000-000000000009'::uuid as admin,
  '00000000-0000-4000-8000-000000000010'::uuid as moderator,
  '00000000-0000-4000-8000-000000000011'::uuid as support;
grant select on ids to authenticated, anon;

-- Staff claims with a fresh sign-in (amr), as the admin shell's rules expect (S1-E11-01).
create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object(
    'sub', user_id, 'role', 'authenticated',
    'amr', json_build_array(json_build_object('method', 'password', 'timestamp', extract(epoch from now())::bigint)))::text, true);
$$;

-- The HINT a statement's refusal carries, or null when it doesn't fail.
create function pg_temp.hint_of(statement text) returns text language plpgsql as $$
declare
  refusal_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics refusal_hint = pg_exception_hint;
  return refusal_hint;
end;
$$;

/* ---------- 1. Finding an account ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select owner from ids));
select results_eq(
  $$ select handle, matched_by, email_masked from public.admin_find_accounts('@Adult_wr') $$,
  $$ values ('adult_writer', 'username', 'a***@personas.test') $$,
  'the owner finds an account by the start of its username, the email masked');
select results_eq(
  $$ select handle, matched_by from public.admin_find_accounts('lia scr') $$,
  $$ values ('adult_writer', 'pen_name') $$,
  'and by any part of its pen name, case ignored');
select results_eq(
  $$ select handle, matched_by, email_masked from public.admin_find_accounts('  Adult_Writer@Personas.test ') $$,
  $$ values ('adult_writer', 'email', 'a***@personas.test') $$,
  'and by the whole email address, case and spaces ignored');
select is_empty($$ select * from public.admin_find_accounts('writer@personas.test') $$,
  'part of an email address finds nothing (no fishing for addresses)');
select is_empty($$ select * from public.admin_find_accounts('a') $$,
  'one character finds nothing');
select results_eq(
  $$ select staff_roles from public.admin_find_accounts('moderator') where handle = 'moderator' $$,
  $$ values ('{moderator}'::public.staff_role[]) $$,
  'a result says which staff roles the account already holds');
reset role;
select results_eq(
  $$ select action, target_user_id from public.audit_log
     where action = 'sensitive_read.account_found_by_email' and created_at >= now() $$,
  $$ values ('sensitive_read.account_found_by_email', '00000000-0000-4000-8000-000000000001'::uuid) $$,
  'only the email search is logged, naming the account');
select is((select count(*)::integer from public.audit_log where created_at >= now()
  and coalesce(before_values::text, '') || coalesce(after_values::text, '') || coalesce(reason, '') ilike '%personas.test%'), 0,
  'the audit log never holds the address');

set local role authenticated;
select pg_temp.sign_in_as((select admin from ids));
select isnt_empty($$ select * from public.admin_find_accounts('teacher') $$, 'an admin can search too');
select pg_temp.sign_in_as((select moderator from ids));
select throws_ok($$ select * from public.admin_find_accounts('teacher') $$, '42501', null,
  'a moderator can''t search accounts here');
select pg_temp.sign_in_as((select support from ids));
select throws_ok($$ select * from public.admin_find_accounts('teacher') $$, '42501', null, 'nor can support');
select pg_temp.sign_in_as((select adult_writer from ids));
select throws_ok($$ select * from public.admin_find_accounts('teacher') $$, '42501', null, 'nor a member');

/* ---------- 2. Show email ---------- */

select throws_ok($$ select public.admin_reveal_email((select teacher from ids)) $$, '42501', null,
  'a member can''t see an email');
select pg_temp.sign_in_as((select owner from ids));
select is(public.admin_reveal_email((select adult_writer from ids)), 'adult_writer@personas.test',
  'the owner sees the whole address on request');
reset role;
select is((select count(*)::integer from public.audit_log where action = 'sensitive_read.email_revealed'
  and target_user_id = (select adult_writer from ids) and user_id = (select owner from ids) and created_at >= now()), 1,
  'and that is logged as a sensitive read');

/* ---------- 3. Each refusal names its problem ---------- */

set local role authenticated;
select pg_temp.sign_in_as((select owner from ids));
select is(pg_temp.hint_of(format('select public.admin_grant_role(%L, %L, %L)', (select teacher from ids), 'support', '  ')),
  'reason_missing', 'a blank reason says so');
select is(pg_temp.hint_of(format('select public.admin_grant_role(%L, %L, %L)', (select owner from ids), 'support', 'Me')),
  'own_role', 'changing your own role says so');
select is(pg_temp.hint_of(format('select public.admin_grant_role(%L, %L, %L)', gen_random_uuid(), 'support', 'Help')),
  'no_such_account', 'an account that doesn''t exist says so');
select is(pg_temp.hint_of(format('select public.admin_set_permission(%L, %L, true, %L)', (select adult_writer from ids), 'safeguarding', 'Trained')),
  'not_staff', 'a permission for a member says it is only for staff');
select pg_temp.sign_in_as((select admin from ids));
select is(pg_temp.hint_of(format('select public.admin_grant_role(%L, %L, %L)', (select teacher from ids), 'owner', 'Promotion')),
  'owner_only_role', 'an admin giving the owner role is told only an owner can');
select pg_temp.sign_in_as((select moderator from ids));
select is(pg_temp.hint_of(format('select public.admin_grant_role(%L, %L, %L)', (select teacher from ids), 'support', 'Help')),
  'not_allowed', 'a moderator is told only an owner or admin can');
reset role;

-- The last-owner guard, called directly with the last owner as target (the seed has one owner).
select is((select count(*)::integer from public.staff_roles where role = 'owner'), 1, 'the seed has exactly one owner');
select is(pg_temp.hint_of(format('select public.require_not_last_owner(%L, %L)', (select owner from ids), 'owner')),
  'last_owner', 'removing the last owner is refused with the hint last_owner');
select is(pg_temp.hint_of(format('select public.require_not_last_owner(%L, %L)', (select owner from ids), 'admin')),
  null, 'removing another role from that owner passes the guard');

select * from finish();

rollback;
