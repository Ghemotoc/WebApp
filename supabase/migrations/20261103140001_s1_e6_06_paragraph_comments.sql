/*
 * Migration: comments on one paragraph of a chapter (story S1-E6-06; board 3.5, the speech-bubble
 * marker beside each paragraph and the thread that opens under it).
 *
 * What it adds:
 * - comments.paragraph_key and comments.paragraph_number: where a paragraph comment was left.
 *   The number is the block it sat in (the runs of text between blank lines, chapter_blocks(),
 *   S1-E4-11; the reader numbers its paragraphs the same way, src/lib/chapter-blocks.ts). The key
 *   is a fingerprint of that paragraph's words (paragraph_key_of()). Both are null on a comment
 *   on the whole chapter. A reply takes its comment's paragraph (a trigger).
 * - Where a paragraph comment shows now (story criterion 2: "stay attached by a stable paragraph
 *   ID or move to comments on an earlier version"): the paragraph whose words still have the same
 *   key, nearest the number it was left on. When the writer moves the paragraph, its comments
 *   move with it; when the writer changes its words, or takes it out, the comments go to
 *   "Comments on an earlier version" under the chapter. The words are never stored twice: the key
 *   is a fingerprint, not a copy.
 * - paragraph_comment_counts(): the count beside each paragraph, and how many are on an earlier
 *   version.
 * - paragraph_comments(): one paragraph's thread (or the earlier-version ones), with replies.
 * - post_paragraph_comment(): posts a comment on one paragraph, through the same rules as
 *   post_comment() (the account gate, the limit, the text check, the comment_posted job).
 * - chapter_comments() now says which paragraph a comment is on ("On paragraph 4" in the list,
 *   board 3.5), or that it is on an earlier version.
 * Paragraph comments are ordinary comments: the same Report button and moderation (rule 6), the
 *   same blocks, the same purge. No new personal data: the paragraph's place, not its words.
 * Who calls it: src/features/reading/api/paragraphComments.ts (the counts beside the text) and
 *   src/features/comments/api/paragraphComments.ts (the thread).
 * Tests: supabase/tests/database/189-paragraph-comments.test.sql.
 */

/* ---------- Where a comment was left ---------- */

alter table public.comments
  add column paragraph_key text,
  add column paragraph_number integer,
  add constraint comments_paragraph_fields_go_together
    check ((paragraph_key is null) = (paragraph_number is null)),
  add constraint comments_paragraph_number_counts_from_one
    check (paragraph_number is null or paragraph_number >= 1);
comment on column public.comments.paragraph_key is
  'A fingerprint of the paragraph''s words when the comment was left, or null for the whole chapter (S1-E6-06).';
comment on column public.comments.paragraph_number is
  'The block the comment was left on, counted from 1 (chapter_blocks()), or null (S1-E6-06).';
create index comments_on_paragraphs on public.comments (chapter_id) where paragraph_key is not null;

/**
 * paragraph_key_of: the fingerprint of a paragraph's words, so its comments can find it again
 *   after the writer moves it.
 * Input: the block's text. Returns: an md5 of the words with every run of spaces and line breaks
 *   made one space, so changing only the line breaks keeps the key.
 * Internal: chapter_paragraphs() and post_paragraph_comment().
 */
