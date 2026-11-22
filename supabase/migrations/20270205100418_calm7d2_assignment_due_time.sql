/*
 * Migration: a class assignment is due at a moment, not on a day (bundle CALM-7d, part 2; story
 * S1-E8-11, class spaces; DESIGN, 21 Nov 2026, approved by Robert: "assignment due ->
 * DateTimeField (date, time, zone, member local)"). Builds on MUST-1d
 * (20270205100054_must1d_assignment_due_dates.sql).
 *
 * Why: the teacher now picks a date and a time in their own time zone (the shared DateTimeField,
 * CALM-1c), and every member reads it in theirs. A day alone can't say "Friday at 08:00", and it
 * only meant something in the Romanian calendar.
 * What it changes:
 * - forum_threads.due_on (date) becomes forum_threads.due_at (timestamptz). A date already set
 *   becomes 23:59 Romanian time on that day, the end of the day it meant.
 * - assignment_reminders.due_on becomes due_at in the same way, so a reminder already sent still
 *   counts and nobody is reminded twice.
 * - set_forum_thread_due_date(thread, due) takes a moment and refuses one already past (hint
 *   due_in_past, as before).
 * - class_space_assignments(slug) lists assignments not yet due, soonest first, and answers
 *   'due_at'.
 * - send_assignment_reminders(): a student who hasn't replied gets one reminder in the 24 hours
 *   before the moment (was: on the Romanian day before), still never during quiet hours.
 * - forum_thread_header_json() and class_thread_replies() answer 'due_at'; a reply is "after the
 *   due date" when its first post came after that moment (was: on a later Romanian day).
 * Who calls it: src/features/spaces/ (ClassDueDateField, ClassAssignmentsCard, ClassRepliesPanel)
 *   and src/features/forums/ (the "Due" line in ThreadHeader).
 * Tests: supabase/tests/database/349-assignment-due-dates.test.sql.
 */

/* ---------- 1. The data ---------- */

-- Step 1: the new column, filled from the old one at 23:59 Romanian time on that day.
alter table public.forum_threads add column due_at timestamptz;
update public.forum_threads
  set due_at = (due_on + time '23:59') at time zone 'Europe/Bucharest'
  where due_on is not null;
comment on column public.forum_threads.due_at is
  'The moment a class assignment is due; set only by the class''s teacher through set_forum_thread_due_date(); null for every other thread (MUST-1d, CALM-7d).';
create index forum_threads_due_at_idx on public.forum_threads (due_at) where due_at is not null;

-- Step 2: the reminders already sent keep counting, keyed by the same moment.
alter table public.assignment_reminders add column due_at timestamptz;
update public.assignment_reminders
  set due_at = (due_on + time '23:59') at time zone 'Europe/Bucharest';
alter table public.assignment_reminders alter column due_at set not null;
alter table public.assignment_reminders drop constraint assignment_reminders_thread_id_user_id_due_on_key;
alter table public.assignment_reminders drop column due_on;
alter table public.assignment_reminders
  add constraint assignment_reminders_thread_id_user_id_due_at_key unique (thread_id, user_id, due_at);
comment on table public.assignment_reminders is
  'kind: platform
The assignment reminders already sent: one per student, assignment and due moment, so the hourly job never sends twice; deleted 30 days after the due moment (MUST-1d, CALM-7d). Personal data: the link between a student and an assignment.';

/* ---------- 2. Setting a due moment ---------- */

-- The old function took a day; the functions that read due_on go before the column does.
drop function public.set_forum_thread_due_date(uuid, date);

/*
 * set_forum_thread_due_date(target_thread_id, due): sets a class thread's due moment, or clears
 * it with null. Inputs: the thread's ID and the moment (the browser turns the teacher's date, time
 * and time zone into it). Returns nothing. Errors: insufficient_privilege (hint not_teacher) when
 * the caller isn't the class's teacher or acting for them, or the thread isn't in a class space;
 * insufficient_privilege (hint class_locked) once the class is locked or archived;
 * check_violation (hint due_in_past) for a moment already past.
 * Called by ClassDueDateField in the teacher's "Who has replied" panel.
 */
