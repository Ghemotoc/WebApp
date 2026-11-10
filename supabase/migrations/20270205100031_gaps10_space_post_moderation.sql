/*
 * Migration: a space's moderators hide and move posts (bundle GAPS-10, part b; story S1-E8-07;
 * design/boards/Space.dc.html: "Posts: hide or move posts… Every action is logged", and the
 * owner and our moderators can read the log).
 *
 * Until now the posts power only pinned and locked threads; anything else in a space went to our
 * moderation team as a report. This adds, for the owner and for moderators with the posts power:
 * - space_hide_forum_post() and space_show_forum_post(): hide a reply in their space, and show it
 *   again. A hide is a row in moderated_items like a staff hide (so search, counts and every read
 *   already leave the post out), marked with the space it belongs to (the new space_id column).
 *   The writer still sees their post, with a note that the space's moderators hid it.
 * - space_move_forum_post(): move a reply to another thread of the same space. A space has one
 *   forum, so "move" means to the right thread. The reply gets the next number in that thread
 *   (numbers are never reused) and is marked as moved (forum_posts.moved_from_thread_id).
 * Limits that keep the team in charge: a space hide never touches a post our team already hid or
 * removed; our team's later decision replaces a space hide (moderate_item()); a moderator can't
 * act on the owner's posts; the first post of a thread is neither hidden nor moved (lock the
 * thread, or report it). Every action needs a reason and is in the space's log in the same
 * transaction (architecture 1.8.1).
 * Also: forum_post_json() answers what the caller may do and who hid a post, and forum_quote_json()
 * answers the quoted post's thread, so a quote of a moved reply still links to it.
 * No new table or policy. Who calls it: PostSpaceModeration on the thread page
 * (src/features/forums/). What it calls: the space helpers of S1-E8-06 and S1-E8-07.
 */

/* ---------- 1. Columns ---------- */

alter table public.moderated_items
  add column space_id uuid references public.spaces (id);
comment on column public.moderated_items.space_id is
  'Set when a space''s owner or moderator hid the item (GAPS-10); null for our moderation team''s own decisions.';
create index moderated_items_space_id_fk_idx on public.moderated_items using btree (space_id);

alter table public.forum_posts
  add column moved_from_thread_id uuid references public.forum_threads (id) on delete set null;
comment on column public.forum_posts.moved_from_thread_id is
  'The thread a space moderator moved this reply out of (GAPS-10); null for a reply that never moved.';
create index forum_posts_moved_from_thread_id_fk_idx on public.forum_posts using btree (moved_from_thread_id);

/* ---------- 2. Who may act on a post ---------- */

/**
 * space_post_for_moderation: the reply a space moderator wants to change, checked.
 * Inputs: post_id; reason.
 * Returns: the post's row, locked for the change.
 * Errors: 42501 when the post isn't in a space, the caller has no posts power there or is
 *   suspended or banned, or a moderator acts on the owner's post (hint post:owner); P0002
 *   (post:missing) when the post or its thread is gone, or our team hid or removed the thread; 23514 with hint post:first for a thread's first post, reason:empty or
 *   reason:too_long for the reason.
 * Where it fits: internal, the first step of the three space post functions.
 */
create or replace function public.space_post_for_moderation(post_id uuid, reason text)
returns public.forum_posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  post public.forum_posts;
  thread public.forum_threads;
  space public.spaces;
