-- Database tests for deleting accounts nobody has used for 5 years (bundle INACTIVE-1).
-- What it proves:
-- - the app's once-a-minute "here" notes the day of use, once a day;
-- - the day of last use is the latest of: the account made, the last log-in, the app open, and
--   "Keep my account";
-- - tonight's step for one account: nothing before the month window, the "about a month" notice
--   in it, the "about a week" notice in the last week (or straight away when the month window was
--   missed), and closing only once the 5 years are up and the last notice is a week old;
-- - the nightly job sends each notice once, always by email, closes the account the same way as
--   "Delete my account" (to be deleted after 14 days), and never touches staff or a closing account;
-- - using the account again, or keeping it while it is closing, starts the 5 years again;
-- - nobody but the job can run it, and deleting an account and Download my data know the table.
-- Policies covered: account_last_used_select_own, allowed and denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(38);

create temp table ids as select
  '00000000-0000-4000-8000-000000000001'::uuid as adult_writer,
  '00000000-0000-4000-8000-000000000007'::uuid as teacher,
  '00000000-0000-4000-8000-000000000008'::uuid as owner,
  '00000000-0000-4000-8000-000000000014'::uuid as banned_user,
  '00000000-0000-4000-8000-000000000015'::uuid as blocker;
grant select on ids to authenticated, anon;

create function pg_temp.sign_in_as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
$$;

-- Makes an account look last used this long ago: made then, last logged in then, never open
-- in the app since.
create function pg_temp.last_used_ago(user_id uuid, how_long interval) returns void language sql as $$
  update public.profiles set created_at = now() - how_long where profiles.id = user_id;
  update auth.users set last_sign_in_at = now() - how_long where users.id = user_id;
  delete from public.account_last_used where account_last_used.user_id = user_id;
$$;

-- Today in Romanian time, as the job counts it.
create function pg_temp.today() returns date language sql as $$
  select (now() at time zone 'Europe/Bucharest')::date;
$$;

/* ---------- The day of use ---------- */

select pg_temp.sign_in_as((select adult_writer from ids));
set local role authenticated;
select public.note_active_minute(false);
reset role;

select is(
  (select used_on from public.account_last_used where user_id = (select adult_writer from ids)),
  pg_temp.today(),
  'having the app open notes today as the day of use');

update public.account_last_used set used_on = pg_temp.today() + 1
where user_id = (select adult_writer from ids);
select pg_temp.sign_in_as((select adult_writer from ids));
set local role authenticated;
select public.note_active_minute(true);
reset role;
select is(
  (select used_on from public.account_last_used where user_id = (select adult_writer from ids)),
  pg_temp.today() + 1,
  'the day of use only ever moves forward, so a later minute the same day writes nothing');
update public.account_last_used set used_on = pg_temp.today()
where user_id = (select adult_writer from ids);

-- account_last_used_select_own: allowed for the person, denied for anyone else.
select pg_temp.sign_in_as((select adult_writer from ids));
set local role authenticated;
select is(
  (select count(*)::integer from public.account_last_used),
  1,
  'a person reads their own day of use');
reset role;

select pg_temp.sign_in_as((select blocker from ids));
set local role authenticated;
select is(
  (select count(*)::integer from public.account_last_used where user_id = (select adult_writer from ids)),
  0,
  'nobody reads another person''s day of use');
reset role;

set local role anon;
select throws_ok(
  'select count(*) from public.account_last_used',
  '42501',
  null,
  'a visitor who isn''t logged in can''t read any day of use');
reset role;

/* ---------- The day of last use ---------- */

select pg_temp.last_used_ago((select teacher from ids), interval '3 years');
select is(
  public.account_last_used_on((select teacher from ids)),
  ((now() - interval '3 years') at time zone 'Europe/Bucharest')::date,
  'without the app open, the last use is the last log-in');

insert into public.account_last_used (user_id, used_on)
values ((select teacher from ids), pg_temp.today() - 400);
select is(
  public.account_last_used_on((select teacher from ids)),
  pg_temp.today() - 400,
  'a later day with the app open counts over an older log-in');

