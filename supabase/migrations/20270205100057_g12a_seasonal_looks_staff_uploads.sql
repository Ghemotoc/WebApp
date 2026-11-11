/*
 * G12a: the Seasonal looks page in Staff › Website, and staff uploads that skip the moderator
 * step (bundle G12 of the liquid glass rebuild; the canvas's StaffWebsiteSeasonal board).
 *
 * What it adds:
 * - admin_set_seasonal_look_dates(): the owner and admins change when each of the four seasonal
 *   looks (winter, spring, summer, autumn) shows. The setting seasonal_look_dates (bundle G2) is a
 *   list of objects, which the general admin_set_setting() refuses (it only takes lists of words
 *   and numbers), so this function checks the shape itself: each look once, real month-days, and
 *   no day in two windows. Logged like every staff change.
 * - picture_needs_person(): pictures that staff upload for the website (landing page pictures and
 *   the brand assets) no longer wait for a picture reviewer (Robert, build plan G12: "staff
 *   uploads skip the moderator step; Arachnid still runs"). The automatic checks still run on
 *   every one of them, and a picture they flag is still held for a person. Sponsor creatives keep
 *   the person: the sponsor made them, not staff (S1-E12-02 review step).
 *
 * Who calls it: src/features/website/api/seasonalLooks.ts (the new page);
 * picture_needs_person() is called by the picture check's result function, unchanged.
 */

/* ---------- When each seasonal look shows ---------- */

/**
 * seasonal_window_problem: says what is wrong with a proposed set of seasonal windows, or null.
 * Input: windows, a JSON list of {look, from, to} with month-days such as "01-08".
 * Returns: a reason word the page can word: not_a_list, wrong_looks, bad_day or overlap.
 * Where it fits: admin_set_seasonal_look_dates() calls it before saving.
 */
create or replace function public.seasonal_window_problem(windows jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  shown_looks text[];
begin
  -- Step 1: a list of exactly four objects.
  if windows is null or jsonb_typeof(windows) <> 'array' or jsonb_array_length(windows) <> 4 then
    return 'not_a_list';
  end if;
  if exists (select 1 from jsonb_array_elements(windows) as item where jsonb_typeof(item) <> 'object') then
    return 'not_a_list';
  end if;
  -- Step 2: each of the four seasonal looks exactly once.
  select array_agg(item ->> 'look' order by item ->> 'look') into shown_looks
  from jsonb_array_elements(windows) as item;
  if shown_looks is distinct from array['autumn', 'spring', 'summer', 'winter'] then
    return 'wrong_looks';
  end if;
  -- Step 3: every first and last day is a real day of the year (29 February included).
  if exists (
    select 1 from jsonb_array_elements(windows) as item
    cross join lateral (values (item ->> 'from'), (item ->> 'to')) as day (month_day)
    where day.month_day is null
       or day.month_day not in (
         select to_char(calendar_day, 'MM-DD')
         from generate_series(date '2000-01-01', date '2000-12-31', interval '1 day') as calendar_day)) then
    return 'bad_day';
  end if;
  -- Step 4: no day of the year falls inside two windows. A window whose first day comes after its
  -- last (for example 12-15 to 01-06) crosses the new year, as src/lib/looks.ts reads it.
  if exists (
    select 1
    from generate_series(date '2000-01-01', date '2000-12-31', interval '1 day') as calendar_day
    cross join lateral (select to_char(calendar_day, 'MM-DD') as month_day) as today
    where (select count(*) from jsonb_array_elements(windows) as item
           where case when item ->> 'from' <= item ->> 'to'
                      then today.month_day between item ->> 'from' and item ->> 'to'
                      else today.month_day >= item ->> 'from' or today.month_day <= item ->> 'to' end) > 1) then
    return 'overlap';
  end if;
  return null;
end;
$$;

comment on function public.seasonal_window_problem(jsonb) is
  'Internal: a reason word when a set of seasonal windows can''t be saved, or null (bundle G12a).';

revoke execute on function public.seasonal_window_problem(jsonb) from public, anon, authenticated;

/**
 * admin_set_seasonal_look_dates: changes when each seasonal look shows.
 * Input: new_windows, the four windows as JSON ({look, from, to}).
 * Returns: the saved windows.
 * Errors: insufficient_privilege for anyone but the owner and admins (require_website_staff);
 *   check_violation with a hint (not_a_list, wrong_looks, bad_day, overlap) for a bad set.
 * Where it fits: Staff › Website › Seasonal looks saves through it; members' devices read the
 * public setting through get_client_config() as before.
 */
create or replace function public.admin_set_seasonal_look_dates(new_windows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_value jsonb;
  clean_windows jsonb;
  problem text := public.seasonal_window_problem(new_windows);
begin
  -- Step 1: the owner and admins only (decided 17 Oct 2026, 19:19: website content is admin-only).
  perform public.require_website_staff();
  -- Step 2: the shape the members' devices read.
  if problem is not null then
    raise exception 'These dates can''t be saved (%).', problem using errcode = 'check_violation', hint = problem;
  end if;
  -- Step 3: keep only the three known parts of each window, in the order given, so nothing else
  -- rides along into a public setting every device reads.
  select jsonb_agg(jsonb_build_object('look', item ->> 'look', 'from', item ->> 'from', 'to', item ->> 'to')
                   order by position)
  into clean_windows
  from jsonb_array_elements(new_windows) with ordinality as entry (item, position);
  -- Step 4: the change and its log line, with the old value for the audit log.
  select value into old_value from public.settings where key = 'seasonal_look_dates' for update;
  update public.settings set value = clean_windows where key = 'seasonal_look_dates';
  perform public.log_staff_action('website.seasonal_looks', 'settings', 'seasonal_look_dates', null, null,
    jsonb_build_object('value', old_value), jsonb_build_object('value', clean_windows));
  return clean_windows;
end;
$$;

comment on function public.admin_set_seasonal_look_dates(jsonb) is
  'Changes when each seasonal look shows; owner and admin only; logged (bundle G12a).';

revoke execute on function public.admin_set_seasonal_look_dates(jsonb) from public, anon;
grant execute on function public.admin_set_seasonal_look_dates(jsonb) to authenticated;

update public.settings
set description = 'When each seasonal look shows, for members who turned Seasonal themes on (canvas "Website themes", 7 Nov 2026). Month-day, inclusive; edited in Staff › Website › Seasonal looks (admin_set_seasonal_look_dates, bundle G12a).'
where key = 'seasonal_look_dates';

/* ---------- Staff uploads skip the moderator step ---------- */

/**
 * picture_needs_person: true when a picture reviewer must approve the picture before anyone else
 * sees it, even after the automatic checks passed.
 * Input: picture, the picture_checks row.
 * Returns: true for uploaders under 16, pictures on All ages and 13+ stories, and sponsor
 *   creatives; false for everything else, including the website pictures staff upload (landing
 *   page pictures and brand assets), which only the owner and admins can upload.
 * Where it fits: the picture check's result function holds a passed picture when this is true.
 */
create or replace function public.picture_needs_person(picture public.picture_checks)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.age_band_of(picture.user_id) in ('under_13', '13_to_15')
    or picture.kind = 'sponsor_creative'
    or exists (select 1 from public.stories
               where stories.id = picture.story_id and stories.rating in ('all_ages', '13_plus'));
$$;

comment on function public.picture_needs_person(public.picture_checks) is
  'Internal: true when a moderator must approve the picture first: All ages or 13+ stories, uploaders under 16 and sponsor creatives; staff website uploads skip it (ADMIN-2e1b, G12a).';

revoke all on function public.picture_needs_person(public.picture_checks) from public;
