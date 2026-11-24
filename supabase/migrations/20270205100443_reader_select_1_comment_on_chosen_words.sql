/*
 * Migration: a reader selects any words in a chapter and comments on them (bundle READER-SELECT;
 * Robert, 24 Nov 2026: "is there a way we can select more or less than a paragraph for poems?",
 * then "Select any text, then Comment" on the Builder thread's decision card at 18:11 UTC and
 * the drawn design approved for poems and prose in the DESIGN thread at 18:23 UTC; boards
 * B12-ReaderSelect, B13-ReaderPartComments and B14-ReaderSelectMore).
 *
 * How it works: a comment on chosen words is a paragraph comment (S1-E6-06) that also keeps the
 * words: it belongs to the paragraph (a stanza, in a poem) where the selection starts, so that
 * paragraph's count in the margin counts it, and it carries where the words start and end and the
 * exact words. A selection may cross paragraphs (board B14, 7) and holds at most 1,000 characters
 * (B14, 8). Comments made before this migration have no words, so they stay comments on the whole
 * paragraph: nothing is moved.
 * What it adds:
 * - comments.quote_text, quote_start_offset, quote_end_block, quote_end_key, quote_end_offset: the
 *   words, where they start in the first paragraph (a character offset in the paragraph's text as
 *   the reader draws it), and the last paragraph (its number and fingerprint, like the first one's
 *   paragraph_number and paragraph_key) with where the words end in it. All five are set together
 *   or not at all, and only on a paragraph comment. They are the writer's words, not the reader's,
 *   so they need no moderation of their own; the comment around them is moderated as before.
 * - quote_words(text): the words of a text with marks, Markdown and spacing taken out, so a
 *   selection matches the chapter however it was drawn.
 * - quote_still_there(body, comment): whether the words are still in the paragraphs they were on;
 *   when the writer changes them the comment stays in its paragraph's list, without an underline
 *   (board B13: "the comment moves to its stanza's general list and keeps its quote").
 * - post_passage_comment(): posts a comment on chosen words, with the same checks as
 *   post_paragraph_comment() (signed in, the chapter readable, comments on and not paused, the
 *   account gate and the limit) plus the words' own (B14).
 * - take_parent_paragraph() copies the words to a reply too, so a reply counts on the same part.
 * - comment_json() adds 'quote' (null on a comment without chosen words), so every list can show
 *   the words above the comment (board B13, 5).
 * - paragraph_comment_counts() adds 'parts': each set of chosen words still in the text, with its
 *   comments and replies counted, for the underlines (board B13, 4).
 * Download my data needs nothing new: export_tables_of() copies each comment row whole.
 * Who calls it: src/features/comments/api/comments.ts (postComment) and
 * src/features/reading/api/paragraphComments.ts (the counts and parts).
 * Tests: supabase/tests/database/405-comment-on-chosen-words.test.sql.
 */

/* ---------- 1. The columns ---------- */

alter table public.comments
  add column quote_text text,
  add column quote_start_offset integer,
  add column quote_end_block integer,
  add column quote_end_key text,
  add column quote_end_offset integer;

-- The five go together, only on a paragraph comment, and a selection runs forwards.
alter table public.comments
  add constraint comments_quote_fields_go_together check (
    (quote_text is null and quote_start_offset is null and quote_end_block is null
      and quote_end_key is null and quote_end_offset is null)
    or (quote_text is not null and quote_start_offset is not null and quote_end_block is not null
      and quote_end_key is not null and quote_end_offset is not null)),
  add constraint comments_quote_is_on_a_paragraph check (quote_text is null or paragraph_key is not null),
  -- Board B14, 8: up to 1,000 characters.
  add constraint comments_quote_length check (quote_text is null or char_length(quote_text) between 1 and 1000),
  add constraint comments_quote_runs_forwards check (
    quote_text is null
    or (quote_start_offset >= 0 and quote_end_offset >= 0 and quote_end_block >= paragraph_number
      and (quote_end_block > paragraph_number or quote_end_offset > quote_start_offset)));

comment on column public.comments.quote_text is
  'The writer''s words a reader chose to comment on, or null for the whole paragraph (READER-SELECT, board B12).';
comment on column public.comments.quote_start_offset is
  'Where the chosen words start in the first paragraph''s text as the reader draws it (READER-SELECT).';
comment on column public.comments.quote_end_block is
  'The paragraph the chosen words end in, counted from 1 like paragraph_number (READER-SELECT, board B14).';
