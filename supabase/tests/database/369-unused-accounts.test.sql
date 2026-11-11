-- Database tests for the journey of an account nobody uses (bundles INACTIVE-1 and INACTIVE-2).
-- What it proves:
-- - the app's once-a-minute "here" notes the day of use, once a day;
-- - the day of last use is the latest of: the account made, the last log-in, the app open, and
--   "Keep my account";
-- - the nudge days: yearly for three years, then every 3 months in the fifth year;
-- - tonight's step for one account: nothing in the first year, a nudge on each nudge day, the
--   closing notice at 5 years, and closing only once that notice is 30 days old;
-- - the nightly job sends each email once, always by email, closes the account the same way as
--   "Delete my account" (to be deleted after 14 days), and never touches staff, a banned account
--   or a closing account;
-- - the closing email reaches the closed account, which can still make a copy of its data, and
--   that alone doesn't keep it;
-- - keeping the account starts the 5 years again;
-- - nobody but the job can run it, and deleting an account and Download my data know the table.
-- Policies covered: account_last_used_select_own, allowed and denied.
begin;

create extension if not exists pgtap with schema extensions;

select plan(50);

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
  'allowed: account_last_used_select_own: a person reads their own day of use');
reset role;

select pg_temp.sign_in_as((select blocker from ids));
set local role authenticated;
select is(
  (select count(*)::integer from public.account_last_used where user_id = (select adult_writer from ids)),
  0,
  'denied: account_last_used_select_own: nobody reads another person''s day of use');
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

/* ---------- The nudge days ---------- */

select is(public.unused_account_nudges_due((pg_temp.today() - interval '11 months')::date), 0,
  'no nudge is due before the first year');
select is(public.unused_account_nudges_due((pg_temp.today() - interval '3 years 6 months')::date), 3,
  'before the fourth year the nudges are yearly: three by three and a half years');
select is(public.unused_account_nudges_due((pg_temp.today() - interval '4 years 7 months')::date), 6,
  'from the fourth year they are quarterly: 4 years, 4 years 3 months and 4 years 6 months more');
select is(public.unused_account_nudges_due((pg_temp.today() - interval '6 years')::date), 7,
  'there are seven nudges in all: three yearly and four quarterly');

/* ---------- Tonight's step ---------- */

select is(public.unused_account_step((pg_temp.today() - interval '11 months')::date, null::date, null::timestamptz, 0),
  'none', 'nothing happens in the first year');
select is(public.unused_account_step((pg_temp.today() - interval '1 year')::date, null::date, null::timestamptz, 0),
  'nudge', 'a year without use: the first yearly nudge is due');
select is(public.unused_account_step((pg_temp.today() - interval '1 year 2 days')::date,
    (pg_temp.today() - interval '1 year 2 days')::date, null::timestamptz, 1),
  'none', 'each nudge goes once');
select is(public.unused_account_step((pg_temp.today() - interval '4 years 3 months')::date,
    (pg_temp.today() - interval '4 years 3 months')::date, null::timestamptz, 4),
  'nudge', 'in the fifth year a nudge is due every 3 months');
select is(public.unused_account_step((pg_temp.today() - interval '5 years')::date,
    (pg_temp.today() - interval '5 years')::date, null::timestamptz, 7),
  'notice', 'at 5 years the closing notice is due');
select is(public.unused_account_step((pg_temp.today() - interval '5 years 20 days')::date,
    (pg_temp.today() - interval '5 years 20 days')::date, now() - interval '20 days', 7),
  'none', 'the account doesn''t close until the notice is 30 days old');
select is(public.unused_account_step((pg_temp.today() - interval '6 years')::date,
    (pg_temp.today() - interval '6 years')::date, now() - interval '3 days', 7),
  'none', 'a late notice still gives its full 30 days');
select is(public.unused_account_step((pg_temp.today() - interval '5 years 31 days')::date,
    (pg_temp.today() - interval '5 years 31 days')::date, now() - interval '31 days', 7),
  'close', '30 days after the notice, the account closes');
select is(public.unused_account_step((pg_temp.today() - interval '2 years 1 day')::date,
    (pg_temp.today() - interval '8 years')::date, now() - interval '40 days', 7),
  'nudge', 'emails sent for an older day of use don''t count: everything starts again');

/* ---------- The nightly job ---------- */

-- The adult writer: last used 2 years and a day ago. The owner (staff) and a banned account as
-- long. The teacher: last used 6 months ago.
select pg_temp.last_used_ago((select adult_writer from ids), interval '2 years 1 day');
select pg_temp.last_used_ago((select owner from ids), interval '2 years 1 day');
select pg_temp.last_used_ago((select banned_user from ids), interval '2 years 1 day');
delete from public.account_deletions where user_id = (select teacher from ids);
select pg_temp.last_used_ago((select teacher from ids), interval '6 months');

