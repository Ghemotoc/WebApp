/*
 * Read and unread in the forums (bundle FORUMS-1, part d; story S1-E8-04; boards 5.1 Forums and
 * 5.2 Forum thread).
 *
 * The phpBB pattern the story names (confirmed by the research fact check): one "everything read"
 * mark per person, one mark per forum, and one mark per thread. A post is new for a reader when
 * all three say they haven't seen it:
 * - it was written after the person's latest board mark and the latest mark on its forum (or,
 *   with no mark yet, after the account was made, so a new account doesn't start with the whole
 *   board unread);
 * - its number is after the last post they read in that thread;
 * - someone else wrote it (one's own posts are never new to oneself), and the reader can read it.
 *
 * What it adds:
 * - forum_read_marks: "Mark all as read" (forum_id null) and "Mark as read" on a forum or
 *   category (one row per forum inside it), each with when.
 * - forum_thread_reads: the last post number a person has seen in each thread they opened.
 * - forum_first_unread_post(): the first new post of a thread for the caller, or null.
 * - forum_has_unread(): whether a forum, or one inside it, has a thread with new posts.
 * - mark_forum_thread_read(), mark_forums_read() and forum_new_for_you() for the screens.
 * - forum_index() gains has_unread; forum_thread_summary_json() gains is_unread and
 *   first_unread_post, so the list opens an unread thread at its first new post (criterion 2).
 *
 * Privacy: what someone has read is theirs alone (the select_own policies); no one else, staff
 * included, sees it. Both tables are in Download my data and go with the account.
 * Who calls it: src/features/forums (api/forumReads.ts, hooks/useForumReads.ts).
 */

/* ---------- 1. Tables ---------- */