comment on column public.comments.quote_end_key is
  'A fingerprint of that last paragraph''s words, like paragraph_key (READER-SELECT).';
comment on column public.comments.quote_end_offset is
  'Where the chosen words end in the last paragraph''s text (READER-SELECT).';

/* ---------- 2. Matching the words ---------- */

/*
 * quote_words(value): the words of a text in lower case, one space apart, with everything else
 * taken out (punctuation, Markdown marks such as * and _, line breaks).
 * Input: any text. Returns the words, padded with a space at each end so that a search for one
 * set of words inside another only matches whole words. Raises nothing.
 * Called by post_passage_comment() and quote_still_there().
 */
create function public.quote_words(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select ' ' || btrim(regexp_replace(lower(coalesce(value, '')), '[^[:alnum:]]+', ' ', 'g')) || ' ';
$$;

comment on function public.quote_words(text) is
  'Internal: a text''s words only, for matching chosen words against a chapter (READER-SELECT).';

/*
 * passage_text(body, first_block, last_block): the paragraphs from one number to another, joined.
 * Inputs: a chapter's published body and the two paragraph numbers. Returns the text, or null when
 * a number is missing or the run goes backwards. Raises nothing. Called by post_passage_comment() and
 * quote_still_there().
 */
create function public.passage_text(body text, first_block integer, last_block integer)
returns text
language sql
immutable
set search_path = ''
as $$
  -- A missing number, or a run that goes backwards, has no text; between() finds the rest.
  select case
    when first_block is null or last_block is null or last_block < first_block then null
    else (select string_agg(blocks.block_text, E'\n\n' order by blocks.block_number)
          from public.chapter_blocks(body) as blocks
          where blocks.block_number between first_block and last_block)
  end;
$$;

comment on function public.passage_text(text, integer, integer) is
  'Internal: a run of a chapter''s paragraphs as one text, or null when one is missing (READER-SELECT).';

/*
 * quote_still_there(body, target): whether a comment's chosen words are still in the paragraphs
 * they were on, as the chapter is published now.
 * Inputs: the chapter's published body and the comment. Returns false for a comment without
 * chosen words, and false when the writer has since changed the words (board B13: the comment
 * then stays in its paragraph's list without an underline). Raises nothing.
 * Called by paragraph_comment_counts().
 */
create function public.quote_still_there(body text, target public.comments)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    target.quote_text is not null
    and position(public.quote_words(target.quote_text) in public.quote_words(public.passage_text(body,
      public.paragraph_now(body, target.paragraph_key, target.paragraph_number),
      public.paragraph_now(body, target.quote_end_key, target.quote_end_block)))) > 0,
    false);
$$;

comment on function public.quote_still_there(text, public.comments) is
  'Internal: whether a comment''s chosen words are still in the chapter where they were (READER-SELECT, board B13).';

/* ---------- 3. Posting a comment on chosen words ---------- */

/*
 * post_passage_comment(): a reader comments on words they chose in a chapter (board B12).
 * Inputs: the story and chapter, the paragraph the words start in and where (start_block,
 *   start_offset), the paragraph they end in and where (end_block, end_offset), the words
 *   themselves (quote), the comment and its spoiler mark.
 * Returns {"id": the new comment's ID}.
 * Errors: insufficient_privilege signed out; no_data_found when the chapter or a paragraph isn't
 *   there; the refusals of require_comment_allowed() (comments off, paused, the account gate, the
 *   limit); check_violation with the hint 'quote_too_long' over 1,000 characters (board B14, 8),
 *   'quote_not_found' when the words aren't in those paragraphs, and the comment's own text checks.
 * Where it fits: the reader's Comment button and bar (B12) post through postComment() in
 * src/features/comments/api/comments.ts; the comment then counts on the paragraph where the words
 * start, like any paragraph comment.
 */
