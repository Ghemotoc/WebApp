/*
 * Migration: a class competition starts and ends at a moment, not on a day (bundle CALM-7d,
 * part 3; story S1-E8-15; DESIGN, 21 Nov 2026, approved by Robert: "Class competition start/end
 * -> DateTimeField (date, time, zone, member local)"). Builds on CLASS-POINTS part 2
 * (20270205100228_classpoints2_02_class_competitions.sql).
 *
 * Why: the teacher now picks a date and a time on their own clock (the shared DateTimeField,
 * CALM-1c), and every member reads both moments on theirs.
 * What it changes:
 * - class_competitions.starts_at and ends_at (timestamptz). Competitions already saved start at
 *   00:00 on their first day and end at 23:59 on their last, in the class points time zone.
 * - starts_on and ends_on stay: a trigger (class_competitions_set_days) keeps them as the days of
 *   the two moments, so the class points of those days (made_on), the last day and the
 *   certificates work as before.
 * - class_competition_phase(): 'upcoming' before starts_at, 'judging' from ends_at (or once the
 *   teacher ended it), otherwise 'open'.
 * - save_class_competition() takes details {name, starts_at, ends_at, criteria}: the end after the
 *   start and before the class locks, and a new one starting today or later (hint
 *   competition:dates, as before).
 * - class_competition_running_json() also answers 'starts_at' and 'ends_at'.
 * Who calls it: src/features/class-competitions/ (CompetitionFormPage, ClassCompetitionCard).
 * Tests: supabase/tests/database/379-class-competitions.test.sql (with 380 and 381).
 */

/* ---------- 1. The moments ---------- */