create table public.forum_read_marks (
  id uuid primary key default gen_random_uuid(),
  -- Who marked (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  -- The forum marked as read; null for "Mark all as read" on the whole board.
  forum_id uuid references public.forums (id) on delete cascade,
  -- Everything written before this counts as read.
  marked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One board mark and one mark per forum each (null counts as one value here).
  constraint forum_read_marks_one_each unique nulls not distinct (user_id, forum_id)
);
comment on table public.forum_read_marks is
  'kind: user_action
"Mark all as read" (forum_id null) and "Mark as read" on a forum, with when (S1-E8-04). Private to the person.';
comment on column public.forum_read_marks.forum_id is 'The forum marked as read; null for the whole board.';
create trigger forum_read_marks_set_updated_at
  before update on public.forum_read_marks
  for each row execute function public.set_updated_at();
create trigger forum_read_marks_refuse_user_id_change
  before update on public.forum_read_marks
  for each row execute function public.refuse_user_id_change('user_id');
alter table public.forum_read_marks enable row level security;

-- Who: the person. Why: what someone has read is private; writes go only through
-- mark_forums_read().
create policy forum_read_marks_select_own on public.forum_read_marks
  for select to authenticated
  using (user_id = (select auth.uid()));
comment on policy forum_read_marks_select_own on public.forum_read_marks is
  'A person reads their own read marks; nobody else (S1-E8-04).';
grant select on public.forum_read_marks to authenticated;

create table public.forum_thread_reads (
  id uuid primary key default gen_random_uuid(),
  -- Who read (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  thread_id uuid not null references public.forum_threads (id) on delete cascade,
  -- The highest post number they have had on screen; posts after it are new to them.
  last_read_post_number integer not null default 0,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forum_thread_reads_one_each unique (user_id, thread_id),
  constraint forum_thread_reads_number_not_negative check (last_read_post_number >= 0)
);
comment on table public.forum_thread_reads is
  'kind: user_action
The last post a person has seen in each forum thread they opened (S1-E8-04). Private to the person.';
comment on column public.forum_thread_reads.last_read_post_number is 'The highest post number they have had on screen.';
create index forum_thread_reads_thread on public.forum_thread_reads (thread_id);
create trigger forum_thread_reads_set_updated_at
  before update on public.forum_thread_reads
  for each row execute function public.set_updated_at();
create trigger forum_thread_reads_refuse_user_id_change
  before update on public.forum_thread_reads
  for each row execute function public.refuse_user_id_change('user_id');
alter table public.forum_thread_reads enable row level security;

-- Who: the person. Why: what someone has read is private; writes go only through
-- mark_forum_thread_read().
create policy forum_thread_reads_select_own on public.forum_thread_reads
  for select to authenticated
  using (user_id = (select auth.uid()));
comment on policy forum_thread_reads_select_own on public.forum_thread_reads is
  'A person reads their own thread reads; nobody else (S1-E8-04).';
grant select on public.forum_thread_reads to authenticated;

/* ---------- 2. Working out what is new ---------- */

/**
 * forum_and_children: a forum and every forum inside it, at any depth.
 * Input: the forum's ID. Returns: the IDs, the forum's own first.
 * Internal: forum_has_unread(), mark_forums_read().
 */
create or replace function public.forum_and_children(top_forum_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with recursive tree as (
    select forums.id from public.forums where forums.id = top_forum_id and forums.deleted_at is null
    union all
    select inner_forum.id from public.forums as inner_forum
    join tree on inner_forum.parent_id = tree.id
    where inner_forum.deleted_at is null
  )
  select tree.id from tree;
$$;
comment on function public.forum_and_children(uuid) is 'Internal: a forum and every live forum inside it (S1-E8-04).';
revoke execute on function public.forum_and_children(uuid) from public, anon, authenticated;

/**
 * forum_read_since: the moment before which everything in a forum counts as read for the caller.
 * Input: the forum's ID.
 * Returns: the latest of the account's creation, the board mark and the forum's own mark; null
 *   when signed out (nothing is new to a visitor).
 * Internal: forum_first_unread_post().
 */
create or replace function public.forum_read_since(target_forum_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    profiles.created_at,
    (select marks.marked_at from public.forum_read_marks as marks
     where marks.user_id = profiles.id and marks.forum_id is null),
    (select marks.marked_at from public.forum_read_marks as marks
     where marks.user_id = profiles.id and marks.forum_id = target_forum_id))
  from public.profiles
  where profiles.id = (select auth.uid());
$$;
comment on function public.forum_read_since(uuid) is 'Internal: when a forum counts as read up to, for the caller (S1-E8-04).';
revoke execute on function public.forum_read_since(uuid) from public, anon, authenticated;

/**
 * forum_first_unread_post: the first post of a thread that is new to the caller.
 * Input: the thread row.
 * Returns: its number, or null when nothing is new (or the caller is signed out). A post is new
 *   when someone else wrote it, the caller can read it, it was written after forum_read_since()
 *   and its number is after the last one the caller has seen in this thread (criterion 1).
 * Internal: forum_thread_summary_json(), forum_has_unread(), forum_new_for_you().
 */
create or replace function public.forum_first_unread_post(target public.forum_threads)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select min(forum_posts.post_number)
  from public.forum_posts
  where forum_posts.thread_id = target.id
    and (select auth.uid()) is not null
    and forum_posts.user_id <> (select auth.uid())
    and forum_posts.created_at > public.forum_read_since(target.forum_id)
    and forum_posts.post_number > coalesce(
      (select reads.last_read_post_number from public.forum_thread_reads as reads
       where reads.user_id = (select auth.uid()) and reads.thread_id = target.id), 0)
    and public.forum_post_state_for_caller(forum_posts) = 'live';
$$;
comment on function public.forum_first_unread_post(public.forum_threads) is
  'Internal: the first post of a thread new to the caller, or null (S1-E8-04).';
revoke execute on function public.forum_first_unread_post(public.forum_threads) from public, anon, authenticated;

/**
 * forum_unread_post_count: how many posts of a thread are new to the caller (the same rule as
 * forum_first_unread_post()), for "New for you"'s "3 new".
 * Input: the thread row. Returns: the count; 0 when signed out.
 * Internal: forum_new_for_you().
 */
create or replace function public.forum_unread_post_count(target public.forum_threads)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.forum_posts
  where forum_posts.thread_id = target.id
    and (select auth.uid()) is not null
    and forum_posts.user_id <> (select auth.uid())
    and forum_posts.created_at > public.forum_read_since(target.forum_id)
    and forum_posts.post_number > coalesce(
      (select reads.last_read_post_number from public.forum_thread_reads as reads
       where reads.user_id = (select auth.uid()) and reads.thread_id = target.id), 0)
    and public.forum_post_state_for_caller(forum_posts) = 'live';
$$;
comment on function public.forum_unread_post_count(public.forum_threads) is
  'Internal: how many posts of a thread are new to the caller (S1-E8-04).';
revoke execute on function public.forum_unread_post_count(public.forum_threads) from public, anon, authenticated;

/**
 * forum_has_unread: whether a forum, or any forum inside it, has a thread with new posts.
 * Input: the forum's ID. Returns: true or false; null when signed out (the index then shows no
 *   dots at all).
 * Internal: forum_index().
 */
create or replace function public.forum_has_unread(target_forum_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case when (select auth.uid()) is null then null else exists (
    select 1 from public.forum_threads
    where forum_threads.forum_id in (select public.forum_and_children(target_forum_id))
      and forum_threads.last_post_at > public.forum_read_since(forum_threads.forum_id)
      and public.forum_thread_is_shown(forum_threads)
      and public.forum_first_unread_post(forum_threads) is not null) end;
$$;
comment on function public.forum_has_unread(uuid) is 'Internal: whether a forum or one inside it has new posts for the caller (S1-E8-04).';
revoke execute on function public.forum_has_unread(uuid) from public, anon, authenticated;

/* ---------- 3. The reads, now with what is new ---------- */

/**
 * forum_thread_summary_json: one thread as a forum's list shows it (as in part b, plus is_unread
 *   and first_unread_post, so the list marks it and opens it at its first new post, criteria 1
 *   and 2).
 * Input: the thread row. Returns: JSON with number, title, author, created_at, reply_count,
 *   last_post_at, last_poster, is_unread (null when signed out) and first_unread_post.
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
    'last_poster', (select public.forum_person_json(latest.user_id) from public.forum_posts as latest
                    where latest.thread_id = target.id
                      and public.forum_post_state_for_caller(latest) in ('live', 'hidden')
                    order by latest.post_number desc limit 1),
    'is_unread', case when (select auth.uid()) is null then null else first_unread is not null end,
    'first_unread_post', first_unread);
end;
$$;
comment on function public.forum_thread_summary_json(public.forum_threads) is
  'Internal: one thread as a forum''s list shows it, with whether it is new to the caller; never a user ID (S1-E8-02, S1-E8-04).';
revoke execute on function public.forum_thread_summary_json(public.forum_threads) from public, anon, authenticated;

-- forum_index() gains a column, so it is dropped and made again (its grants with it).
drop function public.forum_index(text);

/**
 * forum_index: as in FORUMS-1b, plus has_unread: whether the forum, or one inside it, has new
 * posts for the caller (board 5.1's filled dot; null for a visitor, who sees no dots).
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
  latest_post jsonb,
  has_unread boolean
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
      'posted_at', latest.posted_at) end,
    public.forum_has_unread(forums.id)
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
  'The forum index in one language: every live forum with its numbers, latest post and whether it has new posts for the caller (S1-E8-01, S1-E8-02, S1-E8-04).';
grant execute on function public.forum_index(text) to anon, authenticated;

/**
 * forum_new_for_you: the threads with new posts for the caller across the forums, newest first
 * (board 5.1's "New for you" side column; each opens at its first new post, criterion 2).
 * Inputs: how_many (default 5, at most 20); language_code, for the forum's name (default 'ro').
 * Returns: JSON [{"title", "forum_name", "forum_slug", "number", "first_unread_post", "new_count",
 *   "last_post_at"}], or []
 *   when signed out.
 * Who may call it: anyone; a visitor gets [].
 */
create or replace function public.forum_new_for_you(how_many integer default 5, language_code text default 'ro')
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(item order by (item ->> 'last_post_at')::timestamptz desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'title', forum_threads.title,
      'forum_name', (select names.name from public.forum_name_in(forums.id, forum_new_for_you.language_code) as names),
      'forum_slug', forums.slug,
      'number', forum_threads.thread_number,
      'first_unread_post', public.forum_first_unread_post(forum_threads),
      'new_count', public.forum_unread_post_count(forum_threads),
      'last_post_at', forum_threads.last_post_at) as item
    from public.forum_threads
    join public.forums on forums.id = forum_threads.forum_id
    where (select auth.uid()) is not null
      and forum_threads.last_post_at > public.forum_read_since(forum_threads.forum_id)
      and public.forum_thread_is_shown(forum_threads)
      and public.forum_first_unread_post(forum_threads) is not null
    order by forum_threads.last_post_at desc
    limit least(greatest(coalesce(how_many, 5), 1), 20)
  ) as unread;
$$;
comment on function public.forum_new_for_you(integer, text) is
  'The threads with new posts for the caller, newest first, each with its first new post (S1-E8-04).';
grant execute on function public.forum_new_for_you(integer, text) to anon, authenticated;

/* ---------- 4. Marking as read ---------- */

/**
 * mark_forum_thread_read: records that the caller has seen a thread up to a post.
 * Inputs: thread_number; up_to_post (the highest post number on their screen).
 * Rules: signed in (any account, read-only ones included: reading isn't writing); a thread they
 *   may open. The mark only moves forward, so reading an old permalink never makes newer posts
 *   new again.
 * Errors: insufficient_privilege (hint 'signed_out'); no_data_found (hint 'thread:missing').
 * Who calls it: the thread page, once its posts are on screen.
 */
create or replace function public.mark_forum_thread_read(thread_number bigint, up_to_post integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  thread public.forum_threads;
begin
  -- Step 1: signed in, and a thread they may open.
  if caller_id is null then
    raise exception 'Log in first.' using errcode = 'insufficient_privilege', hint = 'signed_out';
  end if;
  select * into thread from public.forum_threads where forum_threads.thread_number = mark_forum_thread_read.thread_number;
  if thread.id is null or not public.forum_thread_is_shown(thread) then
    raise exception 'That thread isn''t there any more.' using errcode = 'no_data_found', hint = 'thread:missing';
  end if;
  -- Step 2: move the mark forward, never past the thread's last post.
  insert into public.forum_thread_reads (user_id, thread_id, last_read_post_number)
  values (caller_id, thread.id, least(greatest(coalesce(up_to_post, 0), 0), thread.last_post_number))
  on conflict (user_id, thread_id) do update
    set last_read_post_number = greatest(forum_thread_reads.last_read_post_number, excluded.last_read_post_number),
        read_at = now();
end;
$$;
comment on function public.mark_forum_thread_read(bigint, integer) is
  'Records that the caller has seen a thread up to a post; only moves forward (S1-E8-04).';
revoke execute on function public.mark_forum_thread_read(bigint, integer) from public, anon;
grant execute on function public.mark_forum_thread_read(bigint, integer) to authenticated;

/**
 * mark_forums_read: "Mark all as read" (forum_slug null) or "Mark as read" on a forum or
 * category, which covers every forum inside it (criterion 3).
 * Input: forum_slug, or null for the whole board.
 * Errors: insufficient_privilege (hint 'signed_out'); no_data_found (hint 'forum:missing').
 * Who calls it: the forum index (the board and each category) and a forum's page.
 */
create or replace function public.mark_forums_read(forum_slug text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  top_forum_id uuid;
begin
  -- Step 1: signed in.
  if caller_id is null then
    raise exception 'Log in first.' using errcode = 'insufficient_privilege', hint = 'signed_out';
  end if;
  -- Step 2: the whole board: one mark, now.
  if forum_slug is null then
    insert into public.forum_read_marks (user_id, forum_id, marked_at) values (caller_id, null, now())
    on conflict (user_id, forum_id) do update set marked_at = now();
    return;
  end if;
  -- Step 3: one forum and everything inside it: a mark on each.
  select forums.id into top_forum_id from public.forums
  where forums.slug = mark_forums_read.forum_slug and forums.deleted_at is null;
  if top_forum_id is null then
    raise exception 'That forum isn''t there any more.' using errcode = 'no_data_found', hint = 'forum:missing';
  end if;
  insert into public.forum_read_marks (user_id, forum_id, marked_at)
  select caller_id, inside.id, now() from public.forum_and_children(top_forum_id) as inside(id)
  on conflict (user_id, forum_id) do update set marked_at = now();
end;
$$;
comment on function public.mark_forums_read(text) is
  '"Mark all as read" on the board, or "Mark as read" on a forum and the forums inside it (S1-E8-04).';
revoke execute on function public.mark_forums_read(text) from public, anon;
grant execute on function public.mark_forums_read(text) to authenticated;

/* ---------- 5. Data rights ---------- */

/**
 * data_export_tables: as in FORUMS-1b, plus the person's read marks and thread reads (S1-E8-04).
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
    ('forum_read_marks', true, null),
    ('forum_thread_reads', true, null),
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
  'Internal: every user table and whether Download my data includes it (S1-E13-02, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04).';

/**
 * account_deletion_rules: as in FORUMS-1b, plus the read marks and thread reads, deleted with the
 * account (S1-E8-04).
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
    ('forum_read_marks', 'delete', 1, null),
    ('forum_thread_reads', 'delete', 1, null),
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
  'Internal: what deleting an account does to each user table, and why anything is kept (S1-E13-03, IDEAS-1b, IDEAS-1c, S1-E8-02, S1-E8-04).';
