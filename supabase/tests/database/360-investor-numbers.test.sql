-- Database tests for the investor numbers (story S1-E15-04, bundle ANALYTICS-1a; CLAUDE.md rule 1).
-- What it proves:
-- - note_active_minute() counts a member once a day and a minute at most every 45 seconds, and
--   staff aren't counted (criterion 1);
-- - the member's one row holds only their last day, overwritten, and only they read it (criterion 2);
-- - a first finish of a chapter adds one to the day's finished total, a second save doesn't, and a
--   writer's own chapter doesn't count (criterion 3);
-- - the nightly job stores the investor numbers, retention only for 5 or more new members (criterion 4);
-- - policies daily_activity_totals_select_metrics and chapter_finishes_select_staff: allowed and
--   denied; admin_investor_numbers() answers the owner and admins only, with no user ID (criterion 5).
begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

create temporary table today on commit drop as
select (now() at time zone 'Europe/Bucharest')::date as day;
grant select on today to anon, authenticated;

-- A published chapter by adult_writer (…01) in a completed story, for the finish tests.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000001', 'invest01', 1,
  'One', 'x', 1, 'published', 'One', 'Text.', 1, now());
update public.stories set first_published_at = now(), last_chapter_published_at = now(),
  rating = 'all_ages' where id = '00000000-0000-4000-9000-000000000002';

/* ---------- 1. Noting minutes ---------- */

-- Start from no activity, whatever ran before (rolled back at the end).
delete from public.member_last_active;
delete from public.daily_activity_totals;
delete from public.chapter_finishes;

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.note_active_minute(false) ->> 'counted', 'true', 'the first minute of the day counts');
select is(public.note_active_minute(true) ->> 'counted', 'false',
  'a second minute within 45 seconds doesn''t');
reset role;
select is((select active_members from public.daily_activity_totals where activity_on = (select day from today)),
  1, 'the member is counted active once');
select is((select minutes_in_app from public.daily_activity_totals where activity_on = (select day from today)),
  1, 'and one minute in the app');

-- 50 seconds later, a reading minute counts.
update public.member_last_active set minute_noted_at = now() - interval '50 seconds'
where user_id = '00000000-0000-4000-8000-000000000002';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select is(public.note_active_minute(true) ->> 'counted', 'true', 'a minute 50 seconds later counts');
reset role;
select is((select array[active_members, minutes_in_app, minutes_reading] from public.daily_activity_totals
           where activity_on = (select day from today)), array[1, 2, 1],
  'still one member, now two minutes in the app and one reading');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select is(public.note_active_minute(false) ->> 'counted', 'false', 'an admin isn''t counted');
reset role;
select is((select count(*)::integer from public.member_last_active
           where user_id = '00000000-0000-4000-8000-000000000009'), 0, 'and gets no row');

set local role anon;
select throws_ok($$ select public.note_active_minute(false) $$, '42501', null,
  'a signed-out visitor can''t note a minute');
reset role;

/* ---------- 2. The member's one row ---------- */

update public.member_last_active set active_on = (select day from today) - 3, minute_noted_at = null
where user_id = '00000000-0000-4000-8000-000000000002';
select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.note_active_minute(false);
select is((select array_agg(active_on) from public.member_last_active), array[(select day from today)],
  'allowed: member_last_active_select_own, the member reads their one row, with only today');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select is((select count(*)::integer from public.member_last_active), 0,
  'denied: member_last_active_select_own, the owner reads no one''s row');
select throws_ok($$ update public.member_last_active set active_on = current_date $$, '42501', null,
  'and nobody writes the rows directly');
reset role;

/* ---------- 3. Finished chapters ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000002');
select public.save_reading_position('the-girl-who-fixed-radios-seed02', 'invest01', 96, 'phone');
select public.save_reading_position('the-girl-who-fixed-radios-seed02', 'invest01', 100, 'phone');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select public.save_reading_position('the-girl-who-fixed-radios-seed02', 'invest01', 100, 'computer');
reset role;
select is((select total from public.chapter_finishes join public.chapters on chapters.id = chapter_id
           where chapters.code = 'invest01'), 1,
  'a first finish counts once; saving again and the writer''s own read don''t');

/* ---------- 4. The nightly job ---------- */

-- Five members who count joined 8 days ago, a week before yesterday (adult_writer, teen_17 and three more confirmed,
-- non-staff accounts) and two of them came back since; nobody joined 30 days ago.
create temporary table cohort on commit drop as
select profiles.id from public.profiles join auth.users on users.id = profiles.id
where users.email_confirmed_at is not null and public.counts_for_metrics(profiles.id)
order by profiles.id <> '00000000-0000-4000-8000-000000000001',
  profiles.id <> '00000000-0000-4000-8000-000000000002', profiles.id
limit 5;
update public.profiles set created_at = now() - interval '8 days' where id in (select id from cohort);
delete from public.member_last_active;
insert into public.member_last_active (user_id, active_on) values
  ('00000000-0000-4000-8000-000000000001', (select day from today) - 1),
  ('00000000-0000-4000-8000-000000000002', (select day from today) - 1);
select ok(public.compute_daily_metrics((select day from today) - 1) > 0, 'the nightly job runs');
select is(public.metric_on((select day from today) - 1, 'weekly_active_members'), 2::numeric,
  'two members are active this week');
select ok(public.metric_on((select day from today) - 1, 'retention_day_7') is not null,
  'retention is stored for a day five or more members joined');
select is(public.metric_on((select day from today) - 1, 'retention_day_30'), null::numeric,
  'and not for a day fewer joined (the small-number rule)');
select is(public.metric_on((select day from today), 'chapters_finished'), null::numeric,
  'today isn''t counted until the night is over');
select public.compute_daily_metrics((select day from today));
select is(public.metric_on((select day from today), 'chapters_finished'), 1::numeric,
  'counting today stores its finished chapter');
select is(public.metric_on((select day from today), 'weekly_active_members'), null::numeric,
  'but not the weekly count, which only the night itself can count');

/* ---------- 5. Who reads them ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select ok((select count(*) from public.daily_activity_totals) > 0,
  'allowed: daily_activity_totals_select_metrics, an admin reads the activity totals');
select ok((select count(*) from public.chapter_finishes) > 0,
  'allowed: chapter_finishes_select_staff, and the finished totals');
select ok(public.admin_investor_numbers()::text !~ '00000000-0000-4000-8000',
  'admin_investor_numbers() answers the admin, with no user ID anywhere');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.daily_activity_totals), 0,
  'denied: daily_activity_totals_select_metrics, a member reads no activity totals');
select is((select count(*)::integer from public.chapter_finishes), 0,
  'denied: chapter_finishes_select_staff, nor the finished totals');
select throws_ok($$ select public.admin_investor_numbers() $$, '42501', null,
  'and admin_investor_numbers() refuses the member');

reset role;
select * from finish();
rollback;
