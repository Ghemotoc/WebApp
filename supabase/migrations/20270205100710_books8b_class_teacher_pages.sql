/*
 * Migration: the teacher's class pages (bundle BOOKS-8, part 8b; boards G07 to G12, user stories
 * 8.7 to 8.12).
 *
 * Why: the boards give the teacher numbers and controls the database didn't offer yet.
 * - G07 (user story 8.7): "Class name, grade and school are needed" when a class is made, so
 *   create_class_space() takes the grade and the school as well (both optional for the older
 *   callers and the staff pilot set-up, which add them afterwards; the teacher's form asks for
 *   both). set_class_school() lets the teacher change the school later in the class settings
 *   (user story 8.8: "Class settings holds the name, grade, school, class points and the code").
 * - G08 (user story 8.8): "This week: totals for the whole class only, never one pupil's":
 *   class_points_summary() adds 'week' for the teacher: points given of the most that could be,
 *   notes, chapters shared since Monday and reports still open.
 * - G09 (user story 8.9): the table has a Notes column, and "Report points on vlad.writes" reports
 *   a pupil (not one chapter) with a reason: class_points_table() adds 'notes' per pupil and
 *   report_pupil_class_points() is new.
 * - G10 (user story 8.10): "Class points on this chapter: how many and how many notes", and teacher
 *   points "can change until the competition the chapter is entered in is published; then they
 *   lock": class_chapter_points() adds the notes' count and 'teacher_locked' for the teacher, and
 *   a trigger refuses any change to locked teacher points.
 * - G12 (user story 8.12): "Results: <name>", "Ended 31 October", and "Read the entry" beside each
 *   entry: class_competition_scoring() adds 'ends_at' and each chapter's story address and code.
 * Privacy: every number the teacher gets is a total; nobody but our moderators ever learns who
 *   gave points (Robert, 13 Nov 2026, class points decisions).
 * Who calls it: src/features/spaces/api/spaces.ts (createClassSpace), src/features/spaces/api/
 *   classTools.ts (setClassSchool), src/features/class-points/api/classPoints.ts (the summary,
 *   the table, the pupil report and the chapter's points).
 *   src/features/class-competitions/api/competitionScoring.ts (the scoring page).
 * Tests: supabase/tests/database/416-class-teacher-pages.test.sql.
 */

/* ---------- 1. Making a class with its grade and school (G07) ---------- */

drop function public.create_class_space(text, text, text, public.space_banner);

/**
 * create_class_space: a teacher with the badge starts a private class space (S1-E8-11; BOOKS-8b
 *   adds the grade and the school, board G07).
 * Input: name and description; rules and banner as before; grade, the school year (1 to 13), and
 *   school, the school's name (1 to 120 characters). Both are optional here so older callers
 *   keep working; the teacher's form always sends them.
 * Returns: JSON {slug}.
 * Errors: insufficient_privilege (space:not_teacher) for anyone without the badge; check_violation
 *   (grade:range) for a grade outside 1 to 13, (school:length) for a long school name, and the
 *   name errors of insert_class_space().
 * Flow: NewClassSpaceForm → useStartClass → here; the class page opens next.
 */
