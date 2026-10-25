/*
 * Migration: the March test numbers, counted from our own database (story S1-E15-02; board
 * AdminMetrics, screen 8.7; architecture 1.7.9).
 *
 * What it adds:
 * - daily_metrics: one number per day, metric and market. Totals only: no row is about a person,
 *   and nothing here can list people (decided 17 Oct 2026, 12:34: "only aggregated data, never
 *   per-reader records"; no individual-level export exists).
 * - compute_daily_metrics(for_day): counts one day (writers who published, in total and by open
 *   market; signed-up readers; chapter reads; the return rate) and deletes rows older than three
 *   years (Robert's default retention for aggregated data, decided 17 Oct 2026, 12:34).
 * - run_daily_metrics(): the nightly job (pg_cron, 04:07 UTC, 06:07 or 07:07 in Romania):
 *   counts yesterday by the Romanian date.
 * - admin_march_numbers(days): what the staff Metrics page shows, for the owner and admins.
 * The return rate is an approximation (architecture 1.7.9): reads of chapter N+1 in the 7 days
 * after it came out, divided by reads of chapter N before N+1 came out. Totals can't tell whether
 * the same readers came back, so the page labels it "approximation".
 * Who sees the numbers: the owner and admins in a staff session (architecture 1.8.3: Metrics and
 * logs is View for owner and admin; moderators see queue numbers only).
 * Who calls it: pg_cron; src/features/staff/api/marchNumbers.ts.
 * Tests: supabase/tests/database/156-daily-metrics.test.sql, 099-epic-s1-e15.test.sql.
 */

/* ---------- Settings: the targets ---------- */

-- The targets are proposals in the plan, not final (S1-E15-02's legal note: 20 writers decided
-- 16 Oct 2026; 200 readers and a 30% return rate are proposals), so they are settings.
insert into public.settings (key, value, is_public, description) values
  ('march_target_writers', '20'::jsonb, false,
   'March test target: writers with at least one published chapter (decided 16 Oct 2026; S1-E15-02).'),
  ('march_target_readers', '200'::jsonb, false,
   'March test target: signed-up readers (a proposal, not final; S1-E15-02).'),
  ('march_target_return_rate', '30'::jsonb, false,
   'March test target: the return rate in per cent (a proposal, not final; S1-E15-02).'),
  ('daily_metrics_keep_years', '3'::jsonb, false,
   'How long daily totals are kept (Robert, 17 Oct 2026, 12:34; docs/retention.md).')
on conflict (key) do nothing;

/* ---------- The table ---------- */

create table public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  -- The day counted, by the Romanian date (Q7).
  metric_date date not null,
  metric text not null,
  -- 'all', an open market's country code, or 'other' for every other country.
  market text not null default 'all',
  value numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_metrics_one_per_day unique (metric_date, metric, market),
  constraint daily_metrics_known_metric check (
    metric in ('writers_published', 'signed_up_readers', 'chapter_reads', 'return_rate')),
  constraint daily_metrics_market_shape check (market in ('all', 'other') or market ~ '^[A-Z]{2}$'),
  constraint daily_metrics_value_not_negative check (value >= 0)
);

comment on table public.daily_metrics is
  'kind: platform. Daily totals for the March test, never about a person; kept 3 years (S1-E15-02).';

alter table public.daily_metrics enable row level security;

/**
 * may_see_march_numbers: whether the caller may read the March test numbers.
 * Returns: true for the owner and admins in a staff session (architecture 1.8.3: Metrics is View
 *   for owner and admin; a moderator's Metrics view covers queue numbers only).
 * Where it fits: the policy below and admin_march_numbers().
 */
create or replace function public.may_see_march_numbers()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.staff_may('metrics', 'view')
    and (public.is_staff('owner') or public.is_staff('admin'));
$$;
comment on function public.may_see_march_numbers() is
  'Owner or admin in a staff session: may read the March test numbers (S1-E15-02).';
revoke execute on function public.may_see_march_numbers() from public, anon;
grant execute on function public.may_see_march_numbers() to authenticated;

-- Who: the owner and admins in a staff session. Why: the March test numbers are theirs to read
-- (architecture 1.8.3); they are totals only, but nobody else needs them. Writes go only through
-- compute_daily_metrics(), as the database owner.
create policy daily_metrics_select_march_numbers on public.daily_metrics
  for select to authenticated
  using ((select public.may_see_march_numbers()));

grant select on public.daily_metrics to authenticated;

create trigger daily_metrics_set_updated_at
  before update on public.daily_metrics
  for each row execute function public.set_updated_at();

/* ---------- Counting one day ---------- */

/**
 * writers_published_by_market: writers with at least one readable chapter out by the end of a day.
 * Input: for_day, the Romanian date. Returns: one row per market ('all', each open market's
 *   country code that has writers, 'other') with how many writers.
 * Rules: the official classics account isn't a writer (S1-E5-06); deleted accounts don't count.
 * Internal: compute_daily_metrics().
 */
