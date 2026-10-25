/*
 * Migration: comments on a chapter (story S1-E6-01; board 3.5, "Comments" under the chapter).
 *
 * What it adds:
 * - comments: one row per comment, with replies one level deep (parent_comment_id points to a
 *   top-level comment of the same chapter; a trigger refuses anything deeper). Up to 2,000
 *   characters (canvas 3.5), optionally marked as a spoiler.
 * - check_comment_text(): the sanitising rules on save (CLAUDE.md rule 8), as for chapter text:
 *   no HTML tags, no script links, the length limit, ş/ţ corrected.
 * - post_comment(), delete_comment(), chapter_comments(): the only ways in. Readers never touch the
 *   table (ADR 0004): every call applies the chapter's reading rules (rating, blocks, moderation)
 *   through readable_chapter() (S1-E6-03), and never answers a user ID (architecture 1.6).
 * - The comment limit (story criterion 4; canvas 8.6's proposal): 5 an hour in an account's
 *   first 24 hours, 60 an hour after, as settings until the admin screen (S1-E11-03, after March)
 *   and the rate-limit story (S1-E10-12) take them over. The refusal says how long to wait.
 * - 'comment' branches in reportable_item_owner() and reportable_item_summary() (the shared
 *   contract, architecture 1.7.11; test 042 checks every type has one), so every comment has a
 *   Report button (DSA art. 16) and a moderator can hide or remove it (moderated_items).
 * - A 'comment_posted' job (IDs only) for the notifications story (S1-E7-01).
 * - purge_deleted_comments(): deleted comments go for good after 30 days (content_purge_days),
 *   unless held for moderation; nightly by pg_cron.
 * Emoji-only comments are never deleted automatically (decided 16 Oct 2026, Q25): nothing here
 * looks at what a comment says beyond the safety rules above. No automated text moderation
 * (CLAUDE.md rule 19).
 * Minors: comments are public to everyone who may read the chapter, under-18s included; under-18s
 * write only once the account gate lets them (the March test is adults only). Needs the lawyer's
 * review before launch to minors (architecture section 6).
 * Who calls it: src/features/comments/api/comments.ts (the comments area on the reader).
 * Tests: supabase/tests/database/149-comments.test.sql.
 */

/* ---------- Settings (proposals; canvas 8.6) ---------- */

insert into public.settings (key, value, is_public, description) values
  ('comment_max_characters', '2000'::jsonb, true,
   'The longest comment, in characters (canvas 3.5; S1-E6-01).'),
  ('comment_hourly_limit_new_account', '5'::jsonb, false,
   'Comments an hour an account may post in its first comment_new_account_hours (proposal, canvas 8.6; S1-E6-01).'),
  ('comment_hourly_limit', '60'::jsonb, false,
   'Comments an hour an account may post after its first day (proposal, canvas 8.6; S1-E6-01).'),
  ('comment_new_account_hours', '24'::jsonb, false,
   'How long an account counts as new for the comment limit, in hours (proposal; S1-E6-01).'),
  ('comment_page_size', '20'::jsonb, false,
   'Top-level comments per page; "Show more comments" reads the next page (S1-E6-01).');

/* ---------- Table ---------- */

-- Who deleted a comment: its author, or the writer of the story it is on (story criterion 3).
create type public.comment_deleted_by as enum ('author', 'writer');

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  -- The comment's author (CLAUDE.md rule 15).
  user_id uuid not null references public.profiles (id),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  -- Null for a comment on the chapter; a top-level comment's ID for a reply (one level deep).
  parent_comment_id uuid references public.comments (id),
  body text not null,
  is_spoiler boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by public.comment_deleted_by,
  constraint comments_body_is_written check (btrim(body) <> '' and char_length(body) <= 2000),
  constraint comments_deletion_fields_go_together check ((deleted_at is null) = (deleted_by is null))
);
comment on table public.comments is
  'kind: user_content; reportable: comment
Comments on chapters, replies one level deep (S1-E6-01). Read only through chapter_comments().';
create index comments_chapter_newest on public.comments (chapter_id, created_at desc) where parent_comment_id is null;
create index comments_parent on public.comments (parent_comment_id) where parent_comment_id is not null;
create index comments_author_recent on public.comments (user_id, created_at desc);
create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();
create trigger comments_refuse_user_id_change
  before update on public.comments
  for each row execute function public.refuse_user_id_change('user_id');

