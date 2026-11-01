/*
 * Sticky and locked threads, and replying without bumping (bundle FORUMS-1, part e; story
 * S1-E8-05; boards 5.1 Forums and 5.2 Forum thread).
 *
 * What it adds:
 * - forum_threads.is_sticky: a moderator pins a thread to the top of its forum (criterion 1). The
 *   rest stay in order of latest activity; there is no popularity ranking in the forums (Q45).
 * - forum_threads.locked_at, locked_by_user_id and lock_reason: a moderator locks a thread with a
 *   reason; everyone can still read it, nobody can reply, and the reason shows (criterion 2).
 * - admin_set_forum_thread_sticky(), admin_lock_forum_thread() and admin_unlock_forum_thread():
 *   moderation staff only, each written to the audit log in the same transaction (B27).
 * - forum_threads.bumped_at and reply_to_forum_thread(…, bump): the list is now ordered by
 *   bumped_at, and "Don't bump" posts the reply without moving the thread up its forum's list
 *   (criterion 3). last_post_at still says when the newest post was written, so "Latest post"
 *   and the read and unread shortcuts from part d stay true.
 * - forum_thread_list(), forum_thread_summary_json() and forum_thread_header_json() now carry
 *   sticky and locked, and the list puts sticky threads first.
 * Who calls it: src/features/forums (ThreadList, ThreadPage, ThreadModeration, ReplyForm).
 */

/* ---------- 1. Columns ---------- */

alter table public.forum_threads
  -- Pinned to the top of its forum by a moderator (criterion 1).
  add column is_sticky boolean not null default false,
  -- Locked by a moderator: readable, no replies (criterion 2).
  add column locked_at timestamptz,
  -- The moderator who locked it; shown only as "the moderation team".
  add column locked_by_user_id uuid references public.profiles (id),
  -- Why, shown to everyone on the thread.
  add column lock_reason text,
  -- When the thread last moved up its forum's list: every reply, unless "Don't bump" (criterion 3).
  add column bumped_at timestamptz not null default now(),
  add constraint forum_threads_lock_is_whole check (
    (locked_at is null and lock_reason is null)
    or (locked_at is not null and lock_reason is not null and btrim(lock_reason) <> '' and char_length(lock_reason) <= 500));
comment on column public.forum_threads.is_sticky is 'Pinned to the top of its forum by a moderator (S1-E8-05).';
comment on column public.forum_threads.locked_at is 'When a moderator locked it; null while open (S1-E8-05).';
comment on column public.forum_threads.locked_by_user_id is 'The moderator who locked it; never shown, the thread says "the moderation team".';
comment on column public.forum_threads.lock_reason is 'Why it was locked, shown on the thread (S1-E8-05).';
comment on column public.forum_threads.bumped_at is
  'When the thread last moved up its forum''s list; orders the list (Q45, S1-E8-05). A reply with "Don''t bump" leaves it.';
-- Existing threads keep their place: they were ordered by their latest post until now.
update public.forum_threads set bumped_at = last_post_at;
create index forum_threads_forum_bumped on public.forum_threads (forum_id, bumped_at desc) where deleted_at is null;
create index forum_threads_forum_sticky on public.forum_threads (forum_id) where is_sticky and deleted_at is null;

/* ---------- 2. Moderators pin and lock ---------- */

/**
 * forum_thread_for_moderation: a thread for a moderator to change, locked for the change.
 * Inputs: thread_number; reason (required, at most 500 characters).
 * Returns: the thread row.
 * Errors: insufficient_privilege unless moderation staff (staff_may('moderation', 'act'));
 *   check_violation (hint 'reason:empty' or 'reason:too_long'); no_data_found (hint
 *   'thread:missing').
 * Internal: the three admin functions below.
 */
create or replace function public.forum_thread_for_moderation(thread_number bigint, reason text)
returns public.forum_threads
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.forum_threads;
begin
  -- Step 1: moderation staff only (architecture 1.8.1: the server decides, not the menu).
  if not public.staff_may('moderation', 'act') then
    raise exception 'Only moderators can do that.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: every staff change needs a reason (architecture 1.8.4).
  if reason is null or btrim(reason) = '' then
    raise exception 'Say why.' using errcode = 'check_violation', hint = 'reason:empty';
  end if;
  if char_length(btrim(reason)) > 500 then
    raise exception 'Keep the reason under 500 characters.' using errcode = 'check_violation', hint = 'reason:too_long';
  end if;
  -- Step 3: the live thread, locked for the change.
  select * into thread from public.forum_threads
  where forum_threads.thread_number = forum_thread_for_moderation.thread_number and forum_threads.deleted_at is null
  for update;
  if thread.id is null then
    raise exception 'That thread isn''t there any more.' using errcode = 'no_data_found', hint = 'thread:missing';
  end if;
  return thread;
