/*
 * Migration: forum threads and posts with safe formatting (bundle FORUMS-1, part b; story
 * S1-E8-02; board 5.2 Forum thread).
 *
 * What it adds:
 * - forum_threads: a thread in a forum or subforum (never straight in a category), with a title,
 *   a public number for its address (/forums/<forum>/<number>) and the time of its latest post,
 *   which orders the forum's list (Q45: latest activity, no popularity ranking).
 * - forum_posts: the posts of a thread, numbered #1, #2… in the order they were written. A
 *   number is never reused or moved, so "#3" always means the same post and each post has its own
 *   permalink (/forums/<forum>/<number>?post=3, criterion 3). Post #1 is the thread starter's.
 * - forum_post_revisions: the earlier versions of an edited post. The post shows "Edited"; only
 *   moderation staff read the earlier words (criterion 4).
 * - check_forum_post_text() and check_forum_thread_title(): the sanitising rules on save (rule 8,
 *   criterion 1): no HTML tags, no script links, the length limits, ş/ţ corrected. The screen
 *   cleans the text again before display and gives links rel="nofollow ugc noopener" (criterion 2).
 * - forum_thread_list(), forum_thread(), start_forum_thread(), reply_to_forum_thread(),
 *   edit_forum_post(), delete_forum_post() and forum_post_history(): the only ways in. Readers
 *   never touch the tables; every read applies blocks and moderation and never answers a user ID
 *   (architecture 1.6).
 * - forum_index() now counts each forum's threads and posts and shows its latest post;
 *   admin_delete_forum() refuses a forum that still holds threads.
 * - 'forum_thread' and 'forum_post' branches in the shared reporting contract (architecture
 *   1.7.11), so every thread and post has a Report button (rule 6) and moderators can hide or
 *   remove it.
 * - Download my data, account deletion and the nightly clean-up know the three new tables.
 * Pictures in posts are OPEN (the story's legal note): posts are text only for now.
 * No automated text moderation (CLAUDE.md rule 19).
 * Who calls it: src/features/forums/api/forumThreads.ts (the forum's thread list, the thread page,
 *   the new thread page) and the moderation case page (case_item_content()).
 * Tests: supabase/tests/database/222-forum-threads-and-posts.test.sql.
 */

/* ---------- Settings (proposals) ---------- */

insert into public.settings (key, value, is_public, description) values
  ('forum_post_max_characters', '15000'::jsonb, true,
   'The longest forum post, in characters: about the board''s 2,000 words (proposal; S1-E8-02).'),
  ('forum_thread_title_max_characters', '120'::jsonb, true,
   'The longest thread title, in characters (proposal; S1-E8-02).'),
  ('forum_post_hourly_limit_new_account', '5'::jsonb, false,
   'Forum posts an hour an account may write in its first comment_new_account_hours (proposal, as comments; S1-E8-02).'),
  ('forum_post_hourly_limit', '60'::jsonb, false,
   'Forum posts an hour an account may write after its first day (proposal, as comments; S1-E8-02).'),
  ('forum_posts_page_size', '20'::jsonb, false,
   'Posts a thread shows at first; "Show more replies" reads the next ones (S1-E8-02).'),
  ('forum_threads_page_size', '25'::jsonb, false,
   'Threads a forum lists at first; "Show more threads" reads the next ones (S1-E8-02).');

/* ---------- Tables ---------- */

