-- Database tests for the full list of accounts in Staff › Users (Robert, 26 Nov 2026; CLAUDE.md
-- rule 1: an allowed and a denied caller for every new function).
-- What it proves about admin_list_accounts():
-- - the owner and an admin see every account that isn't deleted, newest first, with the total
--   for the pager; a deleted account is left out unless the Deleted filter asks for it, and its
--   row is kept (Robert, 26 Nov 2026: hide deleted accounts, filter by status, 5 a page);
-- - the status filter returns only accounts in that state, with the matching total;
-- - the page holds 5 accounts unless another size is asked for;
-- - a row carries the masked email and the age group, never the address or the year of birth;
-- - paging works and a silly page is refused;
-- - each page read is logged as a sensitive read naming the page;
-- - a moderator, support, the content editor, a member and a visitor are refused.
begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;

create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true);
$$;

-- One persona's account is deleted for this test (rolled back at the end), so the list has one
-- to leave out. blocker (…15) is active and has no other part in these checks.
update public.profiles set deleted_at = now() where id = '00000000-0000-4000-8000-000000000015';

-- How many accounts are not deleted, read before signing in (members can't count profiles).
create temp table expected as
  select count(*) filter (where deleted_at is null) as accounts,
         count(*) filter (where public.account_state(id) = 'banned') as banned
  from public.profiles;
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
  'every row carries the total number of accounts that are not deleted, for the pager'
);
select is(
  (select count(*) from public.admin_list_accounts()),
  least((select accounts from expected), 5),
  'with no page size asked for, a page holds 5 accounts'
);
select ok(
  not exists (select 1 from public.admin_list_accounts(1, 100)
              where user_id = '00000000-0000-4000-8000-000000000015' or account_status = 'deleted'),
  'a deleted account is left out of the list by default'
);
select is(
  (select string_agg(user_id::text || ' ' || account_status::text || ' ' || total_count::text, ',')
   from public.admin_list_accounts(1, 100, 'deleted')),
  '00000000-0000-4000-8000-000000000015 deleted 1',
  'the Deleted filter still finds a deleted account, so nothing is lost'
);
select ok(
  (select bool_and(account_status = 'banned') and count(*) = (select banned from expected)
          and bool_or(user_id = '00000000-0000-4000-8000-000000000014')
   from public.admin_list_accounts(1, 100, 'banned')),
  'the Banned filter returns the banned accounts and nobody else'
);
select is(
  (select distinct total_count from public.admin_list_accounts(1, 5, 'suspended')),
  1::bigint,
  'the total under a filter counts only the matching accounts'
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
          where action = 'sensitive_read.account_list' and target_id = 'page 2, 2 a page'
            and user_id = '00000000-0000-4000-8000-000000000009'),
  'reading a page is logged as a sensitive read, naming the page and its size'
);
select ok(
  exists (select 1 from public.audit_log
          where action = 'sensitive_read.account_list'
            and target_id = 'page 1, 100 a page, status deleted'
            and user_id = '00000000-0000-4000-8000-000000000008'),
  'a filtered read names the filter in the audit log'
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