/**
 * keep_replies_one_level: refuses a reply to a reply, or a reply on another chapter.
 * Trigger: before insert on comments. Errors: check_violation.
 * Why: the board shows replies one level deep (story criterion 1); deeper threads are forums
 *   (S1-E8, after March).
 */
create or replace function public.keep_replies_one_level()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent public.comments;
begin
  if new.parent_comment_id is null then
    return new;
  end if;
  select * into parent from public.comments where comments.id = new.parent_comment_id;
  if parent.id is null or parent.parent_comment_id is not null or parent.chapter_id <> new.chapter_id then
    raise exception 'A reply answers a comment on the same chapter, one level deep.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
comment on function public.keep_replies_one_level() is 'Trigger: replies one level deep, on the same chapter (S1-E6-01).';
create trigger comments_keep_replies_one_level
  before insert on public.comments
  for each row execute function public.keep_replies_one_level();

alter table public.comments enable row level security;

-- Who: the author. Why: their own comments (a future "my comments" list and their data export);
-- everyone else reads comments only through chapter_comments(), which applies the reading rules.
-- Writes go only through post_comment() and delete_comment(), so there are no write policies.
create policy comments_select_own on public.comments
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Who: moderation staff (owner, admin, moderator) in a staff session. Why: a reported comment's
-- text on the case page, deleted or not (architecture 1.8.3).
create policy comments_select_moderation on public.comments
  for select to authenticated
  using ((select public.staff_may('moderation', 'view')));

grant select on public.comments to authenticated;

/* ---------- The text ---------- */

/**
 * check_comment_text: the sanitising rules for a comment, on the server (rule 8).
 * Input: the text as typed (the Markdown subset). Returns: the text trimmed, with ş/ţ corrected.
 * Errors: check_violation for an empty text, one over comment_max_characters, a raw HTML tag, or
 *   a javascript:, data: or vbscript: link. The same rules as check_chapter_text() (ADR 0005).
 * Internal: post_comment().
 */
create or replace function public.check_comment_text(body text)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  clean_body text := btrim(public.normalise_romanian_letters(coalesce(body, '')));
  longest integer := coalesce((public.setting_value('comment_max_characters'))::integer, 2000);
begin
  -- Step 1: something to say, and not too much (2,000 characters, canvas 3.5).
  if clean_body = '' then
    raise exception 'Write something first.' using errcode = 'check_violation';
  end if;
  if char_length(clean_body) > longest then
    raise exception 'A comment can have at most % characters.', longest using errcode = 'check_violation';
  end if;
  -- Step 2: no raw HTML; escaped text ("\<b\>") is the literal words (as check_chapter_text()).
  if regexp_replace(clean_body, '\\.', '', 'g') ~ '<[[:alpha:]/!?]' then
    raise exception 'HTML tags are not allowed in a comment (CLAUDE.md rule 8).' using errcode = 'check_violation';
  end if;
  -- Step 3: links only http, https or mailto.
  if clean_body ~* '(javascript|data|vbscript)\s*:' then
    raise exception 'Only http, https and mailto links are allowed (CLAUDE.md rule 8).' using errcode = 'check_violation';
  end if;
  return clean_body;
end;
$$;
comment on function public.check_comment_text(text) is
  'Internal: refuses empty, over-long, HTML and script-link comments; corrects ş/ţ (S1-E6-01, rule 8).';
revoke execute on function public.check_comment_text(text) from public, anon, authenticated;

/* ---------- The limit ---------- */

/**
 * comment_wait_minutes: how long the caller must wait before their next comment.
 * Input: author_id. Returns: 0 when they may post now; otherwise whole minutes until the oldest
 *   comment of the last hour drops out of the window (at least 1).
 * Rules (story criterion 4; canvas 8.6 proposal): comment_hourly_limit_new_account (5) in the
 *   account's first comment_new_account_hours (24), comment_hourly_limit (60) after. Deleted
 *   comments still count, so deleting and posting again doesn't get round it.
 * Internal: post_comment().
 */
create or replace function public.comment_wait_minutes(author_id uuid)
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
    then coalesce((public.setting_value('comment_hourly_limit_new_account'))::integer, 5)
    else coalesce((public.setting_value('comment_hourly_limit'))::integer, 60) end
  into hourly_limit
  from public.profiles where profiles.id = author_id;
  -- Step 2: what they posted in the last hour.
  select count(*)::integer, min(comments.created_at) into posted_in_window, oldest_in_window
  from public.comments
  where comments.user_id = author_id and comments.created_at > now() - interval '1 hour';
  if posted_in_window < hourly_limit then
    return 0;
  end if;
  -- Step 3: the minutes until the oldest of them is an hour old.
  return greatest(1, ceil(extract(epoch from (oldest_in_window + interval '1 hour' - now())) / 60.0))::integer;