create function public.set_forum_thread_due_date(target_thread_id uuid, due timestamptz)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  class_space public.spaces;
begin
  -- Step 1: only in a class space, and only its teacher (or someone holding the members power).
  class_space := public.class_space_of_thread(target_thread_id);
  if class_space.id is null or not public.space_may_act(class_space, 'members') then
    raise exception 'Only the class''s teacher can set a due date.'
      using errcode = 'insufficient_privilege', hint = 'not_teacher';
  end if;
  -- Step 2: a locked or archived class keeps its dates as they were.
  if public.space_is_locked(class_space) then
    raise exception 'The class is locked.' using errcode = 'insufficient_privilege', hint = 'class_locked';
  end if;
  -- Step 3: a new moment can't be one already past; clearing is always allowed.
  if due is not null and due <= now() then
    raise exception 'Choose a later moment.' using errcode = 'check_violation', hint = 'due_in_past';
  end if;
  -- Step 4: save it.
  update public.forum_threads set due_at = due, updated_at = now()
  where forum_threads.id = target_thread_id;
end;
$$;
comment on function public.set_forum_thread_due_date(uuid, timestamptz) is
  'Sets or clears a class assignment''s due moment; teacher only, never one already past (MUST-1d, CALM-7d).';
revoke all on function public.set_forum_thread_due_date(uuid, timestamptz) from public, anon;
grant execute on function public.set_forum_thread_due_date(uuid, timestamptz) to authenticated;

/* ---------- 3. The class space's open assignments ---------- */

/*
 * class_space_assignments(slug): the open assignments of a class space (not yet due), soonest
 * first. Inputs: the space's address. Returns a JSON array of {number, forum_slug, title, due_at,
 * has_replied}; empty when the caller can't read the space. Raises nothing. Called by
 * ClassAssignmentsCard on the class space page.
 */
create or replace function public.class_space_assignments(slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'number', forum_threads.thread_number,
      'forum_slug', forums.slug,
      'title', forum_threads.title,
      'due_at', forum_threads.due_at,
      'has_replied', exists (select 1 from public.forum_posts
                             where forum_posts.thread_id = forum_threads.id
                               and forum_posts.user_id = (select auth.uid())
                               and forum_posts.deleted_at is null))
    order by forum_threads.due_at, forum_threads.thread_number), '[]'::jsonb)
  from public.spaces
  join public.forums on forums.space_id = spaces.id and forums.deleted_at is null
  join public.forum_threads on forum_threads.forum_id = forums.id
  where spaces.slug = class_space_assignments.slug
    and spaces.kind = 'class'
    and public.space_may_read(spaces)
    and forum_threads.due_at > now()
    and public.forum_thread_is_shown(forum_threads);
$$;
comment on function public.class_space_assignments(text) is
  'The open assignments of a class space, soonest first, with whether the caller replied (MUST-1d, CALM-7d).';

/* ---------- 4. The reminder before the moment ---------- */

/*
 * send_assignment_reminders(run_at): sends the assignment reminders. Inputs: the moment of the run
 * (now() for the job; tests pass a fixed moment). Returns how many it sent. Outside quiet hours
 * only (is_in_quiet_hours(), Romanian time), for each assignment due within the next 24 hours in
 * a class that isn't locked, every active student (role member) with no live reply and no
 * reminder yet for that moment gets one 'assignment_due' notification. It also forgets reminders
 * 30 days after their due moment. Raises nothing.
 * Called hourly by pg_cron (job send-assignment-reminders, unchanged).
 */
