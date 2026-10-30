/*
 * Migration: the seasonal doodle schedule (stories S1-E11-11 and S1-E5-07; architecture B30).
 *
 * What it adds:
 *   seasonal_doodle                  the approved seasonal doodles, one value per SVG file shipped
 *                                    in src/assets/doodles/ (S1-E11-11: new doodles arrive as SVG
 *                                    files in a normal release, never as uploads, so a new one is a
 *                                    new value in a new migration)
 *   seasonal_occasions               the schedule: a name in Romanian and English, a date range
 *                                    (once or every year), the doodle, and where it shows
 *                                    (Discover's greeting, Search's popular tags, or both)
 *   current_seasonal_doodle()        the public read: today's doodle for one place
 *   admin_save_occasion(), admin_remove_occasion()
 *                                    the staff writes; owner and admin only (area website_cms),
 *                                    each logged in the audit log in the same transaction
 *
 * The rules (S1-E11-11 acceptance criteria):
 *   - when two occasions overlap, the shorter one wins;
 *   - a season's default doodle covers the days with no occasion;
 *   - a change applies at once: the app asks again at most a minute later.
 * The date is the reader's own device date, sent by the app (S1-E5-07: no location is used).
 *
 * Choices for the story's OPEN points (proposal, 30 Oct 2026, builder): occasions are the same in
 * every market for now (Romania is the only open one), and the website home page doesn't show
 * them yet; both are follow-ups. No religious or political occasion is seeded (story's legal note).
 */

/* ---------- The approved doodles ---------- */

create type public.seasonal_doodle as enum (
  'autumn_leaf',
  'bee',
  'butterfly',
  'candle',
  'cherry_blossom',
  'daisy',
  'friendly_ghost',
  'hot_air_balloon',
  'hot_chocolate',
  'jack_o_lantern',
  'kite',
  'mushroom',
  'rain_cloud',
  'sunny_face'
);

comment on type public.seasonal_doodle is
  'The seasonal doodles shipped with the app as SVG files (S1-E11-11). Add a value with its file in a release.';

/* ---------- The table ---------- */

create table public.seasonal_occasions (
  id uuid primary key default gen_random_uuid(),
  -- What staff call it, in both languages; never shown to readers (the doodle is decorative).
  name_ro text not null,
  name_en text not null,
  -- The first and last day it shows. For an occasion that comes back every year only the month
  -- and day count; a range over New Year ends in the next year (1 Dec to 29 Feb).
  starts_on date not null,
  ends_on date not null,
  every_year boolean not null default true,
  doodle public.seasonal_doodle not null,
  -- discover: by the Discover greeting; search: by Search's popular tags; both.
  shows_on text not null default 'both',
  -- A season's default doodle, shown on days with no occasion (S1-E11-11 criterion 3).
  is_season_default boolean not null default false,
  -- The admin who saved it last; null for the seeded schedule.
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint seasonal_occasions_place_is_known check (shows_on in ('discover', 'search', 'both')),
  constraint seasonal_occasions_names_fit check (
    length(btrim(name_ro)) between 1 and 60 and length(btrim(name_en)) between 1 and 60
  ),
  constraint seasonal_occasions_dates_in_order check (ends_on >= starts_on),
  constraint seasonal_occasions_yearly_fits_a_year check (not every_year or ends_on - starts_on < 366)
);

comment on table public.seasonal_occasions is
  'kind: platform
The seasonal doodle schedule (S1-E11-11, S1-E5-07). Staff-written settings, not user content; user_id is the admin who saved it.';

create trigger seasonal_occasions_set_updated_at
  before update on public.seasonal_occasions
  for each row execute function public.set_updated_at();

alter table public.seasonal_occasions enable row level security;

create policy seasonal_occasions_select_admin
  on public.seasonal_occasions for select to authenticated
  using ((select public.staff_may('website_cms', 'view')));

comment on policy seasonal_occasions_select_admin on public.seasonal_occasions is
  'Allows owner and admin, in a staff session, to read the schedule for the year view (S1-E11-11). Readers get only today''s doodle through current_seasonal_doodle().';

grant select on public.seasonal_occasions to authenticated;  -- seasonal_occasions_select_admin

/* ---------- Reading the schedule ---------- */

/**
 * occasion_covers: true when an occasion shows on a day. Internal.
 * Inputs: the occasion's dates and every_year, and the day.
 * Returns: for a one-off occasion, whether the day is in the range; for a yearly one, whether the
 *   day's month and day are, wrapping over New Year when the range does.
 */