end;
$$;
comment on function public.comment_wait_minutes(uuid) is
  'Internal: minutes until the author may comment again, 0 when now (S1-E6-01).';
revoke execute on function public.comment_wait_minutes(uuid) from public, anon, authenticated;

/* ---------- What a reader may see ---------- */

/**
 * comment_is_shown_to_caller: may the caller see this comment's words?
 * Input: the comment row. Returns: true when it isn't deleted, its author's account isn't
 *   deleted, neither side blocks the other, and staff haven't hidden or removed it; the author
 *   still sees their own hidden comment (architecture 1.7.11: "the owner and staff still see a
 *   hidden item").
 * Internal: chapter_comments() and post_comment() (a reply needs a parent the caller can see).
 */
create or replace function public.comment_is_shown_to_caller(target public.comments)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target.deleted_at is null
    and exists (select 1 from public.profiles where profiles.id = target.user_id and profiles.deleted_at is null)
    and not public.is_blocked_with(target.user_id)
    and (
      not public.is_moderated_away('comment', target.id)
      or (target.user_id = (select auth.uid()) and public.moderated_state_of('comment', target.id) = 'hidden')
    );
$$;
comment on function public.comment_is_shown_to_caller(public.comments) is
  'Internal: whether the caller may read a comment''s words (S1-E6-01).';
revoke execute on function public.comment_is_shown_to_caller(public.comments) from public, anon, authenticated;

/**
 * comment_state_for_caller: what the caller sees in a comment's place.
 * Input: the comment row. Returns: 'live' (the words), 'hidden' (the author's own comment hidden
 *   by moderation: the words and a note), 'removed' (the "[Removed by the moderation team]"
 *   marker), 'deleted' (a "Comment deleted" marker), or null when nothing shows at all (a blocked
 *   author, a deleted account, or someone else's hidden comment).
 * Internal: comment_json(); a marker shows only where replies keep the place (chapter_comments()).
 */
create or replace function public.comment_state_for_caller(target public.comments)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  moderated public.moderated_state := public.moderated_state_of('comment', target.id);
begin
  -- Step 1: an author the caller can't see (a block either way, a deleted account): nothing.
  if public.is_blocked_with(target.user_id)
     or not exists (select 1 from public.profiles where profiles.id = target.user_id and profiles.deleted_at is null) then
    return null;
  end if;
  -- Step 2: deleted by its author or the writer, or removed by staff: a marker.
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
comment on function public.comment_state_for_caller(public.comments) is
  'Internal: live, hidden, removed, deleted or null for the caller (S1-E6-01).';
revoke execute on function public.comment_state_for_caller(public.comments) from public, anon, authenticated;

/**
 * comment_json: one comment as the comments area draws it.
 * Inputs: target, the comment; story_writer_id, the writer of the story (for the "Writer" pill
 *   and who may delete). Returns: JSON with id, author (handle and display name, never the user
 *   ID), is_writer, is_mine, created_at, is_spoiler, state (see comment_state_for_caller()),
 *   body (only for live and hidden), can_delete (the author, or the story's writer, on a comment
 *   that isn't deleted).
 * Internal: chapter_comments(). S1-E6-02 adds the reactions here.
 */
create or replace function public.comment_json(target public.comments, story_writer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  state text := public.comment_state_for_caller(target);
  author public.profiles;
begin
  select * into author from public.profiles where profiles.id = target.user_id;
  return jsonb_build_object(
    'id', target.id,
    'author', jsonb_build_object(
      'handle', author.handle,
      'display_name', public.display_name(author.handle, author.pen_name)),
    'is_writer', target.user_id = story_writer_id,
    'is_mine', target.user_id = caller_id,
    'created_at', target.created_at,
    'is_spoiler', target.is_spoiler,
    'state', state,
    'body', case when state in ('live', 'hidden') then target.body end,
    'can_delete', target.deleted_at is null and caller_id is not null
      and (target.user_id = caller_id or story_writer_id = caller_id));
end;
$$;
comment on function public.comment_json(public.comments, uuid) is
  'Internal: one comment as the comments area draws it, never a user ID (S1-E6-01).';
revoke execute on function public.comment_json(public.comments, uuid) from public, anon, authenticated;

/**
 * comment_replies_json: a comment's replies the caller may see, oldest first.
 * Inputs: parent_id; story_writer_id. Returns: a JSON array of comment_json() (live and hidden
 *   only: a deleted or removed reply has nothing under it, so it simply disappears).
 * Internal: chapter_comments().
 */
create or replace function public.comment_replies_json(parent_id uuid, story_writer_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.comment_json(replies, story_writer_id) order by replies.created_at), '[]'::jsonb)
  from public.comments as replies
  where replies.parent_comment_id = parent_id
    and public.comment_is_shown_to_caller(replies);
