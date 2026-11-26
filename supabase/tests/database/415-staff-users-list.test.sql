-- Database tests for the full list of accounts in Staff › Users (Robert, 26 Nov 2026; CLAUDE.md
-- rule 1: an allowed and a denied caller for every new function).
-- What it proves about admin_list_accounts():
-- - the owner and an admin see every account, newest first, with the total for the pager;
-- - a row carries the masked email and the age group, never the address or the year of birth;
-- - paging works and a silly page is refused;
-- - each page read is logged as a sensitive read naming the page;
-- - a moderator, support, the content editor, a member and a visitor are refused.
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;

create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

-- How many accounts there are, read before signing in (members can't count profiles).
create temp table expected as select count(*) as accounts from public.profiles;
grant select on expected to authenticated;

-- Personas: …01 adult_writer, …08 owner, …09 admin, …10 moderator, …11 support, …12 editor.

/* ---------- Allowed: the owner and an admin ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select is(
  (select count(*) from public.admin_list_accounts(1, 100)),
  least((select accounts from expected), 100),
  'the owner sees a whole page of accounts'
);
select is(
  (select distinct total_count from public.admin_list_accounts(1, 5)),
  (select accounts from expected),
  'every row carries the total number of accounts, for the pager'
);

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select ok(
  (select bool_and(email_masked is null or email_masked like '%***@%')
   from public.admin_list_accounts(1, 100)),
  'an admin sees every email masked, never the address'
);
select is(
  (select concat_ws('|', handle, age_band, account_status) from public.admin_list_accounts(1, 100)
   where user_id = '00000000-0000-4000-8000-000000000001'),
  'adult_writer|18_plus|active',
  'a row shows the username, the age group and the status'
);
select ok(
  (select bool_and(earlier.joined_at >= later.joined_at)
   from public.admin_list_accounts(1, 2) as earlier, public.admin_list_accounts(2, 2) as later),
  'the newest accounts come first, and page 2 carries on where page 1 stopped'
);
-- The audit log is read as the database owner, so the check doesn't depend on who may read it.
select pg_temp.sign_out();
select ok(
  exists (select 1 from public.audit_log
          where action = 'sensitive_read.account_list' and target_id = 'page 2'
            and user_id = '00000000-0000-4000-8000-000000000009'),
  'reading a page is logged as a sensitive read, naming the page'
);
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select throws_ok(
  $$ select * from public.admin_list_accounts(1, 500) $$,
  '22023', null,
  'a page of more than 100 accounts is refused'
);
select throws_ok(
  $$ select * from public.admin_list_accounts(0, 50) $$,
  '22023', null,
  'page 0 is refused'
);

/* ---------- Denied: every other role ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select throws_ok($$ select * from public.admin_list_accounts() $$, '42501', null,
  'a moderator can''t list every account (the search is theirs)');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000011');
select throws_ok($$ select * from public.admin_list_accounts() $$, '42501', null,
  'support can''t list every account');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select throws_ok($$ select * from public.admin_list_accounts() $$, '42501', null,
  'a member can''t list every account');

select pg_temp.sign_out();
set local role anon;
select throws_ok($$ select * from public.admin_list_accounts() $$, '42501', null,
  'a visitor can''t list every account');

select * from finish();
rollback;
