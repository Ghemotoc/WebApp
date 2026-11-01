/*
 * Forum quotes (bundle FORUMS-1, part c; story S1-E8-03; board 5.2 Forum thread).
 *
 * What it adds:
 * - forum_posts.quoted_post_ids: the posts a reply quotes, in thread order. A reply stores which
 *   posts it quotes, never a copy of their words: the quote is drawn from the quoted post as it is
 *   now, so a post its author deletes or staff remove disappears from every quote too (DSA art. 17
 *   and the moderation path, CLAUDE.md rule 6: removed content must not live on inside replies).
 * - reply_to_forum_thread(thread_number, body, quoted_posts): the reply from part b, plus the
 *   posts it quotes ("Quote" and "Add to quotes", criteria 1 and 2). Each quoted post must be in
 *   the same thread and readable by the caller; a reply quotes at most forum_post_max_quotes posts.
 * - forum_quote_json() and forum_post_json(): every post now carries its quotes, each with the
 *   quoted post's number, author and words, or a marker when those words are gone.
 *
 * Who calls it: the thread page (src/features/forums/components/ReplyForm.tsx through
 * api/forumWrites.ts) and forum_thread(), which already draws each post with forum_post_json().
 * The quick reply box (criterion 3) needs nothing new here: it is the reply from part b.
 */

/* ---------- 1. Settings ---------- */

-- The most posts one reply can quote (a proposal: enough for a multi-quote, short of a wall).
insert into public.settings (key, value, is_public, description)
values
  ('forum_post_max_quotes', '10'::jsonb, false,
   'The most posts one forum reply can quote (S1-E8-03; a proposal).')
on conflict (key) do nothing;

/* ---------- 2. The column ---------- */

alter table public.forum_posts
  add column quoted_post_ids uuid[] not null default '{}',
  -- A safety net under the setting: no reply ever stores more than 50 quotes.
  add constraint forum_posts_quotes_bounded check (cardinality(quoted_post_ids) <= 50);
comment on column public.forum_posts.quoted_post_ids is
  'The posts this reply quotes, in thread order; drawn from the quoted posts as they are now (S1-E8-03).';

/* ---------- 3. Checking the quotes ---------- */

/**
 * forum_quotes_for_reply: checks the posts a reply wants to quote and puts them in thread order.
 * Inputs: target_thread_id, the thread being answered; wanted, the post IDs ("Quote" sends one,
 *   "Add to quotes" several; repeats are dropped).
 * Returns: the IDs in thread order (#2 before #5, criterion 2), or '{}' for none.
 * Errors: check_violation with hint 'quote:too_many' past forum_post_max_quotes, or 'quote:missing'
 *   when one isn't a post of this thread the caller can read right now (deleted, removed, hidden
 *   from them, or by someone either side blocks).
 * Internal: reply_to_forum_thread().
 */