$$;
comment on function public.comment_replies_json(uuid, uuid) is 'Internal: the replies the caller may see (S1-E6-01).';
revoke execute on function public.comment_replies_json(uuid, uuid) from public, anon, authenticated;

/**
 * chapter_comments: one page of a chapter's comments, newest first.
 * Inputs: story_slug, chapter_code; older_than (null for the first page; the created_at of the
 *   last comment shown, for "Show more comments").
 * Returns: JSON {"comments_enabled", "total", "has_more", "comments": [...]}: total counts every
 *   comment and reply the caller may read (the heading "86 comments"); each top-level comment
 *   carries its replies. A top-level comment that was deleted or removed stays as a marker only
 *   while it has replies the caller may see. With comments switched off on the story, nothing is
 *   listed (the comments are kept). Null when the caller may not read the chapter (rating,
 *   blocks, moderation: readable_chapter()).
 * Who may call it: anyone who may read the chapter, signed out included.
 */
create or replace function public.chapter_comments(story_slug text, chapter_code text, older_than timestamptz default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  chapter public.chapters;
  story public.stories;
  page_size integer := coalesce((public.setting_value('comment_page_size'))::integer, 20);
  page jsonb;
  page_count integer;
begin
  -- Step 1: the chapter, if the caller may read it, and its story's comments switch.
  select * into chapter from public.readable_chapter(story_slug, chapter_code);
  if chapter.id is null then
    return null;
  end if;
  select * into story from public.stories where stories.id = chapter.story_id;
  if not story.comments_enabled then
    return jsonb_build_object('comments_enabled', false, 'total', 0, 'has_more', false, 'comments', '[]'::jsonb);
  end if;
  -- Step 2: one page of top-level comments (one extra, to know whether there is more), each with
  -- its replies; a top-level comment without words shows only while it keeps replies in place.
  with listed as (
    select top_level.id from public.comments as top_level
    where top_level.chapter_id = chapter.id
      and top_level.parent_comment_id is null
      and (older_than is null or top_level.created_at < older_than)
      and (public.comment_is_shown_to_caller(top_level)
           or (public.comment_state_for_caller(top_level) in ('deleted', 'removed')
               and jsonb_array_length(public.comment_replies_json(top_level.id, story.user_id)) > 0))
    order by top_level.created_at desc
    limit page_size + 1
  )
  select coalesce(jsonb_agg(public.comment_json(comments, story.user_id)
           || jsonb_build_object('replies', public.comment_replies_json(comments.id, story.user_id))
           order by comments.created_at desc), '[]'::jsonb),
         count(*)::integer
  into page, page_count
  from listed join public.comments on comments.id = listed.id;
  -- Step 3: the answer; the extra comment only says there is more.
  return jsonb_build_object(
    'comments_enabled', true,
    'total', (select count(*)::integer from public.comments
              where comments.chapter_id = chapter.id and public.comment_is_shown_to_caller(comments)),
    'has_more', page_count > page_size,
    'comments', case when page_count > page_size then page - page_size else page end);
end;
$$;
comment on function public.chapter_comments(text, text, timestamptz) is
  'One page of a chapter''s comments, newest first, with replies; never a user ID (S1-E6-01).';
grant execute on function public.chapter_comments(text, text, timestamptz) to anon, authenticated;

/* ---------- Posting and deleting ---------- */

/**
 * require_comment_allowed: the checks before a comment is saved, in order.
 * Inputs: caller_id; the chapter's story. Errors: insufficient_privilege when signed out or the
 *   account may not write (the account gate, architecture 1.7.8); object_not_in_prerequisite_state
 *   when the story has comments off; program_limit_exceeded over the limit, with the minutes to
 *   wait as the error's hint ("wait_minutes:12") so the screen can say how long.
 * Internal: post_comment().
 */
create or replace function public.require_comment_allowed(caller_id uuid, story public.stories)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  wait_minutes integer;
begin
  if not story.comments_enabled then
    raise exception 'The writer has turned comments off for this story.' using errcode = 'object_not_in_prerequisite_state';
  end if;
  if not public.is_active_member() then
    raise exception 'Your account can''t comment right now.' using errcode = 'insufficient_privilege';
  end if;
  wait_minutes := public.comment_wait_minutes(caller_id);
  if wait_minutes > 0 then
    raise exception 'You have posted a lot of comments. Wait % minutes.', wait_minutes
      using errcode = 'program_limit_exceeded', hint = 'wait_minutes:' || wait_minutes;
  end if;
end;
$$;
comment on function public.require_comment_allowed(uuid, public.stories) is
  'Internal: comments on, the account gate, the comment limit (S1-E6-01).';
revoke execute on function public.require_comment_allowed(uuid, public.stories) from public, anon, authenticated;

/**
 * post_comment: posts a comment on a chapter, or a reply to one.
 * Inputs: story_slug, chapter_code; body (the Markdown subset, at most 2,000 characters);
 *   is_spoiler; reply_to (null, or the ID of a top-level comment on the same chapter).
 * Returns: JSON {"id": the new comment's ID}.
 * Rules: the caller may read the chapter; the story has comments on; the account gate; the
 *   comment limit; the text passes check_comment_text(); a reply answers a comment the caller
 *   can see (not deleted, removed or by someone either side blocks). A 'comment_posted' job is
 *   queued with IDs only, for S1-E7-01 (CLAUDE.md rule 12: no text in jobs).
 * Errors: insufficient_privilege (signed out, read-only account); no_data_found (no such
 *   chapter, or a reply to a comment the caller can't see); object_not_in_prerequisite_state
 *   (comments off); program_limit_exceeded (the limit; hint "wait_minutes:n"); check_violation
 *   (the text, or a reply to a reply).
 */
create or replace function public.post_comment(
  story_slug text,
  chapter_code text,
  body text,
  is_spoiler boolean default false,
  reply_to uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  chapter public.chapters;
  story public.stories;
  parent public.comments;
  new_comment_id uuid;
begin
  -- Step 1: signed in, and the chapter is one this reader may open.
  if caller_id is null then
    raise exception 'Log in to comment.' using errcode = 'insufficient_privilege';
  end if;
  select * into chapter from public.readable_chapter(story_slug, chapter_code);
  if chapter.id is null then
    raise exception 'There is no such chapter.' using errcode = 'no_data_found';
  end if;
  select * into story from public.stories where stories.id = chapter.story_id;
  -- Step 2: comments on, the account gate and the limit.
  perform public.require_comment_allowed(caller_id, story);
  -- Step 3: a reply needs a parent the caller can see, on this chapter.
  if reply_to is not null then
    select * into parent from public.comments where comments.id = reply_to and comments.chapter_id = chapter.id;
    if parent.id is null or not public.comment_is_shown_to_caller(parent) then
      raise exception 'That comment isn''t there any more.' using errcode = 'no_data_found';
    end if;
  end if;
  -- Step 4: save it (the trigger keeps replies one level deep) and queue the notification job.
  insert into public.comments (user_id, chapter_id, parent_comment_id, body, is_spoiler)
  values (caller_id, chapter.id, reply_to, public.check_comment_text(body), coalesce(is_spoiler, false))
  returning id into new_comment_id;
  insert into public.jobs (kind, payload)
  values ('comment_posted', jsonb_build_object('comment_id', new_comment_id, 'chapter_id', chapter.id,
    'parent_comment_id', reply_to));
  return jsonb_build_object('id', new_comment_id);
end;
$$;
comment on function public.post_comment(text, text, text, boolean, uuid) is
  'Posts a comment or a one-level reply on a chapter, through the account gate and the limit (S1-E6-01).';
revoke execute on function public.post_comment(text, text, text, boolean, uuid) from public, anon;
grant execute on function public.post_comment(text, text, text, boolean, uuid) to authenticated;

/**
 * delete_comment: deletes a comment: the author's own, or any comment on the caller's own story
 *   (story criterion 3).
 * Input: comment_id. Returns: true.
 * Rules: a soft delete (deleted_at, deleted_by); the words disappear at once and the row goes for
 *   good after 30 days (purge_deleted_comments()). Its replies stay; the comment's place shows
 *   "Comment deleted" while they do. Works for a read-only or sanctioned account too: taking
 *   one's own words down is always allowed.
 * Errors: insufficient_privilege when signed out, or when the caller is neither the author nor
 *   the story's writer; no_data_found for no such comment, or one already deleted.
 */
create or replace function public.delete_comment(comment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  target public.comments;
  story_writer_id uuid;
begin
  -- Step 1: signed in, and the comment exists and isn't deleted yet.
  if caller_id is null then
    raise exception 'Log in to delete a comment.' using errcode = 'insufficient_privilege';
  end if;
  select * into target from public.comments where comments.id = comment_id and comments.deleted_at is null for update;
  if target.id is null then
    raise exception 'That comment isn''t there any more.' using errcode = 'no_data_found';
  end if;
  -- Step 2: the author, or the writer of the story it is on.
  select stories.user_id into story_writer_id
  from public.chapters join public.stories on stories.id = chapters.story_id
  where chapters.id = target.chapter_id;
  if caller_id <> target.user_id and caller_id is distinct from story_writer_id then
    raise exception 'Only its author or the story''s writer can delete a comment.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 3: the soft delete, saying who.
  update public.comments
  set deleted_at = now(),
      deleted_by = case when caller_id = target.user_id then 'author' else 'writer' end::public.comment_deleted_by
  where comments.id = target.id;
  return true;
end;
$$;
comment on function public.delete_comment(uuid) is
  'Deletes a comment: the author''s own, or any on the writer''s own story (S1-E6-01).';
revoke execute on function public.delete_comment(uuid) from public, anon;
grant execute on function public.delete_comment(uuid) to authenticated;

/* ---------- Retention ---------- */

/**
 * purge_deleted_comments: deletes for good every comment deleted more than content_purge_days
 * (30) ago, except one held for moderation or one whose replies still stand (they go first, and
 * their parent the night after).
 * Returns: how many were deleted. Run nightly by pg_cron (docs/runbooks/scheduled-jobs.md).
 */
create or replace function public.purge_deleted_comments()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purge_days integer := coalesce((public.setting_value('content_purge_days'))::integer, 30);
  purged integer;
begin
  delete from public.comments
  where comments.deleted_at is not null
    and comments.deleted_at < now() - make_interval(days => purge_days)
    and not public.content_is_held_for_moderation('comment', comments.id)
    and not exists (select 1 from public.comments as replies where replies.parent_comment_id = comments.id);
  get diagnostics purged = row_count;
  return purged;
end;
$$;
comment on function public.purge_deleted_comments() is
  'Nightly: deletes comments 30 days after their deletion, unless held for moderation or still answered (S1-E6-01).';
revoke execute on function public.purge_deleted_comments() from public, anon, authenticated;

-- Nightly at 03:35 UTC, after the chapters' purge (03:29). Naming the job makes this safe to run again.
select cron.schedule('purge-deleted-comments', '35 3 * * *', 'select public.purge_deleted_comments();');

/* ---------- The shared reporting contract: the 'comment' branches ---------- */

/**
 * reportable_item_owner: as in S1-E10-01, plus the 'comment' branch (S1-E6-01): a comment by its
 * row ID, while it isn't deleted and its chapter and story are live.
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
  end case;
  if not found then
    raise exception 'There is no such % to report.', item_type using errcode = 'check_violation';
  end if;
end;
$$;

comment on function public.reportable_item_owner(public.reportable_type, text) is
  'The reported item''s ID and owner, one branch per reportable_type (shared contract, S1-E10-01; comment S1-E6-01).';
revoke execute on function public.reportable_item_owner(public.reportable_type, text) from public, anon, authenticated;

/**
 * reportable_item_summary: as in S1-E10-01, plus the 'comment' branch (S1-E6-01): "Comment on
 * chapter 3 of <story>: <its first 80 characters>", so the moderator sees what was said.
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
  end case;
  return coalesce(summary, '(gone)');
end;
$$;

comment on function public.reportable_item_summary(public.reportable_type, uuid) is
  'A few words saying what was reported, one branch per reportable_type (shared contract, S1-E10-01; comment S1-E6-01).';
revoke execute on function public.reportable_item_summary(public.reportable_type, uuid) from public, anon, authenticated;