create or replace function public.writers_published_by_market(for_day date)
returns table (market text, writer_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  with writers as (
    select distinct stories.user_id,
      case when markets.is_open then profiles.country_code else 'other' end as market
    from public.chapters
    join public.stories on stories.id = chapters.story_id
    join public.profiles on profiles.id = stories.user_id
    left join public.markets on markets.country_code = profiles.country_code
    where public.chapter_is_readable(chapters.id)
      and (chapters.first_published_at at time zone 'Europe/Bucharest')::date <= for_day
      and profiles.deleted_at is null
      and profiles.handle is distinct from (public.setting_value('classics_account_handle') #>> '{}')
  )
  select 'all', count(distinct user_id)::integer from writers
  union all
  select coalesce(writers.market, 'other'), count(*)::integer from writers
  group by coalesce(writers.market, 'other');
$$;
comment on function public.writers_published_by_market(date) is
  'Internal: writers with a readable chapter by the end of a day, in total and by market (S1-E15-02).';
revoke execute on function public.writers_published_by_market(date) from public, anon, authenticated;

/**
 * signed_up_reader_count: accounts that could read on a day.
 * Input: for_day. Returns: confirmed, live accounts created by the end of that day, without staff
 *   and the classics account. Reads are kept as totals only, so "accounts that opened a chapter"
 *   (the board's wording) can't be counted without a per-reader record (docs/board-fixes.md).
 * Internal: compute_daily_metrics().
 */
create or replace function public.signed_up_reader_count(for_day date)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.profiles
  join auth.users on users.id = profiles.id
  where profiles.deleted_at is null
    and users.email_confirmed_at is not null
    and (profiles.created_at at time zone 'Europe/Bucharest')::date <= for_day
    and not exists (select 1 from public.staff_roles where staff_roles.user_id = profiles.id)
    and profiles.handle is distinct from (public.setting_value('classics_account_handle') #>> '{}');
$$;
comment on function public.signed_up_reader_count(date) is
  'Internal: confirmed, live, non-staff accounts by the end of a day (S1-E15-02).';
revoke execute on function public.signed_up_reader_count(date) from public, anon, authenticated;

/**
 * return_rate_on: the approximate return rate as seen on a day, in per cent.
 * Input: for_day. Returns: 100 × (reads of chapter N+1 in its first 7 days) ÷ (reads of chapter
 *   N before N+1 came out), summed over every pair of chapters next to each other whose second
 *   chapter came out 7 to 36 days before for_day (so its 7 days are complete); null when there
 *   are no reads of chapter N to divide by.
 * Rule: daily totals only, never who read (decided 17 Oct 2026, 12:34; architecture 1.7.9).
 * Internal: compute_daily_metrics().
 */
create or replace function public.return_rate_on(for_day date)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  with readable as (
    select chapters.id, chapters.story_id, chapters.position,
      (chapters.first_published_at at time zone 'Europe/Bucharest')::date as released_on
    from public.chapters
    where public.chapter_is_readable(chapters.id)
  ),
  pairs as (
    select readable.id as previous_id,
      lead(readable.id) over (partition by readable.story_id order by readable.position) as next_id,
      lead(readable.released_on) over (partition by readable.story_id order by readable.position) as next_released_on
    from readable
  ),
  counted as (
    select
      (select coalesce(sum(reads.total), 0) from public.chapter_reads as reads
        where reads.chapter_id = pairs.next_id
          and reads.read_on between pairs.next_released_on and pairs.next_released_on + 6) as next_reads,
      (select coalesce(sum(reads.total), 0) from public.chapter_reads as reads
        where reads.chapter_id = pairs.previous_id and reads.read_on < pairs.next_released_on) as previous_reads
    from pairs
    where pairs.next_id is not null
      and pairs.next_released_on between for_day - 36 and for_day - 6
  )
  select case when sum(previous_reads) > 0
    then round(100.0 * sum(next_reads) / sum(previous_reads), 1) end
  from counted;
$$;
comment on function public.return_rate_on(date) is
  'Internal: the approximate return rate from daily read totals (S1-E15-02; architecture 1.7.9).';
revoke execute on function public.return_rate_on(date) from public, anon, authenticated;

/**
 * compute_daily_metrics: counts one day and keeps the table to three years.
 * Input: for_day, the Romanian date to count (yesterday when null).
 * Returns: how many numbers were stored. Running it twice for the same day replaces that day's
 *   numbers, so a re-run never doubles them.
 * Where it fits: run_daily_metrics() every night; the migration below for the last 30 days;
 *   tests call it directly.
 */
create or replace function public.compute_daily_metrics(for_day date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  counted_day date := coalesce(for_day, (now() at time zone 'Europe/Bucharest')::date - 1);
  keep_years integer := coalesce(public.setting_value('daily_metrics_keep_years'), '3')::text::integer;
  return_rate numeric := public.return_rate_on(counted_day);
  stored integer;
begin
  -- Step 1: forget the day's earlier numbers, so this run's are the only ones.
  delete from public.daily_metrics where metric_date = counted_day;

  -- Step 2: writers who published, in total and by market.
  insert into public.daily_metrics (metric_date, metric, market, value)
  select counted_day, 'writers_published', writers.market, writers.writer_count
  from public.writers_published_by_market(counted_day) as writers;

  -- Step 3: signed-up readers and the day's chapter reads.
  insert into public.daily_metrics (metric_date, metric, value) values
    (counted_day, 'signed_up_readers', public.signed_up_reader_count(counted_day)),
    (counted_day, 'chapter_reads', (select coalesce(sum(total), 0) from public.chapter_reads
                                    where read_on = counted_day));

  -- Step 4: the return rate, only when there is something to divide by.
  if return_rate is not null then
    insert into public.daily_metrics (metric_date, metric, value)
    values (counted_day, 'return_rate', return_rate);
  end if;

  -- Step 5: aggregated numbers are kept three years (decided 17 Oct 2026, 12:34).
  delete from public.daily_metrics
  where metric_date < (now() at time zone 'Europe/Bucharest')::date - make_interval(years => keep_years);

  select count(*)::integer into stored from public.daily_metrics where metric_date = counted_day;
  return stored;
end;
$$;
comment on function public.compute_daily_metrics(date) is
  'Counts one day''s March test numbers and deletes those older than 3 years (S1-E15-02).';
revoke execute on function public.compute_daily_metrics(date) from public, anon, authenticated;

/**
 * run_daily_metrics: the nightly job.
 * Returns: how many numbers were stored for yesterday (the Romanian date).
 * Where it fits: pg_cron, 04:07 UTC (06:07 or 07:07 in Romania), after the day has ended.
 */
create or replace function public.run_daily_metrics()
returns integer
language sql
security definer
set search_path = ''
as $$
  select public.compute_daily_metrics(null);
$$;
comment on function public.run_daily_metrics() is
  'Nightly: counts yesterday''s March test numbers (S1-E15-02).';
revoke execute on function public.run_daily_metrics() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('count-daily-metrics', '7 4 * * *', 'select public.run_daily_metrics();');

-- So the page isn't empty on its first day: count the last 30 days once.
select public.compute_daily_metrics(day::date)
from generate_series((now() at time zone 'Europe/Bucharest')::date - 30,
                     (now() at time zone 'Europe/Bucharest')::date - 1, interval '1 day') as day;

/* ---------- What the staff page reads ---------- */

/**
 * metric_on: one stored number.
 * Inputs: the day, the metric and the market. Returns: the value, or null when none is stored.
 * Internal: admin_march_numbers().
 */
create or replace function public.metric_on(for_day date, wanted_metric text, wanted_market text default 'all')
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select value from public.daily_metrics
  where metric_date = for_day and metric = wanted_metric and market = wanted_market;
$$;
comment on function public.metric_on(date, text, text) is 'Internal: one stored daily number (S1-E15-02).';
revoke execute on function public.metric_on(date, text, text) from public, anon, authenticated;

/**
 * admin_march_numbers: the staff Metrics page (board AdminMetrics).
 * Input: days, how many days of reads to list (7 to 90; 30 when null).
 * Returns: JSON {counted_on (the latest day counted, or null), writers, readers, return_rate
 *   (null when it can't be worked out yet), targets {writers, readers, return_rate},
 *   writers_by_market [{market, count}], reads_per_day [{day, reads}]}. Totals only.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller is the owner or an admin in a
 *   staff session.
 * Where it fits: /staff/metrics → useMarchNumbers → api/marchNumbers.ts → here.
 */
create or replace function public.admin_march_numbers(days integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  listed_days integer := least(greatest(coalesce(days, 30), 7), 90);
  counted_on date;
begin
  -- Step 1: owner and admins only (architecture 1.8.3).
  if not public.may_see_march_numbers() then
    raise exception 'Only the owner and admins can see the March test numbers.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: the latest day the job has counted.
  select max(metric_date) into counted_on from public.daily_metrics;
  -- Step 3: the numbers, the targets and the lists.
  return jsonb_build_object(
    'counted_on', counted_on,
    'writers', public.metric_on(counted_on, 'writers_published'),
    'readers', public.metric_on(counted_on, 'signed_up_readers'),
    'return_rate', public.metric_on(counted_on, 'return_rate'),
    'targets', jsonb_build_object(
      'writers', public.setting_value('march_target_writers'),
      'readers', public.setting_value('march_target_readers'),
      'return_rate', public.setting_value('march_target_return_rate')),
    'writers_by_market', coalesce((
      select jsonb_agg(jsonb_build_object('market', market, 'count', value) order by value desc, market)
      from public.daily_metrics
      where metric_date = counted_on and metric = 'writers_published' and market <> 'all'), '[]'::jsonb),
    'reads_per_day', coalesce((
      select jsonb_agg(jsonb_build_object('day', metric_date, 'reads', value) order by metric_date)
      from public.daily_metrics
      where metric = 'chapter_reads' and market = 'all'
        and metric_date > counted_on - listed_days), '[]'::jsonb)
  );
end;
$$;
comment on function public.admin_march_numbers(integer) is
  'The staff Metrics page: the March test numbers, totals only, for the owner and admins (S1-E15-02).';
revoke execute on function public.admin_march_numbers(integer) from public, anon;
grant execute on function public.admin_march_numbers(integer) to authenticated;
