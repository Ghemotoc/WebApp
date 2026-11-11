-- Migration: investor numbers, counted from our own database (story S1-E15-04, bundle
-- ANALYTICS-1a; Robert's queue, 10 Nov 2026; research doc "Research: reading analytics and
-- suggestions").
--
-- What it does:
-- 1. member_last_active: one row per member with only their last day in the app and when their
--    last minute was noted. Overwritten every time, so no history of a member's days is kept
--    (decided 17 Oct 2026, 12:34: no per-reader records). Only the member reads their own row.
-- 2. daily_activity_totals: per day, how many members used the app and how many minutes were
--    spent in the app and reading. Totals only.
-- 3. chapter_finishes: per chapter and day, how many readers reached 95% for the first time.
--    Totals only, like chapter_reads.
-- 4. note_active_minute(is_reading): the app calls it once a minute while it is open and visible.
--    The first call of a day counts the member as active; later calls add a minute, at most one
--    every 45 seconds.
-- 5. save_reading_position() adds one to chapter_finishes when a reader first reaches 95%.
-- 6. The nightly metrics job also stores: active members (day, week, month), sign-ups, stories
--    read, chapters finished, minutes in the app and reading, writers publishing and rolling
--    retention at 1, 7 and 30 days, with the small-number rule for retention.
-- 7. admin_investor_numbers(): what the staff Metrics page's investor section reads, for the
--    owner and admins only.
-- Who calls it: src/features/analytics (the minute hook) and src/features/staff (the page).
-- What it calls next: nothing new.

/* ---------- 1. The member's last day ---------- */

create table public.member_last_active (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  -- The last day (Romanian date, as every daily total) the member used the app.
  active_on date not null,
  -- When the member's last minute was added to the totals, so a minute counts once.
  minute_noted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.member_last_active is
  'kind: user_action. Each member''s last day in the app and last noted minute, overwritten each time: no history (S1-E15-04).';

alter table public.member_last_active enable row level security;

-- Who: the member, for their own row only. Why: it is their data (GDPR art. 15). Nobody else,
-- staff included, reads it: only the nightly job turns the rows into weekly and monthly counts.
-- Writes go only through note_active_minute().
create policy member_last_active_select_own on public.member_last_active
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.member_last_active to authenticated;

create trigger member_last_active_set_updated_at
  before update on public.member_last_active
  for each row execute function public.set_updated_at();

/* ---------- 2. The day's activity totals ---------- */

create table public.daily_activity_totals (
  activity_on date primary key,
  active_members integer not null default 0,
  minutes_in_app integer not null default 0,
  minutes_reading integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_activity_totals_not_negative
    check (active_members >= 0 and minutes_in_app >= 0 and minutes_reading >= 0)
);

comment on table public.daily_activity_totals is
  'kind: platform. Per day: members who used the app and minutes in the app and reading. Totals only (S1-E15-04).';

alter table public.daily_activity_totals enable row level security;

-- Who: the owner and admins in a staff session. Why: like the March numbers, these totals are
-- theirs to read (architecture 1.8.3). Writes go only through note_active_minute().
create policy daily_activity_totals_select_metrics on public.daily_activity_totals
  for select to authenticated
  using ((select public.may_see_march_numbers()));

grant select on public.daily_activity_totals to authenticated;

create trigger daily_activity_totals_set_updated_at
  before update on public.daily_activity_totals
  for each row execute function public.set_updated_at();

/* ---------- 3. Chapters read to the end ---------- */

create table public.chapter_finishes (
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  read_on date not null,
  total integer not null default 0,
  primary key (chapter_id, read_on),
  constraint chapter_finishes_total_not_negative check (total >= 0)
);

comment on table public.chapter_finishes is
  'kind: platform. How many readers first reached 95% of each chapter each day: totals only, never who (S1-E15-04).';

alter table public.chapter_finishes enable row level security;

-- Who: staff who may view stories. Why: to check a story's finish rate from the admin site.
-- Readers never read it; the ranking job reads it as the database owner. Writes go only through
-- save_reading_position().
create policy chapter_finishes_select_staff on public.chapter_finishes
  for select to authenticated
  using ((select public.staff_may('stories', 'view')));

grant select on public.chapter_finishes to authenticated;

/* ---------- Settings ---------- */

insert into public.settings (key, value, is_public, description) values
  ('metrics_minimum_group', '5'::jsonb, false,
   'Investor numbers: retention is stored only for a day on which at least this many members joined, so no one person''s visits can be read from it (S1-E15-04).'),
  ('member_last_active_keep_days', '35'::jsonb, false,
   'How long a member''s last-day row is kept after their last day in the app: long enough for the monthly count and 30-day retention (S1-E15-04).')
on conflict (key) do nothing;

/* ---------- 4. Noting a minute ---------- */

/**
 * counts_for_metrics: whether a member counts in the investor numbers.
 * Input: a profile ID. Returns true for a live member who isn't staff or the classics account,
 *   the same people signed_up_reader_count() counts (S1-E15-02).
 * Where it fits: note_active_minute() and the sign-up and retention counts.
 */
create function public.counts_for_metrics(person_id uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where profiles.id = person_id and profiles.deleted_at is null
      and profiles.handle is distinct from (public.setting_value('classics_account_handle') #>> '{}'))
    and not exists (select 1 from public.staff_roles where staff_roles.user_id = person_id);
$$;
comment on function public.counts_for_metrics(uuid) is
  'Internal: whether a member counts in the investor numbers: live, not staff, not the classics account (S1-E15-04).';
revoke execute on function public.counts_for_metrics(uuid) from public, anon, authenticated;

/**
 * add_to_activity_totals: adds to one day's totals.
 * Inputs: the day, whether to count one more active member, minutes in the app and reading (0 or 1).
 * Returns nothing. Internal: note_active_minute().
 */
create function public.add_to_activity_totals(
  for_day date, new_member integer, app_minutes integer, reading_minutes integer)
returns void
language sql security definer set search_path = ''
as $$
  insert into public.daily_activity_totals as totals
    (activity_on, active_members, minutes_in_app, minutes_reading)
  values (for_day, new_member, app_minutes, reading_minutes)
  on conflict (activity_on) do update set
    active_members = totals.active_members + excluded.active_members,
    minutes_in_app = totals.minutes_in_app + excluded.minutes_in_app,
    minutes_reading = totals.minutes_reading + excluded.minutes_reading;
$$;
comment on function public.add_to_activity_totals(date, integer, integer, integer) is
  'Internal: adds a member and minutes to one day''s activity totals (S1-E15-04).';
revoke execute on function public.add_to_activity_totals(date, integer, integer, integer)
  from public, anon, authenticated;

/**
 * note_active_minute: the app says "this member is here", once a minute while it is visible.
 * Input: is_reading, true while a chapter is open.
 * Returns: {counted: true} when the minute was added, false when one came in the last 45 seconds
 *   or the member isn't counted (staff, the classics account).
 * Errors: 42501 when signed out.
 * Where it fits: src/features/analytics/hooks/useActiveMinutes.ts.
 */
create function public.note_active_minute(is_reading boolean default false)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  today date := (now() at time zone 'Europe/Bucharest')::date;
  previous public.member_last_active;
  is_new_today boolean;
  counts_minute boolean;
begin
  -- Step 1: a signed-in member who counts (staff and the classics account don't).
  if caller_id is null then
    raise exception 'Log in first.' using errcode = '42501';
  end if;
  if not public.counts_for_metrics(caller_id) then
    return jsonb_build_object('counted', false);
  end if;
  -- Step 2: the member's last day, locked so two tabs can't both count the same minute.
  select * into previous from public.member_last_active
  where member_last_active.user_id = caller_id for update;
  is_new_today := previous.user_id is null or previous.active_on < today;
  counts_minute := previous.minute_noted_at is null
    or previous.minute_noted_at < now() - interval '45 seconds';
  if not is_new_today and not counts_minute then
    return jsonb_build_object('counted', false);
  end if;
  -- Step 3: overwrite the one row: today, and now when a minute counts. No history is kept.
  insert into public.member_last_active (user_id, active_on, minute_noted_at)
  values (caller_id, today, now())
  on conflict (user_id) do update set
    active_on = excluded.active_on,
    minute_noted_at = case when counts_minute then excluded.minute_noted_at
                           else member_last_active.minute_noted_at end;
  -- Step 4: the day's totals, which carry no name.
  perform public.add_to_activity_totals(today, is_new_today::integer, counts_minute::integer,
    (counts_minute and coalesce(is_reading, false))::integer);
  return jsonb_build_object('counted', counts_minute);
end;
$$;
comment on function public.note_active_minute(boolean) is
  'The app''s once-a-minute "here": counts the member active today and adds a minute in the app and reading (S1-E15-04).';
revoke execute on function public.note_active_minute(boolean) from public, anon;
grant execute on function public.note_active_minute(boolean) to authenticated;

/* ---------- 5. A chapter read to the end ---------- */

/**
 * save_reading_position: as in S1-E4-03, plus one step (S1-E15-04): the first time a reader
 * reaches 95% of a chapter (the line the Library uses for a finished chapter), the day's finished
 * total for that chapter goes up by one. A writer's own chapters don't count.
 * Inputs, returns and errors as before.
 */
create or replace function public.save_reading_position(
  story_slug text, chapter_code text, read_percent integer, device_kind text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  chapter public.chapters;
  current_shelf public.library_shelf;
  new_shelf public.library_shelf;
  clamped integer := least(100, greatest(0, coalesce(read_percent, 0)));
  furthest_before integer;
  is_owner boolean;
begin
  -- Step 1: signed in, and a chapter this reader may read.
  if caller_id is null then
    raise exception 'Log in to keep your place.' using errcode = 'insufficient_privilege';
  end if;
  if device_kind is null or device_kind not in ('phone', 'tablet', 'computer') then
    raise exception 'Unknown kind of device.' using errcode = 'invalid_parameter_value';
  end if;
  select * into chapter from public.readable_chapter_for(story_slug, chapter_code);
  if not found then
    raise exception 'There is no such chapter.' using errcode = 'no_data_found';
  end if;
  is_owner := exists (select 1 from public.stories
                      where stories.id = chapter.story_id and stories.user_id = caller_id);
  -- Step 2: how far the reader had got before, so a finish counts only once.
  select reading_positions.furthest_percent into furthest_before from public.reading_positions
  where reading_positions.user_id = caller_id and reading_positions.chapter_id = chapter.id;
  -- Step 3: the place, one row per chapter; saving again moves it.
  insert into public.reading_positions (user_id, story_id, chapter_id, percent, device_kind)
  values (caller_id, chapter.story_id, chapter.id, clamped, device_kind)
  on conflict on constraint reading_positions_one_per_chapter
  do update set percent = excluded.percent, device_kind = excluded.device_kind, updated_at = now();
  -- Step 4 (S1-E15-04): a first finish adds one to the day's total, never who finished.
  if clamped >= 95 and coalesce(furthest_before, 0) < 95 and not is_owner then
    insert into public.chapter_finishes as finishes (chapter_id, read_on, total)
    values (chapter.id, (now() at time zone 'Europe/Bucharest')::date, 1)
    on conflict (chapter_id, read_on) do update set total = finishes.total + 1;
  end if;
  -- Step 5: the shelf. A writer's own story never fills their library.
  if is_owner then
    return jsonb_build_object('shelf', null);
  end if;
  select library_entries.shelf into current_shelf from public.library_entries
  where library_entries.user_id = caller_id and library_entries.story_id = chapter.story_id;
  new_shelf := case
    when public.finishes_story(chapter, clamped) and coalesce(current_shelf, 'reading') = 'reading' then 'finished'
    when current_shelf is null or current_shelf = 'saved' then 'reading'
    else current_shelf
  end::public.library_shelf;
  if current_shelf is distinct from new_shelf then
    insert into public.library_entries (user_id, story_id, shelf)
    values (caller_id, chapter.story_id, new_shelf)
    on conflict on constraint library_entries_one_per_story do update set shelf = excluded.shelf;
  end if;
  return jsonb_build_object('shelf', new_shelf);
end;
$$;
comment on function public.save_reading_position(text, text, integer, text) is
  'Keeps the caller''s place in a chapter, files the story on a shelf and counts a first finish (S1-E4-03, S1-E15-04).';

/* ---------- 6. The nightly numbers ---------- */

alter table public.daily_metrics drop constraint daily_metrics_known_metric;
alter table public.daily_metrics add constraint daily_metrics_known_metric check (
  metric in ('writers_published', 'signed_up_readers', 'chapter_reads', 'return_rate',
             'active_members', 'weekly_active_members', 'monthly_active_members', 'sign_ups',
             'stories_read', 'chapters_finished', 'minutes_in_app', 'minutes_reading',
             'writers_publishing', 'retention_day_1', 'retention_day_7', 'retention_day_30'));

/**
 * rolling_retention: of the members who joined on one day, the share who came back on a later
 * day or after it, in per cent.
 * Inputs: joined_on (the Romanian date), after_days (1, 7 or 30).
 * Returns: the per cent, or null when fewer than metrics_minimum_group (5) members joined that
 *   day, so no one person's visits can be read from it.
 * Rule: "came back" means their last day in the app is on or after joined_on + after_days, the
 *   only kind of retention one last-day per member can give (rolling retention).
 * Internal: compute_investor_metrics().
 */
create function public.rolling_retention(joined_on date, after_days integer)
returns numeric
language sql stable security definer set search_path = ''
as $$
  with cohort as (
    select profiles.id from public.profiles
    join auth.users on users.id = profiles.id and users.email_confirmed_at is not null
    where (profiles.created_at at time zone 'Europe/Bucharest')::date = joined_on
      and public.counts_for_metrics(profiles.id)
  )
  select case when count(*) >= coalesce(public.setting_value('metrics_minimum_group') #>> '{}', '5')::integer
    then round(100.0 * count(*) filter (where exists (
      select 1 from public.member_last_active
      where member_last_active.user_id = cohort.id
        and member_last_active.active_on >= joined_on + after_days)) / count(*), 1) end
  from cohort;
$$;
comment on function public.rolling_retention(date, integer) is
  'Internal: the share of one day''s new members who came back after so many days, or null under 5 (S1-E15-04).';
revoke execute on function public.rolling_retention(date, integer) from public, anon, authenticated;

/**
 * day_totals_for_investors: the numbers that can be counted for any day from totals.
 * Input: for_day. Returns: one row per metric and value. Internal: compute_investor_metrics().
 */
create function public.day_totals_for_investors(for_day date)
returns table (metric text, value numeric)
language sql stable security definer set search_path = ''
as $$
  select 'active_members', coalesce((select active_members from public.daily_activity_totals
                                      where activity_on = for_day), 0)::numeric
  union all
  select 'minutes_in_app', coalesce((select minutes_in_app from public.daily_activity_totals
                                      where activity_on = for_day), 0)::numeric
  union all
  select 'minutes_reading', coalesce((select minutes_reading from public.daily_activity_totals
                                       where activity_on = for_day), 0)::numeric
  union all
  select 'sign_ups', (select count(*) from public.profiles
                      join auth.users on users.id = profiles.id and users.email_confirmed_at is not null
                      where (profiles.created_at at time zone 'Europe/Bucharest')::date = for_day
                        and public.counts_for_metrics(profiles.id))::numeric
  union all
  select 'stories_read', (select count(distinct chapters.story_id) from public.chapter_reads
                          join public.chapters on chapters.id = chapter_reads.chapter_id
                          where chapter_reads.read_on = for_day and chapter_reads.total > 0)::numeric
  union all
  select 'chapters_finished', coalesce((select sum(total) from public.chapter_finishes
                                         where read_on = for_day), 0)::numeric
  union all
  select 'writers_publishing', (select count(distinct chapters.user_id) from public.chapters
                                where chapters.status = 'published'
                                  and (chapters.first_published_at at time zone 'Europe/Bucharest')::date = for_day
                                  and public.counts_for_metrics(chapters.user_id))::numeric;
$$;
comment on function public.day_totals_for_investors(date) is
  'Internal: one day''s investor totals that can be counted at any time (S1-E15-04).';
revoke execute on function public.day_totals_for_investors(date) from public, anon, authenticated;

/**
 * compute_investor_metrics: stores one day's investor numbers in daily_metrics.
 * Input: for_day, the Romanian date. Returns how many numbers were stored.
 * Rules: the weekly and monthly counts and retention read each member's last day, which only
 *   says what is true now, so they are stored only when counting yesterday (the nightly run);
 *   a re-count of an older day keeps them as they were. Old last-day rows (35 days), activity
 *   totals (3 years, like daily_metrics) and finish totals (the ranking window plus 7 days, as
 *   daily_metrics keeps the day's sum) are deleted here.
 * Internal: compute_daily_metrics().
 */
create function public.compute_investor_metrics(for_day date)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Bucharest')::date;
  stored integer;
  nightly_stored integer;
begin
  -- Step 1: the totals that can be counted for any day.
  insert into public.daily_metrics (metric_date, metric, value)
  select for_day, totals.metric, totals.value from public.day_totals_for_investors(for_day) as totals
  on conflict (metric_date, metric, market) do update set value = excluded.value;
  get diagnostics stored = row_count;
  -- Step 2: the counts that read each member's last day, only on the nightly run for yesterday.
  if for_day = today - 1 then
    insert into public.daily_metrics (metric_date, metric, value)
    select for_day, counted.metric, counted.value
    from (values
      ('weekly_active_members', (select count(*) from public.member_last_active
                                 where active_on > for_day - 7)::numeric),
      ('monthly_active_members', (select count(*) from public.member_last_active
                                  where active_on > for_day - 30)::numeric),
      ('retention_day_1', public.rolling_retention(for_day - 1, 1)),
      ('retention_day_7', public.rolling_retention(for_day - 7, 7)),
      ('retention_day_30', public.rolling_retention(for_day - 30, 30))
    ) as counted (metric, value)
    where counted.value is not null
    on conflict (metric_date, metric, market) do update set value = excluded.value;
    get diagnostics nightly_stored = row_count;
    stored := stored + nightly_stored;
  end if;
  -- Step 3: delete what is no longer needed (docs/retention.md).
  delete from public.member_last_active
  where active_on < today - coalesce(public.setting_value('member_last_active_keep_days') #>> '{}', '35')::integer;
  delete from public.daily_activity_totals
  where activity_on < today - make_interval(years => coalesce(
    public.setting_value('daily_metrics_keep_years') #>> '{}', '3')::integer);
  delete from public.chapter_finishes
  where read_on < today - (public.ranking_setting('ranking_window_days', 60)::integer + 7);
  return stored;
end;
$$;
comment on function public.compute_investor_metrics(date) is
  'Internal: stores one day''s investor numbers and deletes old last-day rows and totals (S1-E15-04).';
revoke execute on function public.compute_investor_metrics(date) from public, anon, authenticated;

/**
 * compute_daily_metrics: as in S1-E15-02, with the investor numbers (S1-E15-04) stored after the
 * March numbers. Step 1 now keeps the weekly and monthly counts and retention of an older day,
 * because they can't be counted again later.
 * Input: for_day, the Romanian date to count (yesterday when null). Returns how many numbers were stored.
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
  -- Step 1: forget the day's earlier numbers, except those that only the night itself can count.
  delete from public.daily_metrics where metric_date = counted_day
    and metric not in ('weekly_active_members', 'monthly_active_members',
                       'retention_day_1', 'retention_day_7', 'retention_day_30');

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

  -- Step 5 (S1-E15-04): the investor numbers.
  perform public.compute_investor_metrics(counted_day);

  -- Step 6: aggregated numbers are kept three years (decided 17 Oct 2026, 12:34).
  delete from public.daily_metrics
  where metric_date < (now() at time zone 'Europe/Bucharest')::date - make_interval(years => keep_years);

  select count(*)::integer into stored from public.daily_metrics where metric_date = counted_day;
  return stored;
end;
$$;
comment on function public.compute_daily_metrics(date) is
  'Counts one day''s March test and investor numbers and deletes those older than 3 years (S1-E15-02, S1-E15-04).';

/* ---------- 7. What the staff page reads ---------- */

/**
 * investor_months: the month-by-month table.
 * Input: how many months back (1 to 36). Returns: one JSON object per month, oldest first.
 * Rules: stories read and writers publishing are counted for the whole month (a story read on two
 *   days counts once); the other sums come from daily_metrics; the monthly active count and
 *   retention are the month's last night's count and the month's average.
 * Internal: admin_investor_numbers().
 */
create function public.investor_months(months integer)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  with month_list as (
    select month_start::date as month_start, (month_start + interval '1 month')::date as month_end
    from generate_series(
      date_trunc('month', (now() at time zone 'Europe/Bucharest')::date) - make_interval(months => months - 1),
      date_trunc('month', (now() at time zone 'Europe/Bucharest')::date), interval '1 month') as month_start
  ),
  sums as (
    select month_list.month_start,
      sum(value) filter (where metric = 'sign_ups') as sign_ups,
      round(avg(value) filter (where metric = 'active_members'), 1) as average_daily_active,
      sum(value) filter (where metric = 'chapter_reads' and market = 'all') as chapter_reads,
      sum(value) filter (where metric = 'chapters_finished') as chapters_finished,
      sum(value) filter (where metric = 'minutes_in_app') as minutes_in_app,
      sum(value) filter (where metric = 'minutes_reading') as minutes_reading,
      round(avg(value) filter (where metric = 'retention_day_1'), 1) as retention_day_1,
      round(avg(value) filter (where metric = 'retention_day_7'), 1) as retention_day_7,
      round(avg(value) filter (where metric = 'retention_day_30'), 1) as retention_day_30,
      (array_agg(value order by metric_date desc) filter (where metric = 'monthly_active_members'))[1]
        as monthly_active
    from month_list
    left join public.daily_metrics on metric_date >= month_list.month_start
      and metric_date < month_list.month_end
    group by month_list.month_start
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'month', to_char(sums.month_start, 'YYYY-MM'),
    'sign_ups', coalesce(sums.sign_ups, 0),
    'average_daily_active', sums.average_daily_active,
    'monthly_active', sums.monthly_active,
    'stories_read', (select count(distinct chapters.story_id) from public.chapter_reads
                     join public.chapters on chapters.id = chapter_reads.chapter_id
                     where chapter_reads.read_on >= sums.month_start
                       and chapter_reads.read_on < (sums.month_start + interval '1 month')::date
                       and chapter_reads.total > 0),
    'chapter_reads', coalesce(sums.chapter_reads, 0),
    'chapters_finished', coalesce(sums.chapters_finished, 0),
    'finish_rate', case when coalesce(sums.chapter_reads, 0) > 0
                        then round(100.0 * coalesce(sums.chapters_finished, 0) / sums.chapter_reads, 1) end,
    'minutes_in_app', coalesce(sums.minutes_in_app, 0),
    'minutes_reading', coalesce(sums.minutes_reading, 0),
    'writers_publishing', (select count(distinct chapters.user_id) from public.chapters
                           where chapters.status = 'published'
                             and (chapters.first_published_at at time zone 'Europe/Bucharest')::date >= sums.month_start
                             and (chapters.first_published_at at time zone 'Europe/Bucharest')::date
                                 < (sums.month_start + interval '1 month')::date
                             and public.counts_for_metrics(chapters.user_id)),
    'retention_day_1', sums.retention_day_1,
    'retention_day_7', sums.retention_day_7,
    'retention_day_30', sums.retention_day_30) order by sums.month_start), '[]'::jsonb)
  from sums;
$$;
comment on function public.investor_months(integer) is
  'Internal: the investor numbers month by month, oldest first (S1-E15-04).';
revoke execute on function public.investor_months(integer) from public, anon, authenticated;

/**
 * admin_investor_numbers: the investor section of the staff Metrics page.
 * Input: months, how many months the table shows (1 to 36, default 12).
 * Returns: {counted_on, latest: {...the last night's numbers}, months: [...], days: [...]} where
 *   days holds every stored investor number for the last 366 days, for the spreadsheet.
 * Errors: 42501 with hint not_allowed for anyone but the owner and admins in a staff session.
 */
create function public.admin_investor_numbers(months integer default 12)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  listed_months integer := least(greatest(coalesce(months, 12), 1), 36);
  counted_on date;
begin
  -- Step 1: owner and admins only (architecture 1.8.3), as the March numbers.
  if not public.may_see_march_numbers() then
    raise exception 'Only the owner and admins can see the investor numbers.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: the latest night counted.
  select max(metric_date) into counted_on from public.daily_metrics where metric = 'active_members';
  -- Step 3: the latest numbers, the months and the days.
  return jsonb_build_object(
    'counted_on', counted_on,
    'latest', jsonb_build_object(
      'active_members', public.metric_on(counted_on, 'active_members'),
      'weekly_active_members', public.metric_on(counted_on, 'weekly_active_members'),
      'monthly_active_members', public.metric_on(counted_on, 'monthly_active_members'),
      'retention_day_1', public.metric_on(counted_on, 'retention_day_1'),
      'retention_day_7', public.metric_on(counted_on, 'retention_day_7'),
      'retention_day_30', public.metric_on(counted_on, 'retention_day_30')),
    'months', public.investor_months(listed_months),
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('day', metric_date, 'metric', metric, 'value', value)
                       order by metric_date, metric)
      from public.daily_metrics
      where market = 'all' and metric <> 'writers_published'
        and metric_date > coalesce(counted_on, current_date) - 366), '[]'::jsonb));
end;
$$;
comment on function public.admin_investor_numbers(integer) is
  'The staff Metrics page''s investor numbers: latest, by month and by day, totals only, for the owner and admins (S1-E15-04).';
revoke execute on function public.admin_investor_numbers(integer) from public, anon;
grant execute on function public.admin_investor_numbers(integer) to authenticated;