-- Step 1: the two columns, filled from the days already saved (start of the first day, end of the
-- last), in the time zone class weeks are counted in.
alter table public.class_competitions add column starts_at timestamptz, add column ends_at timestamptz;
update public.class_competitions
  set starts_at = (starts_on + time '00:00') at time zone
        coalesce(public.setting_value('class_points_timezone') #>> '{}', 'Europe/Bucharest'),
      ends_at = (ends_on + time '23:59') at time zone
        coalesce(public.setting_value('class_points_timezone') #>> '{}', 'Europe/Bucharest');
alter table public.class_competitions
  alter column starts_at set not null,
  alter column ends_at set not null,
  add constraint class_competitions_moments_in_order check (ends_at > starts_at);
comment on column public.class_competitions.starts_at is
  'The moment the competition opens; starts_on is its day (CALM-7d).';
comment on column public.class_competitions.ends_at is
  'The moment the competition closes for judging; ends_on is its day (CALM-7d).';

/*
 * class_competitions_set_days(): keeps starts_on and ends_on as the days of starts_at and ends_at,
 * in the class points time zone, so everything counted by day (the class points made_on, the last
 * day, the certificates) reads the competition as before. Inputs: the row being saved. Returns the
 * row. Raises nothing. Called by the trigger class_competitions_set_days on every insert, and on
 * every update that changes a moment.
 */
create function public.class_competitions_set_days()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  class_zone text := coalesce(public.setting_value('class_points_timezone') #>> '{}', 'Europe/Bucharest');
begin
  new.starts_on := (new.starts_at at time zone class_zone)::date;
  new.ends_on := (new.ends_at at time zone class_zone)::date;
  return new;
end;
$$;
comment on function public.class_competitions_set_days() is
  'Trigger: keeps a class competition''s days in step with its moments (CALM-7d).';
revoke execute on function public.class_competitions_set_days() from public, anon, authenticated;
create trigger class_competitions_set_days
  before insert or update of starts_at, ends_at on public.class_competitions
  for each row execute function public.class_competitions_set_days();

/* ---------- 2. Where a competition stands ---------- */

/**
 * class_competition_phase: where a competition stands.
 * Input: target, the competition.
 * Returns: 'published' once the results are confirmed; 'judging' from its end moment or once the
 *   teacher ended it; 'upcoming' before its start moment; otherwise 'open'.
 * Errors: none. Internal.
 */
create or replace function public.class_competition_phase(target public.class_competitions)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when target.published_at is not null then 'published'
    when target.ended_at is not null or now() >= target.ends_at then 'judging'
    when now() < target.starts_at then 'upcoming'
    else 'open' end;
$$;

/* ---------- 3. What the class page reads ---------- */

-- class_competition_running_json(): unchanged except that it also answers the two moments.
create or replace function public.class_competition_running_json(competition public.class_competitions, space public.spaces, is_teacher boolean)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  phase text := public.class_competition_phase(competition);
  entrant_count integer;
  is_entrant boolean;
  may_take_part boolean;
begin
  select count(*), coalesce(bool_or(entrants.user_id = caller_id), false) into entrant_count, is_entrant
  from public.class_competition_entrants as entrants where entrants.competition_id = competition.id;
  -- A pupil joins or leaves before the end, in a class that is still open, as a full member.
  may_take_part := not is_teacher and phase in ('upcoming', 'open')
    and not public.space_is_locked(space) and public.is_active_member();
  return jsonb_build_object(
    'id', competition.id, 'name', competition.name,
    'starts_on', competition.starts_on, 'ends_on', competition.ends_on,
    -- CALM-7d: the moments, which members read on their own clock.
    'starts_at', competition.starts_at, 'ends_at', competition.ends_at, 'phase', phase,
    'criteria', public.class_competition_criteria_json(competition.id),
    'is_entrant', case when not is_teacher then is_entrant end,
    'can_join', may_take_part and not is_entrant,
    'can_leave', may_take_part and is_entrant,
    'entrant_count', case when is_teacher then entrant_count end,
    'can_edit', is_teacher and (phase = 'upcoming' or (phase = 'open' and entrant_count = 0)),
    'can_end', is_teacher and phase = 'open',
    'can_score', is_teacher and phase = 'judging');
end;
$$;

/* ---------- 4. The teacher saves a competition ---------- */

/**
 * save_class_competition: the teacher starts a class competition, or changes one nobody joined.
 * Inputs: slug, the class's address; details, JSON {name, starts_at, ends_at, criteria} with the
 *   moments as ISO text (CALM-7d) and criteria as check_class_criteria() takes them;
 *   target_competition_id, the competition to change, or null for a new one.
 * Returns: class_competitions() after the change.
 * Errors: as space_for_power(); insufficient_privilege with hint 'competition:not_teacher' for
 *   anyone but the class's teacher; check_violation with hint 'space:not_class',
 *   'space:archived', 'competition:grade' (the class has no school year yet), 'competition:name',
 *   'competition:dates' (not real moments, the end not after the start, a new one starting
 *   before today, or an end at or after the moment the class locks), 'competition:exists' (one is
 *   still running), 'competition:started' (it has entrants or is over, so it can't change) or any
 *   'criteria:…' hint; no_data_found with hint 'competition:missing'.
 * Where it fits: the competition form. Written to the class's log.
 */
create or replace function public.save_class_competition(slug text, details jsonb, target_competition_id uuid default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(slug, 'settings');
  caller_id uuid := (select auth.uid());
  clean_name text;
  clean_criteria jsonb;
  first_moment timestamptz;
  last_moment timestamptz;
  existing public.class_competitions;
  saved_id uuid;
begin
  -- Step 1: a live class with a school year, and only its own teacher.
  perform public.check_certificate_class(space);
  if space.user_id is distinct from caller_id then
    raise exception 'Only the class''s teacher runs its competitions.'
      using errcode = 'insufficient_privilege', hint = 'competition:not_teacher';
  end if;
  if space.class_grade is null then
    raise exception 'Say which school year the class is first.' using errcode = 'check_violation', hint = 'competition:grade';
  end if;
  -- Step 2: the name, the criteria and the two moments (CALM-7d: a date and a time each).
  clean_name := public.check_class_plain_text(details ->> 'name', 120, 'competition:name');
  clean_criteria := public.check_class_criteria(details -> 'criteria');
  begin
    first_moment := (details ->> 'starts_at')::timestamptz;
    last_moment := (details ->> 'ends_at')::timestamptz;
  exception when others then
    first_moment := null;
  end;
  if first_moment is null or last_moment is null or last_moment <= first_moment
     or (space.locks_at is not null and last_moment >= space.locks_at) then
    raise exception 'Choose a start and an end before the class closes.' using errcode = 'check_violation', hint = 'competition:dates';
  end if;
  -- Step 3: a new competition, or one that nobody has joined yet.
  if target_competition_id is null then
    -- Any moment of today still counts, as the first day did before (the form starts at now).
    if (first_moment at time zone coalesce(public.setting_value('class_points_timezone') #>> '{}',
          'Europe/Bucharest'))::date < public.class_today() then
      raise exception 'A competition can''t start in the past.' using errcode = 'check_violation', hint = 'competition:dates';
    end if;
    if exists (select 1 from public.class_competitions as competitions
               where competitions.space_id = space.id and competitions.published_at is null) then
      raise exception 'This class already has a competition running.' using errcode = 'check_violation', hint = 'competition:exists';
    end if;
    -- The trigger class_competitions_set_days fills starts_on and ends_on from the moments.
    insert into public.class_competitions (user_id, space_id, name, starts_at, ends_at)
    values (caller_id, space.id, clean_name, first_moment, last_moment)
    returning id into saved_id;
  else
    existing := public.class_competition_for_teacher(target_competition_id);
    if existing.space_id <> space.id then
      raise exception 'There is no such competition.' using errcode = 'no_data_found', hint = 'competition:missing';
    end if;
    if public.class_competition_phase(existing) not in ('upcoming', 'open')
       or (public.class_competition_phase(existing) = 'open' and exists (
             select 1 from public.class_competition_entrants as entrants
             where entrants.competition_id = existing.id)) then
      raise exception 'Pupils have joined, so it can''t change.' using errcode = 'check_violation', hint = 'competition:started';
    end if;
    update public.class_competitions set name = clean_name, starts_at = first_moment, ends_at = last_moment
    where class_competitions.id = existing.id;
    delete from public.class_competition_criteria as criteria where criteria.competition_id = existing.id;
    saved_id := existing.id;
  end if;
  -- Step 4: the criteria, in the order typed.
  insert into public.class_competition_criteria (user_id, competition_id, position, label, max_points, description, outcomes)
  select caller_id, saved_id, entries.position, entries.value ->> 'label', (entries.value ->> 'max_points')::smallint,
         entries.value ->> 'description',
         array(select jsonb_array_elements_text(entries.value -> 'outcomes'))
  from jsonb_array_elements(clean_criteria) with ordinality as entries (value, position);
  -- Step 5: the class's log.
  perform public.log_space_action(space,
    case when target_competition_id is null then 'competition_started' else 'competition_changed' end,
    null, null, null, jsonb_build_object('name', clean_name, 'starts_at', first_moment, 'ends_at', last_moment));
  return public.class_competitions(slug);
end;
$$;
