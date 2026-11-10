/*
 * Migration: a forum's rules thread and a locked thread that points to the next one (bundle
 * GAPS-9; story S1-E8-05; design/boards/Thread.dc.html: the strip "Pinned | First chapters: read
 * this before you post. | Post up to 2,000 words at a time… | Locked: read only" above a thread,
 * and "Go to the October prompt" on a locked thread).
 *
 * What it adds:
 * - forums.rules_thread_id: the one thread of a forum that holds its rules. Every other thread of
 *   that forum shows it in a strip at the top. Empty for a forum with no rules thread.
 * - forum_threads.continues_in_thread_id: where the conversation carries on after a lock. Only a
 *   locked thread can have one; unlocking takes it away.
 * - admin_set_forum_rules_thread() and admin_set_forum_thread_next(): the two moderator changes.
 *   Both go through forum_thread_for_moderation() (moderation staff, or a space moderator with
 *   the posts power; a reason is required) and log_thread_moderation() (the audit log, or the
 *   space's log), in the same transaction (architecture 1.8.1).
 * - forum_thread_header_json() also answers "is_rules", "rules" and the lock's "next". Each is
 *   drawn for the caller: a rules thread or a next thread the caller may not open is left out,
 *   so a pointer never tells anyone a hidden thread's title.
 * - admin_unlock_forum_thread() also clears the pointer.
 * No new table or policy: both columns are read only through the forum functions.
 * Who calls it: the thread page (src/features/forums/). What it calls: the forum helpers of
 * S1-E8-02, S1-E8-05 and S1-E8-07.
 */

/* ---------- 1. The two columns ---------- */

alter table public.forums
  add column rules_thread_id uuid references public.forum_threads (id) on delete set null;
comment on column public.forums.rules_thread_id is
  'The thread that holds this forum''s rules, shown in a strip above its other threads (GAPS-9).';
create index forums_rules_thread_id_fk_idx on public.forums using btree (rules_thread_id);

alter table public.forum_threads
  add column continues_in_thread_id uuid references public.forum_threads (id) on delete set null,
  -- A thread can't send its readers back to itself.
  add constraint forum_threads_next_is_another check (continues_in_thread_id is distinct from id),
  -- Only a locked thread points on: an open one still takes replies where it is.
  add constraint forum_threads_next_needs_lock check (continues_in_thread_id is null or locked_at is not null);
comment on column public.forum_threads.continues_in_thread_id is
  'Where the conversation carries on after this thread was locked (GAPS-9); null when nowhere.';
create index forum_threads_continues_in_thread_id_fk_idx on public.forum_threads using btree (continues_in_thread_id);

/* ---------- 2. The moderator changes ---------- */

/**
 * admin_set_forum_rules_thread: makes a thread its forum's rules thread, or stops it being that.
 * Inputs: thread_number; is_rules (true to make it the rules thread, false to stop); reason.
 * Returns: nothing.
 * Errors: 42501 for anyone but moderation staff or a space moderator with the posts power; P0002
 *   (hint thread:missing) for a thread that isn't there; 23514 (hint reason:empty or
 *   reason:too_long) for a bad reason.
 * Where it fits: the moderator tools on a thread page. Making a thread the rules thread also pins
 *   it, so the forum's list shows the rules first; a forum has one rules thread, so the earlier
 *   one (if any) stops being it. Stopping leaves the pin as it is.
 */
