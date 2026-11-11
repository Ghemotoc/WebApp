-- Database tests for misusing the unused-account job (bundle INACTIVE-1, its break test).
-- What it proves:
-- - a signed-in member can't call the job's internal steps (hide, close, notice, last use) or write
--   the day of use by hand to stop or speed up the countdown; a visitor can't note a day of use;
-- - the job runs over every persona at once and never closes the classics account, an account with
--   abuse image evidence, an account already closing or a staff account;
-- - a suspended (not banned) account closes like any other.
-- Who runs it: `npx supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;
create function pg_temp.last_used_ago(user_id uuid, how_long interval) returns void language sql as $$
  update public.profiles set created_at = now() - how_long where profiles.id = user_id;
  update auth.users set last_sign_in_at = now() - how_long where users.id = user_id;
  delete from public.account_last_used where account_last_used.user_id = user_id;
$$;

-- 1-4: a signed-in member can't reach any of the internal steps.
select pg_temp.sign_in_as('00000000-0000-4000-8000-000000000001');
set local role authenticated;
select throws_ok($$select public.hide_closing_account('00000000-0000-4000-8000-000000000015')$$, '42501', null, 'a member can''t hide someone else''s account');
select throws_ok($$select public.close_unused_account('00000000-0000-4000-8000-000000000015')$$, '42501', null, 'a member can''t close someone else''s account');
select throws_ok($$select public.send_unused_account_notice('00000000-0000-4000-8000-000000000015', current_date, 'week')$$, '42501', null, 'a member can''t send a notice');
select throws_ok($$select public.account_last_used_on('00000000-0000-4000-8000-000000000015')$$, '42501', null, 'a member can''t read another account''s last use');
-- 5-7: nor write the day of use by hand, to stop or speed up the countdown.
select throws_ok($$insert into public.account_last_used (user_id, used_on) values ('00000000-0000-4000-8000-000000000001', current_date + 3650)$$, '42501', null, 'a member can''t write a day of use far in the future');
select throws_ok($$update public.account_last_used set used_on = current_date - 4000$$, '42501', null, 'a member can''t move a day of use back');
select throws_ok($$delete from public.account_last_used$$, '42501', null, 'a member can''t delete the day of use');
reset role;

-- 8: a visitor who isn't logged in can't note a day of use.
set local role anon;
select throws_ok($$select public.note_active_minute(false)$$, '42501', null, 'a visitor can''t note a day of use');
reset role;

-- Every persona looks unused for 5 years and 2 days, with the week notice 8 days old.
select pg_temp.last_used_ago(id, interval '5 years 2 days') from public.profiles where deleted_at is null;
insert into public.account_last_used (user_id, notices_for, month_notice_at, week_notice_at)
select id, public.account_last_used_on(id), now() - interval '30 days', now() - interval '8 days'
from public.profiles where deleted_at is null
on conflict (user_id) do update set notices_for = excluded.notices_for,
  month_notice_at = excluded.month_notice_at, week_notice_at = excluded.week_notice_at;

-- The classics account is "blocked" for this test; "teacher" has abuse image evidence held;
-- "teen_17" has an open deletion request already.
update public.settings set value = '"blocked"' where key = 'classics_account_handle';
insert into public.abuse_image_evidence (user_id, case_reference, picture_kind, uploaded_at, source, description, keep_until)
select '00000000-0000-4000-8000-000000000007', 'TEST-1', (enum_range(null::public.picture_kind))[1], now(), 'moderator', 'test', now() + interval '5 years';
insert into public.account_deletions (user_id, delete_after) values ('00000000-0000-4000-8000-000000000002', now() + interval '3 days');

select lives_ok($$select public.close_unused_accounts()$$, 'the job runs over every persona at once');

-- 10-13: who it must never close.
select is((select deleted_at from public.profiles where id = '00000000-0000-4000-8000-000000000016'), null, 'the classics account stays');
select is((select deleted_at from public.profiles where id = '00000000-0000-4000-8000-000000000007'), null, 'an account with abuse image evidence stays');
select is((select count(*)::integer from public.account_deletions where user_id = '00000000-0000-4000-8000-000000000002'), 1, 'an account already closing gets no second request');
select is((select count(*)::integer from public.account_deletions a join public.staff_roles s on s.user_id = a.user_id), 0, 'no staff account is closed');

-- 14: everyone else who qualifies did close, the suspended account included.
select isnt((select deleted_at from public.profiles where id = '00000000-0000-4000-8000-000000000013'), null, 'a suspended (not banned) account closes like any other');

select * from finish();
rollback;
