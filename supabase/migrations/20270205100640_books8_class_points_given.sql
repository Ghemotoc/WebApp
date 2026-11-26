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
 * points. Nothing else changes (20270205100226_classpoints1_02_class_points.sql).
 * Privacy: a pupil sees only the gifts they gave themselves. Nobody else, the teacher included,
 * ever learns who gave points (Robert, 13 Nov 2026, class points decisions).
 * Who calls it: src/features/class-points/api/classPoints.ts (fetchClassPointsSummary), shown by
 * ClassPointsCard on the class page.
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