create or replace function public.occasion_covers(
  starts_on date, ends_on date, every_year boolean, on_date date
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- Month and day as one number (14 February is 214), so 29 February needs no special case.
  with day_numbers as (
    select
      extract(month from starts_on)::int * 100 + extract(day from starts_on)::int as first_day,
      extract(month from ends_on)::int * 100 + extract(day from ends_on)::int as last_day,
      extract(month from on_date)::int * 100 + extract(day from on_date)::int as this_day
  )
  select case
    when not every_year then on_date between starts_on and ends_on
    -- A yearly range inside one year: 25 October to 1 November.
    when extract(year from ends_on) = extract(year from starts_on)
      then this_day between first_day and last_day
    -- A yearly range over New Year: 1 December to 29 February.
    else this_day >= first_day or this_day <= last_day
  end
  from day_numbers;
$$;

comment on function public.occasion_covers(date, date, boolean, date) is
  'Internal: whether an occasion shows on a day, yearly ranges wrapping over New Year (S1-E11-11).';

/**
 * current_seasonal_doodle: the doodle a place shows on a day (S1-E5-07 criteria 1 to 3).
 * Inputs: on_date, the reader's own date (S1-E5-07: the device's date, never a location);
 *   place, 'discover' or 'search'.
 * Returns: one row with the doodle, or none when nothing covers the day.
 * Rules (S1-E11-11 criterion 3): an occasion beats a season default; between two occasions the
 *   shorter wins; on a tie, the one saved last.
 * Where it fits: useSeasonalDoodle() in src/features/seasonal/, for visitors and members alike.
 */
create or replace function public.current_seasonal_doodle(on_date date, place text)
returns table (doodle public.seasonal_doodle)
language sql
stable
security definer
set search_path = ''
as $$
  select occasion.doodle
  from public.seasonal_occasions as occasion
  where occasion.deleted_at is null
    and occasion.shows_on in (place, 'both')
    and public.occasion_covers(occasion.starts_on, occasion.ends_on, occasion.every_year, on_date)
  order by occasion.is_season_default, occasion.ends_on - occasion.starts_on, occasion.updated_at desc
  limit 1;
$$;

comment on function public.current_seasonal_doodle(date, text) is
  'The seasonal doodle Discover or Search shows on a day (S1-E5-07, S1-E11-11).';
revoke execute on function public.current_seasonal_doodle(date, text) from public;
grant execute on function public.current_seasonal_doodle(date, text) to anon, authenticated;

/* ---------- The staff writes ---------- */

/**
 * seasonal_occasion_problems: what stops an occasion from being saved. Internal.
 * Inputs: the names, the dates, every_year and the place.
 * Returns: the problems as "field:reason" words (empty when it can be saved).
 */
create or replace function public.seasonal_occasion_problems(
  name_ro text, name_en text, starts_on date, ends_on date, every_year boolean, shows_on text
)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array_remove(array[
    case when coalesce(btrim(name_ro), '') = '' then 'nameRo:empty' end,
    case when length(btrim(name_ro)) > 60 then 'nameRo:too_long' end,
    case when coalesce(btrim(name_en), '') = '' then 'nameEn:empty' end,
    case when length(btrim(name_en)) > 60 then 'nameEn:too_long' end,
    case when starts_on is null then 'startsOn:empty' end,
    case when ends_on is null then 'endsOn:empty' end,
    case when ends_on < starts_on then 'endsOn:before_start' end,
    case when every_year and ends_on - starts_on >= 366 then 'endsOn:longer_than_a_year' end,
    case when shows_on not in ('discover', 'search', 'both') then 'showsOn:unknown' end
  ], null);
$$;

comment on function public.seasonal_occasion_problems(text, text, date, date, boolean, text) is
  'Internal: what stops a seasonal occasion from being saved (S1-E11-11).';

/**
 * admin_save_occasion: adds an occasion, or changes one (S1-E11-11 criteria 1, 2 and 5). It
 * applies at once; the app asks again within a minute.
 * Inputs: the names in Romanian and English, starts_on, ends_on, every_year, the doodle (one of
 *   the approved set), shows_on, is_season_default, and occasion_id (left out to add one).
 * Returns: the occasion's id.
 * Errors: insufficient_privilege unless owner or admin; check_violation with the problems as the
 *   hint ("endsOn:before_start"); no_data_found when the occasion to change doesn't exist.
 * Logged as seasonal.saved with the before and after values.
 */
create or replace function public.admin_save_occasion(
  name_ro text, name_en text, starts_on date, ends_on date, every_year boolean,
  doodle public.seasonal_doodle, shows_on text, is_season_default boolean, occasion_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  problems text[] := public.seasonal_occasion_problems(name_ro, name_en, starts_on, ends_on, every_year, shows_on);
  before_row public.seasonal_occasions;
  saved_id uuid;
begin
  perform public.require_website_staff();
  -- Step 1: refuse a broken occasion, naming every field to fix.
  if cardinality(problems) > 0 then
    raise exception 'Fix this occasion before saving.' using errcode = 'check_violation', hint = array_to_string(problems, ',');
  end if;
  -- Step 2: change the one asked for, or add a new one.
  if occasion_id is not null then
    select * into before_row from public.seasonal_occasions as occasion
    where occasion.id = occasion_id and occasion.deleted_at is null for update;
    if before_row.id is null then
      raise exception 'There is no occasion with that id.' using errcode = 'no_data_found';
    end if;
    update public.seasonal_occasions as occasion
    set name_ro = btrim(admin_save_occasion.name_ro), name_en = btrim(admin_save_occasion.name_en),
        starts_on = admin_save_occasion.starts_on, ends_on = admin_save_occasion.ends_on,
        every_year = admin_save_occasion.every_year, doodle = admin_save_occasion.doodle,
        shows_on = admin_save_occasion.shows_on, is_season_default = admin_save_occasion.is_season_default,
        user_id = (select auth.uid())
    where occasion.id = occasion_id
    returning occasion.id into saved_id;
  else
    insert into public.seasonal_occasions
      (name_ro, name_en, starts_on, ends_on, every_year, doodle, shows_on, is_season_default, user_id)
    values (btrim(name_ro), btrim(name_en), starts_on, ends_on, every_year, doodle, shows_on,
      is_season_default, (select auth.uid()))
    returning id into saved_id;
  end if;
  -- Step 3: the audit log, with what it was and what it is now.
  perform public.log_staff_action('seasonal.saved', 'seasonal_occasions', saved_id::text, null, null,
    case when before_row.id is null then null else to_jsonb(before_row) - 'user_id' end,
    (select to_jsonb(occasion) - 'user_id' from public.seasonal_occasions as occasion where occasion.id = saved_id));
  return saved_id;
end;
$$;

comment on function public.admin_save_occasion(text, text, date, date, boolean, public.seasonal_doodle, text, boolean, uuid) is
  'Adds or changes a seasonal occasion; owner and admin only; logged (S1-E11-11).';
revoke execute on function public.admin_save_occasion(text, text, date, date, boolean, public.seasonal_doodle, text, boolean, uuid) from public, anon;
grant execute on function public.admin_save_occasion(text, text, date, date, boolean, public.seasonal_doodle, text, boolean, uuid) to authenticated;

/**
 * admin_remove_occasion: takes an occasion off the schedule (S1-E11-11 criterion 5). The row is
 * kept with deleted_at, so the audit log still points at it.
 * Inputs: occasion_id. Returns: nothing.
 * Errors: insufficient_privilege; no_data_found when there is no such occasion.
 * Logged as seasonal.removed with what was removed.
 */
create or replace function public.admin_remove_occasion(occasion_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed public.seasonal_occasions;
begin
  perform public.require_website_staff();
  update public.seasonal_occasions as occasion
  set deleted_at = now(), user_id = (select auth.uid())
  where occasion.id = occasion_id and occasion.deleted_at is null
  returning * into removed;
  if removed.id is null then
    raise exception 'There is no occasion with that id.' using errcode = 'no_data_found';
  end if;
  perform public.log_staff_action('seasonal.removed', 'seasonal_occasions', removed.id::text, null, null,
    to_jsonb(removed) - 'user_id', null);
end;
$$;

comment on function public.admin_remove_occasion(uuid) is
  'Takes a seasonal occasion off the schedule; owner and admin only; logged (S1-E11-11).';
revoke execute on function public.admin_remove_occasion(uuid) from public, anon;
grant execute on function public.admin_remove_occasion(uuid) to authenticated;

/* ---------- The first schedule ---------- */

-- The four seasons cover every day; two occasions sit on top (proposal, editable by admins).
-- Years only mark the shape of a yearly range: winter ends in the next year, on 29 February so a
-- leap year is covered too.
insert into public.seasonal_occasions
  (name_ro, name_en, starts_on, ends_on, every_year, doodle, shows_on, is_season_default)
values
  ('Primăvara', 'Spring', '2027-03-01', '2027-05-31', true, 'cherry_blossom', 'both', true),
  ('Vara', 'Summer', '2027-06-01', '2027-08-31', true, 'sunny_face', 'both', true),
  ('Toamna', 'Autumn', '2027-09-01', '2027-11-30', true, 'autumn_leaf', 'both', true),
  ('Iarna', 'Winter', '2027-12-01', '2028-02-29', true, 'hot_chocolate', 'both', true),
  ('Ziua Copilului', 'Children''s Day', '2027-06-01', '2027-06-01', true, 'kite', 'both', false),
  ('Halloween', 'Halloween', '2027-10-25', '2027-10-31', true, 'jack_o_lantern', 'both', false);
