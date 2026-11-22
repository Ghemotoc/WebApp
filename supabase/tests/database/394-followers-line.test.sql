-- Database tests for the followers line graph (bundle CALM-7b; design handover Step 4, "Followers
-- line graph").
-- What it proves:
-- - writer_followers_line() refuses a signed-out caller and any range but 7, 30, 90 and 365;
-- - 7 and 30 days give one point a day, 90 days one a week starting on Monday, 365 days one a
--   calendar month, oldest first, and the last point is the one still running;
-- - total is the followers at the end of each point and gained the new follows inside it, and both
--   say null ("fewer than 5") from 1 to 4;
-- - a follow at 00:30 Romania time (22:30 UTC the evening before) counts on the Romanian day;
-- - a writer sees only their own followers;
-- - writer_dashboard() gives followers_this_week and no longer gives followers_by_week, and the
--   weekly bars' function is gone.
-- Test data: adult_writer (…01) starts with no followers; rolled back at the end.
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

create function pg_temp.sign_in(persona_id uuid) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
create function pg_temp.sign_out() returns void language sql as $$
  select set_config('role', 'anon', true), set_config('request.jwt.claims', '', true);
$$;
-- The SQLSTATE a statement raises, or null.
create function pg_temp.refusal(statement text) returns text language plpgsql as $$
begin
  execute statement;
  return null;
exception when others then
  return sqlstate;
end;
$$;
-- A persona's ID from its number.
create function pg_temp.persona(persona_number integer) returns uuid language sql as $$
  select ('00000000-0000-4000-8000-' || lpad(persona_number::text, 12, '0'))::uuid;
$$;
-- Today, in Romania.
create function pg_temp.today() returns date language sql as $$
  select (now() at time zone 'Europe/Bucharest')::date;
$$;
-- The writer's line for a range, read as the writer.
create function pg_temp.points(range_days integer) returns jsonb language sql as $$
  select public.writer_followers_line(range_days) -> 'points';
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- adult_writer starts from nothing; then three followers 40 days ago and one at 00:30 today,
-- Romania time (22:30 UTC the evening before in winter).
delete from public.follows_users where followed_user_id = pg_temp.persona(1);
insert into public.follows_users (user_id, followed_user_id, created_at)
select pg_temp.persona(number), pg_temp.persona(1), now() - interval '40 days'
from generate_series(2, 4) as number;
insert into public.follows_users (user_id, followed_user_id, created_at)
values (pg_temp.persona(5), pg_temp.persona(1),
  (pg_temp.today()::timestamp at time zone 'Europe/Bucharest') + interval '30 minutes');

-- Step 1: who may ask, and which ranges.
select pg_temp.sign_out();
select is(pg_temp.refusal('select public.writer_followers_line(7)'), '42501',
  'a signed-out visitor can''t read a follower line');
select pg_temp.sign_in(pg_temp.persona(1));
select is(pg_temp.refusal('select public.writer_followers_line(14)'), '22023',
  'a range other than 7, 30, 90 or 365 days is refused');

-- Step 2: the shape of each range.
select is(jsonb_array_length(pg_temp.points(7)), 7, 'the last 7 days give one point a day');
select is(jsonb_array_length(pg_temp.points(30)), 30, 'the last 30 days give one point a day');
select is((pg_temp.points(7) -> -1 ->> 'starts_on')::date, pg_temp.today(),
  'the newest point is today, still running');
select is((pg_temp.points(7) -> 0 ->> 'starts_on')::date, pg_temp.today() - 6,
  'the oldest of 7 points is six days ago');
select ok((select bool_and(extract(isodow from (point ->> 'starts_on')::date) = 1)
    from jsonb_array_elements(pg_temp.points(90)) as point),
  'the last 90 days give one point a week, each starting on a Monday');
select is((pg_temp.points(90) -> -1 ->> 'starts_on')::date,
  date_trunc('week', pg_temp.today()::timestamp)::date, 'the newest week is this week');
select ok((select bool_and(extract(day from (point ->> 'starts_on')::date) = 1)
    from jsonb_array_elements(pg_temp.points(365)) as point),
  'the last 365 days give one point a calendar month');
select is(jsonb_array_length(pg_temp.points(365)),
  (extract(year from age(date_trunc('month', pg_temp.today()::timestamp),
    date_trunc('month', (pg_temp.today() - 364)::timestamp))) * 12
   + extract(month from age(date_trunc('month', pg_temp.today()::timestamp),
    date_trunc('month', (pg_temp.today() - 364)::timestamp))) + 1)::integer,
  'a year of months runs from the month 364 days ago to this month');

-- Step 3: the numbers, with the "fewer than 5" rule.
select is(pg_temp.points(7) -> -1 -> 'total', 'null'::jsonb,
  'four followers say "fewer than 5", not the number');

-- Back to the test's own role to add five more followers today.
reset role;
insert into public.follows_users (user_id, followed_user_id, created_at)
select pg_temp.persona(number), pg_temp.persona(1), now()
from generate_series(6, 10) as number;
select pg_temp.sign_in(pg_temp.persona(1));
select is((pg_temp.points(7) -> -1 ->> 'total')::integer, 9,
  'the newest point counts every follower by its end');
select is((pg_temp.points(7) -> -1 ->> 'gained')::integer, 6,
  'a follow at 00:30 Romania time counts on that Romanian day, with today''s others');
select is(pg_temp.points(7) -> -2 -> 'gained', '0'::jsonb,
  'the evening before (UTC) gets nothing from the 00:30 follow');
select is(pg_temp.points(7) -> 0 -> 'total', 'null'::jsonb,
  'the three older followers are in every point, and still say "fewer than 5"');

-- Step 4: another writer sees only their own followers.
select pg_temp.sign_in(pg_temp.persona(2));
select ok(not (public.writer_followers_line(7)::text like '%"total": 9%'),
  'another writer never gets this writer''s followers');

-- Step 5: the dashboard carries "+n this week" and no longer the weekly bars.
select pg_temp.sign_in(pg_temp.persona(1));
select ok(public.writer_dashboard() -> 'totals' ? 'followers_this_week'
    and not (public.writer_dashboard() ? 'followers_by_week')
    and to_regprocedure('public.writer_followers_by_week(uuid)') is null,
  'the dashboard gives followers this week, and the weekly bars and their function are gone');

select * from finish();
rollback;