create function public.post_passage_comment(
  story_slug text,
  chapter_code text,
  start_block integer,
  start_offset integer,
  end_block integer,
  end_offset integer,
  quote text,
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
  chosen_words text := btrim(coalesce(quote, ''), E' \t\n');
  first_text text;
  last_text text;
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
  -- Step 2: comments on and not paused, the account gate and the limit (as post_comment()).
  perform public.require_comment_allowed(caller_id, story);
  -- Step 3: the words: some, at most 1,000 characters (board B14, 8), running forwards.
  if public.quote_words(chosen_words) = '  ' then
    raise exception 'Choose some words to comment on.' using errcode = 'check_violation', hint = 'quote_not_found';
  end if;
  if char_length(chosen_words) > 1000 then
    raise exception 'Select less to comment.' using errcode = 'check_violation', hint = 'quote_too_long';
  end if;
  if start_offset is null or end_offset is null or start_offset < 0 or end_offset < 0
     or end_block < start_block or (end_block = start_block and end_offset <= start_offset) then
    raise exception 'Those words aren''t in the chapter.' using errcode = 'check_violation', hint = 'quote_not_found';
  end if;
  -- Step 4: both paragraphs are there, and the words are in them, as the chapter is published now.
  select blocks.block_text into first_text from public.chapter_blocks(chapter.published_body) as blocks
  where blocks.block_number = post_passage_comment.start_block;
  select blocks.block_text into last_text from public.chapter_blocks(chapter.published_body) as blocks
  where blocks.block_number = post_passage_comment.end_block;
  if first_text is null or last_text is null then
    raise exception 'That paragraph isn''t there any more.' using errcode = 'no_data_found';
  end if;
  if position(public.quote_words(chosen_words)
              in public.quote_words(public.passage_text(chapter.published_body, start_block, end_block))) = 0 then
    raise exception 'Those words aren''t in the chapter.' using errcode = 'check_violation', hint = 'quote_not_found';
  end if;
  -- Step 5: save it on the first paragraph, with the words and where they end, and queue the
  -- notification job (the same job as any comment).
  insert into public.comments (user_id, chapter_id, body, is_spoiler, paragraph_key, paragraph_number,
    quote_text, quote_start_offset, quote_end_block, quote_end_key, quote_end_offset)
  values (caller_id, chapter.id, public.check_comment_text(body), coalesce(is_spoiler, false),
          public.paragraph_key_of(first_text), start_block,
          chosen_words, start_offset, end_block, public.paragraph_key_of(last_text), end_offset)
  returning id into new_comment_id;
  insert into public.jobs (kind, payload)
  values ('comment_posted', jsonb_build_object('comment_id', new_comment_id, 'chapter_id', chapter.id,
    'parent_comment_id', null));
  return jsonb_build_object('id', new_comment_id);
end;
$$;

comment on function public.post_passage_comment(text, text, integer, integer, integer, integer, text, text, boolean) is
  'Posts a comment on words a reader chose in a chapter, through the account gate and the limit (READER-SELECT, board B12).';

revoke execute on function public.post_passage_comment(text, text, integer, integer, integer, integer, text, text, boolean)
  from public, anon;
grant execute on function public.post_passage_comment(text, text, integer, integer, integer, integer, text, text, boolean)
  to authenticated;

/* ---------- 4. A reply takes its comment's words too ---------- */

/*
 * take_parent_paragraph: a reply sits in its comment's thread, so it takes the comment's paragraph
 * (S1-E6-06) and, since READER-SELECT, its chosen words, so it counts on the same underlined part.
 * Trigger: before insert on comments. Returns the row. Raises nothing.
 */
create or replace function public.take_parent_paragraph()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_comment_id is not null then
    select comments.paragraph_key, comments.paragraph_number, comments.quote_text, comments.quote_start_offset,
           comments.quote_end_block, comments.quote_end_key, comments.quote_end_offset
      into new.paragraph_key, new.paragraph_number, new.quote_text, new.quote_start_offset,
           new.quote_end_block, new.quote_end_key, new.quote_end_offset
    from public.comments where comments.id = new.parent_comment_id;
  end if;
  return new;
end;
$$;

comment on function public.take_parent_paragraph() is
  'Trigger: a reply takes its comment''s paragraph and chosen words (S1-E6-06, READER-SELECT).';

/* ---------- 5. Every list shows the words ---------- */

/*
 * comment_quote_json(target): a comment's chosen words for the lists, or null.
 * Input: the comment. Returns {"text", "start_block", "start_offset", "end_block", "end_offset"}
 * with the numbers as they were when it was posted, or null without chosen words. Raises nothing.
 * Called by comment_json().
 */
create function public.comment_quote_json(target public.comments)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when target.quote_text is null then null else jsonb_build_object(
    'text', target.quote_text,
    'start_block', target.paragraph_number,
    'start_offset', target.quote_start_offset,
    'end_block', target.quote_end_block,
    'end_offset', target.quote_end_offset) end;
$$;

comment on function public.comment_quote_json(public.comments) is
  'Internal: a comment''s chosen words for the comment lists, or null (READER-SELECT, board B13).';

/*
 * comment_json(target, story_writer_id): one comment as the comments area draws it. As before
 * (S1-E6-01, S1-E6-02, S1-E6-04), plus 'quote': the words it is on (READER-SELECT), shown in
 * small italic above its text (board B13, 5). The words are the writer's, so they show whatever
 * state the comment is in. Never a user ID or a downvote count. Raises nothing.
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
      and (target.user_id = caller_id or story_writer_id = caller_id),
    'reactions', case when state in ('live', 'hidden') then public.comment_reactions_json(target.id)
      else jsonb_build_object('counts', '{}'::jsonb, 'mine', null) end,
    'downvoted_by_me', caller_id is not null and exists (
      select 1 from public.comment_downvotes
      where comment_downvotes.comment_id = target.id and comment_downvotes.user_id = caller_id),
    'quote', public.comment_quote_json(target));
end;
$$;

comment on function public.comment_json(public.comments, uuid) is
  'Internal: one comment as the comments area draws it, with its reactions, the caller''s own downvote and its chosen words, never a user ID or a downvote count (S1-E6-01, S1-E6-02, S1-E6-04, READER-SELECT).';

/* ---------- 6. The counts carry the underlined parts ---------- */

/*
 * paragraph_comment_counts(story_slug, chapter_code): as before (S1-E6-06, CALM-8), plus 'parts':
 * each set of chosen words still in the chapter, with the paragraph it starts in and ends in
 * today, where it starts and ends, the words, and how many comments and replies are on it, for
 * the underlines (board B13, 4). Words the writer has since changed are left out of 'parts'; their
 * comments still count on their paragraph. Never a user ID. Raises nothing.
 */
create or replace function public.paragraph_comment_counts(story_slug text, chapter_code text)
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
    return jsonb_build_object('comments_enabled', false, 'paragraphs', '[]'::jsonb, 'earlier', 0,
      'parts', '[]'::jsonb);
  end if;
  -- Step 2: each comment the caller may read, placed on the paragraph it shows on today.
  with shown as (
    select comments.*
    from public.comments
    where comments.chapter_id = chapter.id
      and comments.paragraph_key is not null
      and public.comment_is_shown_to_caller(comments)
  ),
  placed as (
    select public.paragraph_now(chapter.published_body, shown.paragraph_key, shown.paragraph_number) as block
    from shown
  ),
  counted as (
    select placed.block, count(*)::integer as total from placed where placed.block is not null group by placed.block
  ),
  -- Step 3: the chosen words still in the text, each set counted once with its replies.
  parts as (
    select public.paragraph_now(chapter.published_body, shown.paragraph_key, shown.paragraph_number) as block,
           public.paragraph_now(chapter.published_body, shown.quote_end_key, shown.quote_end_block) as end_block,
           shown.quote_start_offset as start_offset, shown.quote_end_offset as end_offset,
           shown.quote_text as quote, count(*)::integer as total
    from shown
    where shown.quote_text is not null and public.quote_still_there(chapter.published_body, shown)
    group by 1, 2, 3, 4, 5
  )
  -- Step 4: the counts by paragraph, the earlier-version ones, the parts and, during a pause
  -- (CALM-8), its end.
  select jsonb_build_object(
    'comments_enabled', true,
    'paragraphs', coalesce((select jsonb_agg(jsonb_build_object('block', counted.block, 'count', counted.total)
                              order by counted.block) from counted), '[]'::jsonb),
    'earlier', (select count(*)::integer from placed where placed.block is null),
    'parts', coalesce((select jsonb_agg(jsonb_build_object('block', parts.block, 'end_block', parts.end_block,
                         'start_offset', parts.start_offset, 'end_offset', parts.end_offset,
                         'quote', parts.quote, 'count', parts.total)
                         order by parts.block, parts.start_offset, parts.end_block, parts.end_offset)
                       from parts), '[]'::jsonb))
    || public.comment_pause_json(story)
  into answer;
  return answer;
end;
$$;

comment on function public.paragraph_comment_counts(text, text) is
  'How many comments each paragraph has, how many are on an earlier version, and the chosen words with their counts; never a user ID (S1-E6-06, READER-SELECT).';