insert into public.account_deletions (user_id, requested_at, delete_after, cancelled_at)
values ((select teacher from ids), now() - interval '20 days', now() - interval '6 days', now() - interval '10 days');
select is(
  public.account_last_used_on((select teacher from ids)),
  pg_temp.today() - 10,
  'keeping a closing account counts as using it');

/* ---------- Tonight's step ---------- */

select is(public.unused_account_step((pg_temp.today() - interval '4 years')::date, null::date, null::timestamptz, null::timestamptz),
  'none', 'nothing happens before the month window');
select is(public.unused_account_step((pg_temp.today() - interval '5 years' + interval '20 days')::date, null::date, null::timestamptz, null::timestamptz),
  'month', 'about a month before, the first notice is due');
select is(public.unused_account_step((pg_temp.today() - interval '5 years' + interval '20 days')::date,
    (pg_temp.today() - interval '5 years' + interval '20 days')::date, now() - interval '1 day', null::timestamptz),
  'none', 'the first notice goes once');
select is(public.unused_account_step((pg_temp.today() - interval '5 years' + interval '3 days')::date,
    (pg_temp.today() - interval '5 years' + interval '3 days')::date, now() - interval '20 days', null::timestamptz),
  'week', 'about a week before, the last notice is due');
select is(public.unused_account_step((pg_temp.today() - interval '5 years' + interval '3 days')::date, null::date, null::timestamptz, null::timestamptz),
  'week', 'a missed month window sends the last notice straight away');
select is(public.unused_account_step((pg_temp.today() - interval '5 years' - interval '1 day')::date,
    (pg_temp.today() - interval '5 years' - interval '1 day')::date, now() - interval '30 days', now() - interval '3 days'),
  'none', 'the account doesn''t close until the last notice is a week old');
select is(public.unused_account_step((pg_temp.today() - interval '5 years' - interval '1 day')::date,
    (pg_temp.today() - interval '5 years' - interval '1 day')::date, now() - interval '30 days', now() - interval '8 days'),
  'close', 'after 5 years and a week after the last notice, the account closes');
select is(public.unused_account_step((pg_temp.today() - interval '5 years' - interval '1 day')::date,
    (pg_temp.today() - interval '6 years')::date, now() - interval '30 days', now() - interval '8 days'),
  'week', 'notices sent for an older day of use don''t count: the countdown starts again');

/* ---------- The nightly job ---------- */

-- The adult writer: last used 5 years less 20 days ago. The owner (staff) just as long.
select pg_temp.last_used_ago((select adult_writer from ids), interval '5 years' - interval '20 days');
select pg_temp.last_used_ago((select owner from ids), interval '5 years' - interval '20 days');
select pg_temp.last_used_ago((select banned_user from ids), interval '5 years' - interval '20 days');
delete from public.account_deletions where user_id = (select teacher from ids);
select pg_temp.last_used_ago((select teacher from ids), interval '1 year');

select is(
  public.close_unused_accounts(),
  '{"month_notices": 1, "week_notices": 0, "closed": 0}'::jsonb,
  'the job sends one "about a month" notice, and none to staff or a banned account');
select is(
  (select count(*)::integer from public.notifications
   where user_id = (select adult_writer from ids) and kind = 'account_unused_month' and is_required),
  1,
  'the adult writer has the "about a month" notice');
select is(
  (select delivery from public.email_outbox
   join public.notifications on notifications.id = any (email_outbox.notification_ids)
   where notifications.user_id = (select adult_writer from ids) and notifications.kind = 'account_unused_month'),
  'required',
  'the notice is always emailed');
select is(
  (select count(*)::integer from public.notifications
   where user_id = (select owner from ids) and kind in ('account_unused_month', 'account_unused_week')),
  0,
  'a staff account gets no notice');
select is(
  (select count(*)::integer from public.notifications
   where user_id = (select banned_user from ids) and kind in ('account_unused_month', 'account_unused_week')),
  0,
  'a banned account gets no notice: it is closed, never deleted');