create or replace function public.admin_set_forum_rules_thread(thread_number bigint, is_rules boolean, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.forum_threads := public.forum_thread_for_moderation(thread_number, reason);
  previous_rules_thread_id uuid;
  -- A missing answer counts as "stop", the change that can't take anything from another thread.
  make_rules boolean := coalesce(is_rules, false);
begin
  -- Step 1: what the forum had before, for the log.
  select forums.rules_thread_id into previous_rules_thread_id
  from public.forums where forums.id = thread.forum_id for update;
  -- Step 2: make the change.
  if make_rules then
    update public.forums set rules_thread_id = thread.id where forums.id = thread.forum_id;
    update public.forum_threads set is_sticky = true where forum_threads.id = thread.id;
  else
    -- Only this thread's own mark is taken away, never another thread's.
    update public.forums set rules_thread_id = null
    where forums.id = thread.forum_id and forums.rules_thread_id = thread.id;
  end if;
  -- Step 3: log it with the reason.
  perform public.log_thread_moderation(thread,
    case when make_rules then 'rules_set' else 'rules_removed' end, reason,
    jsonb_build_object('rules_thread_id', previous_rules_thread_id, 'is_sticky', thread.is_sticky),
    jsonb_build_object(
      'rules_thread_id', case when make_rules then thread.id
                              when previous_rules_thread_id = thread.id then null
                              else previous_rules_thread_id end,
      'is_sticky', thread.is_sticky or make_rules));
end;
$$;
comment on function public.admin_set_forum_rules_thread(bigint, boolean, text) is
  'Makes a thread its forum''s rules thread (and pins it), or stops it; moderators; logged (GAPS-9).';
revoke execute on function public.admin_set_forum_rules_thread(bigint, boolean, text) from public, anon;
grant execute on function public.admin_set_forum_rules_thread(bigint, boolean, text) to authenticated;

/**
 * admin_set_forum_thread_next: points a locked thread at the thread where the conversation
 * carries on, or takes the pointer away.
 * Inputs: thread_number (the locked thread); reason; next_thread_number (the thread to point at;
 *   left out or null to take the pointer away).
 * Returns: nothing.
 * Errors: 42501, P0002 (thread:missing) and 23514 (reason:…) as every thread change; 23514 with
 *   hint thread:not_locked for an open thread, next:same for a thread pointing at itself; P0002
 *   with hint next:missing when the other thread isn't there or the caller may not open it (the
 *   same answer for both, so a thread number never tells a moderator of one space what exists in
 *   another).
 * Where it fits: the moderator tools on a locked thread; LockedThreadNote shows the link.
 */
create or replace function public.admin_set_forum_thread_next(thread_number bigint, reason text, next_thread_number bigint default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.forum_threads := public.forum_thread_for_moderation(thread_number, reason);
  next_thread public.forum_threads;
begin
  -- Step 1: only a locked thread points on.
  if thread.locked_at is null then
    raise exception 'Lock the thread first.' using errcode = 'check_violation', hint = 'thread:not_locked';
  end if;
  -- Step 2: find the other thread, when one is named.
  if next_thread_number is not null then
    select * into next_thread from public.forum_threads
    where forum_threads.thread_number = next_thread_number and forum_threads.deleted_at is null;
    if next_thread.id is null or not public.forum_thread_is_shown(next_thread) then
      raise exception 'That thread isn''t there.' using errcode = 'no_data_found', hint = 'next:missing';
    end if;
    if next_thread.id = thread.id then
      raise exception 'A thread can''t point at itself.' using errcode = 'check_violation', hint = 'next:same';
    end if;
  end if;
  -- Step 3: save and log.
  update public.forum_threads set continues_in_thread_id = next_thread.id where forum_threads.id = thread.id;
  perform public.log_thread_moderation(thread,
    case when next_thread.id is null then 'next_removed' else 'next_set' end, reason,
    jsonb_build_object('continues_in_thread_id', thread.continues_in_thread_id),
    jsonb_build_object('continues_in_thread_id', next_thread.id));
end;
$$;
comment on function public.admin_set_forum_thread_next(bigint, text, bigint) is
  'Points a locked thread at the thread that carries on, or takes the pointer away; moderators; logged (GAPS-9).';
revoke execute on function public.admin_set_forum_thread_next(bigint, text, bigint) from public, anon;
grant execute on function public.admin_set_forum_thread_next(bigint, text, bigint) to authenticated;

/**
 * admin_unlock_forum_thread: as in S1-E8-05, and the pointer goes with the lock.
 * Inputs: thread_number; reason. Returns: nothing. Errors: as every thread change.
 * Where it fits: the moderator tools; an open thread takes replies where it is, so it no longer
 *   sends readers elsewhere (GAPS-9).
 */
create or replace function public.admin_unlock_forum_thread(thread_number bigint, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.forum_threads := public.forum_thread_for_moderation(thread_number, reason);
begin
  update public.forum_threads
  set locked_at = null, locked_by_user_id = null, lock_reason = null, continues_in_thread_id = null
  where forum_threads.id = thread.id;
  perform public.log_thread_moderation(thread, 'unlocked', reason,
    jsonb_build_object('locked_at', thread.locked_at, 'lock_reason', thread.lock_reason,
                       'continues_in_thread_id', thread.continues_in_thread_id),
    jsonb_build_object('locked_at', null, 'lock_reason', null, 'continues_in_thread_id', null));
end;
$$;

/* ---------- 3. What a thread's heading answers ---------- */

/**
 * forum_thread_pointer_json: one thread as another thread links to it.
 * Inputs: pointed_thread_id (may be null).
 * Returns: JSON {number, title, forum_slug, summary, is_locked}, or null when there is no such
 *   live thread or the caller may not open it. "summary" is the first post's words as a short
 *   plain line, or null when the caller can't read that post.
 * Where it fits: internal, called by forum_thread_header_json() for the rules strip and for a
 *   locked thread's "Go to …" link.
 */
create or replace function public.forum_thread_pointer_json(pointed_thread_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'number', pointed.thread_number,
    'title', pointed.title,
    'forum_slug', (select forums.slug from public.forums where forums.id = pointed.forum_id),
    'summary', (select public.forum_search_snippet(first_post.body) from public.forum_posts as first_post
                where first_post.thread_id = pointed.id and first_post.post_number = 1
                  and public.forum_post_state_for_caller(first_post) = 'live'),
    'is_locked', pointed.locked_at is not null)
  from public.forum_threads as pointed
  where pointed.id = pointed_thread_id and public.forum_thread_is_shown(pointed);
$$;
comment on function public.forum_thread_pointer_json(uuid) is
  'Internal: a thread as another links to it, or null when the caller may not open it (GAPS-9).';
revoke execute on function public.forum_thread_pointer_json(uuid) from public, anon, authenticated;

/**
 * forum_thread_header_json: as in S1-E8-05 and IDEAS-3f, plus the rules strip and the pointer.
 * Inputs: target, the thread.
 * Returns: the heading's JSON. New since GAPS-9: "is_rules" (this thread is its forum's rules
 *   thread), "rules" (the forum's rules thread when it is another thread the caller may open,
 *   else null) and "lock.next" (where a locked thread carries on, when the caller may open it).
 * Where it fits: internal, called by forum_thread().
 */
create or replace function public.forum_thread_header_json(target public.forum_threads)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target.id,
    'number', target.thread_number,
    'title', target.title,
    'forum_slug', (select forums.slug from public.forums where forums.id = target.forum_id),
    'space', (select jsonb_build_object('slug', space.slug, 'name', space.name)
              from public.space_of_forum(target.forum_id) as space where space.id is not null),
    'author', public.forum_person_json(target.user_id),
    'is_mine', target.user_id = (select auth.uid()),
    'state', case when public.moderated_state_of('forum_thread', target.id) = 'hidden' then 'hidden' else 'live' end,
    'created_at', target.created_at,
    'reply_count', greatest(public.forum_live_post_count(target.id) - 1, 0),
    'writer_count', (select count(distinct forum_posts.user_id)::integer from public.forum_posts
                     where forum_posts.thread_id = target.id
                       and public.forum_post_state_for_caller(forum_posts) in ('live', 'hidden')),
    'last_post_at', target.last_post_at,
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
  'Internal: a thread''s heading, numbers, sticky, lock, rules strip and pointer, never a user ID (S1-E8-02, S1-E8-05, GAPS-9).';
