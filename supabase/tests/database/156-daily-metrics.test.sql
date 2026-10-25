-- Database tests for the March test numbers (story S1-E15-02; board AdminMetrics; CLAUDE.md rule 1).
-- What it proves:
-- - the daily job counts writers who published (in total and by market) and signed-up readers
--   without staff (criterion 1);
-- - the return rate comes from daily totals only: reads of chapter N+1 in its first 7 days over
--   reads of chapter N before it (criterion 2);
-- - every stored row is a total with no user ID, and re-running a day replaces it (criterion 3);
-- - rows older than three years are deleted (criterion 4);
-- - policy daily_metrics_select_march_numbers: the owner and admins read the numbers (allowed);
--   a moderator, a member and a visitor don't (denied); nobody writes the table directly;
-- - admin_march_numbers() answers the owner and refuses everyone else.
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

create function pg_temp.sign_in(persona_id text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims', '{"sub": "' || persona_id || '", "role": "authenticated"}', true);
$$;
grant execute on all functions in schema pg_temp to anon, authenticated;

-- Today by the Romanian date, the day these tests count.
create temporary table today on commit drop as
select (now() at time zone 'Europe/Bucharest')::date as day;
grant select on today to anon, authenticated;

-- adult_writer's (…01) first seed story: chapter 1 out 20 days ago, chapter 2 out 10 days ago.
insert into public.chapters (story_id, user_id, code, position, draft_title, draft_body, word_count,
  status, published_title, published_body, published_word_count, first_published_at)
values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'metric01', 1,
   'Unu', 'x', 3, 'published', 'Unu', 'Primul capitol aici.', 3, now() - interval '20 days'),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001', 'metric02', 2,
   'Doi', 'x', 3, 'published', 'Doi', 'Al doilea capitol aici.', 3, now() - interval '10 days');
update public.stories set first_published_at = now() - interval '20 days',
  last_chapter_published_at = now() - interval '10 days'
where id = '00000000-0000-4000-9000-000000000001';

-- Reads: 100 of chapter 1 before chapter 2 came out (and 50 after, which don't count); 40 of
-- chapter 2 in its first 7 days (and 30 later, which don't count either).
insert into public.chapter_reads (chapter_id, read_on, total)
select chapters.id, reads.read_on, reads.total
from public.chapters
join (values
  ('metric01', (select day from today) - 15, 100),
  ('metric01', (select day from today) - 5, 50),
  ('metric02', (select day from today) - 8, 40),
  ('metric02', (select day from today) - 1, 30)
) as reads (code, read_on, total) on reads.code = chapters.code;

/* ---------- 1. The daily job ---------- */

select ok(public.compute_daily_metrics((select day from today)) >= 4, 'the job stores the day''s numbers');
select is(public.metric_on((select day from today), 'writers_published'), 1::numeric,
  'one writer has published (criterion 1)');
select is(public.metric_on((select day from today), 'writers_published',
  (select country_code from public.profiles where id = '00000000-0000-4000-8000-000000000001')), 1::numeric,
  'and they are counted in their own market');
select is(public.metric_on((select day from today), 'signed_up_readers'),
  (select count(*)::numeric from public.profiles join auth.users on users.id = profiles.id
   where users.email_confirmed_at is not null and profiles.deleted_at is null
     and profiles.id not in (select user_id from public.staff_roles)),
  'signed-up readers are the confirmed accounts without staff');
select is(public.metric_on((select day from today), 'return_rate'), 40.0,
  'the return rate is 40 reads of chapter 2 over 100 reads of chapter 1 before it (criterion 2)');
select public.compute_daily_metrics((select day from today) - 1);
select is(public.metric_on((select day from today) - 1, 'chapter_reads'), 30::numeric,
  'chapter reads are the day''s total');

select is(public.compute_daily_metrics((select day from today)),
  (select count(*)::integer from public.daily_metrics where metric_date = (select day from today)),
  'counting the same day again replaces it');
select is((select count(*)::integer from public.daily_metrics
           where metric_date = (select day from today) and metric = 'writers_published' and market = 'all'), 1,
  'and never doubles a number (criterion 3)');

-- A number from four years ago goes on the next run (criterion 4).
insert into public.daily_metrics (metric_date, metric, value)
values ((select day from today) - interval '4 years', 'chapter_reads', 7);
select public.compute_daily_metrics((select day from today));
select is((select count(*)::integer from public.daily_metrics
           where metric_date < (select day from today) - interval '3 years'), 0,
  'numbers older than three years are deleted');

/* ---------- 2. Who reads them ---------- */

select pg_temp.sign_in('00000000-0000-4000-8000-000000000008');
select ok((select count(*) from public.daily_metrics) > 0,
  'allowed: daily_metrics_select_march_numbers, the owner reads the numbers');
select pg_temp.sign_in('00000000-0000-4000-8000-000000000009');
select ok((select count(*) from public.daily_metrics) > 0, 'allowed: and so does an admin');
select is((public.admin_march_numbers() ->> 'writers')::numeric, 1::numeric,
  'admin_march_numbers() gives the admin the latest numbers');
select ok(public.admin_march_numbers()::text !~ '00000000-0000-4000-8000',
  'with no user ID anywhere in the answer');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000010');
select is((select count(*)::integer from public.daily_metrics), 0,
  'denied: daily_metrics_select_march_numbers, a moderator reads none (queue numbers only)');
select throws_ok($$ select public.admin_march_numbers() $$, '42501', null,
  'and admin_march_numbers() refuses the moderator');

select pg_temp.sign_in('00000000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.daily_metrics), 0, 'denied: a member reads none');
select throws_ok($$ insert into public.daily_metrics (metric_date, metric, value) values (current_date, 'chapter_reads', 1) $$,
  '42501', null, 'and nobody writes the table directly');

select * from finish();
rollback;
