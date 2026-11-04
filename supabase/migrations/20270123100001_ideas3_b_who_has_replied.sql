-- Migration: "Who has replied" for a class thread (bundle 14d IDEAS-3, part b; idea
-- IDEA-20261102-5).
--
-- What it adds: one read function, class_thread_replies(), that splits a class's members into
-- those who have posted in a thread and those who haven't yet, so a teacher can remind the ones
-- who haven't without counting by hand.
-- Who may read it: whoever holds the class's "members" power (the teacher who owns it, a space
-- moderator with that power, platform moderation staff), through space_may_act(). Everyone else,
-- students included, gets null and the thread page shows no panel (criterion 2).
-- Why it shows nothing new: the teacher already sees every post in the class and its member list;
-- this only does the counting. No new table, column or policy.
-- Called by: src/features/spaces/api/classThreadReplies.ts (the thread page's side column).

/**
 * class_thread_replies: who in a class has posted in one of its threads, and who hasn't yet.
 * Input: target_thread_id, the thread's ID (the thread page has it).
 * Returns: {"replied": [...], "not_yet": [...]}, each a list of {"handle", "display_name"} in
 *   name order; the class's owner is left out of both lists. Never the user ID or the age.
 *   Null when the thread isn't in a class space, has been deleted, or the caller may not use the
 *   class's "members" power, so a student learns nothing (criterion 2).
 * Errors: none. Where it fits: ClassRepliesPanel beside a class thread.
 */
create or replace function public.class_thread_replies(target_thread_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  class_space public.spaces;
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
  -- Step 3: every active member but the owner, marked by whether they have a live post here.
  return (
    with members as (
      select profiles.handle,
             public.display_name(profiles.handle, profiles.pen_name) as display_name,
             exists (select 1 from public.forum_posts
                     where forum_posts.thread_id = target_thread_id
                       and forum_posts.user_id = space_members.user_id
                       and forum_posts.deleted_at is null) as has_replied
      from public.space_members
      join public.profiles on profiles.id = space_members.user_id
      where space_members.space_id = class_space.id
        and space_members.status = 'active'
        and space_members.role <> 'owner'
        and profiles.deleted_at is null
    )
    select jsonb_build_object(
      'replied', coalesce(jsonb_agg(jsonb_build_object('handle', handle, 'display_name', display_name)
                   order by lower(display_name), handle) filter (where has_replied), '[]'::jsonb),
      'not_yet', coalesce(jsonb_agg(jsonb_build_object('handle', handle, 'display_name', display_name)
                   order by lower(display_name), handle) filter (where not has_replied), '[]'::jsonb))
    from members);
end;
$$;
comment on function public.class_thread_replies(uuid) is
  'Who in a class has posted in one of its threads and who hasn''t yet, for the teacher only (IDEAS-3b).';
revoke execute on function public.class_thread_replies(uuid) from public, anon;
grant execute on function public.class_thread_replies(uuid) to authenticated;