select is(
  public.close_unused_accounts(),
  '{"month_notices": 0, "week_notices": 0, "closed": 0}'::jsonb,
  'running again the same night sends nothing more');

-- A week before: the last notice, and no closing yet.
update public.profiles set created_at = now() - interval '5 years' + interval '3 days'
where id = (select adult_writer from ids);
update auth.users set last_sign_in_at = now() - interval '5 years' + interval '3 days'
where id = (select adult_writer from ids);
update public.account_last_used set notices_for = public.account_last_used_on((select adult_writer from ids))
where user_id = (select adult_writer from ids);
select is(
  public.close_unused_accounts(),
  '{"month_notices": 0, "week_notices": 1, "closed": 0}'::jsonb,
  'a week before, the job sends the "about a week" notice');
select is(
  public.notification_category('account_unused_week'),
  'staff',
  'both notices are filed with the notices from the team');

-- The 5 years are up and the last notice is 8 days old: the account closes.
update public.profiles set created_at = now() - interval '5 years' - interval '2 days'
where id = (select adult_writer from ids);
update auth.users set last_sign_in_at = now() - interval '5 years' - interval '2 days'
where id = (select adult_writer from ids);
update public.account_last_used
set notices_for = public.account_last_used_on((select adult_writer from ids)),
    week_notice_at = now() - interval '8 days'
where user_id = (select adult_writer from ids);
select is(
  public.close_unused_accounts(),
  '{"month_notices": 0, "week_notices": 0, "closed": 1}'::jsonb,
  'after 5 years and a week''s notice, the job closes the account');
select isnt(
  (select deleted_at from public.profiles where id = (select adult_writer from ids)),
  null,
  'the closed account is hidden at once');
select is(
  (select count(*)::integer from public.stories
   where user_id = (select adult_writer from ids) and deleted_at is null),
  0,
  'its stories go out of sight with it');
select is(
  (select reason from public.account_deletions
   where user_id = (select adult_writer from ids) and completed_at is null and cancelled_at is null),
  'unused',
  'the deletion says the account was unused');
select ok(
  (select delete_after between now() + interval '13 days' and now() + interval '15 days'
   from public.account_deletions
   where user_id = (select adult_writer from ids) and completed_at is null and cancelled_at is null),
  'it is deleted for good after 14 days, like "Delete my account"');
select is(
  public.close_unused_accounts(),
  '{"month_notices": 0, "week_notices": 0, "closed": 0}'::jsonb,
  'a closing account is left alone');

-- Logging in during the 14 days and choosing "Keep my account" brings it back for 5 more years.
select pg_temp.sign_in_as((select adult_writer from ids));
set local role authenticated;
select is(public.cancel_account_deletion() ->> 'outcome', 'ok', 'the person can keep the account');
reset role;
select is(
  (select deleted_at from public.profiles where id = (select adult_writer from ids)),
  null,
  'the kept account is back');
select is(
  public.account_last_used_on((select adult_writer from ids)),
  pg_temp.today(),
  'keeping it starts the 5 years again');
select is(
  public.close_unused_accounts(),
  '{"month_notices": 0, "week_notices": 0, "closed": 0}'::jsonb,
  'a kept account gets no more notices');

/* ---------- Who may run it, and the lists ---------- */

select pg_temp.sign_in_as((select owner from ids));
set local role authenticated;
select throws_ok(
  'select public.close_unused_accounts()',
  '42501',
  null,
  'nobody signed in can run the job, the owner included');
reset role;

select is(
  public.email_delivery_for((select blocker from ids), 'account_unused_week'),
  'required',
  'the last notice is always emailed too');
select is(
  (select action from public.account_deletion_rules() where table_name = 'account_last_used'),
  'delete',
  'deleting an account deletes its day of use');
select is(
  (select is_included from public.data_export_tables() where table_name = 'account_last_used'),
  true,
  'Download my data includes the day of use');

select * from finish();
rollback;