begin
  -- Step 1: the reply and its thread, locked for the change (a deleted one too, so its space's
  -- moderators get "isn't there any more" instead of "not yours").
  select * into post from public.forum_posts where forum_posts.id = post_id for update;
  select * into thread from public.forum_threads where forum_threads.id = post.thread_id;
  space := public.space_of_forum(thread.forum_id);
  -- Step 2: only in a space, and only with the posts power there (the same answer when the post
  -- doesn't exist, so a post ID tells an outsider nothing). A suspended or banned account
  -- moderates nothing (the account gate, architecture 1.7.8); our team's accounts are staff
  -- accounts, which the gate doesn't count as members.
  if space.id is null or not public.space_may_act(space, 'posts')
     or not (public.is_active_member() or public.staff_may('moderation', 'act')) then
    raise exception 'Only this space''s moderators can do that.' using errcode = 'insufficient_privilege';
  end if;
  -- A deleted reply or thread is gone; a thread our moderation team hid or removed is the
  -- team's, and its replies stay as the case found them.
  if post.deleted_at is not null or thread.deleted_at is not null
     or public.is_moderated_away('forum_thread', thread.id) then
    raise exception 'That post isn''t there any more.' using errcode = 'no_data_found', hint = 'post:missing';
  end if;
  -- Step 3: the owner's posts are the owner's and our team's to deal with, never a moderator's.
  if post.user_id = space.user_id and space.user_id <> (select auth.uid())
     and not public.space_acts_as_platform(space) then
    raise exception 'A moderator can''t change the owner''s posts.' using errcode = 'insufficient_privilege', hint = 'post:owner';
  end if;
  -- Step 4: a thread's first post stays where it is: lock the thread, or report it.
  if post.post_number = 1 then
    raise exception 'The first post of a thread can''t be hidden or moved.' using errcode = 'check_violation', hint = 'post:first';
  end if;
  -- Step 5: every change needs a reason (architecture 1.8.4).
  if reason is null or btrim(reason) = '' then
    raise exception 'Say why.' using errcode = 'check_violation', hint = 'reason:empty';
  end if;
  if char_length(btrim(reason)) > 500 then
    raise exception 'Keep the reason under 500 characters.' using errcode = 'check_violation', hint = 'reason:too_long';
  end if;
  return post;
end;
$$;
comment on function public.space_post_for_moderation(uuid, text) is
  'Internal: a live reply in a space for its owner or a moderator with the posts power to change (GAPS-10).';
revoke execute on function public.space_post_for_moderation(uuid, text) from public, anon, authenticated;

/**
 * space_of_post: the space a post's thread lives in.
 * Inputs: target, the post. Returns: the space's row, or an empty row outside a space.
 * Where it fits: internal, for the three functions below and forum_post_json().
 */
create or replace function public.space_of_post(target public.forum_posts)
returns public.spaces
language sql
stable
security definer
set search_path = ''
as $$
  select public.space_of_forum((select forum_threads.forum_id from public.forum_threads
                                where forum_threads.id = target.thread_id));
$$;
comment on function public.space_of_post(public.forum_posts) is
  'Internal: the space a forum post''s thread lives in (GAPS-10).';
revoke execute on function public.space_of_post(public.forum_posts) from public, anon, authenticated;

/* ---------- 3. Hide and show again ---------- */

/**
 * space_hide_forum_post: hides a reply in the caller's space.
 * Inputs: post_id; reason (kept in the space's log).
 * Returns: nothing.
 * Errors: as space_post_for_moderation(); 23514 with hint post:already when the post is already
 *   hidden or removed, by the space or by our team.
 * Where it fits: "Hide" under a reply, for the owner and moderators with the posts power.
 */
create or replace function public.space_hide_forum_post(post_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  post public.forum_posts := public.space_post_for_moderation(post_id, reason);
  space public.spaces := public.space_of_post(post);
begin
  if public.moderated_state_of('forum_post', post.id) is not null then
    raise exception 'This post is already hidden.' using errcode = 'check_violation', hint = 'post:already';
  end if;
  insert into public.moderated_items (user_id, item_type, item_id, state, moderated_by_user_id, note, space_id)
  values (post.user_id, 'forum_post', post.id, 'hidden', (select auth.uid()), btrim(reason), space.id);
  perform public.log_space_action(space, 'post_hidden', post.user_id, post.thread_id, reason,
    jsonb_build_object('post_id', post.id, 'post_number', post.post_number));
end;
$$;
comment on function public.space_hide_forum_post(uuid, text) is
  'Hides a reply in a space; its owner or a moderator with the posts power; logged in the space''s log (GAPS-10).';
revoke execute on function public.space_hide_forum_post(uuid, text) from public, anon;
grant execute on function public.space_hide_forum_post(uuid, text) to authenticated;

/**
 * space_show_forum_post: shows again a reply the space's moderators hid.
 * Inputs: post_id; reason.
 * Returns: nothing.
 * Errors: as space_post_for_moderation(); 23514 with hint post:not_hidden when it isn't hidden,
 *   post:by_team when our moderation team hid or removed it (only a case or an appeal undoes that).
 * Where it fits: "Show again" under a hidden reply.
 */
create or replace function public.space_show_forum_post(post_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  post public.forum_posts := public.space_post_for_moderation(post_id, reason);
  space public.spaces := public.space_of_post(post);
  hide public.moderated_items;
begin
  select * into hide from public.moderated_items
  where moderated_items.item_type = 'forum_post' and moderated_items.item_id = post.id
    and moderated_items.restored_at is null
  for update;
  if hide.id is null then
    raise exception 'This post isn''t hidden.' using errcode = 'check_violation', hint = 'post:not_hidden';
  end if;
  if hide.space_id is distinct from space.id then
    raise exception 'Our moderation team hid this post.' using errcode = 'check_violation', hint = 'post:by_team';
  end if;
  update public.moderated_items
  set restored_at = now(), restored_by_user_id = (select auth.uid()), restore_reason = btrim(reason)
  where moderated_items.id = hide.id;
  perform public.log_space_action(space, 'post_shown', post.user_id, post.thread_id, reason,
    jsonb_build_object('post_id', post.id, 'post_number', post.post_number));
end;
$$;
comment on function public.space_show_forum_post(uuid, text) is
  'Shows again a reply a space''s moderators hid; never one our team hid; logged (GAPS-10).';
revoke execute on function public.space_show_forum_post(uuid, text) from public, anon;
grant execute on function public.space_show_forum_post(uuid, text) to authenticated;

/**
 * moderate_item: as in S1-E10-06, and our team's decision replaces a space's hide.
 * Inputs: item_type, item_id, owner_user_id, wanted_state, source_case_id, note_text.
 * Returns: the new moderated_items row's ID.
 * Errors: 23514 when our team already hid or removed the item.
 * Where it fits: internal, called by admin_decide_case(). GAPS-10: a hide by a space's
 *   moderators is ended first, so it never blocks the team from hiding or removing the same post.
 */
create or replace function public.moderate_item(item_type public.reportable_type, item_id uuid, owner_user_id uuid, wanted_state public.moderated_state, source_case_id uuid, note_text text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_row_id uuid;
begin
  -- A space's own hide gives way to the team's decision.
  update public.moderated_items
  set restored_at = now(), restored_by_user_id = (select auth.uid()),
      restore_reason = 'Replaced by a moderation team decision.'
  where moderated_items.item_type = moderate_item.item_type and moderated_items.item_id = moderate_item.item_id
    and moderated_items.restored_at is null and moderated_items.space_id is not null;
  if public.moderated_state_of(item_type, item_id) is not null then
    raise exception 'This item is already hidden or removed.' using errcode = 'check_violation';
  end if;
  insert into public.moderated_items (user_id, item_type, item_id, state, case_id, moderated_by_user_id, note)
  values (owner_user_id, item_type, item_id, wanted_state, source_case_id, (select auth.uid()), btrim(note_text))
  returning id into new_row_id;
  perform public.log_staff_action(
    'item.' || wanted_state::text, item_type::text, item_id::text, owner_user_id, btrim(note_text),
    null, jsonb_build_object('state', wanted_state, 'case_id', source_case_id)
  );
  return new_row_id;
end;
$$;

/* ---------- 4. Move a reply to another thread of the space ---------- */

/**
 * space_move_forum_post: moves a reply to another thread of the same space.
 * Inputs: post_id; to_thread_number; reason.
 * Returns: JSON {thread_number, post_number}: where the reply is now.
 * Errors: as space_post_for_moderation(); P0002 with hint target:missing when the other thread
 *   isn't a live thread of this space (the same answer for a thread elsewhere or one our team
 *   hid, so numbers tell nothing); 23514 with hint target:same for the thread it is already in, target:locked for a
 *   locked thread, post:by_team for a reply our team hid or removed.
 * Where it fits: "Move" under a reply. The reply takes the next number in the other thread, is
 *   marked as moved, and stops being the old thread's answer; neither thread moves in the list.
 */
create or replace function public.space_move_forum_post(post_id uuid, to_thread_number bigint, reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  post public.forum_posts := public.space_post_for_moderation(post_id, reason);
  space public.spaces := public.space_of_post(post);
  from_thread public.forum_threads;
  to_thread public.forum_threads;
  hide public.moderated_items;
  new_number integer;
begin
  select * into from_thread from public.forum_threads where forum_threads.id = post.thread_id;
  -- Step 1: the other thread, a live one in this same space, locked for the change.
  select * into to_thread from public.forum_threads
  where forum_threads.thread_number = to_thread_number and forum_threads.deleted_at is null
    and forum_threads.forum_id = from_thread.forum_id
  for update;
  -- A thread our moderation team hid or removed takes no replies either.
  if to_thread.id is null or public.is_moderated_away('forum_thread', to_thread.id) then
    raise exception 'That thread isn''t in this space.' using errcode = 'no_data_found', hint = 'target:missing';
  end if;
  if to_thread.id = from_thread.id then
    raise exception 'The post is already in that thread.' using errcode = 'check_violation', hint = 'target:same';
  end if;
  if to_thread.locked_at is not null then
    raise exception 'That thread is locked.' using errcode = 'check_violation', hint = 'target:locked';
  end if;
  -- Step 2: a reply our team hid or removed stays where the case found it.
  select * into hide from public.moderated_items
  where moderated_items.item_type = 'forum_post' and moderated_items.item_id = post.id
    and moderated_items.restored_at is null;
  if hide.id is not null and hide.space_id is null then
    raise exception 'Our moderation team hid this post.' using errcode = 'check_violation', hint = 'post:by_team';
  end if;
  -- Step 3: the next number in the other thread (numbers are never reused).
  new_number := to_thread.last_post_number + 1;
  update public.forum_threads set last_post_number = new_number where forum_threads.id = to_thread.id;
  update public.forum_posts
  set thread_id = to_thread.id, post_number = new_number,
      moved_from_thread_id = coalesce(forum_posts.moved_from_thread_id, from_thread.id)
  where forum_posts.id = post.id;
  -- Step 4: the old thread no longer has this reply as its answer.
  update public.forum_threads set answer_post_id = null
  where forum_threads.id = from_thread.id and forum_threads.answer_post_id = post.id;
  -- Step 5: log it.
  perform public.log_space_action(space, 'post_moved', post.user_id, to_thread.id, reason,
    jsonb_build_object('post_id', post.id, 'from_thread_id', from_thread.id, 'from_post_number', post.post_number,
                       'to_thread_id', to_thread.id, 'to_post_number', new_number));
  return jsonb_build_object('thread_number', to_thread.thread_number, 'post_number', new_number);
end;
$$;
comment on function public.space_move_forum_post(uuid, bigint, text) is
  'Moves a reply to another thread of the same space; its owner or a moderator with the posts power; logged (GAPS-10).';
revoke execute on function public.space_move_forum_post(uuid, bigint, text) from public, anon;
grant execute on function public.space_move_forum_post(uuid, bigint, text) to authenticated;

/* ---------- 5. What a reader gets ---------- */

/**
 * forum_post_is_space_hidden: whether the space's own moderators hid this post.
 * Inputs: target, the post. Returns: true for a live hide marked with a space.
 * Where it fits: internal, for forum_post_state_for_caller() and forum_post_json().
 */
create or replace function public.forum_post_is_space_hidden(target public.forum_posts)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.moderated_items
                 where moderated_items.item_type = 'forum_post' and moderated_items.item_id = target.id
                   and moderated_items.restored_at is null and moderated_items.space_id is not null);
$$;
comment on function public.forum_post_is_space_hidden(public.forum_posts) is
  'Internal: true when a space''s moderators (not our team) hid the post (GAPS-10).';
revoke execute on function public.forum_post_is_space_hidden(public.forum_posts) from public, anon, authenticated;

/**
 * forum_post_state_for_caller: as in S1-E8-02, and the people who can show a space-hidden reply
 * again still see it.
 * Inputs: target, the post.
 * Returns: 'live', 'hidden', 'removed', 'deleted', or null when the caller sees nothing of it.
 * Where it fits: internal, asked for every post the forums show. GAPS-10: a reply hidden by its
 *   space's moderators reads 'hidden' for its writer and for the space's owner and moderators
 *   with the posts power (so they can show it again); a reply our team hid is unchanged.
 */
create or replace function public.forum_post_state_for_caller(target public.forum_posts)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  moderated public.moderated_state := public.moderated_state_of('forum_post', target.id);
begin
  -- Step 1: an author the caller blocks, or who blocks them: nothing at all.
  if public.is_blocked_with(target.user_id) then
    return null;
  end if;
  -- Step 2: deleted by its author, or removed by staff: a marker.
  if target.deleted_at is not null then
    return 'deleted';
  end if;
  if moderated = 'removed' then
    return 'removed';
  end if;
  -- Step 3: hidden: the author still sees it; so do the space's moderators when the hide is
  -- theirs; for everyone else it is gone.
  if moderated = 'hidden' then
    return case when target.user_id = (select auth.uid()) then 'hidden'
                when public.forum_post_is_space_hidden(target)
                     and public.space_may_act(public.space_of_post(target), 'posts') then 'hidden' end;
  end if;
  return 'live';
end;
$$;

/**
 * forum_quote_json: as in S1-E8-03, plus where the quoted post is now.
 * Inputs: quoted_post_id.
 * Returns: JSON {number, author, state, body, thread_number, forum_slug}, or null when the post
 *   is gone. GAPS-10: thread_number and forum_slug (left out of an unavailable quote), so a quote
 *   of a reply that was moved to another thread still links to it.
 * Where it fits: internal, called by forum_post_json().
 */
create or replace function public.forum_quote_json(quoted_post_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  quoted public.forum_posts;
  state text;
begin
  select * into quoted from public.forum_posts where forum_posts.id = quoted_post_id;
  if quoted.id is null then
    return null;
  end if;
  -- The author's own hidden post isn't quoted back to them as live: quoting shows only what everyone sees.
  state := public.forum_post_state_for_caller(quoted);
  if state is null or state = 'hidden' then
    state := 'unavailable';
  end if;
  return jsonb_build_object(
    'number', quoted.post_number,
    'author', case when state = 'unavailable' then null else public.forum_person_json(quoted.user_id) end,
    'state', state,
    'body', case when state = 'live' then quoted.body end)
    -- GAPS-10: where the quoted post is now; left out of a quote the caller can't see.
    || case when state = 'unavailable' then '{}'::jsonb else (
         select jsonb_build_object('thread_number', forum_threads.thread_number, 'forum_slug', forums.slug)
         from public.forum_threads join public.forums on forums.id = forum_threads.forum_id
         where forum_threads.id = quoted.thread_id) end;
end;
$$;

/**
 * forum_post_json: as in S1-E8-02 to IDEAS-3f, plus the space moderators' part.
 * Inputs: target, the post; starter_id, the thread's starter.
 * Returns: the post's JSON. New since GAPS-10: "hidden_by" ('space' or 'team' for a hidden post,
 *   else null), "was_moved" (a moderator moved it here from another thread) and
 *   "can_space_moderate" (the caller may hide, show again or move this reply: the server checks
 *   again on each action).
 * Where it fits: internal, called by forum_thread().
 */
create or replace function public.forum_post_json(target public.forum_posts, starter_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  state text := public.forum_post_state_for_caller(target);
  is_own boolean := caller_id is not null and target.user_id = caller_id;
  is_shown boolean := state in ('live', 'hidden');
  is_space_hidden boolean := public.forum_post_is_space_hidden(target);
  space public.spaces := public.space_of_post(target);
begin
  return jsonb_build_object(
    'id', target.id,
    'number', target.post_number,
    'author', public.forum_person_json(target.user_id),
    'is_starter', target.user_id = starter_id,
    'is_mine', is_own,
    'created_at', target.created_at,
    'edited_at', target.edited_at,
    'state', state,
    'body', case when is_shown then target.body end,
    'quotes', case when is_shown then (
      select coalesce(jsonb_agg(public.forum_quote_json(quoted_id) order by position), '[]'::jsonb)
      from unnest(target.quoted_post_ids) with ordinality as quoted(quoted_id, position)
      where public.forum_quote_json(quoted_id) is not null) else '[]'::jsonb end,
    'can_edit', is_own and is_shown,
    'can_delete', is_own and is_shown,
    'has_history', target.edited_at is not null and caller_id is not null
      and public.staff_may('moderation', 'view'),
    -- S1-E8-08: the author's signature, under the post on bigger screens (Q25).
    'signature', case when is_shown then public.signature_json(target.user_id) end,
    -- S1-E8-09: the author's rank, a chip next to their name (null before a published chapter).
    'author_rank', public.rank_of(target.user_id),
    -- IDEAS-3f: whether this reply is the thread's marked answer, and whether the caller (the
    -- thread's starter) may mark it: a live reply by someone else (criteria 1 and 2).
    'is_answer', target.id = (select forum_threads.answer_post_id from public.forum_threads
                              where forum_threads.id = target.thread_id),
    'can_mark_answer', is_own is false and caller_id is not null and caller_id = starter_id
                       and target.post_number > 1 and state = 'live',
    -- GAPS-10: who hid a hidden post, whether it was moved here, and the space moderators' tools.
    'hidden_by', case when state is distinct from 'hidden' then null when is_space_hidden then 'space' else 'team' end,
    'was_moved', is_shown and target.moved_from_thread_id is not null,
    'can_space_moderate', coalesce(
      caller_id is not null and is_shown and target.post_number > 1
      and space.id is not null and public.space_may_act(space, 'posts')
      and (state = 'live' or is_space_hidden)
      and (target.user_id <> space.user_id or space.user_id = caller_id
           or public.space_acts_as_platform(space)), false));
end;
$$;