create table public.forum_threads (
  id uuid primary key default gen_random_uuid(),
  -- Who started it (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  forum_id uuid not null references public.forums (id),
  -- The public number in the thread's address; never the row ID or the user ID.
  thread_number bigint generated always as identity unique,
  title text not null,
  -- The number the latest post took; the next post takes one more (never reused).
  last_post_number integer not null default 0,
  -- When the latest post was written: the forum lists its threads by this, newest first (Q45).
  last_post_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint forum_threads_title_is_written check (btrim(title) <> '' and char_length(title) <= 300)
);
comment on table public.forum_threads is
  'kind: user_content; reportable: forum_thread
Forum threads (S1-E8-02). Read only through forum_thread_list() and forum_thread().';
comment on column public.forum_threads.thread_number is 'The public number in the thread''s address.';
comment on column public.forum_threads.last_post_number is 'The number the latest post took; numbers are never reused.';
comment on column public.forum_threads.last_post_at is 'When the latest post was written; orders the forum''s list (Q45).';
create index forum_threads_forum_latest on public.forum_threads (forum_id, last_post_at desc) where deleted_at is null;
create index forum_threads_author on public.forum_threads (user_id);
create trigger forum_threads_set_updated_at
  before update on public.forum_threads
  for each row execute function public.set_updated_at();
create trigger forum_threads_refuse_user_id_change
  before update on public.forum_threads
  for each row execute function public.refuse_user_id_change('user_id');

create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  -- Who wrote it (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  -- #1, #2…: its place in the thread, fixed for good (criterion 3).
  post_number integer not null,
  -- The Markdown subset as saved; erased ('') once a deleted post's words are purged.
  body text not null,
  -- Set when its author changed it; the screen shows "Edited" (criterion 4).
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint forum_posts_number_in_thread unique (thread_id, post_number),
  constraint forum_posts_number_positive check (post_number >= 1),
  constraint forum_posts_body_is_written check (
    char_length(body) <= 20000 and (btrim(body) <> '' or deleted_at is not null))
);
comment on table public.forum_posts is
  'kind: user_content; reportable: forum_post
Posts in forum threads, numbered in order (S1-E8-02). Read only through forum_thread().';
comment on column public.forum_posts.post_number is 'The post''s place in its thread (#1, #2…), never reused.';
comment on column public.forum_posts.edited_at is 'When its author last changed it; null when never.';
create index forum_posts_author_recent on public.forum_posts (user_id, created_at desc);
create trigger forum_posts_set_updated_at
  before update on public.forum_posts
  for each row execute function public.set_updated_at();
create trigger forum_posts_refuse_user_id_change
  before update on public.forum_posts
  for each row execute function public.refuse_user_id_change('user_id');

create table public.forum_post_revisions (
  id uuid primary key default gen_random_uuid(),
  -- The post's author, whose earlier words these are (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  -- The words before the edit.
  body text not null,
  -- The thread's title before the edit, for an edit of post #1 that changed it; otherwise null.
  title text,
  -- When this earlier version was written (the post's first time, or its previous edit).
  written_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.forum_post_revisions is
  'kind: user_content; reportable: forum_post
Earlier versions of edited forum posts; only moderation staff and the author read them (S1-E8-02 criterion 4).';
create index forum_post_revisions_post on public.forum_post_revisions (post_id, written_at);
create index forum_post_revisions_author on public.forum_post_revisions (user_id);
create trigger forum_post_revisions_set_updated_at
  before update on public.forum_post_revisions
  for each row execute function public.set_updated_at();
create trigger forum_post_revisions_refuse_user_id_change
  before update on public.forum_post_revisions
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_post_revisions enable row level security;

-- Who: the author. Why: their own threads, posts and earlier versions (their data export);
-- everyone else reads through forum_thread_list() and forum_thread(), which apply blocks and
-- moderation. Writes go only through the functions below, so there are no write policies.
create policy forum_threads_select_own on public.forum_threads
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy forum_posts_select_own on public.forum_posts
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy forum_post_revisions_select_own on public.forum_post_revisions
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Who: moderation staff (owner, admin, moderator) in a staff session. Why: a reported thread or
-- post, deleted or not, and the earlier versions of an edited post (criterion 4; architecture 1.8.3).
create policy forum_threads_select_moderation on public.forum_threads
  for select to authenticated
  using ((select public.staff_may('moderation', 'view')));
create policy forum_posts_select_moderation on public.forum_posts
  for select to authenticated
  using ((select public.staff_may('moderation', 'view')));
create policy forum_post_revisions_select_moderation on public.forum_post_revisions
  for select to authenticated
  using ((select public.staff_may('moderation', 'view')));

comment on policy forum_threads_select_own on public.forum_threads is 'Allows the starter to read their own threads (S1-E8-02).';
comment on policy forum_posts_select_own on public.forum_posts is 'Allows the author to read their own posts (S1-E8-02).';
comment on policy forum_post_revisions_select_own on public.forum_post_revisions is
  'Allows the author to read the earlier versions of their own posts (S1-E8-02).';
comment on policy forum_threads_select_moderation on public.forum_threads is 'Allows moderation staff to read any thread (S1-E8-02).';
comment on policy forum_posts_select_moderation on public.forum_posts is 'Allows moderation staff to read any post (S1-E8-02).';
comment on policy forum_post_revisions_select_moderation on public.forum_post_revisions is
  'Allows moderation staff to read the earlier versions of any post (S1-E8-02 criterion 4).';

grant select on public.forum_threads to authenticated;
grant select on public.forum_posts to authenticated;
grant select on public.forum_post_revisions to authenticated;

/* ---------- The text ---------- */

/**
 * check_forum_post_text: the sanitising rules for a post, on the server (rule 8, criterion 1).
 * Input: the text as typed (bold, italic, links, quotes and lists). Returns: the text trimmed,
 *   with ş/ţ corrected.
 * Errors: check_violation with a hint for the screen: 'body:empty', 'body:too_long' (over
 *   forum_post_max_characters), 'body:html' (a raw HTML tag, so no script, iframe or style can be
 *   saved) or 'body:link' (a javascript:, data: or vbscript: link). The same rules as comments.
 * Internal: start_forum_thread(), reply_to_forum_thread(), edit_forum_post().
 */
create or replace function public.check_forum_post_text(body text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  clean_body text := btrim(public.normalise_romanian_letters(coalesce(body, '')));
  longest integer := coalesce((public.setting_value('forum_post_max_characters'))::integer, 15000);
begin
  -- Step 1: something to say, and not too much.
  if clean_body = '' then
    raise exception 'Write something first.' using errcode = 'check_violation', hint = 'body:empty';
  end if;
  if char_length(clean_body) > longest then
    raise exception 'A post can have at most % characters.', longest using errcode = 'check_violation', hint = 'body:too_long';
  end if;
  -- Step 2: no raw HTML; escaped text ("\<b\>") is the literal words (as check_comment_text()).
  if regexp_replace(clean_body, '\\.', '', 'g') ~ '<[[:alpha:]/!?]' then
    raise exception 'HTML tags are not allowed in a post (CLAUDE.md rule 8).' using errcode = 'check_violation', hint = 'body:html';
  end if;
  -- Step 3: links only http, https or mailto.
  if clean_body ~* '(javascript|data|vbscript)\s*:' then
    raise exception 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).' using errcode = 'check_violation', hint = 'body:link';
  end if;
  return clean_body;
end;
$$;
comment on function public.check_forum_post_text(text) is
  'Internal: refuses empty, over-long, HTML and script-link posts; corrects ş/ţ (S1-E8-02, rule 8).';
revoke execute on function public.check_forum_post_text(text) from public, anon, authenticated;

/**
 * check_forum_thread_title: the rules for a thread's title: plain words on one line.
 * Input: the title as typed. Returns: it trimmed, spaces folded, ş/ţ corrected.
 * Errors: check_violation with hint 'title:empty', 'title:too_long' (over
 *   forum_thread_title_max_characters) or 'title:html'. The screen shows a title as text, never
 *   as Markdown, so nothing in it can run.
 * Internal: start_forum_thread(), edit_forum_post().
 */
create or replace function public.check_forum_thread_title(title text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  clean_title text := btrim(regexp_replace(public.normalise_romanian_letters(coalesce(title, '')), '\s+', ' ', 'g'));
  longest integer := coalesce((public.setting_value('forum_thread_title_max_characters'))::integer, 120);
begin
  if clean_title = '' then
    raise exception 'Give the thread a title.' using errcode = 'check_violation', hint = 'title:empty';
  end if;
  if char_length(clean_title) > longest then
    raise exception 'A title can have at most % characters.', longest using errcode = 'check_violation', hint = 'title:too_long';
  end if;
  if clean_title ~ '<[[:alpha:]/!?]' then
    raise exception 'HTML tags are not allowed in a title (CLAUDE.md rule 8).' using errcode = 'check_violation', hint = 'title:html';
  end if;
  return clean_title;
end;
$$;
comment on function public.check_forum_thread_title(text) is
  'Internal: refuses empty, over-long and HTML titles; corrects ş/ţ (S1-E8-02, rule 8).';
revoke execute on function public.check_forum_thread_title(text) from public, anon, authenticated;

/* ---------- The limit ---------- */

/**
 * forum_post_wait_minutes: how long the author must wait before their next post.
 * Input: author_id. Returns: 0 when they may post now; otherwise whole minutes until the oldest
 *   post of the last hour drops out of the window (at least 1).
 * Rules (proposal, as comments): forum_post_hourly_limit_new_account (5) in the account's first
 *   comment_new_account_hours (24), forum_post_hourly_limit (60) after. A new thread counts as
 *   one post (its #1). Deleted posts still count.
 * Internal: require_forum_writer().
 */
create or replace function public.forum_post_wait_minutes(author_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  new_account_hours integer := coalesce((public.setting_value('comment_new_account_hours'))::integer, 24);
  hourly_limit integer;
  oldest_in_window timestamptz;
  posted_in_window integer;
begin
  -- Step 1: the limit for this account's age.
  select case when profiles.created_at > now() - make_interval(hours => new_account_hours)
    then coalesce((public.setting_value('forum_post_hourly_limit_new_account'))::integer, 5)
    else coalesce((public.setting_value('forum_post_hourly_limit'))::integer, 60) end
  into hourly_limit
  from public.profiles where profiles.id = author_id;
  -- Step 2: what they posted in the last hour.
  select count(*)::integer, min(forum_posts.created_at) into posted_in_window, oldest_in_window
  from public.forum_posts
  where forum_posts.user_id = author_id and forum_posts.created_at > now() - interval '1 hour';
  if posted_in_window < hourly_limit then
    return 0;
  end if;
  -- Step 3: the minutes until the oldest of them is an hour old.
  return greatest(1, ceil(extract(epoch from (oldest_in_window + interval '1 hour' - now())) / 60.0))::integer;
end;
$$;
comment on function public.forum_post_wait_minutes(uuid) is
  'Internal: minutes until the author may post in the forums again, 0 when now (S1-E8-02).';
revoke execute on function public.forum_post_wait_minutes(uuid) from public, anon, authenticated;

/**
 * require_forum_writer: the checks before anything is written in the forums, in order.
 * Returns: the caller's user ID.
 * Errors: insufficient_privilege (hint 'signed_out') when signed out, or (hint 'not_active') when
 *   the account may not write (the account gate, architecture 1.7.8); program_limit_exceeded over
 *   the limit, with hint "wait_minutes:12" so the screen can say how long.
 * Internal: start_forum_thread(), reply_to_forum_thread().
 */
create or replace function public.require_forum_writer()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  wait_minutes integer;
begin
  if caller_id is null then
    raise exception 'Log in to post.' using errcode = 'insufficient_privilege', hint = 'signed_out';
  end if;
  if not public.is_active_member() then
    raise exception 'Your account can''t post right now.' using errcode = 'insufficient_privilege', hint = 'not_active';
  end if;
  wait_minutes := public.forum_post_wait_minutes(caller_id);
  if wait_minutes > 0 then
    raise exception 'You have posted a lot. Wait % minutes.', wait_minutes
      using errcode = 'program_limit_exceeded', hint = 'wait_minutes:' || wait_minutes;
  end if;
  return caller_id;
end;
$$;
comment on function public.require_forum_writer() is 'Internal: signed in, the account gate, the post limit (S1-E8-02).';
revoke execute on function public.require_forum_writer() from public, anon, authenticated;

/* ---------- What a reader may see ---------- */

/**
 * forum_thread_is_shown: may the caller open this thread?
 * Input: the thread row. Returns: true when it isn't deleted, its forum is live, neither side
 *   blocks the starter, and staff haven't hidden or removed it; the starter still sees their own
 *   hidden thread (architecture 1.7.11).
 * Internal: every read below.
 */
create or replace function public.forum_thread_is_shown(target public.forum_threads)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target.deleted_at is null
    and exists (select 1 from public.forums where forums.id = target.forum_id and forums.deleted_at is null)
    and not public.is_blocked_with(target.user_id)
    and (
      not public.is_moderated_away('forum_thread', target.id)
      or (target.user_id = (select auth.uid()) and public.moderated_state_of('forum_thread', target.id) = 'hidden')
    );
$$;
comment on function public.forum_thread_is_shown(public.forum_threads) is 'Internal: whether the caller may open a thread (S1-E8-02).';
revoke execute on function public.forum_thread_is_shown(public.forum_threads) from public, anon, authenticated;

/**
 * forum_post_state_for_caller: what the caller sees in a post's place.
 * Input: the post row. Returns: 'live' (the words), 'hidden' (the author's own post hidden by
 *   moderation: the words and a note), 'removed' (the "[Removed by the moderation team]" marker),
 *   'deleted' (a "Post deleted" marker), or null when nothing shows (someone either side blocks,
 *   or someone else's hidden post). A marker keeps the post's number in place.
 * Internal: forum_post_json(), forum_thread().
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
  -- Step 3: hidden by staff: the author still sees it; for everyone else it is gone.
  if moderated = 'hidden' then
    return case when target.user_id = (select auth.uid()) then 'hidden' end;
  end if;
  return 'live';
end;
$$;
comment on function public.forum_post_state_for_caller(public.forum_posts) is
  'Internal: live, hidden, removed, deleted or null for the caller (S1-E8-02).';
revoke execute on function public.forum_post_state_for_caller(public.forum_posts) from public, anon, authenticated;

/**
 * forum_person_json: a person as the forums show them: username and display name, a Staff pill,
 *   or null for a deleted account (shown as "Deleted account"). Never the user ID.
 * Input: the user ID. Internal: the reads below.
 */
create or replace function public.forum_person_json(person_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'handle', profiles.handle,
    'display_name', public.display_name(profiles.handle, profiles.pen_name),
    'is_staff', exists (select 1 from public.staff_roles where staff_roles.user_id = profiles.id))
  from public.profiles
  where profiles.id = person_id and profiles.deleted_at is null;
$$;
comment on function public.forum_person_json(uuid) is 'Internal: a username, display name and Staff pill; null for a deleted account (S1-E8-02).';
revoke execute on function public.forum_person_json(uuid) from public, anon, authenticated;

/**
 * forum_live_post_count: how many posts of a thread the caller can read (state live or hidden).
 * Input: the thread ID. Internal: the thread list and the thread's numbers.
 */
create or replace function public.forum_live_post_count(target_thread_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.forum_posts
  where forum_posts.thread_id = target_thread_id
    and public.forum_post_state_for_caller(forum_posts) in ('live', 'hidden');
$$;
comment on function public.forum_live_post_count(uuid) is 'Internal: the posts of a thread the caller can read (S1-E8-02).';
revoke execute on function public.forum_live_post_count(uuid) from public, anon, authenticated;

/**
 * forum_post_json: one post as the thread page draws it.
 * Inputs: target, the post; starter_id, who started the thread (for the "Thread starter" pill).
 * Returns: JSON with id (for Report, Edit and Delete), number, author (forum_person_json(), null
 *   for a deleted account), is_starter, is_mine, created_at, edited_at, state (see
 *   forum_post_state_for_caller()), body (only for live and hidden), can_edit and can_delete (the
 *   author, on a post that isn't deleted or removed), and has_history (moderation staff, on an
 *   edited post: they may read the earlier versions, criterion 4).
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
    'body', case when state in ('live', 'hidden') then target.body end,
    'can_edit', is_own and state in ('live', 'hidden'),
    'can_delete', is_own and state in ('live', 'hidden'),
    'has_history', target.edited_at is not null and caller_id is not null
      and public.staff_may('moderation', 'view'));
end;
$$;
comment on function public.forum_post_json(public.forum_posts, uuid) is
  'Internal: one post as the thread page draws it, never a user ID (S1-E8-02).';
revoke execute on function public.forum_post_json(public.forum_posts, uuid) from public, anon, authenticated;

/**
 * forum_thread_summary_json: one thread as a forum's list shows it.
 * Input: the thread row. Returns: JSON with number, title, author, created_at, reply_count (the
 *   posts the caller can read, less #1), last_post_at and last_poster (who wrote the newest post
 *   the caller can read, or null).
 * Internal: forum_thread_list().
 */
create or replace function public.forum_thread_summary_json(target public.forum_threads)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'number', target.thread_number,
    'title', target.title,
    'author', public.forum_person_json(target.user_id),
    'created_at', target.created_at,
    'reply_count', greatest(public.forum_live_post_count(target.id) - 1, 0),
    'last_post_at', target.last_post_at,
    'last_poster', (select public.forum_person_json(latest.user_id) from public.forum_posts as latest
                    where latest.thread_id = target.id
                      and public.forum_post_state_for_caller(latest) in ('live', 'hidden')
                    order by latest.post_number desc limit 1));
$$;
comment on function public.forum_thread_summary_json(public.forum_threads) is
  'Internal: one thread as a forum''s list shows it, never a user ID (S1-E8-02).';
revoke execute on function public.forum_thread_summary_json(public.forum_threads) from public, anon, authenticated;

/**
 * forum_thread_list: one page of a forum's threads, latest activity first (Q45).
 * Inputs: forum_slug; older_than (null for the first page; the last_post_at of the last thread
 *   shown, for "Show more threads").
 * Returns: JSON {"threads": [forum_thread_summary_json()...], "has_more"}, or null when there is
 *   no such live forum. A category holds forums, not threads, so its list is always empty.
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
  page jsonb;
  page_count integer;
begin
  -- Step 1: the forum, if it is live.
  select * into forum from public.forums where forums.slug = forum_thread_list.forum_slug and forums.deleted_at is null;
  if forum.id is null then
    return null;
  end if;
  -- Step 2: one page of threads the caller may open (one extra, to know whether there is more).
  with listed as (
    select forum_threads.* from public.forum_threads
    where forum_threads.forum_id = forum.id
      and (older_than is null or forum_threads.last_post_at < older_than)
      and public.forum_thread_is_shown(forum_threads)
    order by forum_threads.last_post_at desc
    limit page_size + 1
  )
  select coalesce(jsonb_agg(public.forum_thread_summary_json(listed) order by listed.last_post_at desc), '[]'::jsonb),
         count(*)::integer
  into page, page_count
  from listed;
  -- Step 3: the answer; the extra thread only says there is more.
  return jsonb_build_object(
    'threads', case when page_count > page_size then page - page_size else page end,
    'has_more', page_count > page_size);
end;
$$;
comment on function public.forum_thread_list(text, timestamptz) is
  'One page of a forum''s threads, latest activity first; never a user ID (S1-E8-02).';
grant execute on function public.forum_thread_list(text, timestamptz) to anon, authenticated;

/**
 * forum_thread_header_json: a thread's heading and side panel ("This thread").
 * Input: the thread row. Returns: JSON with id (for Report), number, title, forum_slug, author,
 *   created_at, reply_count, writer_count (people with a post the caller can read),
 *   last_post_at, last_post_number and can_reply (signed in, and the account gate lets them write).
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
    'can_reply', (select auth.uid()) is not null and public.is_active_member());
$$;
comment on function public.forum_thread_header_json(public.forum_threads) is
  'Internal: a thread''s heading and numbers, never a user ID (S1-E8-02).';
revoke execute on function public.forum_thread_header_json(public.forum_threads) from public, anon, authenticated;

/**
 * forum_thread: a thread with its posts in order, for the thread page.
 * Inputs: thread_number (from the address); after_post (0 for the first posts; the number of the
 *   last post shown, for "Show more replies"); up_to_post (a permalink's post number: the first
 *   read reaches at least that far, so /…?post=37 can scroll to #37).
 * Returns: JSON {"thread": forum_thread_header_json(), "posts": [forum_post_json()...],
 *   "has_more"}, or null when the caller may not open the thread (deleted, removed, hidden from
 *   them, a blocked starter, a removed forum). Posts the caller can't see at all (a blocked
 *   author, someone else's hidden post) are left out; deleted and removed posts keep their
 *   number as a marker (criterion 3).
 * Who may call it: anyone, signed out included.
 */
create or replace function public.forum_thread(thread_number bigint, after_post integer default 0, up_to_post integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  thread public.forum_threads;
  page_size integer := coalesce((public.setting_value('forum_posts_page_size'))::integer, 20);
  wanted integer;
  page jsonb;
  last_number integer;
begin
  -- Step 1: the thread, if the caller may open it.
  select * into thread from public.forum_threads where forum_threads.thread_number = forum_thread.thread_number;
  if thread.id is null or not public.forum_thread_is_shown(thread) then
    return null;
  end if;
  -- Step 2: how far to read: a page, or as far as the permalink's post.
  wanted := greatest(page_size, coalesce(up_to_post, 0) - coalesce(after_post, 0));
  -- Step 3: the posts after after_post, in number order, without the ones the caller can't see.
  with listed as (
    select forum_posts.* from public.forum_posts
    where forum_posts.thread_id = thread.id
      and forum_posts.post_number > coalesce(after_post, 0)
      and public.forum_post_state_for_caller(forum_posts) is not null
    order by forum_posts.post_number
    limit wanted
  )
  select coalesce(jsonb_agg(public.forum_post_json(listed, thread.user_id) order by listed.post_number), '[]'::jsonb),
         max(listed.post_number)
  into page, last_number
  from listed;
  -- Step 4: more when a visible post comes after the last one read.
  return jsonb_build_object(
    'thread', public.forum_thread_header_json(thread),
    'posts', page,
    'has_more', exists (select 1 from public.forum_posts
                        where forum_posts.thread_id = thread.id
                          and forum_posts.post_number > coalesce(last_number, coalesce(after_post, 0))
                          and public.forum_post_state_for_caller(forum_posts) is not null));
end;
$$;
comment on function public.forum_thread(bigint, integer, integer) is
  'A thread with its numbered posts in order, for the thread page; never a user ID (S1-E8-02).';
grant execute on function public.forum_thread(bigint, integer, integer) to anon, authenticated;

/* ---------- Writing ---------- */

/**
 * start_forum_thread: starts a thread in a forum or subforum, with its first post (#1).
 * Inputs: forum_slug; title (plain words); body (the Markdown subset).
 * Returns: JSON {"thread_number", "forum_slug"} for the new thread's address.
 * Rules: require_forum_writer() (signed in, the account gate, the limit); a live forum, not a
 *   category (categories hold forums, board 5.1); the title and text pass their checks.
 * Errors: insufficient_privilege; program_limit_exceeded; no_data_found (hint 'forum:missing');
 *   check_violation (hint 'forum:category', or the text's and title's hints).
 */
create or replace function public.start_forum_thread(forum_slug text, title text, body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_forum_writer();
  forum public.forums;
  clean_title text := public.check_forum_thread_title(title);
  clean_body text := public.check_forum_post_text(body);
  new_thread public.forum_threads;
begin
  -- Step 1: a live forum that holds threads.
  select * into forum from public.forums
  where forums.slug = start_forum_thread.forum_slug and forums.deleted_at is null;
  if forum.id is null then
    raise exception 'There is no such forum.' using errcode = 'no_data_found', hint = 'forum:missing';
  end if;
  if forum.level = 0 then
    raise exception 'Start a thread in one of the forums inside this category.' using errcode = 'check_violation', hint = 'forum:category';
  end if;
  -- Step 2: the thread, then its first post, numbered #1.
  insert into public.forum_threads (user_id, forum_id, title, last_post_number, last_post_at)
  values (caller_id, forum.id, clean_title, 1, now())
  returning * into new_thread;
  insert into public.forum_posts (user_id, thread_id, post_number, body)
  values (caller_id, new_thread.id, 1, clean_body);
  return jsonb_build_object('thread_number', new_thread.thread_number, 'forum_slug', forum.slug);
end;
$$;
comment on function public.start_forum_thread(text, text, text) is
  'Starts a thread with its first post, through the account gate and the limit (S1-E8-02).';
revoke execute on function public.start_forum_thread(text, text, text) from public, anon;
grant execute on function public.start_forum_thread(text, text, text) to authenticated;

/**
 * reply_to_forum_thread: adds a post at the end of a thread.
 * Inputs: thread_number; body (the Markdown subset).
 * Returns: JSON {"post_number"}: the new post's number, for its permalink.
 * Rules: require_forum_writer(); a thread the caller may open; the text passes its check. The
 *   thread's row is locked while the number is taken, so two replies at once get #7 and #8,
 *   never both #7. The thread moves to the top of its forum (latest activity, Q45).
 * Errors: insufficient_privilege; program_limit_exceeded; no_data_found (hint 'thread:missing');
 *   check_violation (the text's hints).
 */
create or replace function public.reply_to_forum_thread(thread_number bigint, body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_forum_writer();
  clean_body text := public.check_forum_post_text(body);
  thread public.forum_threads;
  new_number integer;
begin
  -- Step 1: the thread, locked, if the caller may open it.
  select * into thread from public.forum_threads
  where forum_threads.thread_number = reply_to_forum_thread.thread_number
  for update;
  if thread.id is null or not public.forum_thread_is_shown(thread) then
    raise exception 'That thread isn''t there any more.' using errcode = 'no_data_found', hint = 'thread:missing';
  end if;
  -- Step 2: the next number, the post, and the thread's latest activity.
  new_number := thread.last_post_number + 1;
  insert into public.forum_posts (user_id, thread_id, post_number, body)
  values (caller_id, thread.id, new_number, clean_body);
  update public.forum_threads set last_post_number = new_number, last_post_at = now()
  where forum_threads.id = thread.id;
  return jsonb_build_object('post_number', new_number);
end;
$$;
comment on function public.reply_to_forum_thread(bigint, text) is
  'Adds a numbered post at the end of a thread, through the account gate and the limit (S1-E8-02).';
revoke execute on function public.reply_to_forum_thread(bigint, text) from public, anon;
grant execute on function public.reply_to_forum_thread(bigint, text) to authenticated;

/**
 * own_forum_post_for_change: the caller's own post, locked, ready to change or delete.
 * Input: post_id. Returns: the post row.
 * Errors: insufficient_privilege (hint 'signed_out') when signed out, (hint 'not_mine') for
 *   someone else's post; no_data_found (hint 'post:missing') for no such post, one already deleted
 *   or removed by staff, or one in a thread the caller can't open.
 * Internal: edit_forum_post(), delete_forum_post().
 */
create or replace function public.own_forum_post_for_change(post_id uuid)
returns public.forum_posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target public.forum_posts;
  thread public.forum_threads;
begin
  if caller_id is null then
    raise exception 'Log in first.' using errcode = 'insufficient_privilege', hint = 'signed_out';
  end if;
  select * into target from public.forum_posts where forum_posts.id = post_id for update;
  select * into thread from public.forum_threads where forum_threads.id = target.thread_id;
  if target.id is null or target.deleted_at is not null
     or public.moderated_state_of('forum_post', target.id) = 'removed'
     or not public.forum_thread_is_shown(thread) then
    raise exception 'That post isn''t there any more.' using errcode = 'no_data_found', hint = 'post:missing';
  end if;
  if target.user_id <> caller_id then
    raise exception 'Only its author can change a post.' using errcode = 'insufficient_privilege', hint = 'not_mine';
  end if;
  return target;
end;
$$;
comment on function public.own_forum_post_for_change(uuid) is 'Internal: the caller''s own live post, locked (S1-E8-02).';
revoke execute on function public.own_forum_post_for_change(uuid) from public, anon, authenticated;

/**
 * edit_forum_post: changes the words of the caller's own post; for post #1 also the title.
 * Inputs: post_id; body (the Markdown subset); title (only for post #1; null keeps the title).
 * Returns: JSON {"edited_at"}.
 * Rules (criterion 4): the earlier words (and the earlier title, when it changes) are saved in
 *   forum_post_revisions with the time they were written, the post gets edited_at, and the screen
 *   shows "Edited". Saving the same words again changes nothing. Editing doesn't move the thread
 *   in its forum's list (only new posts do). A post staff hid can still be edited by its author.
 * Errors: as own_forum_post_for_change(); check_violation (the text's and title's hints).
 */
create or replace function public.edit_forum_post(post_id uuid, body text, title text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.forum_posts := public.own_forum_post_for_change(post_id);
  clean_body text := public.check_forum_post_text(body);
  thread public.forum_threads;
  new_title text;
begin
  -- Step 1: the new title, only on post #1 and only when one is given.
  select * into thread from public.forum_threads where forum_threads.id = target.thread_id;
  new_title := case when target.post_number = 1 and title is not null
    then public.check_forum_thread_title(title) else thread.title end;
  -- Step 2: nothing changed, nothing saved.
  if clean_body = target.body and new_title = thread.title then
    return jsonb_build_object('edited_at', target.edited_at);
  end if;
  -- Step 3: keep the earlier version for moderators, then save the new one.
  insert into public.forum_post_revisions (user_id, post_id, body, title, written_at)
  values (target.user_id, target.id, target.body,
          case when new_title <> thread.title then thread.title end,
          coalesce(target.edited_at, target.created_at));
  update public.forum_posts set body = clean_body, edited_at = now() where forum_posts.id = target.id;
  if new_title <> thread.title then
    update public.forum_threads set title = new_title where forum_threads.id = thread.id;
  end if;
  return jsonb_build_object('edited_at', now());
end;
$$;
comment on function public.edit_forum_post(uuid, text, text) is
  'Changes the caller''s own post (and the title on #1), keeping the earlier version for moderators (S1-E8-02).';
revoke execute on function public.edit_forum_post(uuid, text, text) from public, anon;
grant execute on function public.edit_forum_post(uuid, text, text) to authenticated;

/**
 * delete_forum_post: deletes the caller's own post.
 * Input: post_id. Returns: JSON {"thread_deleted"}: true when the whole thread went with it.
 * Rules: a soft delete; the post's number stays as a "Post deleted" marker so later numbers and
 *   permalinks still match (criterion 3); its words go for good after content_purge_days
 *   (purge_deleted_forum_posts()). Deleting post #1 of a thread nobody else has a live post in
 *   deletes the thread too; with other people's replies the thread stays. Works for a read-only
 *   or sanctioned account too: taking one's own words down is always allowed.
 * Errors: as own_forum_post_for_change().
 */
create or replace function public.delete_forum_post(post_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.forum_posts := public.own_forum_post_for_change(post_id);
  thread_goes boolean;
begin
  -- Step 1: the post becomes a marker.
  update public.forum_posts set deleted_at = now() where forum_posts.id = target.id;
  -- Step 2: the starter's #1 in a thread with no one else's live post takes the thread with it.
  thread_goes := target.post_number = 1 and not exists (
    select 1 from public.forum_posts
    where forum_posts.thread_id = target.thread_id and forum_posts.user_id <> target.user_id
      and forum_posts.deleted_at is null);
  if thread_goes then
    update public.forum_threads set deleted_at = now() where forum_threads.id = target.thread_id;
  end if;
  return jsonb_build_object('thread_deleted', thread_goes);
end;
$$;
comment on function public.delete_forum_post(uuid) is
  'Deletes the caller''s own post, keeping its number as a marker; #1 alone takes its thread (S1-E8-02).';
revoke execute on function public.delete_forum_post(uuid) from public, anon;
grant execute on function public.delete_forum_post(uuid) to authenticated;

/**
 * forum_post_history: the earlier versions of an edited post, oldest first (criterion 4:
 *   "moderators can see the previous version").
 * Input: post_id. Returns: a JSON array of {body, title, written_at}; the current version is the
 *   post itself.
 * Who may call it: moderation staff (owner, admin, moderator). Everyone else gets
 *   insufficient_privilege, the author included: an edit replaces the words for readers.
 */
create or replace function public.forum_post_history(post_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('moderation', 'view') then
    raise exception 'Only moderators can see earlier versions.' using errcode = 'insufficient_privilege';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'body', revisions.body, 'title', revisions.title, 'written_at', revisions.written_at)
      order by revisions.written_at), '[]'::jsonb)
    from public.forum_post_revisions as revisions
    where revisions.post_id = forum_post_history.post_id);
end;
$$;
comment on function public.forum_post_history(uuid) is
  'The earlier versions of an edited post, for moderation staff only (S1-E8-02 criterion 4).';
revoke execute on function public.forum_post_history(uuid) from public, anon;
grant execute on function public.forum_post_history(uuid) to authenticated;

/* ---------- The forum index and removing a forum ---------- */

/**
 * forum_index: as in FORUMS-1a, now with each forum's numbers and latest post.
 * - thread_count and post_count: the forum's own live threads and their live posts (a subforum
 *   counts its own; totals, so blocks don't change them);
 * - latest_activity_at and latest_post: the newest live post the caller can read in the forum's
 *   own threads (not one by someone either side blocks, nor one staff hid or removed), with its
 *   thread's title, the permalink, the writer's username and name and a Staff pill.
 * Now security definer, because readers never read the thread and post tables directly.
 */
create or replace function public.forum_index(language_code text)
returns table (
  id uuid,
  parent_id uuid,
  level smallint,
  slug text,
  "position" integer,
  is_pinned boolean,
  accent public.forum_accent,
  doodle text,
  name text,
  description text,
  thread_count bigint,
  post_count bigint,
  latest_activity_at timestamptz,
  latest_post jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select forums.id, forums.parent_id, forums.level, forums.slug, forums.position, forums.is_pinned,
    forums.accent, forums.doodle, names.name, names.description,
    numbers.thread_count, numbers.post_count, latest.posted_at,
    case when latest.post_id is not null then jsonb_build_object(
      'thread_title', latest.thread_title,
      'thread_address', '/forums/' || forums.slug || '/' || latest.thread_number || '?post=' || latest.post_number,
      'writer_handle', latest.writer ->> 'handle',
      'writer_name', latest.writer ->> 'display_name',
      'is_staff', coalesce((latest.writer ->> 'is_staff')::boolean, false),
      'posted_at', latest.posted_at) end
  from public.forums
  cross join lateral public.forum_name_in(forums.id, forum_index.language_code) as names
  cross join lateral (
    select count(distinct live_threads.id) as thread_count, count(live_posts.id) as post_count
    from public.forum_threads as live_threads
    left join public.forum_posts as live_posts
      on live_posts.thread_id = live_threads.id and live_posts.deleted_at is null
    where live_threads.forum_id = forums.id and live_threads.deleted_at is null
  ) as numbers
  left join lateral (
    select newest.id as post_id, newest.post_number, newest.created_at as posted_at,
      thread.title as thread_title, thread.thread_number, public.forum_person_json(newest.user_id) as writer
    from public.forum_threads as thread
    join public.forum_posts as newest on newest.thread_id = thread.id
    where thread.forum_id = forums.id and public.forum_thread_is_shown(thread)
      and public.forum_post_state_for_caller(newest) = 'live'
    order by newest.created_at desc
    limit 1
  ) as latest on true
  where forums.deleted_at is null;
$$;

comment on function public.forum_index(text) is
  'The forum index in one language: every live forum with its numbers and latest post (S1-E8-01, S1-E8-02).';
grant execute on function public.forum_index(text) to anon, authenticated;

/**
 * admin_delete_forum: as in FORUMS-1a, and a forum that still holds live threads is refused
 * (hint 'forum:has_threads'): its threads would vanish with it. Move or delete them first.
 */
create or replace function public.admin_delete_forum(forum_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_forum jsonb;
begin
  perform public.require_forum_staff();
  -- Step 1: a reason for the audit log.
  if coalesce(btrim(reason), '') = '' then
    raise exception 'Say why the forum is removed.' using errcode = 'check_violation', hint = 'reason:empty';
  end if;
  if char_length(btrim(reason)) > 300 then
    raise exception 'Keep the reason under 300 characters.' using errcode = 'check_violation', hint = 'reason:too_long';
  end if;
  -- Step 2: the forum must exist and hold no live forums.
  before_forum := public.forum_as_json(admin_delete_forum.forum_id);
  if before_forum is null or before_forum ->> 'deleted_at' is not null then
    raise exception 'There is no forum with that id.' using errcode = 'no_data_found';
  end if;
  if exists (select 1 from public.forums
             where forums.parent_id = admin_delete_forum.forum_id and forums.deleted_at is null) then
    raise exception 'Remove or move the forums inside it first.' using errcode = 'check_violation', hint = 'forum:has_children';
  end if;
  if exists (select 1 from public.forum_threads
             where forum_threads.forum_id = admin_delete_forum.forum_id and forum_threads.deleted_at is null) then
    raise exception 'This forum still has threads.' using errcode = 'check_violation', hint = 'forum:has_threads';
  end if;
  -- Step 3: mark it removed, then log it.
  update public.forums set deleted_at = now() where forums.id = admin_delete_forum.forum_id;
  perform public.log_staff_action('forum.removed', 'forums', admin_delete_forum.forum_id::text, null,
    btrim(reason), before_forum, public.forum_as_json(admin_delete_forum.forum_id));
end;
$$;

comment on function public.admin_delete_forum(uuid, text) is 'Removes an empty forum, with no forums or threads inside; owner and admin; logged (FORUMS-1a, FORUMS-1b).';

/* ---------- The shared reporting contract: the forum branches ---------- */

/**
 * reportable_item_owner: as in S1-E9-01, plus 'forum_thread' and 'forum_post' (S1-E8-02).
 */
create or replace function public.reportable_item_owner(
  item_type public.reportable_type,
  item_reference text
)
returns table (item_id uuid, owner_user_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  is_row_id boolean := item_reference ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  case item_type
    when 'profile' then
      return query
        select profiles.id, profiles.id from public.profiles
        where profiles.handle_skeleton = public.username_skeleton(btrim(item_reference, ' @'))
          and profiles.deleted_at is null;
    -- A story or a chapter by its row ID, and only once readers can see it: published and not
    -- deleted, so a draft's existence never leaks.
    when 'story' then
      return query
        select stories.id, stories.user_id from public.stories
        where is_row_id and stories.id = item_reference::uuid
          and stories.first_published_at is not null
          and stories.deleted_at is null;
    when 'chapter' then
      return query
        select chapters.id, chapters.user_id from public.chapters
        join public.stories on stories.id = chapters.story_id
        where is_row_id and chapters.id = item_reference::uuid
          and chapters.status = 'published'
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    when 'comment' then
      return query
        select comments.id, comments.user_id from public.comments
        join public.chapters on chapters.id = comments.chapter_id
        join public.stories on stories.id = chapters.story_id
        where is_row_id and comments.id = item_reference::uuid
          and comments.deleted_at is null
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    when 'picture' then
      return query
        select picture_checks.id, picture_checks.user_id from public.picture_checks
        where is_row_id and picture_checks.id = item_reference::uuid
          and picture_checks.status in ('passed', 'approved')
          and picture_checks.deleted_at is null;
    when 'embed' then
      return query
        select chapter_embeds.id, chapter_embeds.user_id from public.chapter_embeds
        join public.chapters on chapters.id = chapter_embeds.chapter_id
        join public.stories on stories.id = chapters.story_id
        where is_row_id and chapter_embeds.id = item_reference::uuid
          and chapter_embeds.deleted_at is null
          and chapters.status = 'published'
          and chapters.deleted_at is null
          and stories.deleted_at is null;
    -- A Story Atlas item only while readers can see it, so a private one never leaks (S1-E17-34).
    when 'atlas_item' then
      return query
        select item_reference::uuid, item.owner_user_id
        from public.plan_item_row(case when is_row_id then item_reference::uuid end) as item
        where public.plan_item_is_public(item_reference::uuid);
    -- A private message only for the two people in its chat, so its existence never leaks to
    -- anyone else (S1-E9-01). Deleted ones can't be reported.
    when 'message' then
      return query
        select messages.id, messages.user_id from public.messages
        join public.conversations on conversations.id = messages.conversation_id
        where is_row_id and messages.id = item_reference::uuid
          and messages.deleted_at is null
          and (select auth.uid()) in (conversations.user_id, conversations.recipient_user_id);
    -- A forum thread or post only while readers can see it: not deleted, in a live thread and
    -- forum, so a deleted one's existence never leaks (S1-E8-02).
    when 'forum_thread' then
      return query
        select forum_threads.id, forum_threads.user_id from public.forum_threads
        join public.forums on forums.id = forum_threads.forum_id
        where is_row_id and forum_threads.id = item_reference::uuid
          and forum_threads.deleted_at is null and forums.deleted_at is null;
    when 'forum_post' then
      return query
        select forum_posts.id, forum_posts.user_id from public.forum_posts
        join public.forum_threads on forum_threads.id = forum_posts.thread_id
        join public.forums on forums.id = forum_threads.forum_id
        where is_row_id and forum_posts.id = item_reference::uuid
          and forum_posts.deleted_at is null and forum_threads.deleted_at is null
          and forums.deleted_at is null;
  end case;
  if not found then
    raise exception 'There is no such % to report.', item_type using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.reportable_item_owner(public.reportable_type, text) is
  'The reported item''s ID and owner, one branch per reportable_type (shared contract, S1-E10-01; comment S1-E6-01; picture S1-E10-05; embed S1-E3-10; atlas_item S1-E17-34; message S1-E9-01; forum_thread and forum_post S1-E8-02).';

/**
 * reportable_item_summary: as in S1-E9-01, and a thread says its title, a post its number,
 * thread and first words, for the moderation queue (S1-E8-02).
 */
create or replace function public.reportable_item_summary(
  item_type public.reportable_type,
  item_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  summary text;
begin
  case item_type
    when 'profile' then
      select '@' || coalesce(profiles.handle, '…') into summary
      from public.profiles where profiles.id = item_id;
    when 'story' then
      select stories.title into summary from public.stories where stories.id = item_id;
    when 'chapter' then
      select format('Chapter %s of %s', chapters.position, stories.title) into summary
      from public.chapters join public.stories on stories.id = chapters.story_id
      where chapters.id = item_id;
    when 'comment' then
      select format('Comment on chapter %s of %s: %s', chapters.position, stories.title,
          case when char_length(comments.body) > 80 then left(comments.body, 80) || '…' else comments.body end)
        into summary
      from public.comments
      join public.chapters on chapters.id = comments.chapter_id
      join public.stories on stories.id = chapters.story_id
      where comments.id = item_id;
    when 'picture' then
      select case picture_checks.kind
          when 'cover' then format('Cover picture of %s', coalesce(stories.title, 'a story'))
          when 'avatar' then format('Profile picture of @%s', coalesce(profiles.handle, '…'))
          when 'chapter_picture' then format('Picture in chapter %s of %s',
            coalesce(chapters.position::text, '?'), coalesce(stories.title, 'a story'))
          else format('Picture (%s)', picture_checks.kind) end
        into summary
      from public.picture_checks
      left join public.stories on stories.id = picture_checks.story_id
      left join public.chapters on chapters.id = picture_checks.chapter_id
      left join public.profiles on profiles.id = picture_checks.user_id
      where picture_checks.id = item_id;
    when 'embed' then
      select format('%s from %s in chapter %s of %s',
          case when chapter_embeds.service in ('spotify', 'apple_music') then 'Music' else 'Video' end,
          case chapter_embeds.service when 'youtube' then 'YouTube' when 'vimeo' then 'Vimeo'
            when 'loom' then 'Loom' when 'spotify' then 'Spotify' else 'Apple Music' end,
          chapters.position, stories.title)
        into summary
      from public.chapter_embeds
      join public.chapters on chapters.id = chapter_embeds.chapter_id
      join public.stories on stories.id = chapters.story_id
      where chapter_embeds.id = item_id;
    when 'atlas_item' then
      select format('%s "%s" in the world of %s',
          case item.item_kind when 'character' then 'Character' when 'relationship' then 'Relationship between'
            when 'section' then 'World section' when 'entry' then 'World entry' else 'Timeline event' end,
          item.title, stories.title)
        into summary
      from public.plan_item_row(item_id) as item
      join public.stories on stories.id = item.story_id;
    when 'message' then
      select format('Private message from @%s: %s', coalesce(profiles.handle, '…'),
          case when char_length(messages.body) > 80 then left(messages.body, 80) || '…' else messages.body end)
        into summary
      from public.messages
      left join public.profiles on profiles.id = messages.user_id
      where messages.id = item_id;
    when 'forum_thread' then
      select format('Forum thread "%s"', forum_threads.title) into summary
      from public.forum_threads where forum_threads.id = item_id;
    when 'forum_post' then
      select format('Post #%s in "%s": %s', forum_posts.post_number, forum_threads.title,
          case when char_length(forum_posts.body) > 80 then left(forum_posts.body, 80) || '…' else forum_posts.body end)
        into summary
      from public.forum_posts join public.forum_threads on forum_threads.id = forum_posts.thread_id
      where forum_posts.id = item_id;
  end case;
  return coalesce(summary, '(gone)');
end;
$$;

/**
 * case_item_content: as in S1-E9-02, and a reported thread's title and first post, or a post's
 * words with its earlier versions (S1-E8-02).
 */
create or replace function public.case_item_content(target public.cases)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case target.item_type
    when 'story' then (select jsonb_build_object('title', stories.title, 'blurb', stories.blurb,
        'created_at', stories.created_at) from public.stories where stories.id = target.item_id)
    when 'chapter' then (select jsonb_build_object('title', chapters.published_title, 'text', chapters.published_body,
        'first_published_at', chapters.first_published_at) from public.chapters where chapters.id = target.item_id)
    when 'comment' then (select jsonb_build_object('text', comments.body, 'created_at', comments.created_at)
        from public.comments where comments.id = target.item_id)
    when 'profile' then (select jsonb_build_object('handle', profiles.handle, 'pen_name', profiles.pen_name,
        'bio', profiles.bio) from public.profiles where profiles.id = target.item_id)
    when 'picture' then (select jsonb_build_object('kind', picture_checks.kind, 'bucket', picture_checks.bucket,
        'path', picture_checks.path, 'flags', picture_checks.flags, 'uploaded_at', picture_checks.created_at,
        'checked_at', picture_checks.checked_at) from public.picture_checks where picture_checks.id = target.item_id)
    when 'embed' then (select jsonb_build_object('service', chapter_embeds.service,
        'source_url', chapter_embeds.source_url, 'title', chapter_embeds.title,
        'author_name', chapter_embeds.author_name, 'added_at', chapter_embeds.created_at)
        from public.chapter_embeds where chapter_embeds.id = target.item_id)
    when 'atlas_item' then public.plan_item_content(target.item_id)
    -- The reported message's words, plus it and up to 20 before it as context (S1-E9-02).
    when 'message' then (select jsonb_build_object('text', messages.body, 'sent_at', messages.created_at,
        'context', public.message_with_context(messages.id))
        from public.messages where messages.id = target.item_id)
    -- A thread's title with its first post; a post's words, when it was written and edited, and
    -- its earlier versions (S1-E8-02 criterion 4).
    when 'forum_thread' then (select jsonb_build_object('title', forum_threads.title,
        'started_at', forum_threads.created_at,
        'text', (select first_post.body from public.forum_posts as first_post
                 where first_post.thread_id = forum_threads.id and first_post.post_number = 1))
        from public.forum_threads where forum_threads.id = target.item_id)
    when 'forum_post' then (select jsonb_build_object('text', forum_posts.body, 'number', forum_posts.post_number,
        'posted_at', forum_posts.created_at, 'edited_at', forum_posts.edited_at,
        'earlier_versions', (select coalesce(jsonb_agg(jsonb_build_object('text', revisions.body,
            'title', revisions.title, 'written_at', revisions.written_at) order by revisions.written_at), '[]'::jsonb)
          from public.forum_post_revisions as revisions where revisions.post_id = forum_posts.id))
        from public.forum_posts where forum_posts.id = target.item_id)
  end;
$$;

/**
 * notification_item_json: as in S1-E9-01, and a thread or post links to its place (S1-E8-02).
 */
create or replace function public.notification_item_json(case_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'item_type', cases.item_type,
    'reference', cases.reference,
    'address', case cases.item_type
      when 'story' then (select '/s/' || stories.slug from public.stories where stories.id = cases.item_id)
      when 'chapter' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.chapters join public.stories on stories.id = chapters.story_id where chapters.id = cases.item_id)
      when 'comment' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.comments join public.chapters on chapters.id = comments.chapter_id
        join public.stories on stories.id = chapters.story_id where comments.id = cases.item_id)
      when 'profile' then (select '/u/' || profiles.handle from public.profiles where profiles.id = cases.item_id)
      when 'picture' then (select case picture_checks.kind
          when 'cover' then (select '/s/' || stories.slug from public.stories where stories.id = picture_checks.story_id)
          when 'avatar' then (select '/u/' || profiles.handle from public.profiles where profiles.id = picture_checks.user_id)
          when 'chapter_picture' then (select '/s/' || stories.slug || '/' || chapters.code
            from public.chapters join public.stories on stories.id = chapters.story_id
            where chapters.id = picture_checks.chapter_id)
        end from public.picture_checks where picture_checks.id = cases.item_id)
      when 'embed' then (select '/s/' || stories.slug || '/' || chapters.code
        from public.chapter_embeds join public.chapters on chapters.id = chapter_embeds.chapter_id
        join public.stories on stories.id = chapters.story_id where chapter_embeds.id = cases.item_id)
      when 'atlas_item' then public.plan_item_address(cases.item_id)
      -- A chat's address differs for each of the two people, so a message links to Messages.
      when 'message' then '/messages'
      -- A thread's address, and a post's permalink (S1-E8-02).
      when 'forum_thread' then (select '/forums/' || forums.slug || '/' || forum_threads.thread_number
        from public.forum_threads join public.forums on forums.id = forum_threads.forum_id
        where forum_threads.id = cases.item_id)
      when 'forum_post' then (select '/forums/' || forums.slug || '/' || forum_threads.thread_number
          || '?post=' || forum_posts.post_number
        from public.forum_posts join public.forum_threads on forum_threads.id = forum_posts.thread_id
        join public.forums on forums.id = forum_threads.forum_id where forum_posts.id = cases.item_id)
    end)
  from public.cases where cases.id = case_id;
$$;

/* ---------- Download my data and account deletion ---------- */

/**
 * data_export_tables: as in IDEAS-1c, plus the person's forum threads, posts and the earlier
 * versions of their edited posts (S1-E8-02).
 */
create or replace function public.data_export_tables()
returns table (table_name text, is_included boolean, why_left_out text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', true, null),
    ('age_check_attempts', true, null),
    ('age_check_sessions', false, 'a short-lived link to a Yoti session, deleted once the result is stored; the result is in the account part'),
    ('appeals', true, null),
    ('blocks', true, null),
    ('canva_connections', false, 'holds the keys to the person''s own Canva account, which must never leave the server'),
    ('chapter_embeds', true, null),
    ('chapter_likes', true, null),
    ('chapter_plan_characters', true, null),
    ('chapter_plans', true, null),
    ('chapter_revisions', true, null),
    ('chapter_scenes', true, null),
    ('chapters', true, null),
    ('comment_downvotes', true, null),
    ('comment_reactions', true, null),
    ('comments', true, null),
    ('consents', true, null),
    ('conversation_members', true, null),
    ('conversations', true, null),
    ('email_outbox', false, 'copies of notifications waiting to be emailed; the notifications themselves are included'),
    ('email_unsubscribe_keys', false, 'a secret key for the one-click unsubscribe link'),
    ('finished_thanks', true, null),
    ('follows_stories', true, null),
    ('follows_users', true, null),
    ('forum_post_revisions', true, null),
    ('forum_posts', true, null),
    ('forum_threads', true, null),
    ('identity_link_requests', false, 'a ten-minute step while connecting a way to log in; the ways to log in are in the account part'),
    ('invites', true, null),
    ('library_entries', true, null),
    ('manual_age_checks', true, null),
    ('messages', true, null),
    ('moderator_mail_messages', true, null),
    ('moderator_mail_threads', true, null),
    ('notification_email_settings', true, null),
    ('notifications', true, null),
    ('parental_consents', true, null),
    ('picture_checks', true, null),
    ('quote_cards', true, null),
    ('rate_limit_events', false, 'a security counter kept for two days'),
    ('reading_habits', true, null),
    ('reading_minutes', true, null),
    ('reading_positions', true, null),
    ('reading_preferences', true, null),
    ('reading_settings', true, null),
    ('report_detail_requests', true, null),
    ('reports', true, null),
    ('statements_of_reasons', true, null),
    ('stories', true, null),
    ('story_bible_entries', true, null),
    ('story_bible_sections', true, null),
    ('story_character_fields', true, null),
    ('story_character_relationships', true, null),
    ('story_characters', true, null),
    ('story_events', true, null),
    ('story_ideas', true, null),
    ('story_marketing', true, null),
    ('story_plan_acts', true, null),
    ('story_plans', true, null),
    ('story_tags', true, null),
    ('teacher_checks', true, null),
    ('username_approvals', false, 'a moderator''s note that a name was refused by mistake; the name itself is in the profile');
$$;

comment on function public.data_export_tables() is
  'Internal: every user table and whether Download my data includes it (S1-E13-02, IDEAS-1b, IDEAS-1c, S1-E8-02).';

/**
 * account_deletion_rules: as in IDEAS-1c, plus the forum tables, each with its own step in
 * delete_account_forum_posts().
 */
create or replace function public.account_deletion_rules()
returns table (table_name text, action text, step integer, why text)
language sql
immutable
set search_path = ''
as $$
  values
    ('account_deletions', 'kept', 0, 'the record that the account was deleted, with no personal data in it'),
    ('age_check_attempts', 'delete', 1, null),
    ('age_check_sessions', 'delete', 1, null),
    ('appeals', 'kept', 0, 'a moderation record, kept as long as its statement of reasons and case (docs/retention.md)'),
    ('blocks', 'own_step', 0, 'deleted both ways: who the person blocked and who blocked them'),
    ('canva_connections', 'delete', 1, null),
    ('chapter_embeds', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_likes', 'delete', 1, null),
    ('chapter_plan_characters', 'delete', 1, null),
    ('chapter_plans', 'delete', 2, null),
    ('chapter_revisions', 'own_step', 0, 'deleted with their chapter, unless the chapter is kept for a case'),
    ('chapter_scenes', 'delete', 1, null),
    ('chapters', 'own_step', 0, 'deleted unless under an open case'),
    ('comment_downvotes', 'delete', 1, null),
    ('comment_reactions', 'delete', 1, null),
    ('comments', 'own_step', 0, 'deleted unless under an open case; one with replies keeps its place, with its words erased'),
    ('consents', 'kept', 0, 'proof of what the person agreed to (GDPR art. 7(1)); how long after deletion is OPEN for the lawyer'),
    ('conversation_members', 'own_step', 0, 'marked deleted for the person, so the chat goes once the other person deletes it too'),
    ('conversations', 'kept', 0, 'the other person''s chat; removed by the chat clean-up once they delete it (S1-E9-04)'),
    ('email_outbox', 'delete', 1, null),
    ('email_unsubscribe_keys', 'delete', 1, null),
    ('exports', 'delete', 1, null),
    ('finished_thanks', 'delete', 1, null),
    ('follows_stories', 'delete', 1, null),
    ('follows_users', 'own_step', 0, 'deleted both ways: whom the person followed and who followed them'),
    ('forum_post_revisions', 'own_step', 0, 'deleted with the account''s posts, unless a case holds the post'),
    ('forum_posts', 'own_step', 0, 'words erased unless under an open case; the post keeps its number as a "Post deleted" marker so the thread''s numbering stays'),
    ('forum_threads', 'own_step', 0, 'deleted when nobody else posted in it; otherwise kept for the other people''s replies, its starter shown as a deleted account'),
    ('identity_link_requests', 'delete', 1, null),
    ('invites', 'kept', 0, 'invites staff made; purged 90 days after they expire (docs/retention.md)'),
    ('library_entries', 'delete', 1, null),
    ('manual_age_checks', 'delete', 1, null),
    ('messages', 'own_step', 0, 'the person''s own messages are deleted, unless reported and still held (S1-E9-02)'),
    ('moderator_mail_messages', 'kept', 0, 'a moderation record, purged a year after the thread was last updated (docs/retention.md)'),
    ('moderator_mail_threads', 'kept', 0, 'a moderation record, purged a year after it was last updated (docs/retention.md)'),
    ('notification_email_settings', 'delete', 1, null),
    ('notifications', 'delete', 1, null),
    ('parental_consents', 'delete', 1, null),
    ('picture_checks', 'own_step', 0, 'deleted unless a case or an authority''s order keeps the picture'),
    ('quote_cards', 'delete', 1, null),
    ('rate_limit_events', 'delete', 1, null),
    ('reading_habits', 'delete', 1, null),
    ('reading_minutes', 'delete', 1, null),
    ('reading_positions', 'delete', 1, null),
    ('reading_preferences', 'delete', 1, null),
    ('reading_settings', 'delete', 1, null),
    ('report_detail_requests', 'kept', 0, 'part of a report, kept as long as the report and its case (docs/retention.md)'),
    ('reports', 'kept', 0, 'a moderation record, kept as long as its case (docs/retention.md, OPEN)'),
    ('statements_of_reasons', 'kept', 0, 'a moderation record, kept 6 months after the decision and as long as its case (DSA art. 17)'),
    ('stories', 'own_step', 0, 'deleted unless the story or one of its chapters is under an open case'),
    ('story_bible_entries', 'delete', 1, null),
    ('story_bible_sections', 'delete', 2, null),
    ('story_character_fields', 'delete', 1, null),
    ('story_character_relationships', 'delete', 1, null),
    ('story_characters', 'delete', 2, null),
    ('story_events', 'delete', 1, null),
    ('story_ideas', 'delete', 1, null),
    ('story_marketing', 'delete', 1, null),
    ('story_plan_acts', 'delete', 2, null),
    ('story_plans', 'delete', 3, null),
    ('story_tags', 'own_step', 0, 'deleted with their story, unless the story is kept for a case'),
    ('teacher_checks', 'delete', 1, null),
    ('username_approvals', 'delete', 1, null);
$$;

comment on function public.account_deletion_rules() is
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c, S1-E8-02).';

/**
 * request_account_deletion: as in S1-E13-03, and the person's forum posts become "Post deleted"
 * markers at the same moment, with the threads only they posted in (S1-E8-02).
 */
create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := public.require_live_profile();
  deletion_days integer := coalesce((public.setting_value('account_deletion_days'))::integer, 14);
  closes_on timestamptz := now() + make_interval(days => deletion_days);
begin
  -- Step 1: the board's "Log in again to confirm".
  if not public.account_signed_in_recently() then
    raise exception 'Log in again to confirm.' using errcode = 'check_violation', hint = 'sign_in_again';
  end if;
  -- Step 2: a staff account keeps its staff powers off a closing account (architecture 1.8.1).
  if exists (select 1 from public.staff_roles where staff_roles.user_id = caller_id) then
    raise exception 'A staff account can''t be deleted here.' using errcode = 'check_violation', hint = 'staff_account';
  end if;
  -- Step 3: the account closes: hidden everywhere, and online status forgotten.
  update public.profiles set deleted_at = now(), last_active_at = null where profiles.id = caller_id;
  -- Step 4: the live stories and comments go out of sight with the same time, so a cancel
  -- brings back exactly these (chapters follow their story).
  update public.stories set deleted_at = now()
  where stories.user_id = caller_id and stories.deleted_at is null;
  update public.comments set deleted_at = now(), deleted_by = 'author'
  where comments.user_id = caller_id and comments.deleted_at is null;
  -- Step 5: the forums (S1-E8-02): the person's posts become "Post deleted" markers, and a
  -- thread nobody else has a live post in goes with them; a cancel brings back exactly these.
  update public.forum_posts set deleted_at = now()
  where forum_posts.user_id = caller_id and forum_posts.deleted_at is null;
  update public.forum_threads set deleted_at = now()
  where forum_threads.user_id = caller_id and forum_threads.deleted_at is null
    and not exists (select 1 from public.forum_posts
                    where forum_posts.thread_id = forum_threads.id and forum_posts.user_id <> caller_id
                      and forum_posts.deleted_at is null);
  -- Step 6: the request, for the closing page and the nightly job.
  insert into public.account_deletions (user_id, delete_after) values (caller_id, closes_on);
  return jsonb_build_object('delete_after', closes_on);
end;
$$;


/**
 * cancel_account_deletion: as in S1-E13-03, and the forum posts and threads the request hid come
 * back too (S1-E8-02).
 */
create or replace function public.cancel_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request public.account_deletions;
begin
  if caller_id is null then
    raise exception 'Sign in first.' using errcode = 'insufficient_privilege', hint = 'signed_out';
  end if;
  -- Step 1: the open request, if any.
  select * into request from public.account_deletions
  where account_deletions.user_id = caller_id
    and account_deletions.cancelled_at is null and account_deletions.completed_at is null
  for update;
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the account, its stories and its comments come back.
  update public.profiles set deleted_at = null where profiles.id = caller_id;
  update public.stories set deleted_at = null
  where stories.user_id = caller_id and stories.deleted_at = request.requested_at;
  update public.comments set deleted_at = null, deleted_by = null
  where comments.user_id = caller_id and comments.deleted_at = request.requested_at;
  update public.forum_posts set deleted_at = null
  where forum_posts.user_id = caller_id and forum_posts.deleted_at = request.requested_at;
  update public.forum_threads set deleted_at = null
  where forum_threads.user_id = caller_id and forum_threads.deleted_at = request.requested_at;
  -- Step 3: the request is closed as cancelled.
  update public.account_deletions set cancelled_at = now() where account_deletions.id = request.id;
  return jsonb_build_object('outcome', 'ok');
end;
$$;


/**
 * delete_account_forum_posts: the forum threads and posts of an account being deleted (S1-E8-02).
 * - A thread nobody else posted in goes, with its posts, unless a case holds it or one of them.
 * - Every other post loses its words (a "Post deleted" marker keeps its number) and its earlier
 *   versions, unless a case holds it. A thread with other people's replies stays, its starter
 *   shown as a deleted account; its title stays with it (a question for Robert in the PR).
 * Input: the user ID. Internal: delete_account_data().
 */
create or replace function public.delete_account_forum_posts(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Step 1: threads only this person posted in, unless a case holds the thread or a post in it.
  delete from public.forum_threads
  where forum_threads.user_id = target_user_id
    and not exists (select 1 from public.forum_posts
                    where forum_posts.thread_id = forum_threads.id and forum_posts.user_id <> target_user_id)
    and not public.content_is_held_for_moderation('forum_thread', forum_threads.id)
    and not exists (select 1 from public.forum_posts
                    where forum_posts.thread_id = forum_threads.id
                      and public.content_is_held_for_moderation('forum_post', forum_posts.id));
  -- Step 2: the rest of their posts lose their words and earlier versions, unless held.
  delete from public.forum_post_revisions
  where forum_post_revisions.user_id = target_user_id
    and not public.content_is_held_for_moderation('forum_post', forum_post_revisions.post_id);
  update public.forum_posts set body = '', deleted_at = coalesce(forum_posts.deleted_at, now())
  where forum_posts.user_id = target_user_id
    and not public.content_is_held_for_moderation('forum_post', forum_posts.id);
end;
$$;

comment on function public.delete_account_forum_posts(uuid) is
  'Internal: deletes an account''s forum threads and erases its posts, keeping only what a case holds (S1-E8-02).';
revoke execute on function public.delete_account_forum_posts(uuid) from public, anon, authenticated;

/**
 * delete_account_data: as in S1-E13-03, with the forum step after the comments and messages.
 */
create or replace function public.delete_account_data(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rule record;
begin
  -- Step 1: the content, keeping only what a case holds.
  perform public.delete_account_stories(target_user_id);
  perform public.delete_account_conversation(target_user_id);
  perform public.delete_account_forum_posts(target_user_id);
  -- Step 2: follows and blocks, both ways.
  delete from public.follows_users
  where follows_users.user_id = target_user_id or follows_users.followed_user_id = target_user_id;
  delete from public.blocks
  where blocks.user_id = target_user_id or blocks.blocked_user_id = target_user_id;
  -- Step 3: every other row of the person's, children before parents.
  for rule in
    select rules.table_name from public.account_deletion_rules() as rules
    where rules.action = 'delete' order by rules.step, rules.table_name
  loop
    execute format('delete from public.%I where user_id = $1', rule.table_name) using target_user_id;
  end loop;
  -- Step 4: the account itself.
  perform public.erase_closed_account(target_user_id);
end;
$$;


/* ---------- Retention ---------- */

/**
 * purge_deleted_forum_posts: erases for good the words of every post deleted more than
 * content_purge_days (30) ago, with its earlier versions, unless a case holds it; the row stays as
 * the "Post deleted" marker that keeps the thread's numbering. Deleted threads go for good after
 * the same time, unless a case holds them or a post in them.
 * Returns: how many posts and threads were cleared. Run nightly by pg_cron.
 */
create or replace function public.purge_deleted_forum_posts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purge_days integer := coalesce((public.setting_value('content_purge_days'))::integer, 30);
  cleared_posts integer;
  cleared_threads integer;
begin
  -- Step 1: the earlier versions and words of long-deleted posts.
  delete from public.forum_post_revisions
  using public.forum_posts
  where forum_posts.id = forum_post_revisions.post_id
    and forum_posts.deleted_at < now() - make_interval(days => purge_days)
    and not public.content_is_held_for_moderation('forum_post', forum_posts.id);
  update public.forum_posts set body = ''
  where forum_posts.deleted_at < now() - make_interval(days => purge_days)
    and forum_posts.body <> ''
    and not public.content_is_held_for_moderation('forum_post', forum_posts.id);
  get diagnostics cleared_posts = row_count;
  -- Step 2: long-deleted threads, with their posts.
  delete from public.forum_threads
  where forum_threads.deleted_at < now() - make_interval(days => purge_days)
    and not public.content_is_held_for_moderation('forum_thread', forum_threads.id)
    and not exists (select 1 from public.forum_posts
                    where forum_posts.thread_id = forum_threads.id
                      and public.content_is_held_for_moderation('forum_post', forum_posts.id));
  get diagnostics cleared_threads = row_count;
  return cleared_posts + cleared_threads;
end;
$$;
comment on function public.purge_deleted_forum_posts() is
  'Nightly: erases deleted forum posts'' words and deletes deleted threads 30 days on, unless held (S1-E8-02).';
revoke execute on function public.purge_deleted_forum_posts() from public, anon, authenticated;

-- Nightly at 03:37 UTC, after the comments' purge (03:35). Naming the job makes this safe to run again.
select cron.schedule('purge-deleted-forum-posts', '37 3 * * *', 'select public.purge_deleted_forum_posts();');