create function public.create_class_space(
  name text,
  description text,
  rules text default '',
  banner public.space_banner default 'plum',
  grade integer default null,
  school text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_space_starter();
  new_space public.spaces;
begin
  -- Step 1: only an adult teacher with the badge (criterion 1; S1-E2-11 grants it to adults only).
  if public.age_band() is distinct from '18_plus'
     or (select profiles.teacher_badge_since from public.profiles where profiles.id = caller_id) is null then
    raise exception 'Only teachers can start a class space.' using errcode = 'insufficient_privilege', hint = 'space:not_teacher';
  end if;
  -- Step 2: a real school year when one is given (spaces_class_grade_range says the same).
  if grade is not null and grade not between 1 and 13 then
    raise exception 'A school year is 1 to 13.' using errcode = 'check_violation', hint = 'grade:range';
  end if;
  -- Step 3: the spam limit, then the space with its school, then its grade.
  perform public.take_rate_limit('space_create');
  new_space := public.insert_class_space(caller_id, name, description, rules, banner, school);
  if grade is not null then
    update public.spaces set class_grade = grade where spaces.id = new_space.id;
  end if;
  return jsonb_build_object('slug', new_space.slug);
end;
$$;
comment on function public.create_class_space(text, text, text, public.space_banner, integer, text) is
  'Starts a private class space for a teacher with the badge, with its grade and school; joined by invite code only (S1-E8-11, BOOKS-8b).';
revoke execute on function public.create_class_space(text, text, text, public.space_banner, integer, text) from public, anon;
grant execute on function public.create_class_space(text, text, text, public.space_banner, integer, text) to authenticated;

/**
 * set_class_school: the teacher changes the school a class belongs to (BOOKS-8b, user story 8.8:
 *   "Class settings holds the name, grade, school ..."). It prints on class certificates.
 * Input: slug, the class's address; school_name, 1 to 120 characters.
 * Returns: JSON {school_name}.
 * Errors: as space_for_power() (no such space, not allowed); check_violation (school:length) for
 *   an empty or long name, and check_certificate_class()'s errors for an archived class.
 * Flow: ClassSchoolCard in the class settings → useClassSchool → here; the class's log records it.
 */
create function public.set_class_school(slug text, school_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  space public.spaces := public.space_for_power(slug, 'settings');
  clean_school text := btrim(coalesce(school_name, ''));
begin
  -- Step 1: a live class, and only its own teacher (a moderator with settings power can't).
  perform public.check_certificate_class(space);
  if space.user_id is distinct from (select auth.uid()) then
    raise exception 'Only the class''s teacher changes its school.'
      using errcode = 'insufficient_privilege', hint = 'space:not_owner';
  end if;
  -- Step 2: a name of 1 to 120 characters (spaces_school_name_length says the same).
  if char_length(clean_school) not between 1 and 120 then
    raise exception 'Give the school''s name, up to 120 characters.' using errcode = 'check_violation', hint = 'school:length';
  end if;
  -- Step 3: save it and write it in the class's log, only when it changes.
  if space.school_name is distinct from clean_school then
    update public.spaces set school_name = clean_school, updated_at = now() where spaces.id = space.id;
    perform public.log_space_action(space, 'class_school_set', null, null, null);
  end if;
  return jsonb_build_object('school_name', clean_school);
end;
$$;
comment on function public.set_class_school(text, text) is
  'The teacher changes the school their class belongs to; logged in the class (BOOKS-8b, G08).';
revoke execute on function public.set_class_school(text, text) from public, anon;
grant execute on function public.set_class_school(text, text) to authenticated;

/* ---------- 2. The class's week, for the teacher (G08) ---------- */

/**
 * class_week_totals: this week's class points totals for one class, for its teacher's page.
 * Input: class_id, the class; week, the Monday of the week.
 * Returns: JSON {given, possible, notes, chapters_shared, reported}: points given this week and
 *   the most the pupils could give (pupils × the weekly budget), notes written with them, chapters
 *   first published in the class's stories since Monday, and reports still open. Totals only.
 * Errors: none. Internal: only class_points_summary() calls it, for the teacher.
 */
create function public.class_week_totals(class_id uuid, week date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with class as (select spaces.* from public.spaces where spaces.id = class_week_totals.class_id),
  gifts as (
    select gifts.points, gifts.note from public.class_point_gifts as gifts
    where gifts.space_id = class_week_totals.class_id and gifts.week_start = class_week_totals.week
      and gifts.removed_at is null
  )
  select jsonb_build_object(
    'given', (select coalesce(sum(gifts.points), 0)::integer from gifts),
    'possible', (select count(*)::integer from class
                 join public.space_members on space_members.space_id = class.id
                   and space_members.status = 'active' and space_members.user_id <> class.user_id)
                * public.class_points_number('class_points_weekly_budget', 10),
    'notes', (select count(*)::integer from gifts where gifts.note is not null),
    -- A chapter counts once, on the day it first went out to the class (Romanian time).
    'chapters_shared', (select count(*)::integer from public.stories
      join public.chapters on chapters.story_id = stories.id and chapters.status = 'published'
                          and chapters.deleted_at is null
      where stories.class_space_id = class_week_totals.class_id and stories.class_only
        and stories.deleted_at is null and chapters.first_published_at is not null
        and public.class_points_week_start(chapters.first_published_at) >= class_week_totals.week),
    'reported', (select count(*)::integer from public.class_point_flags as flags
      where flags.space_id = class_week_totals.class_id and flags.kind = 'teacher_report'
        and flags.closed_at is null));
$$;
comment on function public.class_week_totals(uuid, date) is
  'This week''s class points totals for a class, never one pupil''s (BOOKS-8b, board G08).';
revoke execute on function public.class_week_totals(uuid, date) from public, anon, authenticated;

/**
 * class_points_summary: class points on a class page (S1-E8-13; BOOKS-8 adds 'given', BOOKS-8b
 *   adds 'week').
 * Input: slug, the class's address.
 * Returns: JSON {enabled, role, can_switch, budget, left, cap, resets_on, received_total, given,
 *   week}; left, resets_on, received_total and given only for a pupil; week (class_week_totals())
 *   only for the teacher; null for anyone outside the class.
 * Errors: none.
 */
create or replace function public.class_points_summary(slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with class as (
    select spaces.*, spaces.user_id = (select auth.uid()) as is_teacher,
           public.class_points_week_start() as week
    from public.spaces
    where spaces.slug = class_points_summary.slug and spaces.kind = 'class' and spaces.deleted_at is null
      and public.space_may_read(spaces)
      and (spaces.user_id = (select auth.uid()) or public.class_points_is_pupil(spaces, (select auth.uid())))
  )
  select jsonb_build_object(
    'enabled', class.class_points_on,
    'role', case when class.is_teacher then 'teacher' else 'pupil' end,
    'can_switch', class.is_teacher and class.archived_at is null,
    'budget', public.class_points_number('class_points_weekly_budget', 10),
    'left', case when not class.is_teacher then
      greatest(public.class_points_number('class_points_weekly_budget', 10)
               - public.class_points_spent(class.id, (select auth.uid()), class.week), 0) end,
    'cap', public.class_points_number('class_points_chapter_cap', 3),
    'resets_on', case when not class.is_teacher then class.week + 7 end,
    'received_total', case when not class.is_teacher then (
      select coalesce(sum(gifts.points), 0)::integer from public.class_point_gifts as gifts
      where gifts.space_id = class.id and gifts.receiver_user_id = (select auth.uid())
        and gifts.removed_at is null) end,
    -- Only the pupil's own gifts: the teacher never learns who gave points.
    'given', case when not class.is_teacher then
      public.class_points_given_this_week(class.id, (select auth.uid()), class.week) end,
    -- The teacher's "This week": totals for the whole class only (user story 8.8).
    'week', case when class.is_teacher then public.class_week_totals(class.id, class.week) end)
  from class;
$$;

/* ---------- 3. The teacher's table and the report on a pupil (G09) ---------- */

/**
 * class_points_table: the teacher's table: each pupil's class points, teacher points and notes,
 *   with no rank and no givers (S1-E8-14; BOOKS-8b adds 'notes', board G09).
 * Input: slug, the class's address.
 * Returns: JSON {pupils: [{handle, display_name, class_points, notes, teacher_points, chapters}]},
 *   sorted by name; null when the caller isn't the teacher or points are off.
 * Errors: none.
 */
create or replace function public.class_points_table(slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with class as (
    select spaces.* from public.spaces
    where spaces.slug = class_points_table.slug and spaces.kind = 'class' and spaces.deleted_at is null
      and spaces.class_points_on and spaces.user_id = (select auth.uid())
  ),
  pupils as (
    select space_members.user_id, profiles.handle,
           public.display_name(profiles.handle, profiles.pen_name) as display_name
    from class
    join public.space_members on space_members.space_id = class.id and space_members.status = 'active'
    join public.profiles on profiles.id = space_members.user_id and profiles.deleted_at is null
    where space_members.user_id <> class.user_id
  ),
  -- Every chapter a pupil shares with this class now, with its two numbers.
  pieces as (
    select chapters.id as chapter_id, chapters.user_id, chapters.code, chapters.position,
           chapters.published_title, stories.slug as story_slug, stories.title as story_title,
           (select coalesce(sum(gifts.points), 0)::integer from public.class_point_gifts as gifts
            where gifts.chapter_id = chapters.id and gifts.space_id = class.id and gifts.removed_at is null) as class_points,
           (select count(*)::integer from public.class_point_gifts as gifts
            where gifts.chapter_id = chapters.id and gifts.space_id = class.id and gifts.removed_at is null
              and gifts.note is not null) as notes,
           (select marks.points from public.class_teacher_points as marks
            where marks.chapter_id = chapters.id and marks.space_id = class.id) as teacher_points,
           exists (select 1 from public.class_point_flags as flags
                   where flags.chapter_id = chapters.id and flags.kind = 'teacher_report'
                     and flags.closed_at is null) as is_reported
    from class
    join public.stories on stories.class_space_id = class.id and stories.class_only and stories.deleted_at is null
    join public.chapters on chapters.story_id = stories.id and chapters.status = 'published'
                        and chapters.deleted_at is null
    where not public.is_moderated_away('story', stories.id)
      and not public.is_moderated_away('chapter', chapters.id)
  )
  select jsonb_build_object('pupils', coalesce((
    select jsonb_agg(jsonb_build_object(
        'handle', pupils.handle,
        'display_name', pupils.display_name,
        'class_points', (select coalesce(sum(pieces.class_points), 0)::integer from pieces
                         where pieces.user_id = pupils.user_id),
        -- The notes classmates wrote with their points, counted, never shown here.
        'notes', (select coalesce(sum(pieces.notes), 0)::integer from pieces
                  where pieces.user_id = pupils.user_id),
        -- Teacher points on chapters and on assignment replies together.
        'teacher_points', (select coalesce(sum(marks.points), 0)::integer
                           from public.class_teacher_points as marks, class
                           where marks.space_id = class.id and marks.pupil_user_id = pupils.user_id),
        'chapters', (select coalesce(jsonb_agg(jsonb_build_object(
              'chapter_id', pieces.chapter_id,
              'story_slug', pieces.story_slug,
              'story_title', pieces.story_title,
              'chapter_code', pieces.code,
              'chapter_position', pieces.position,
              'chapter_title', pieces.published_title,
              'class_points', pieces.class_points,
              'teacher_points', pieces.teacher_points,
              'is_reported', pieces.is_reported)
            order by pieces.story_title, pieces.position), '[]'::jsonb)
          from pieces where pieces.user_id = pupils.user_id))
      order by pupils.display_name, pupils.handle)
    from pupils), '[]'::jsonb))
  from class;
$$;

/**
 * report_pupil_class_points: the teacher reports the class points one pupil received as odd
 *   (BOOKS-8b, board G09, user story 8.9: "Report points sends the pupil's name, the reason and
 *   the note to the moderators and adds a line to the class log").
 * Input: slug, the class's address; pupil_handle, the pupil; reason, one of 'swapped' (swapped
 *   between friends), 'not_writing' (given for something other than the writing) or 'other';
 *   note, what the teacher noticed (optional, up to 500 characters).
 * Returns: JSON {reported}: how many of the pupil's chapters now have an open report.
 * Side effect: one open report (class_point_flags, kind teacher_report) on each of the pupil's
 *   chapters that received points and has none open yet, read by our moderators in Staff ›
 *   Class points; one line in the class's log.
 * Errors: check_violation (points:not_offered) when points are off or the pupil isn't in the
 *   class or received no points; insufficient_privilege (points:not_teacher) for anyone but the
 *   teacher; check_violation (report:reason) for an unknown reason; check_class_note()'s errors.
 * Flow: ReportPupilPointsForm under the table → useReportPupilPoints → here.
 */
create function public.report_pupil_class_points(slug text, pupil_handle text, reason text, note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  space public.spaces;
  pupil_id uuid;
  clean_note text;
  why text;
  added integer;
begin
  -- Step 1: the class, with points on, and only its teacher (rule: who gave stays private).
  select spaces.* into space from public.spaces
  where spaces.slug = report_pupil_class_points.slug and spaces.kind = 'class' and spaces.deleted_at is null;
  if space.id is null or not space.class_points_on then
    raise exception 'There are no class points here.' using errcode = 'check_violation', hint = 'points:not_offered';
  end if;
  if space.user_id is distinct from caller_id then
    raise exception 'Only the class''s teacher can report its points.'
      using errcode = 'insufficient_privilege', hint = 'points:not_teacher';
  end if;
  -- Step 2: a pupil of this class, a known reason and a short note.
  select profiles.id into pupil_id from public.profiles
  where profiles.handle = pupil_handle and profiles.deleted_at is null;
  if pupil_id is null or not public.class_points_is_pupil(space, pupil_id) then
    raise exception 'There are no class points here.' using errcode = 'check_violation', hint = 'points:not_offered';
  end if;
  if reason is null or reason not in ('swapped', 'not_writing', 'other') then
    raise exception 'Pick why the points look odd.' using errcode = 'check_violation', hint = 'report:reason';
  end if;
  clean_note := public.check_class_note(note, 480);
  -- The moderators read the reason's code first, then the teacher's words.
  why := reason || coalesce(': ' || clean_note, '');
  -- Step 3: one open report on each of the pupil's chapters in this class that received points.
  insert into public.class_point_flags (space_id, kind, chapter_id, reporter_user_id, note)
  select space.id, 'teacher_report', chapters.id, caller_id, why
  from public.chapters
  where chapters.user_id = pupil_id and chapters.deleted_at is null
    and exists (select 1 from public.class_point_gifts as gifts
                where gifts.chapter_id = chapters.id and gifts.space_id = space.id and gifts.removed_at is null)
  on conflict (chapter_id) where kind = 'teacher_report' and closed_at is null do nothing;
  get diagnostics added = row_count;
  if not exists (select 1 from public.class_point_flags as flags
                 join public.chapters on chapters.id = flags.chapter_id
                 where flags.space_id = space.id and flags.kind = 'teacher_report'
                   and flags.closed_at is null and chapters.user_id = pupil_id) then
    raise exception 'This pupil has received no class points.' using errcode = 'check_violation', hint = 'points:not_offered';
  end if;
  -- Step 4: the class's log says a pupil's points were reported (the same line as one chapter).
  if added > 0 then
    perform public.log_space_action(space, 'class_points_reported', pupil_id, null, null);
  end if;
  return jsonb_build_object('reported', (select count(*)::integer from public.class_point_flags as flags
    join public.chapters on chapters.id = flags.chapter_id
    where flags.space_id = space.id and flags.kind = 'teacher_report' and flags.closed_at is null
      and chapters.user_id = pupil_id));
end;
$$;
comment on function public.report_pupil_class_points(text, text, text, text) is
  'The teacher reports one pupil''s class points to our moderators with a reason (BOOKS-8b, G09).';
revoke execute on function public.report_pupil_class_points(text, text, text, text) from public, anon;
grant execute on function public.report_pupil_class_points(text, text, text, text) to authenticated;

/* ---------- 4. Teacher points lock once the competition is published (G10) ---------- */

/**
 * class_teacher_points_locked: whether the teacher's points on a pupil's chapter may no longer
 *   change (user story 8.10: "Both can change until the competition the chapter is entered in is
 *   published; then they lock").
 * Input: class_id, the class; chapter_id, the chapter.
 * Returns: true when the chapter's writer entered a competition of this class whose results are
 *   published, and the chapter was out before that competition ended (so it was part of the
 *   entry). Entrants enter as pupils, so this is how a chapter is "entered".
 * Errors: none. Internal: the lock trigger and class_chapter_points() call it.
 */
create function public.class_teacher_points_locked(class_id uuid, chapter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.chapters
    join public.class_competition_entrants as entrants on entrants.user_id = chapters.user_id
                                                     and entrants.space_id = class_teacher_points_locked.class_id
    join public.class_competitions as competitions on competitions.id = entrants.competition_id
                                                 and competitions.published_at is not null
    where chapters.id = class_teacher_points_locked.chapter_id
      and chapters.first_published_at is not null
      and chapters.first_published_at <= competitions.ends_at);
$$;
comment on function public.class_teacher_points_locked(uuid, uuid) is
  'True when a chapter''s teacher points are locked by a published competition (BOOKS-8b, G10).';
revoke execute on function public.class_teacher_points_locked(uuid, uuid) from public, anon, authenticated;

/**
 * refuse_locked_teacher_points: a trigger on class_teacher_points that refuses to add, change or
 *   remove teacher points on a chapter once they are locked (class_teacher_points_locked()).
 *   A removal is refused only when a signed-in person deletes the row themselves (the teacher's
 *   set_teacher_points()); a chapter, account or class being deleted still takes its points with
 *   it (those arrive through a cascade, one trigger level deeper), and so do our own clean-ups.
 * Errors: check_violation (points:locked). Replies to assignments never lock.
 */
create function public.refuse_locked_teacher_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_now public.class_teacher_points := case when tg_op = 'DELETE' then old else new end;
begin
  -- Step 1: a deletion that isn't the teacher's own removal passes (see the doc comment).
  if tg_op = 'DELETE' and ((select auth.uid()) is null or pg_trigger_depth() > 1) then
    return old;
  end if;
  -- Step 2: only chapters lock; an assignment reply has no competition.
  if row_now.chapter_id is not null
     and public.class_teacher_points_locked(row_now.space_id, row_now.chapter_id) then
    raise exception 'The competition this chapter was in is published, so its teacher points are locked.'
      using errcode = 'check_violation', hint = 'points:locked';
  end if;
  return row_now;
end;
$$;
comment on function public.refuse_locked_teacher_points() is
  'Trigger: teacher points on a chapter stop changing once its competition is published (BOOKS-8b).';
revoke execute on function public.refuse_locked_teacher_points() from public, anon, authenticated;

create trigger class_teacher_points_lock
  before insert or update or delete on public.class_teacher_points
  for each row execute function public.refuse_locked_teacher_points();

/**
 * class_chapter_points: everything about class points on one chapter, for the person reading it
 *   (S1-E8-13, S1-E8-14; BOOKS-8 sends teacher_max to the writer; BOOKS-8b gives the teacher the
 *   notes' count and teacher_locked, board G10).
 * Input, side effect and errors: as in 20270205100640_books8_class_points_given.sql.
 * Returns: as before; for the teacher, received is {total, notes} (notes is a count, never the
 *   words or who wrote them) and teacher_locked says the points can no longer change.
 */
create or replace function public.class_chapter_points(target_chapter_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  space public.spaces;
  writer_id uuid;
  viewer_role text;
  week date := public.class_points_week_start();
  budget integer := public.class_points_number('class_points_weekly_budget', 10);
  my_gift public.class_point_gifts;
  teacher_row public.class_teacher_points;
  received_total integer;
begin
  -- Step 1: only a chapter shared with a class that has points on, and only for a signed-in reader.
  if caller_id is null then
    return null;
  end if;
  space := public.class_points_chapter_space(target_chapter_id);
  if space.id is null or not space.class_points_on then
    return null;
  end if;
  -- Step 2: who is looking: the writer, the teacher or a classmate. Anyone else gets nothing.
  select chapters.user_id into writer_id from public.chapters where chapters.id = target_chapter_id;
  viewer_role := case
    when writer_id = caller_id then 'writer'
    when space.user_id = caller_id then 'teacher'
    when public.class_points_is_pupil(space, caller_id) and public.is_active_member() then 'classmate' end;
  if viewer_role is null then
    return null;
  end if;
  -- Step 3: a classmate has now opened the chapter (criterion 4).
  if viewer_role = 'classmate' then
    insert into public.class_chapter_opens (user_id, space_id, chapter_id)
    values (caller_id, space.id, target_chapter_id)
    on conflict on constraint class_chapter_opens_once do nothing;
    select * into my_gift from public.class_point_gifts as gifts
    where gifts.user_id = caller_id and gifts.chapter_id = target_chapter_id and gifts.week_start = week;
  end if;
  -- Step 4: the totals, for the writer and the teacher only.
  select coalesce(sum(gifts.points), 0)::integer into received_total
  from public.class_point_gifts as gifts
  where gifts.chapter_id = target_chapter_id and gifts.space_id = space.id and gifts.removed_at is null;
  select * into teacher_row from public.class_teacher_points as marks
  where marks.space_id = space.id and marks.chapter_id = target_chapter_id;
  -- Step 5: the answer, with only the parts this viewer may see.
  return jsonb_build_object(
    'class', jsonb_build_object('slug', space.slug, 'name', space.name),
    'role', viewer_role,
    'giving', case when viewer_role = 'classmate' then jsonb_build_object(
      'budget', budget,
      'left', greatest(budget - public.class_points_spent(space.id, caller_id, week), 0),
      'cap', public.class_points_number('class_points_chapter_cap', 3),
      'given', case when my_gift.removed_at is null then coalesce(my_gift.points, 0) else 0 end,
      'note', case when my_gift.removed_at is null then my_gift.note end,
      'note_max', public.class_points_number('class_point_note_max_characters', 140),
      'resets_on', week + 7,
      -- Not offered in a locked class, to someone blocked either way, or after a moderator
      -- removed this week's gift to this chapter.
      'can_give', not public.space_is_locked(space) and not public.is_blocked_with(writer_id)
                  and my_gift.removed_at is null) end,
    'received', case
      when viewer_role = 'writer' then jsonb_build_object(
        'total', received_total,
        'notes', (select coalesce(jsonb_agg(jsonb_build_object('id', gifts.id, 'note', gifts.note)
                    order by gifts.created_at), '[]'::jsonb)
                  from public.class_point_gifts as gifts
                  where gifts.chapter_id = target_chapter_id and gifts.space_id = space.id
                    and gifts.removed_at is null and gifts.note is not null
                    and not public.is_moderated_away('class_point_note', gifts.id)))
      -- The teacher gets how many notes, never the words or who wrote them (user story 8.10).
      when viewer_role = 'teacher' then jsonb_build_object(
        'total', received_total,
        'notes', (select count(*)::integer from public.class_point_gifts as gifts
                  where gifts.chapter_id = target_chapter_id and gifts.space_id = space.id
                    and gifts.removed_at is null and gifts.note is not null)) end,
    'teacher', case when viewer_role in ('writer', 'teacher') then public.class_teacher_points_json(teacher_row) end,
    'teacher_max', case when viewer_role in ('writer', 'teacher') then public.class_points_number('class_teacher_points_max', 10) end,
    'teacher_locked', case when viewer_role = 'teacher' then public.class_teacher_points_locked(space.id, target_chapter_id) end,
    'notes_on', case when viewer_role = 'teacher' then public.is_feature_enabled('class_teacher_notes') end,
    'note_max', case when viewer_role = 'teacher' then public.class_points_number('class_teacher_note_max_characters', 1000) end,
    'is_locked', public.space_is_locked(space));
end;
$$;

/* ---------- 5. The results page: when it ended, and a link to each entry (G12) ---------- */

/**
 * class_competition_scoring: for the teacher, a competition's entrants by name with their scores
 * and the guide numbers, never a rank (S1-E8-15). Same as before, plus 'ends_at' for "Ended 31
 * October" and each chapter's 'story_slug' and 'code' for "Read the entry" (board G12).
 * Inputs: target_competition_id.
 * Returns: jsonb.
 * Errors: as class_competition_for_teacher(): missing for anyone but the class's teacher.
 * Called by: src/features/class-competitions/api/competitionScoring.ts.
 */
create or replace function public.class_competition_scoring(target_competition_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  competition public.class_competitions := public.class_competition_for_teacher(target_competition_id);
  space public.spaces;
begin
  -- Step 1: the class the competition belongs to.
  select * into space from public.spaces where spaces.id = competition.space_id;
  -- Step 2: the competition and its entrants by name; the guide numbers never order them.
  return jsonb_build_object(
    'id', competition.id, 'name', competition.name,
    'phase', public.class_competition_phase(competition),
    'ends_at', competition.ends_at,
    'class_slug', space.slug,
    'winners_allowed', public.class_winners_allowed(space.class_grade),
    'criteria', public.class_competition_criteria_json(competition.id),
    'entrants', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'handle', profiles.handle,
        'display_name', public.display_name(profiles.handle, profiles.pen_name),
        'class_points', public.class_competition_class_points(competition, profiles.id),
        'teacher_points', (
          select coalesce(sum(marks.points), 0)::integer from public.class_teacher_points as marks
          where marks.space_id = space.id and marks.pupil_user_id = profiles.id),
        'chapters', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', chapters.id, 'title', chapters.published_title, 'story_title', stories.title,
            'story_slug', stories.slug, 'code', chapters.code,
            'position', chapters.position) order by stories.title, chapters.position), '[]'::jsonb)
          from public.chapters join public.stories on stories.id = chapters.story_id
          where chapters.user_id = profiles.id and stories.class_only and stories.class_space_id = space.id
            and chapters.status = 'published' and chapters.deleted_at is null and stories.deleted_at is null),
        'scores', (
          select coalesce(jsonb_object_agg(scores.criterion_id, scores.points), '{}'::jsonb)
          from public.class_competition_scores as scores
          where scores.competition_id = competition.id and scores.pupil_user_id = profiles.id),
        'result', results.result,
        'readers_choice', coalesce(results.readers_choice, false))
        order by public.display_name(profiles.handle, profiles.pen_name), profiles.handle), '[]'::jsonb)
      from public.class_competition_entrants as entrants
      join public.profiles on profiles.id = entrants.user_id
      left join public.class_competition_results as results
        on results.competition_id = competition.id and results.pupil_user_id = profiles.id
      where entrants.competition_id = competition.id));
end;
$$;
comment on function public.class_competition_scoring(uuid) is
  'For the teacher: a class competition''s entrants by name with their scores, the guide numbers and a link to each chapter, never a rank (S1-E8-15; BOOKS-8b, board G12).';