create function public.paragraph_key_of(block_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select md5(regexp_replace(btrim(coalesce(block_text, ''), E' \t\n'), '\s+', ' ', 'g'));
$$;
comment on function public.paragraph_key_of(text) is
  'Internal: the fingerprint of a paragraph''s words (S1-E6-06).';
revoke execute on function public.paragraph_key_of(text) from public, anon, authenticated;

/**
 * chapter_paragraphs: a chapter body's blocks with each one's fingerprint.
 * Input: the body. Returns: one row per block (block_number, paragraph_key).
 * Internal: paragraph_now().
 */
create function public.chapter_paragraphs(body text)
returns table (block_number integer, paragraph_key text)
language sql
immutable
set search_path = ''
as $$
  select blocks.block_number, public.paragraph_key_of(blocks.block_text)
  from public.chapter_blocks(body) as blocks;
$$;
comment on function public.chapter_paragraphs(text) is
  'Internal: a chapter body''s blocks with their fingerprints (S1-E6-06).';
revoke execute on function public.chapter_paragraphs(text) from public, anon, authenticated;

/**
 * paragraph_now: the block a paragraph comment shows on today (story criterion 2).
 * Inputs: body, the chapter as published now; key and number, where the comment was left.
 * Returns: the number of the block with the same fingerprint nearest the one it was left on (the
 *   earlier one when two are as near), or null when no block has it any more (the writer changed
 *   or took out the paragraph: "on an earlier version").
 * Internal: paragraph_comment_counts(), paragraph_comments(), comment_paragraph_json().
 */
create function public.paragraph_now(body text, key text, number integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select paragraphs.block_number
  from public.chapter_paragraphs(body) as paragraphs
  where paragraphs.paragraph_key = key
  order by abs(paragraphs.block_number - number), paragraphs.block_number
  limit 1;
$$;
comment on function public.paragraph_now(text, text, integer) is
  'Internal: the block a paragraph comment shows on today, or null for an earlier version (S1-E6-06).';
revoke execute on function public.paragraph_now(text, text, integer) from public, anon, authenticated;

/**
 * take_parent_paragraph: a reply sits in its comment's thread, so it takes the comment's
 *   paragraph (or none).
 * Trigger: before insert on comments. Why: post_comment() answers any top-level comment, and a
 *   reply to a paragraph comment must count on, and show under, the same paragraph.
 */
create function public.take_parent_paragraph()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_comment_id is not null then
    select comments.paragraph_key, comments.paragraph_number
      into new.paragraph_key, new.paragraph_number
    from public.comments where comments.id = new.parent_comment_id;
  end if;
  return new;
end;
$$;
comment on function public.take_parent_paragraph() is
  'Trigger: a reply takes its comment''s paragraph (S1-E6-06).';
create trigger comments_take_parent_paragraph
  before insert on public.comments
  for each row execute function public.take_parent_paragraph();

/**
 * comment_paragraph_json: which paragraph a comment is on, for the main list's "On paragraph 4".
 * Inputs: target, the comment; body, the chapter as published now.
 * Returns: null for a comment on the whole chapter, the block number, or "earlier".
 * Internal: chapter_comments().
 */
create function public.comment_paragraph_json(target public.comments, body text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when target.paragraph_key is null then null
    else coalesce(to_jsonb(public.paragraph_now(body, target.paragraph_key, target.paragraph_number)),
                  to_jsonb('earlier'::text))
  end;
$$;
comment on function public.comment_paragraph_json(public.comments, text) is
  'Internal: null, the paragraph''s number or "earlier", for the comments list (S1-E6-06).';
revoke execute on function public.comment_paragraph_json(public.comments, text) from public, anon, authenticated;

/* ---------- The counts beside the text ---------- */

/**
 * paragraph_comment_counts: how many comments each paragraph has, for its marker.
 * Inputs: story_slug, chapter_code.
 * Returns: JSON {"comments_enabled", "paragraphs": [{"block", "count"}], "earlier"}: only
 *   paragraphs with comments are listed; count includes replies the caller may read (blocks,
 *   moderation, deletions: comment_is_shown_to_caller()); earlier counts those on an earlier
 *   version. With comments off, nothing is counted. Null when the caller may not read the chapter
 *   (readable_chapter()). Never a user ID.
 * Who may call it: anyone who may read the chapter.
 */
create function public.paragraph_comment_counts(story_slug text, chapter_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  chapter public.chapters;
  story public.stories;
  answer jsonb;
begin
  -- Step 1: the chapter, if the caller may read it, and its story's comments switch.
  select * into chapter from public.readable_chapter(story_slug, chapter_code);
  if chapter.id is null then
    return null;
  end if;
  select * into story from public.stories where stories.id = chapter.story_id;
  if not story.comments_enabled then
    return jsonb_build_object('comments_enabled', false, 'paragraphs', '[]'::jsonb, 'earlier', 0);
  end if;
  -- Step 2: each comment the caller may read, placed on the paragraph it shows on today.
  with placed as (
    select public.paragraph_now(chapter.published_body, comments.paragraph_key, comments.paragraph_number) as block
    from public.comments
    where comments.chapter_id = chapter.id
      and comments.paragraph_key is not null
      and public.comment_is_shown_to_caller(comments)
  ),
  counted as (
    select placed.block, count(*)::integer as total from placed where placed.block is not null group by placed.block
  )
  -- Step 3: the counts by paragraph, and the earlier-version ones.
  select jsonb_build_object(
    'comments_enabled', true,
    'paragraphs', coalesce((select jsonb_agg(jsonb_build_object('block', counted.block, 'count', counted.total)
                              order by counted.block) from counted), '[]'::jsonb),
    'earlier', (select count(*)::integer from placed where placed.block is null))
  into answer;
  return answer;
end;
$$;
comment on function public.paragraph_comment_counts(text, text) is
  'How many comments each paragraph has, and how many are on an earlier version; never a user ID (S1-E6-06).';
revoke execute on function public.paragraph_comment_counts(text, text) from public;
grant execute on function public.paragraph_comment_counts(text, text) to anon, authenticated;

/* ---------- One paragraph's thread ---------- */

/**
 * paragraph_comments: the comments on one paragraph, newest first, each with its replies.
 * Inputs: story_slug, chapter_code; block_number (the paragraph, or null for the comments on an
 *   earlier version).
 * Returns: JSON {"comments_enabled", "total", "has_more", "comments": [...]}, shaped as
 *   chapter_comments() (comment_json() and replies), at most 100 top-level comments (has_more
 *   says when there are more). A deleted or removed top-level comment shows as a marker only
 *   while it has replies the caller may see. Null when the caller may not read the chapter.
 * Who may call it: anyone who may read the chapter.
 */
create function public.paragraph_comments(story_slug text, chapter_code text, block_number integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  chapter public.chapters;
  story public.stories;
  most_shown constant integer := 100;
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
  -- Step 2: the top-level comments that show on this paragraph today (or on none: earlier).
  with listed as (
    select top_level.id from public.comments as top_level
    where top_level.chapter_id = chapter.id
      and top_level.parent_comment_id is null
      and top_level.paragraph_key is not null
      and public.paragraph_now(chapter.published_body, top_level.paragraph_key, top_level.paragraph_number)
          is not distinct from paragraph_comments.block_number
      and (public.comment_is_shown_to_caller(top_level)
           or (public.comment_state_for_caller(top_level) in ('deleted', 'removed')
               and jsonb_array_length(public.comment_replies_json(top_level.id, story.user_id)) > 0))
    order by top_level.created_at desc
    limit most_shown + 1
  )
  select coalesce(jsonb_agg(public.comment_json(comments, story.user_id)
           || jsonb_build_object('replies', public.comment_replies_json(comments.id, story.user_id))
           order by comments.created_at desc), '[]'::jsonb),
         count(*)::integer
  into page, page_count
  from listed join public.comments on comments.id = listed.id;
  -- Step 3: the answer, with the total the thread's heading says.
  return jsonb_build_object(
    'comments_enabled', true,
    'total', (select count(*)::integer from public.comments
              where comments.chapter_id = chapter.id
                and comments.paragraph_key is not null
                and public.comment_is_shown_to_caller(comments)
                and public.paragraph_now(chapter.published_body, comments.paragraph_key, comments.paragraph_number)
                    is not distinct from paragraph_comments.block_number),
    'has_more', page_count > most_shown,
    'comments', case when page_count > most_shown then page - most_shown else page end);
end;
$$;
comment on function public.paragraph_comments(text, text, integer) is
  'One paragraph''s comments (or the earlier-version ones), newest first, with replies; never a user ID (S1-E6-06).';
revoke execute on function public.paragraph_comments(text, text, integer) from public;
grant execute on function public.paragraph_comments(text, text, integer) to anon, authenticated;

/* ---------- Posting on a paragraph ---------- */

/**
 * post_paragraph_comment: posts a comment on one paragraph of a chapter (story criterion 1).
 * Inputs: story_slug, chapter_code; block_number (the paragraph, counted from 1 as the reader
 *   numbers them); body (the Markdown subset, at most 2,000 characters); is_spoiler.
 * Returns: JSON {"id": the new comment's ID}.
 * Rules: the same as post_comment(): signed in, the chapter readable, comments on, the account
 *   gate, the comment limit, check_comment_text() and a 'comment_posted' job with IDs only
 *   (CLAUDE.md rule 12). The paragraph's place and fingerprint are saved, never its words.
 *   Replies go through post_comment(), which keeps them in the same thread.
 * Errors: insufficient_privilege (signed out, read-only account); no_data_found (no such chapter,
 *   or no such paragraph); object_not_in_prerequisite_state (comments off); program_limit_exceeded
 *   (the limit; hint "wait_minutes:n"); check_violation (the text).
 */
create function public.post_paragraph_comment(
  story_slug text,
  chapter_code text,
  block_number integer,
  body text,
  is_spoiler boolean default false
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
  paragraph_text text;
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
  -- Step 2: comments on, the account gate and the limit (the same checks as post_comment()).
  perform public.require_comment_allowed(caller_id, story);
  -- Step 3: the paragraph, as the chapter is published now.
  select blocks.block_text into paragraph_text
  from public.chapter_blocks(chapter.published_body) as blocks
  where blocks.block_number = post_paragraph_comment.block_number;
  if paragraph_text is null then
    raise exception 'That paragraph isn''t there any more.' using errcode = 'no_data_found';
  end if;
  -- Step 4: save it with the paragraph's place and fingerprint, and queue the notification job.
  insert into public.comments (user_id, chapter_id, body, is_spoiler, paragraph_key, paragraph_number)
  values (caller_id, chapter.id, public.check_comment_text(body), coalesce(is_spoiler, false),
          public.paragraph_key_of(paragraph_text), post_paragraph_comment.block_number)
  returning id into new_comment_id;
  insert into public.jobs (kind, payload)
  values ('comment_posted', jsonb_build_object('comment_id', new_comment_id, 'chapter_id', chapter.id,
    'parent_comment_id', null));
  return jsonb_build_object('id', new_comment_id);
end;
$$;
comment on function public.post_paragraph_comment(text, text, integer, text, boolean) is
  'Posts a comment on one paragraph of a chapter, through the account gate and the limit (S1-E6-06).';
revoke execute on function public.post_paragraph_comment(text, text, integer, text, boolean) from public, anon;
grant execute on function public.post_paragraph_comment(text, text, integer, text, boolean) to authenticated;

/* ---------- The main list says which paragraph ---------- */

/**
 * chapter_comments: as in S1-E6-01, plus 'paragraph' on each top-level comment: null for a
 *   comment on the whole chapter, the paragraph's number today, or "earlier" (S1-E6-06; board
 *   3.5's "On paragraph 4"). Paragraph comments stay in the main list too, so nothing is missed
 *   by a reader who never opens a marker.
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
  -- its replies and its paragraph; one without words shows only while it keeps replies in place.
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
           || jsonb_build_object('replies', public.comment_replies_json(comments.id, story.user_id),
                                 'paragraph', public.comment_paragraph_json(comments, chapter.published_body))
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
  'One page of a chapter''s comments, newest first, with replies and which paragraph each is on; never a user ID (S1-E6-01, S1-E6-06).';