create or replace function public.forum_quotes_for_reply(target_thread_id uuid, wanted uuid[])
returns uuid[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  distinct_wanted uuid[];
  ordered uuid[];
  most integer := coalesce((select (value #>> '{}')::integer from public.settings where key = 'forum_post_max_quotes'), 10);
begin
  -- Step 1: nothing to quote is fine.
  select coalesce(array_agg(distinct id), '{}') into distinct_wanted
  from unnest(coalesce(wanted, '{}')) as id
  where id is not null;
  if cardinality(distinct_wanted) = 0 then
    return '{}';
  end if;
  -- Step 2: the limit.
  if cardinality(distinct_wanted) > most then
    raise exception 'A reply can quote at most % posts.', most
      using errcode = 'check_violation', hint = 'quote:too_many';
  end if;
  -- Step 3: only live posts of this thread, as the caller sees them, in thread order.
  select coalesce(array_agg(forum_posts.id order by forum_posts.post_number), '{}') into ordered
  from public.forum_posts
  where forum_posts.id = any (distinct_wanted)
    and forum_posts.thread_id = target_thread_id
    and public.forum_post_state_for_caller(forum_posts) = 'live';
  if cardinality(ordered) <> cardinality(distinct_wanted) then
    raise exception 'A post you quoted isn''t there any more.'
      using errcode = 'check_violation', hint = 'quote:missing';
  end if;
  return ordered;
end;
$$;
comment on function public.forum_quotes_for_reply(uuid, uuid[]) is
  'Internal: checks a reply''s quotes and puts them in thread order (S1-E8-03).';
revoke execute on function public.forum_quotes_for_reply(uuid, uuid[]) from public, anon, authenticated;

/* ---------- 4. Replying with quotes ---------- */

-- Part b's two-argument version goes, so the API has one reply function, not two overloads.
drop function public.reply_to_forum_thread(bigint, text);

/**
 * reply_to_forum_thread: adds a post at the end of a thread, quoting other posts if asked.
 * Inputs: thread_number; body (the Markdown subset); quoted_posts (the IDs of the posts it quotes,
 *   default none).
 * Returns: JSON {"post_number"}: the new post's number, for its permalink.
 * Rules: require_forum_writer(); a thread the caller may open; the text passes its check; the
 *   quotes pass forum_quotes_for_reply(). The thread's row is locked while the number is taken,
 *   so two replies at once get #7 and #8, never both #7. The thread moves to the top of its forum
 *   (latest activity, Q45).
 * Errors: insufficient_privilege; program_limit_exceeded; no_data_found (hint 'thread:missing');
 *   check_violation (the text's hints, 'quote:missing', 'quote:too_many').
 */
create or replace function public.reply_to_forum_thread(
  thread_number bigint,
  body text,
  quoted_posts uuid[] default '{}'
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
  -- Step 2: the quotes, checked and in thread order.
  quotes := public.forum_quotes_for_reply(thread.id, quoted_posts);
  -- Step 3: the next number, the post, and the thread's latest activity.
  new_number := thread.last_post_number + 1;
  insert into public.forum_posts (user_id, thread_id, post_number, body, quoted_post_ids)
  values (caller_id, thread.id, new_number, clean_body, quotes);
  update public.forum_threads set last_post_number = new_number, last_post_at = now()
  where forum_threads.id = thread.id;
  return jsonb_build_object('post_number', new_number);
end;
$$;
comment on function public.reply_to_forum_thread(bigint, text, uuid[]) is
  'Adds a numbered post at the end of a thread, with any quotes, through the account gate and the limit (S1-E8-02, S1-E8-03).';
revoke execute on function public.reply_to_forum_thread(bigint, text, uuid[]) from public, anon;
grant execute on function public.reply_to_forum_thread(bigint, text, uuid[]) to authenticated;

/* ---------- 5. Drawing quotes ---------- */

/**
 * forum_quote_json: one quote as a reply draws it.
 * Input: the quoted post's ID.
 * Returns: JSON with number (for the link back to it), author (forum_person_json(), null for a
 *   deleted account), state ('live'; 'deleted' or 'removed' for a marker; 'unavailable' when the
 *   caller can't read it: hidden by staff, or by someone either side blocks) and body (only when
 *   live). Null when the post was purged altogether.
 * Internal: forum_post_json().
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
    'body', case when state = 'live' then quoted.body end);
end;
$$;
comment on function public.forum_quote_json(uuid) is
  'Internal: one quoted post as a reply draws it, never a user ID (S1-E8-03).';
revoke execute on function public.forum_quote_json(uuid) from public, anon, authenticated;

/**
 * forum_post_json: one post as the thread page draws it (as in part b, plus its quotes).
 * Inputs: target, the post; starter_id, who started the thread (for the "Thread starter" pill).
 * Returns: JSON with id (for Report, Edit and Delete), number, author (forum_person_json(), null
 *   for a deleted account), is_starter, is_mine, created_at, edited_at, state (see
 *   forum_post_state_for_caller()), body (only for live and hidden), quotes (forum_quote_json()
 *   for each quoted post, in thread order, only for live and hidden), can_edit and can_delete
 *   (the author, on a post that isn't deleted or removed), and has_history (moderation staff, on
 *   an edited post: they may read the earlier versions, S1-E8-02 criterion 4).
 * Internal: forum_thread().
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
      and public.staff_may('moderation', 'view'));
end;
$$;
comment on function public.forum_post_json(public.forum_posts, uuid) is
  'Internal: one post as the thread page draws it, with its quotes, never a user ID (S1-E8-02, S1-E8-03).';
revoke execute on function public.forum_post_json(public.forum_posts, uuid) from public, anon, authenticated;
