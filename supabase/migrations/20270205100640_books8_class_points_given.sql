/*
 * Migration: a pupil's class page lists the points they gave this week (bundle BOOKS-8, board
 * G03-Class, user story 8.3: "what was given this week with Move (until Sunday 23:59)").
 *
 * Why: board G03 draws, under "10 points to give this week", a meter of the points left and a
 * "Given this week" list: each chapter the pupil gave points to, its writer, the points and Move.
 * class_points_summary() told the pupil only how many points were left, not where the others went.
 * What it changes: class_points_summary() adds 'given' for a pupil: their own gifts of this week
 * that still count (not removed by a moderator), on chapters still published, with the story's
 * title and address, the chapter's code and position, the writer's handle and pen name, and the
 * points. class_chapter_points() also sends the writer teacher_max, for "Teacher points 7 out of
 * 10" on board G06 (G06-ClassReceived, user story 8.6). Nothing else changes
 * (20270205100226_classpoints1_02_class_points.sql).
 * Privacy: a pupil sees only the gifts they gave themselves. Nobody else, the teacher included,
 * ever learns who gave points (Robert, 13 Nov 2026, class points decisions).
 * Who calls it: src/features/class-points/api/classPoints.ts (fetchClassPointsSummary, shown by
 * ClassPointsCard on the class page; fetchChapterClassPoints, shown by ChapterClassPoints).
 * Tests: supabase/tests/database/377-class-points.test.sql.
 */

/**
 * class_points_given_this_week: the gifts one pupil gave in one class this week.
 * Input: class_id, the class; giver_user_id, the pupil; week, the Monday of the week.
 * Returns: a JSON array of {story_slug, story_title, chapter_code, chapter_position,
 *   writer_handle, writer_name, points}, the newest first; empty when there are none.
 * Errors: none. Internal: only class_points_summary() calls it, for the caller themselves.
 */
create function public.class_points_given_this_week(class_id uuid, giver_user_id uuid, week date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'story_slug', stories.slug,
      'story_title', stories.title,
      'chapter_code', chapters.code,
      'chapter_position', chapters.position,
      'writer_handle', writers.handle,
      'writer_name', public.display_name(writers.handle, writers.pen_name),
      'points', gifts.points)
    order by gifts.created_at desc), '[]'::jsonb)
  from public.class_point_gifts as gifts
  join public.chapters on chapters.id = gifts.chapter_id and chapters.status = 'published'
                      and chapters.deleted_at is null
  join public.stories on stories.id = chapters.story_id and stories.deleted_at is null
  join public.profiles as writers on writers.id = gifts.receiver_user_id
  where gifts.space_id = class_points_given_this_week.class_id
    and gifts.user_id = class_points_given_this_week.giver_user_id
    and gifts.week_start = class_points_given_this_week.week
    and gifts.removed_at is null
    and not public.is_moderated_away('story', stories.id)
    and not public.is_moderated_away('chapter', chapters.id);
$$;
comment on function public.class_points_given_this_week(uuid, uuid, date) is
  'A pupil''s own class point gifts this week, for their class page (BOOKS-8, board G03).';
revoke execute on function public.class_points_given_this_week(uuid, uuid, date) from public, anon, authenticated;

/**
 * class_points_summary: class points on a class page (S1-E8-13; BOOKS-8 adds 'given').
 * Input: slug, the class's address.
 * Returns: JSON {enabled, role, can_switch, budget, left, cap, resets_on, received_total, given};
 *   left, resets_on, received_total and given only for a pupil; null for anyone outside the class.
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
      public.class_points_given_this_week(class.id, (select auth.uid()), class.week) end)
  from class;
$$;

/**
 * class_chapter_points: everything about class points on one chapter, for the person reading it
 *   (S1-E8-13, S1-E8-14; BOOKS-8 sends teacher_max to the writer too).
 * Why: board G06 shows the writer "Teacher points 7 out of 10", so the writer needs the most a
 *   teacher may give. It is a public setting (class_teacher_points_max), not anyone's data.
 * Input, returns, side effect and errors: as in 20270205100226_classpoints1_02_class_points.sql,
 *   except that teacher_max now comes for the writer as well as the teacher; notes_on and
 *   note_max stay the teacher's.
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
      when viewer_role = 'teacher' then jsonb_build_object('total', received_total) end,
    'teacher', case when viewer_role in ('writer', 'teacher') then public.class_teacher_points_json(teacher_row) end,
    'teacher_max', case when viewer_role in ('writer', 'teacher') then public.class_points_number('class_teacher_points_max', 10) end,
    'notes_on', case when viewer_role = 'teacher' then public.is_feature_enabled('class_teacher_notes') end,
    'note_max', case when viewer_role = 'teacher' then public.class_points_number('class_teacher_note_max_characters', 1000) end,
    'is_locked', public.space_is_locked(space));
end;
$$;
