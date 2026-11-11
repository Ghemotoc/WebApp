/*
 * Migration: how many times a forum thread was opened (bundle GAPS-16, part d; story S1-E8-02;
 * board 5.2, "Views" under "This thread").
 *
 * How it works: when someone opens a thread page, the page asks once per tab to add one to the
 * thread's total. Only the total is kept: never who opened it, when, or from where (no reader
 * records, as with chapter reads, S1-E4-01a; CLAUDE.md rules 7 and 12). The side column shows the
 * number as "Views".
 * What it adds:
 * - forum_thread_views: one total per thread (kind: platform; no user_id, because no row is about
 *   a person). Moderation staff may read it; everyone else sees it only through the thread page.
 * - record_forum_thread_view(thread_number): adds one, for visitors and members alike, but not
 *   for the thread's starter, and only for a thread the caller may open.
 * - forum_thread_header_json() gains 'view_count'.
 * Who calls it: src/features/forums/ (useRecordThreadView in ThreadPage; ThreadSidePanel).
 * Rules: a total is a number for people to read, never an input to ranking. A script could push
 *   it up (nothing about the caller is kept to stop that); the tab-once rule stops ordinary
 *   reloads.
 * Tests: supabase/tests/database/345-thread-views.test.sql.
 */

create table public.forum_thread_views (
  thread_id uuid primary key references public.forum_threads (id) on delete cascade,
  total bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint forum_thread_views_total_not_negative check (total >= 0)
);
comment on table public.forum_thread_views is
  'kind: platform. How many times each forum thread was opened: a total only, never who (GAPS-16d).';
alter table public.forum_thread_views enable row level security;

-- Who: owner, admin and moderator in a staff session. Why: the totals help moderation see busy
-- threads; members read the number only through the thread page (forum_thread_header_json()).
-- Writes go only through record_forum_thread_view().
create policy forum_thread_views_select_moderation on public.forum_thread_views
  for select to authenticated
  using ((select public.staff_may('moderation', 'view')));

grant select on public.forum_thread_views to authenticated;

/**
 * record_forum_thread_view: adds one to a thread's view total.
 * Input: thread_number. Returns: true when it counted, false when it didn't (a thread the
 *   caller may not open, or their own thread).
 * Rules: visitors and members count; the thread's starter doesn't; nothing about the caller is
 *   kept (GAPS-16d). The page calls it once per tab per thread.
 * Errors: none; a thread that isn't there simply isn't counted.
 */
create or replace function public.record_forum_thread_view(thread_number bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.forum_threads;
begin
  -- Step 1: a thread the caller may open, and not their own.
  select * into thread from public.forum_threads
  where forum_threads.thread_number = record_forum_thread_view.thread_number;
  if thread.id is null or not public.forum_thread_is_shown(thread)
     or thread.user_id is not distinct from (select auth.uid()) then
    return false;
  end if;
  -- Step 2: one more on the total; nothing about the reader is kept.
  insert into public.forum_thread_views (thread_id, total) values (thread.id, 1)
  on conflict (thread_id) do update
  set total = public.forum_thread_views.total + 1, updated_at = now();
  return true;
end;
$$;
comment on function public.record_forum_thread_view(bigint) is
  'Adds one to a forum thread''s view total; keeps nothing about who opened it (GAPS-16d).';
revoke execute on function public.record_forum_thread_view(bigint) from public;
grant execute on function public.record_forum_thread_view(bigint) to anon, authenticated;

/* ---------- The thread page ---------- */

-- forum_thread_header_json(): unchanged except for 'view_count'.
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

comment on function public.forum_thread_header_json(public.forum_threads) is
  'Internal: a thread''s heading, numbers (views included), sticky, lock, rules strip, pointer and whether the reader follows it, never a user ID (S1-E8-02, S1-E8-05, GAPS-9, GAPS-16a, GAPS-16d).';