end;
$$;
comment on function public.forum_thread_for_moderation(bigint, text) is
  'Internal: a live thread for moderation staff to change, with a reason (S1-E8-05).';
revoke execute on function public.forum_thread_for_moderation(bigint, text) from public, anon, authenticated;

/**
 * admin_set_forum_thread_sticky: pins a thread to the top of its forum, or unpins it.
 * Inputs: thread_number; is_sticky; reason (for the audit log).
 * Errors: as forum_thread_for_moderation().
 * Who calls it: a moderator's "Make sticky" / "Remove sticky" on the thread page.
 */
create or replace function public.admin_set_forum_thread_sticky(thread_number bigint, is_sticky boolean, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.forum_threads := public.forum_thread_for_moderation(thread_number, reason);
begin
  update public.forum_threads set is_sticky = admin_set_forum_thread_sticky.is_sticky where forum_threads.id = thread.id;
  perform public.log_staff_action(
    case when is_sticky then 'forum_thread.made_sticky' else 'forum_thread.sticky_removed' end,
    'forum_threads', thread.id::text, thread.user_id, btrim(reason),
    jsonb_build_object('is_sticky', thread.is_sticky), jsonb_build_object('is_sticky', is_sticky));
end;
$$;
comment on function public.admin_set_forum_thread_sticky(bigint, boolean, text) is
  'Pins a forum thread to the top of its forum, or unpins it; moderation staff; logged (S1-E8-05).';
revoke execute on function public.admin_set_forum_thread_sticky(bigint, boolean, text) from public, anon;
grant execute on function public.admin_set_forum_thread_sticky(bigint, boolean, text) to authenticated;

/**
 * admin_lock_forum_thread: locks a thread: everyone can still read it, nobody can reply, and the
 * reason shows on the thread (criterion 2).
 * Inputs: thread_number; reason (shown publicly and written to the audit log).
 * Errors: as forum_thread_for_moderation().
 * Who calls it: a moderator's "Lock thread" on the thread page.
 */
create or replace function public.admin_lock_forum_thread(thread_number bigint, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread public.forum_threads := public.forum_thread_for_moderation(thread_number, reason);
begin
  update public.forum_threads
  set locked_at = now(), locked_by_user_id = (select auth.uid()), lock_reason = btrim(reason)
  where forum_threads.id = thread.id;
  perform public.log_staff_action(
    'forum_thread.locked', 'forum_threads', thread.id::text, thread.user_id, btrim(reason),
    jsonb_build_object('locked_at', thread.locked_at, 'lock_reason', thread.lock_reason),
    jsonb_build_object('locked_at', now(), 'lock_reason', btrim(reason)));
end;
$$;
comment on function public.admin_lock_forum_thread(bigint, text) is
  'Locks a forum thread with a public reason; moderation staff; logged (S1-E8-05).';
revoke execute on function public.admin_lock_forum_thread(bigint, text) from public, anon;
grant execute on function public.admin_lock_forum_thread(bigint, text) to authenticated;

/**
 * admin_unlock_forum_thread: opens a locked thread for replies again.
 * Inputs: thread_number; reason (for the audit log).
 * Errors: as forum_thread_for_moderation().
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
  update public.forum_threads set locked_at = null, locked_by_user_id = null, lock_reason = null
  where forum_threads.id = thread.id;
  perform public.log_staff_action(
    'forum_thread.unlocked', 'forum_threads', thread.id::text, thread.user_id, btrim(reason),
    jsonb_build_object('locked_at', thread.locked_at, 'lock_reason', thread.lock_reason),
    jsonb_build_object('locked_at', null, 'lock_reason', null));
end;
$$;
comment on function public.admin_unlock_forum_thread(bigint, text) is
  'Opens a locked forum thread for replies again; moderation staff; logged (S1-E8-05).';
revoke execute on function public.admin_unlock_forum_thread(bigint, text) from public, anon;
grant execute on function public.admin_unlock_forum_thread(bigint, text) to authenticated;

/* ---------- 3. Replying: locked threads and "Don't bump" ---------- */

-- Part c's three-argument version goes, so the API has one reply function.
drop function public.reply_to_forum_thread(bigint, text, uuid[]);

/**
 * reply_to_forum_thread: adds a post at the end of a thread, quoting other posts if asked.
 * Inputs: thread_number; body (the Markdown subset); quoted_posts (default none); bump (default
 *   true; false for "Don't bump": the thread keeps its place in its forum's list, criterion 3).
 * Returns: JSON {"post_number"}: the new post's number, for its permalink.
 * Rules: require_forum_writer(); a thread the caller may open and that isn't locked (criterion
 *   2); the text passes its check; the quotes pass forum_quotes_for_reply(). The thread's row is
 *   locked while the number is taken, so two replies at once get #7 and #8, never both #7.
 * Errors: insufficient_privilege; program_limit_exceeded; no_data_found (hint 'thread:missing');
 *   check_violation (hint 'thread:locked', the text's hints, 'quote:missing', 'quote:too_many').
 */
create or replace function public.reply_to_forum_thread(
  thread_number bigint,
  body text,
  quoted_posts uuid[] default '{}',
  bump boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_forum_writer();
  clean_body text := public.check_forum_post_text(body);
  thread public.forum_threads;
  quotes uuid[];
  new_number integer;
begin
  -- Step 1: the thread, locked, if the caller may open it.
  select * into thread from public.forum_threads
  where forum_threads.thread_number = reply_to_forum_thread.thread_number
  for update;
  if thread.id is null or not public.forum_thread_is_shown(thread) then
    raise exception 'That thread isn''t there any more.' using errcode = 'no_data_found', hint = 'thread:missing';
  end if;
  -- Step 2: a locked thread takes no replies (criterion 2).
  if thread.locked_at is not null then
    raise exception 'This thread is locked.' using errcode = 'check_violation', hint = 'thread:locked';
  end if;
  -- Step 3: the quotes, checked and in thread order.
  quotes := public.forum_quotes_for_reply(thread.id, quoted_posts);
  -- Step 4: the next number and the post. Only a bumping reply moves the thread up its forum;
  -- last_post_at always moves, because it says when the newest post was written.
  new_number := thread.last_post_number + 1;
  insert into public.forum_posts (user_id, thread_id, post_number, body, quoted_post_ids)
  values (caller_id, thread.id, new_number, clean_body, quotes);
  update public.forum_threads
  set last_post_number = new_number,
      last_post_at = now(),
      bumped_at = case when coalesce(bump, true) then now() else forum_threads.bumped_at end
  where forum_threads.id = thread.id;
  return jsonb_build_object('post_number', new_number);
end;
$$;
comment on function public.reply_to_forum_thread(bigint, text, uuid[], boolean) is
  'Adds a numbered post at the end of an open thread, with any quotes, bumping it unless asked not to (S1-E8-02, S1-E8-03, S1-E8-05).';
revoke execute on function public.reply_to_forum_thread(bigint, text, uuid[], boolean) from public, anon;
grant execute on function public.reply_to_forum_thread(bigint, text, uuid[], boolean) to authenticated;

/* ---------- 4. Reading: sticky and locked ---------- */

/**
 * forum_thread_summary_json: one thread as a forum's list shows it (as in part d, plus is_sticky,
 *   is_locked and bumped_at, so the list draws the Pinned and Locked pills, criteria 1 and 2,
 *   and "Show more threads" knows where it stopped).
 * Input: the thread row. Returns: JSON with number, title, author, created_at, reply_count,
 *   last_post_at, bumped_at, last_poster, is_unread (null when signed out), first_unread_post,
 *   is_sticky and is_locked.
 * Internal: forum_thread_list().
 */
create or replace function public.forum_thread_summary_json(target public.forum_threads)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  first_unread integer := public.forum_first_unread_post(target);
begin
  return jsonb_build_object(
    'number', target.thread_number,
    'title', target.title,
    'author', public.forum_person_json(target.user_id),
    'created_at', target.created_at,
    'reply_count', greatest(public.forum_live_post_count(target.id) - 1, 0),
    'last_post_at', target.last_post_at,
    'bumped_at', target.bumped_at,
    'last_poster', (select public.forum_person_json(latest.user_id) from public.forum_posts as latest
                    where latest.thread_id = target.id
                      and public.forum_post_state_for_caller(latest) in ('live', 'hidden')
                    order by latest.post_number desc limit 1),
    'is_unread', case when (select auth.uid()) is null then null else first_unread is not null end,
    'first_unread_post', first_unread,
    'is_sticky', target.is_sticky,
    'is_locked', target.locked_at is not null);
end;
$$;
comment on function public.forum_thread_summary_json(public.forum_threads) is
  'Internal: one thread as a forum''s list shows it, with whether it is new, pinned or locked; never a user ID (S1-E8-02, S1-E8-04, S1-E8-05).';
revoke execute on function public.forum_thread_summary_json(public.forum_threads) from public, anon, authenticated;

/**
 * forum_thread_list: one page of a forum's threads: sticky threads first, then the rest by
 *   latest activity (Q45; criterion 1).
 * Inputs: forum_slug; older_than (null for the first page; the bumped_at of the last thread
 *   shown, for "Show more threads").
 * Returns: JSON {"threads": [forum_thread_summary_json()...], "has_more"}, or null when there is
 *   no such live forum. The first page holds every sticky thread, then a page of the others;
 *   later pages hold only the others, so a sticky thread never shows twice. has_more counts
 *   only the others.
 * Who may call it: anyone, signed out included.
 */
create or replace function public.forum_thread_list(forum_slug text, older_than timestamptz default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  forum public.forums;
  page_size integer := coalesce((public.setting_value('forum_threads_page_size'))::integer, 25);
  pinned jsonb := '[]'::jsonb;
  page jsonb;
  page_count integer;
begin
  -- Step 1: the forum, if it is live.
  select * into forum from public.forums where forums.slug = forum_thread_list.forum_slug and forums.deleted_at is null;
  if forum.id is null then
    return null;
  end if;
  -- Step 2: on the first page only, every sticky thread the caller may open, latest first.
  if older_than is null then
    select coalesce(jsonb_agg(public.forum_thread_summary_json(forum_threads) order by forum_threads.bumped_at desc), '[]'::jsonb)
    into pinned
    from public.forum_threads
    where forum_threads.forum_id = forum.id and forum_threads.is_sticky
      and public.forum_thread_is_shown(forum_threads);
  end if;
  -- Step 3: one page of the other threads (one extra, to know whether there is more).
  with listed as (
    select forum_threads.* from public.forum_threads
    where forum_threads.forum_id = forum.id
      and not forum_threads.is_sticky
      and (older_than is null or forum_threads.bumped_at < older_than)
      and public.forum_thread_is_shown(forum_threads)
    order by forum_threads.bumped_at desc
    limit page_size + 1
  )
  select coalesce(jsonb_agg(public.forum_thread_summary_json(listed) order by listed.bumped_at desc), '[]'::jsonb),
         count(*)::integer
  into page, page_count
  from listed;
  -- Step 4: the answer; the extra thread only says there is more.
  if page_count > page_size then
    page := page - page_size;
  end if;
  return jsonb_build_object('threads', pinned || page, 'has_more', page_count > page_size);
end;
$$;
comment on function public.forum_thread_list(text, timestamptz) is
  'One page of a forum''s threads, sticky first, then latest activity; never a user ID (S1-E8-02, S1-E8-05).';
grant execute on function public.forum_thread_list(text, timestamptz) to anon, authenticated;

/**
 * forum_thread_header_json: a thread's heading and side panel (as in part b, plus sticky and
 *   locked).
 * Input: the thread row. Returns: JSON with id (for Report), number, title, forum_slug, author,
 *   is_mine, state, created_at, reply_count, writer_count, last_post_at, last_post_number,
 *   is_sticky, lock (null while open; {"locked_at", "reason"} when locked, never who locked it:
 *   the thread says "the moderation team"), can_reply (signed in, the account gate lets them
 *   write and the thread is open, criterion 2) and can_moderate (moderation staff: the page
 *   shows Make sticky, Lock and Unlock; the server checks again on every change).
 * Internal: forum_thread().
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
                 else jsonb_build_object('locked_at', target.locked_at, 'reason', target.lock_reason) end,
    'can_reply', (select auth.uid()) is not null and target.locked_at is null and public.is_active_member(),
    'can_moderate', (select auth.uid()) is not null and public.staff_may('moderation', 'act'));
$$;
comment on function public.forum_thread_header_json(public.forum_threads) is
  'Internal: a thread''s heading, numbers, sticky and lock, never a user ID (S1-E8-02, S1-E8-05).';
revoke execute on function public.forum_thread_header_json(public.forum_threads) from public, anon, authenticated;