select is(
  public.close_unused_accounts(),
  '{"nudges": 1, "notices": 0, "closed": 0}'::jsonb,
  'the job sends one nudge, and none to staff, a banned account or a recently used one');
select is(
  (select nudges_sent from public.account_last_used where user_id = (select adult_writer from ids)),
  2,
  'one nudge covers both years that passed, so a missed night doesn''t send two');
select is(
  (select delivery from public.email_outbox
   join public.notifications on notifications.id = any (email_outbox.notification_ids)
   where notifications.user_id = (select adult_writer from ids) and notifications.kind = 'account_unused_nudge'),
  'required',
  'the nudge is always emailed');
select is(
  (select count(*)::integer from public.notifications
   where user_id in ((select owner from ids), (select banned_user from ids))
     and kind in ('account_unused_nudge', 'account_unused_month', 'account_unused_closed')),
  0,
  'a staff account and a banned account get no email: staff stay, and a banned account is closed, never deleted');
select is(
  public.close_unused_accounts(),
  '{"nudges": 0, "notices": 0, "closed": 0}'::jsonb,
  'running again the same night sends nothing more');

-- 5 years: the closing notice, and no closing yet.
update public.profiles set created_at = now() - interval '5 years' where id = (select adult_writer from ids);
update auth.users set last_sign_in_at = now() - interval '5 years' where id = (select adult_writer from ids);
update public.account_last_used
set notices_for = public.account_last_used_on((select adult_writer from ids)), nudges_sent = 7
where user_id = (select adult_writer from ids);
select is(
  public.close_unused_accounts(),
  '{"nudges": 0, "notices": 1, "closed": 0}'::jsonb,
  'at 5 years the job sends the closing notice');
select is(
  (select delivery from public.email_outbox
   join public.notifications on notifications.id = any (email_outbox.notification_ids)
   where notifications.user_id = (select adult_writer from ids) and notifications.kind = 'account_unused_month'),
  'required',
  'the closing notice is always emailed');
select is(
  public.notification_category('account_unused_nudge'),
  'staff',
  'the nudge is filed with the notices from the team');

-- 31 days after the notice: the account closes.
update public.profiles set created_at = now() - interval '5 years 31 days' where id = (select adult_writer from ids);
update auth.users set last_sign_in_at = now() - interval '5 years 31 days' where id = (select adult_writer from ids);
update public.account_last_used
set notices_for = public.account_last_used_on((select adult_writer from ids)),
    closing_notice_at = now() - interval '31 days'
where user_id = (select adult_writer from ids);
select is(
  public.close_unused_accounts(),
  '{"nudges": 0, "notices": 0, "closed": 1}'::jsonb,
  '30 days after the notice, the job closes the account');
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
  '{"nudges": 0, "notices": 0, "closed": 0}'::jsonb,
  'a closing account is left alone');

/* ---------- The closing email and the copy of data ---------- */

create temporary table worker (worker_key text) on commit drop;
insert into worker select decrypted_secret from vault.decrypted_secrets where name = 'email_worker_key';
create temporary table claimed (emails jsonb) on commit drop;
insert into claimed select public.email_worker_claim((select worker_key from worker), 100);
select is(
  (select count(*)::integer from claimed, jsonb_array_elements(claimed.emails) as email,
          jsonb_array_elements(email -> 'items') as item
   where item ->> 'kind' = 'account_unused_closed'),
  1,
  'the closing email reaches the closed account');
select is(
  (select count(*)::integer from claimed, jsonb_array_elements(claimed.emails) as email,
          jsonb_array_elements(email -> 'items') as item
   where item ->> 'kind' in ('account_unused_nudge', 'account_unused_month')),
  0,
  'every other email to a closed account is dropped');

select pg_temp.sign_in_as((select adult_writer from ids));
set local role authenticated;
select is(public.my_account_deletion() ->> 'reason', 'unused', 'the app is told the account closed for not being used');
select is(public.my_data_export() ->> 'format', 'data-export/1', 'a closing account can still read its data');
select ok((public.request_data_export() ->> 'export_id') is not null, 'and ask for its copy');
select ok(
  (select count(*) > 0 and count(*) = count(*) filter (where story ->> 'deleted_at' is null)
   from jsonb_array_elements(public.my_data_export() -> 'tables' -> 'stories') as story),
  'its copy shows the stories as they were before the account closed, so they get their Word files');
reset role;
select isnt(
  (select deleted_at from public.profiles where id = (select adult_writer from ids)),
  null,
  'downloading the data doesn''t keep the account: it is still closing');

-- Going on to use the site keeps it (the app calls cancel_account_deletion()) for 5 more years.
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
  '{"nudges": 0, "notices": 0, "closed": 0}'::jsonb,
  'a kept account gets no more emails');

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
  public.email_delivery_for((select blocker from ids), 'account_unused_closed'),
  'required',
  'the closing email is always emailed too');
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