create or replace function public.send_assignment_reminders(run_at timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  due_student record;
  sent integer := 0;
  local_moment timestamp := run_at at time zone 'Europe/Bucharest';
begin
  -- Step 0: forget reminders 30 days after their due moment (storage limitation, GDPR art. 5(1)(e)).
  delete from public.assignment_reminders where assignment_reminders.due_at < run_at - interval '30 days';
  -- Step 1: never during quiet hours (22:00 to 07:00).
  if public.is_in_quiet_hours(local_moment::time) then
    return 0;
  end if;
  -- Step 2: each student who hasn't replied to an assignment due in the next 24 hours and wasn't
  -- reminded. The first run outside quiet hours inside that window sends it.
  for due_student in
    select forum_threads.id as thread_id, forum_threads.due_at, spaces.id as space_id,
           space_members.user_id
    from public.forum_threads
    join public.forums on forums.id = forum_threads.forum_id
    join public.spaces on spaces.id = forums.space_id and spaces.kind = 'class'
    join public.space_members on space_members.space_id = spaces.id
    join public.profiles on profiles.id = space_members.user_id
    where forum_threads.due_at > run_at
      and forum_threads.due_at <= run_at + interval '24 hours'
      and forum_threads.deleted_at is null
      and forum_threads.locked_at is null
      and spaces.deleted_at is null
      and not public.space_is_locked(spaces)
      and space_members.status = 'active'
      and space_members.role = 'member'
      and profiles.deleted_at is null
      and not exists (select 1 from public.forum_posts
                      where forum_posts.thread_id = forum_threads.id
                        and forum_posts.user_id = space_members.user_id
                        and forum_posts.deleted_at is null)
      and not exists (select 1 from public.assignment_reminders as reminders
                      where reminders.thread_id = forum_threads.id
                        and reminders.user_id = space_members.user_id
                        and reminders.due_at = forum_threads.due_at)
  loop
    -- Step 3: remember it first, so a second run sends nothing; when another run got there
    -- first, the row already exists and nothing is sent.
    insert into public.assignment_reminders (user_id, thread_id, due_at)
    values (due_student.user_id, due_student.thread_id, due_student.due_at)
    on conflict do nothing;
    if not found then
      continue;
    end if;
    perform public.notify(due_student.user_id, 'assignment_due', null,
      jsonb_build_object('forum_thread_id', due_student.thread_id, 'space_id', due_student.space_id));
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;
comment on function public.send_assignment_reminders(timestamptz) is
  'Hourly job: one reminder in the 24 hours before an assignment is due to each student who hasn''t replied, never in quiet hours (MUST-1d, CALM-7d).';

/* ---------- 5. The thread page and the teacher's panel ---------- */

-- forum_thread_header_json(): unchanged except that it answers 'due_at' (was 'due_on').
CREATE OR REPLACE FUNCTION public.forum_thread_header_json(target forum_threads)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
  select jsonb_build_object(
    'id', target.id,
    'number', target.thread_number,
    'title', target.title,
    'forum_slug', (select forums.slug from public.forums where forums.id = target.forum_id),
    'space', (select jsonb_build_object('slug', space.slug, 'name', space.name)
              from public.space_of_forum(target.forum_id) as space where space.id is not null),
    'author', public.forum_person_json(target.user_id),
    'is_mine', target.user_id = (select auth.uid()),
    -- GAPS-16a: whether the reader follows this thread (false when signed out).
    'is_following', exists (select 1 from public.forum_thread_follows as follows
                            where follows.thread_id = target.id
                              and follows.user_id = (select auth.uid())),
    'state', case when public.moderated_state_of('forum_thread', target.id) = 'hidden' then 'hidden' else 'live' end,
    'created_at', target.created_at,
    'reply_count', greatest(public.forum_live_post_count(target.id) - 1, 0),
    'writer_count', (select count(distinct forum_posts.user_id)::integer from public.forum_posts
                     where forum_posts.thread_id = target.id
                       and public.forum_post_state_for_caller(forum_posts) in ('live', 'hidden')),
    'last_post_at', target.last_post_at,
    -- GAPS-16d: how many times the thread was opened, a total only (never who).
    'view_count', coalesce((select views.total from public.forum_thread_views as views
                            where views.thread_id = target.id), 0),
    'last_post_number', target.last_post_number,
    -- MUST-1d, CALM-7d: the moment a class assignment is due (null for every other thread).
    'due_at', target.due_at,
    'is_sticky', target.is_sticky,
    'lock', case when target.locked_at is null then null
                 else jsonb_build_object('locked_at', target.locked_at, 'reason', target.lock_reason,
                                         -- GAPS-9: where the conversation carries on.
                                         'next', public.forum_thread_pointer_json(target.continues_in_thread_id)) end,
    'can_reply', (select auth.uid()) is not null and target.locked_at is null and public.is_active_member()
                 and coalesce((select public.space_may_post(space) from public.space_of_forum(target.forum_id) as space
                               where space.id is not null), true),
    -- IDEAS-3f: the reply that answered it, linked at the top of the thread (criterion 1).
    'answer', (select jsonb_build_object('number', answer.post_number,
                                         'author', public.forum_person_json(answer.user_id))
               from public.forum_answer_post(target) as answer where answer.id is not null),
    'can_moderate', (select auth.uid()) is not null and (
                      public.staff_may('moderation', 'act')
                      or coalesce((select public.space_may_act(space, 'posts') from public.space_of_forum(target.forum_id) as space
                                   where space.id is not null), false)),
    -- GAPS-9: this thread is the forum's rules thread.
    'is_rules', exists (select 1 from public.forums
                        where forums.id = target.forum_id and forums.rules_thread_id = target.id),
    -- GAPS-9: the forum's rules thread, for the strip above every other thread of the forum.
    'rules', (select public.forum_thread_pointer_json(rules_thread.id)
              from public.forums
              join public.forum_threads as rules_thread on rules_thread.id = forums.rules_thread_id
              where forums.id = target.forum_id and rules_thread.id <> target.id
                and rules_thread.forum_id = forums.id));
$$;


-- class_thread_replies(): unchanged except for 'due_at' and each reply's 'is_late'.
CREATE OR REPLACE FUNCTION public.class_thread_replies(target_thread_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  class_space public.spaces;
  due timestamptz;
begin
  -- Step 1: find the class space the thread lives in (a space's forum carries its space_id).
  select spaces.* into class_space
  from public.forum_threads
  join public.forums on forums.id = forum_threads.forum_id
  join public.spaces on spaces.id = forums.space_id
  where forum_threads.id = target_thread_id
    and forum_threads.deleted_at is null
    and spaces.kind = 'class';
  -- Step 2: not a class thread, or not the teacher (or someone acting for them): nothing to show.
  if class_space.id is null or not public.space_may_act(class_space, 'members') then
    return null;
  end if;
  -- MUST-1d: the assignment's due moment, to mark the replies that came after it.
  select forum_threads.due_at into due from public.forum_threads
  where forum_threads.id = target_thread_id;
  -- Step 3: every active member but the owner, marked by whether they have a live post here.
  return (
    with members as (
      select profiles.handle,
             public.display_name(profiles.handle, profiles.pen_name) as display_name,
             exists (select 1 from public.forum_posts
                     where forum_posts.thread_id = target_thread_id
                       and forum_posts.user_id = space_members.user_id
                       and forum_posts.deleted_at is null) as has_replied,
             -- MUST-1d, CALM-7d: a first reply after the due moment is "after the due date";
             -- only this teacher-only panel shows it.
             coalesce(due < (select min(forum_posts.created_at)
                             from public.forum_posts
                             where forum_posts.thread_id = target_thread_id
                               and forum_posts.user_id = space_members.user_id
                               and forum_posts.deleted_at is null), false) as is_late
      from public.space_members
      join public.profiles on profiles.id = space_members.user_id
      where space_members.space_id = class_space.id
        and space_members.status = 'active'
        and space_members.role <> 'owner'
        and profiles.deleted_at is null
    )
    select jsonb_build_object(
      'due_at', due,
      'replied', coalesce(jsonb_agg(jsonb_build_object('handle', handle, 'display_name', display_name,
                                                       'is_late', is_late)
                   order by lower(display_name), handle) filter (where has_replied), '[]'::jsonb),
      'not_yet', coalesce(jsonb_agg(jsonb_build_object('handle', handle, 'display_name', display_name)
                   order by lower(display_name), handle) filter (where not has_replied), '[]'::jsonb))
    from members);
end;
$$;

/* ---------- 6. The old column goes last ---------- */

drop index public.forum_threads_due_on_idx;
alter table public.forum_threads drop column due_on;
