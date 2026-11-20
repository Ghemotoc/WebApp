/*
 * Migration: a writer pauses new comments on their story for a while (bundle CALM-8;
 * IDEA-20261109-8; story S1-E6-01; the design handover's Step 4, "Pausing new comments"; Robert's
 * go-ahead, 20 Nov 2026, 08:48 and 13:03 UTC, Builder thread).
 *
 * How it works: in Story settings › "Status and comments", under "Who can comment", the writer
 * turns on "Pause new comments" for 24 hours, 3 days or 7 days. While the pause runs nobody adds a
 * comment or a reply, the writer included (the idea says "nobody"); comments already posted stay,
 * likes and reactions carry on, reporting works and moderators act as before. The pause ends by
 * itself at its time, and the writer gets a quiet in-app note; the writer can also end it early
 * (the switch, or "Resume now" under a chapter).
 * What it adds:
 * - stories.comments_paused_until: when the pause ends; null when none runs.
 * - running_comment_pause(story): the end while it is still ahead; the one place that says
 *   whether a pause runs.
 * - require_comment_allowed() refuses during a pause (55000, hint 'paused_until:<end>'), straight
 *   after the comments-off check, so post_comment() (comments and replies) and
 *   post_paragraph_comment() refuse it too.
 * - chapter_comments(), paragraph_comments() and paragraph_comment_counts() add
 *   comments_paused_until (and can_resume_comments, true for the writer) while a pause runs, so the
 *   page shows "New comments are paused until …" in place of the comment box.
 * - update_my_story() takes comments_pause: '24h', '3d' or '7d' (a pause from now, worked out on
 *   the database's clock) or 'off'; anything else is refused (check_violation).
 * - end_my_comment_pause(story_slug): "Resume now" under a chapter, from any language edition.
 * - get_story_page() adds comments_paused_until while a pause runs, for the "Comments" row beside
 *   the story ("Paused until …, Romania time").
 * - Language editions (TRANSLATE-1): the pause is a shared setting, like comments_enabled and
 *   comment_audience: stories_edition_rules() copies it from the first edition and
 *   stories_editions_follow_first() passes a change on to the other editions.
 * - end_comment_pauses(), every 5 minutes (pg_cron 'end-comment-pauses'): clears ended pauses and
 *   sends the writer one 'comments_resumed' notification, in the app only (no email, no push).
 * Download my data needs nothing new: export_tables_of() copies each story row whole, so the new
 * column is in the copy. The Word story export holds the chapters' words only.
 * Who calls it: src/features/writing/ (CommentPauseField in Story settings), src/features/comments/
 * (CommentsSection, ParagraphThread, CommentsPausedLine), and in src/features/reading/ the
 * paragraph markers and the story page's side column (StorySideColumn).
 * Tests: supabase/tests/database/387-pause-comments.test.sql.
 */

/* ---------- 1. The column ---------- */

alter table public.stories add column comments_paused_until timestamptz;
comment on column public.stories.comments_paused_until is
  'When the writer''s pause of new comments ends (CALM-8; IDEA-20261109-8): until then nobody, the writer included, adds a comment or a reply. Null when no pause runs; end_comment_pauses() clears it once the time has passed.';

/* ---------- 2. Whether a pause runs ---------- */

/*
 * running_comment_pause(story): when the story's pause of new comments ends, while it runs.
 * Input: the story row.
 * Returns its comments_paused_until while that is still ahead of now(); null when none was set or
 * it has passed (comments reopen at that moment, before end_comment_pauses() clears the column).
 * Raises nothing. Called by require_comment_allowed() and comment_pause_json().
 */
create function public.running_comment_pause(story public.stories)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select case when story.comments_paused_until > now() then story.comments_paused_until end;
$$;
comment on function public.running_comment_pause(public.stories) is
  'Internal: when a story''s pause of new comments ends, while it runs; null otherwise (CALM-8).';
revoke all on function public.running_comment_pause(public.stories) from public, anon, authenticated;

/*
 * comment_pause_json(story): what a comment list adds while new comments are paused.
 * Input: the story row.
 * Returns {"comments_paused_until": <when it ends>, "can_resume_comments": <true for the story's
 * writer>} while a pause runs, so the page shows "New comments are paused until …" in place of
 * the comment box, with "Resume now" for the writer (handover Step 4, points 5 to 8). An empty
 * object when none runs, so the lists answer exactly as before.
 * Raises nothing. Called by chapter_comments(), paragraph_comments() and paragraph_comment_counts().
 */
create function public.comment_pause_json(story public.stories)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case
    when public.running_comment_pause(story) is null then '{}'::jsonb
    else jsonb_build_object(
      'comments_paused_until', public.running_comment_pause(story),
      'can_resume_comments', coalesce(story.user_id = (select auth.uid()), false))
  end;
$$;
comment on function public.comment_pause_json(public.stories) is
  'Internal: the pause''s end and whether the caller may end it, for the comment lists, while a pause runs (CALM-8).';
revoke all on function public.comment_pause_json(public.stories) from public, anon, authenticated;

/* ---------- 3. The database refuses a comment during a pause ---------- */

/*
 * require_comment_allowed(caller_id, story): as before (comments on, who may comment, the account
 * gate, the comment limit), with the pause straight after the comments-off check (CALM-8): while
 * it runs, nobody adds a comment or a reply, the writer included (IDEA-20261109-8, "nobody").
 * Raises object_not_in_prerequisite_state with the hint 'paused_until:<end, ISO 8601>' so the page
 * can say until when; the other refusals are unchanged.
 */
CREATE OR REPLACE FUNCTION public.require_comment_allowed(caller_id uuid, story stories)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  wait_minutes integer;
begin
  if not story.comments_enabled then
    raise exception 'The writer has turned comments off for this story.' using errcode = 'object_not_in_prerequisite_state';
  end if;
  -- CALM-8: while the writer has paused new comments, nobody adds one, the writer included.
  if public.running_comment_pause(story) is not null then
    raise exception 'New comments on this story are paused for a while.'
      using errcode = 'object_not_in_prerequisite_state',
            hint = 'paused_until:' || (to_jsonb(story.comments_paused_until) #>> '{}');
  end if;
  -- MUST-1a: on Followers only, someone who doesn't follow the writer can't add a comment.
  if not public.comment_audience_allows(story, caller_id) then
    raise exception 'Only the writer''s followers can comment on this story.'
      using errcode = 'insufficient_privilege', hint = 'followers_only';
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
  'Internal: comments on, not paused (CALM-8), who may comment (MUST-1a), the account gate, the comment limit (S1-E6-01).';

/* ---------- 4. The comment lists say a pause runs ---------- */

/*
 * chapter_comments(story_slug, chapter_code, older_than): as before, plus comment_pause_json()
 * while a pause runs (CALM-8), so the page shows the paused line instead of the comment box and
 * hides Reply. The comments themselves still show: a pause stops new ones only.
 */
CREATE OR REPLACE FUNCTION public.chapter_comments(story_slug text, chapter_code text, older_than timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
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
    -- MUST-1a: who may add comments, and whether that includes the caller, so the page shows
    -- the comment box or "Only the writer's followers can comment here".
    'comment_audience', story.comment_audience,
    'audience_allows_me', public.comment_audience_allows(story, (select auth.uid())),
    'total', (select count(*)::integer from public.comments
              where comments.chapter_id = chapter.id and public.comment_is_shown_to_caller(comments)),
    'has_more', page_count > page_size,
    'comments', case when page_count > page_size then page - page_size else page end)
    -- CALM-8: while new comments are paused, until when and whether the caller may end it.
    || public.comment_pause_json(story);
end;
$$;

/*
 * paragraph_comments(story_slug, chapter_code, block_number): as before, plus
 * comment_pause_json() while a pause runs (CALM-8), so the thread's foot shows the paused line
 * instead of the box. Paragraph counts still open the comments for reading.
 */
CREATE OR REPLACE FUNCTION public.paragraph_comments(story_slug text, chapter_code text, block_number integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
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
    -- MUST-1a: who may add comments, and whether that includes the caller, so the page shows
    -- the comment box or "Only the writer's followers can comment here".
    'comment_audience', story.comment_audience,
    'audience_allows_me', public.comment_audience_allows(story, (select auth.uid())),
    'total', (select count(*)::integer from public.comments
              where comments.chapter_id = chapter.id
                and comments.paragraph_key is not null
                and public.comment_is_shown_to_caller(comments)
                and public.paragraph_now(chapter.published_body, comments.paragraph_key, comments.paragraph_number)
                    is not distinct from paragraph_comments.block_number),
    'has_more', page_count > most_shown,
    'comments', case when page_count > most_shown then page - most_shown else page end)
    -- CALM-8: while new comments are paused, until when and whether the caller may end it.
    || public.comment_pause_json(story);
end;
$$;

/*
 * paragraph_comment_counts(story_slug, chapter_code): as before, plus comment_pause_json() while a
 * pause runs (CALM-8), so the reader drops the "+" on paragraphs without comments (nobody can add
 * one) and keeps the counts, which still open the comments for reading.
 */
CREATE OR REPLACE FUNCTION public.paragraph_comment_counts(story_slug text, chapter_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $$
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
  -- Step 3: the counts by paragraph, the earlier-version ones and, during a pause (CALM-8), its end.
  select jsonb_build_object(
    'comments_enabled', true,
    'paragraphs', coalesce((select jsonb_agg(jsonb_build_object('block', counted.block, 'count', counted.total)
                              order by counted.block) from counted), '[]'::jsonb),
    'earlier', (select count(*)::integer from placed where placed.block is null))
    || public.comment_pause_json(story)
  into answer;
  return answer;
end;
$$;

/* ---------- 5. The writer pauses and ends a pause ---------- */

/*
 * comment_pause_end(pause_choice): when a pause the writer asks for ends, worked out on the
 * database's clock so a device set to the wrong time can't stretch or shorten it.
 * Input: '24h', '3d' or '7d' for a pause from now (the idea's three lengths), or 'off'.
 * Returns now() plus 24 hours, 3 days or 7 days; null for 'off'.
 * Raises check_violation (hint unknown_comment_pause) for anything else, null included.
 * Called by comment_pause_after_changes().
 */
create function public.comment_pause_end(pause_choice text)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
begin
  case pause_choice
    when '24h' then return now() + interval '24 hours';
    when '3d' then return now() + interval '3 days';
    when '7d' then return now() + interval '7 days';
    when 'off' then return null;
    else
      raise exception 'A pause of new comments lasts 24 hours, 3 days or 7 days, or is turned off.'
        using errcode = 'check_violation', hint = 'unknown_comment_pause';
  end case;
end;
$$;
comment on function public.comment_pause_end(text) is
  'Internal: the end of a pause of new comments from now (24h, 3d, 7d) or null (off); refuses anything else (CALM-8).';
revoke all on function public.comment_pause_end(text) from public, anon, authenticated;

/*
 * comment_pause_after_changes(current_row, changes): when the story's pause of new comments ends
 * once update_my_story() saves `changes`.
 * Inputs: the story as saved now, and the writer's changes (comments_pause and comments_enabled).
 * Returns a new end from now for '24h', '3d' or '7d', null for 'off', the current end when
 * comments_pause is left out (the atlas and Canva save the story without it), and null whenever
 * comments end up off: with Nobody there is nothing to pause, and an old pause mustn't come back
 * when comments are turned on again.
 * Raises check_violation (from comment_pause_end()) for any other comments_pause.
 */
create function public.comment_pause_after_changes(current_row public.stories, changes jsonb)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  asked_end timestamptz := current_row.comments_paused_until;
begin
  -- Step 1: a pause the writer asked for is checked first, so an unknown value is always refused.
  if changes ? 'comments_pause' then
    asked_end := public.comment_pause_end(changes ->> 'comments_pause');
  end if;
  -- Step 2: comments off (Nobody): nothing to pause.
  if not coalesce((changes ->> 'comments_enabled')::boolean, current_row.comments_enabled) then
    return null;
  end if;
  return asked_end;
end;
$$;
comment on function public.comment_pause_after_changes(public.stories, jsonb) is
  'Internal: the pause''s end once update_my_story() saves the writer''s changes (CALM-8).';
revoke all on function public.comment_pause_after_changes(public.stories, jsonb) from public, anon, authenticated;

/*
 * update_my_story(story_slug, changes): as before (S1-E3-05 and the bundles since), plus the pause
 * of new comments (CALM-8): `changes.comments_pause` is '24h', '3d' or '7d' to pause from now, or
 * 'off' to end the pause; left out, the pause stays as it is. Anything else raises check_violation.
 * Story settings edits a story's first edition, which holds the shared settings of every language.
 */
CREATE OR REPLACE FUNCTION public.update_my_story(story_slug text, changes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  caller_id uuid := (select auth.uid());
  target_story_id uuid;
  current_row public.stories;
  new_title text;
  new_blurb text;
  new_language text;
  new_category_slug text;
  new_category_id uuid;
  new_cover jsonb;
  new_labels jsonb;
begin
  -- Step 1: a signed-in writer who may write, and their own live story.
  if caller_id is null then
    raise exception 'Sign in to change a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  select * into current_row from public.stories where stories.id = target_story_id;

  -- Step 2: the basics: anything not in `changes` keeps its current value, then all are checked.
  new_title := regexp_replace(btrim(coalesce(changes ->> 'title', current_row.title)), '\s+', ' ', 'g');
  new_blurb := btrim(coalesce(changes ->> 'blurb', current_row.blurb));
  new_language := coalesce(changes ->> 'language_code', current_row.language_code);
  new_category_slug := coalesce(changes ->> 'category_slug',
    (select categories.slug from public.categories where categories.id = current_row.category_id));
  new_category_id := public.check_story_basics(new_title, new_blurb, new_language, new_category_slug);

  -- Step 3: the cover, when given; the labels, filled from the current row and checked together.
  new_cover := changes -> 'cover';
  if new_cover is not null then
    perform public.check_story_cover(new_cover);
  end if;
  new_labels := jsonb_build_object(
    'rating', current_row.rating, 'is_fan_fiction', current_row.is_fan_fiction, 'is_parody', current_row.is_parody,
    'deals_with_abuse_or_coercion', current_row.deals_with_abuse_or_coercion,
    'content_note', current_row.content_note, 'ai_disclosure', current_row.ai_disclosure,
    'rating_reasons', to_jsonb(current_row.rating_reasons)
  ) || coalesce(changes -> 'labels', '{}'::jsonb);
  perform public.check_story_labels(new_labels);

  -- Step 4: save. The slug never changes (shared links survive a rename, S1-E3-01).
  update public.stories set
    title = new_title,
    blurb = new_blurb,
    language_code = new_language,
    category_id = new_category_id,
    completion_status = coalesce((changes ->> 'completion_status')::public.completion_status, completion_status),
    comments_enabled = coalesce((changes ->> 'comments_enabled')::boolean, comments_enabled),
    -- MUST-1a: everyone or followers only; the column's check refuses anything else.
    comment_audience = coalesce(changes ->> 'comment_audience', comment_audience),
    -- CALM-8: a pause of new comments from now, its end, or as it was (comment_pause_after_changes()).
    comments_paused_until = public.comment_pause_after_changes(current_row, changes),
    -- S1-E4-07: the writer's switch for quote cards.
    quote_cards_enabled = coalesce((changes ->> 'quote_cards_enabled')::boolean, quote_cards_enabled),
    -- S1-E4-11: the writer's switch for sharing the chapters' pictures.
    picture_sharing_enabled = coalesce((changes ->> 'picture_sharing_enabled')::boolean, picture_sharing_enabled),
    -- IDEAS-1c: the colour new quote and picture cards start in. Sent as null, it goes back to
    -- our default; left out, it stays. The column's check refuses anything off the palette.
    card_colour = case when changes ? 'card_colour' then changes ->> 'card_colour' else card_colour end,
    cover_kind = coalesce((new_cover ->> 'kind')::public.cover_kind, cover_kind),
    cover_design = case when new_cover is null then cover_design else new_cover ->> 'design' end,
    cover_background = case when new_cover is null then cover_background else new_cover ->> 'background' end,
    cover_accent = case when new_cover is null then cover_accent else new_cover ->> 'accent' end,
    cover_tall_path = case when new_cover is null then cover_tall_path else new_cover ->> 'tall_path' end,
    cover_square_path = case when new_cover is null then cover_square_path else new_cover ->> 'square_path' end,
    rating = (new_labels ->> 'rating')::public.story_rating,
    is_fan_fiction = (new_labels ->> 'is_fan_fiction')::boolean,
    is_parody = (new_labels ->> 'is_parody')::boolean,
    deals_with_abuse_or_coercion = (new_labels ->> 'deals_with_abuse_or_coercion')::boolean,
    content_note = btrim(coalesce(new_labels ->> 'content_note', '')),
    ai_disclosure = (new_labels ->> 'ai_disclosure')::public.ai_disclosure,
    -- Why it is 16+ or 18+ (SPONSORS-f); empty for a younger rating.
    rating_reasons = public.story_rating_reasons_from(new_labels)
  where stories.id = target_story_id;

  -- Step 5: the tags, when given.
  if changes ? 'tag_names' then
    if jsonb_array_length(changes -> 'tag_names') > 10 then
      raise exception 'A story can have at most 10 tags (S1-E3-01).' using errcode = 'check_violation';
    end if;
    perform public.set_story_tags(target_story_id, caller_id,
      array(select jsonb_array_elements_text(changes -> 'tag_names')));
  end if;

  return jsonb_build_object('outcome', 'ok');
end;
$$;

/*
 * end_my_comment_pause(story_slug): the writer's "Resume now" under a chapter (handover Step 4,
 * point 8): ends the pause of new comments on their own story at once.
 * Input: the address of the story or of any of its language editions (the writer may be reading
 * either): the pause is kept on the first edition, and stories_editions_follow_first() passes the
 * change on to the others.
 * Returns {"outcome": "ok"} (also when no pause was running), {"outcome": "not_active"} when the
 * account may not change its stories, or {"outcome": "not_found"} when the address isn't one of the
 * caller's own live stories. Sends no note: the writer ended the pause themselves.
 * Raises insufficient_privilege when signed out.
 */
create function public.end_my_comment_pause(story_slug text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  first_edition_id uuid;
begin
  -- Step 1: a signed-in writer who may change their stories, and their own live story.
  if (select auth.uid()) is null then
    raise exception 'Sign in to change a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;
  target_story_id := public.my_live_story_id(story_slug);
  if target_story_id is null then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- Step 2: the pause belongs to the first edition (TRANSLATE-1); ending it there ends it in
  -- every language.
  select coalesce(stories.edition_of_story_id, stories.id) into first_edition_id
  from public.stories where stories.id = target_story_id;
  update public.stories set comments_paused_until = null
  where stories.id = first_edition_id and stories.comments_paused_until is not null;
  return jsonb_build_object('outcome', 'ok');
end;
$$;
comment on function public.end_my_comment_pause(text) is
  'The writer ends the pause of new comments on their own story at once: "Resume now" under a chapter (CALM-8).';
revoke execute on function public.end_my_comment_pause(text) from public, anon;
grant execute on function public.end_my_comment_pause(text) to authenticated;

/* ---------- 6. Language editions share the pause (TRANSLATE-1) ---------- */

/*
 * stories_edition_rules(): as before (TRANSLATE-1), and step 7 also copies the first edition's
 * comments_paused_until (CALM-8), like comments_enabled and comment_audience: a pause covers the
 * story in every language.
 */
CREATE OR REPLACE FUNCTION public.stories_edition_rules()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  first_edition public.stories;
begin
  -- Step 1: a story that isn't a later edition only has to keep its language apart from its editions.
  if new.edition_of_story_id is null then
    if tg_op = 'UPDATE' and old.edition_of_story_id is not null then
      raise exception 'An edition stays an edition of the same story.'
        using errcode = 'check_violation', hint = 'edition_fixed';
    end if;
    if tg_op = 'UPDATE' and new.language_code is distinct from old.language_code and exists (
        select 1 from public.stories as editions
        where editions.edition_of_story_id = new.id and editions.deleted_at is null
          and editions.language_code = new.language_code) then
      raise exception 'The story already has an edition in that language.'
        using errcode = 'check_violation', hint = 'edition_language';
    end if;
    return new;
  end if;

  -- Step 2: the link never changes once the edition exists.
  if tg_op = 'UPDATE' and new.edition_of_story_id is distinct from old.edition_of_story_id then
    raise exception 'An edition stays an edition of the same story.'
      using errcode = 'check_violation', hint = 'edition_fixed';
  end if;

  -- Step 3: the first edition: it exists, it isn't an edition itself and nothing points at this row.
  select * into first_edition from public.stories where stories.id = new.edition_of_story_id;
  if first_edition.id is null or first_edition.edition_of_story_id is not null
      or exists (select 1 from public.stories as editions where editions.edition_of_story_id = new.id) then
    raise exception 'An edition belongs to a story that isn''t an edition itself.'
      using errcode = 'check_violation', hint = 'edition_chain';
  end if;

  -- Step 4: only the writer translates their own story (Robert, 16 Nov 2026, 12:20 UTC).
  if new.user_id <> first_edition.user_id then
    raise exception 'Only the story''s writer can add a language to it.'
      using errcode = 'check_violation', hint = 'edition_owner';
  end if;

  -- Step 5: another language than the first edition (other editions: the unique index).
  if new.language_code = first_edition.language_code then
    raise exception 'The story is already in that language.'
      using errcode = 'check_violation', hint = 'edition_language';
  end if;

  -- Step 6: a live edition needs a live first edition (deleting the story takes its editions too).
  if new.deleted_at is null and first_edition.deleted_at is not null then
    raise exception 'Restore the story before its other languages.'
      using errcode = 'check_violation', hint = 'edition_story_deleted';
  end if;

  -- Step 7: the shared settings, always the first edition's. Who can read a story (CLAUDE.md
  -- rule 18: the rating; NEW-1: the visibility; S1-E8-11: class only) must be the same in every
  -- language, or a translation could show what the original hides.
  new.category_id := first_edition.category_id;
  new.rating := first_edition.rating;
  new.rating_reasons := first_edition.rating_reasons;
  new.is_fan_fiction := first_edition.is_fan_fiction;
  new.is_parody := first_edition.is_parody;
  new.deals_with_abuse_or_coercion := first_edition.deals_with_abuse_or_coercion;
  new.ai_disclosure := first_edition.ai_disclosure;
  new.ai_undisclosed_labelled_at := first_edition.ai_undisclosed_labelled_at;
  new.classic_author_id := first_edition.classic_author_id;
  new.first_published_year := first_edition.first_published_year;
  new.visibility := first_edition.visibility;
  new.class_only := first_edition.class_only;
  new.class_space_id := first_edition.class_space_id;
  new.is_app_only := first_edition.is_app_only;
  new.comments_enabled := first_edition.comments_enabled;
  new.comment_audience := first_edition.comment_audience;
  -- CALM-8: a pause of new comments covers every language, like the comments setting.
  new.comments_paused_until := first_edition.comments_paused_until;
  new.quote_cards_enabled := first_edition.quote_cards_enabled;
  new.picture_sharing_enabled := first_edition.picture_sharing_enabled;
  new.card_colour := first_edition.card_colour;
  new.cover_kind := first_edition.cover_kind;
  new.cover_design := first_edition.cover_design;
  new.cover_background := first_edition.cover_background;
  new.cover_accent := first_edition.cover_accent;
  new.cover_tall_path := first_edition.cover_tall_path;
  new.cover_square_path := first_edition.cover_square_path;
  new.cover_hidden_at := first_edition.cover_hidden_at;
  -- The content note is words, so each edition has its own; an empty one borrows the first
  -- edition's, because a story about abuse must carry a note (stories_abuse_needs_rating_and_note).
  if btrim(coalesce(new.content_note, '')) = '' then
    new.content_note := first_edition.content_note;
  end if;
  return new;
end;
$$;

/*
 * stories_editions_follow_first(): as before (TRANSLATE-1), and a change to the first edition's
 * comments_paused_until reaches its other editions too (CALM-8), like comments_enabled and
 * comment_audience: pausing, ending a pause and end_comment_pauses() clearing it.
 */
CREATE OR REPLACE FUNCTION public.stories_editions_follow_first()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
begin
  update public.stories as editions set
    category_id = new.category_id,
    rating = new.rating,
    rating_reasons = new.rating_reasons,
    is_fan_fiction = new.is_fan_fiction,
    is_parody = new.is_parody,
    deals_with_abuse_or_coercion = new.deals_with_abuse_or_coercion,
    ai_disclosure = new.ai_disclosure,
    visibility = new.visibility,
    class_only = new.class_only,
    class_space_id = new.class_space_id,
    is_app_only = new.is_app_only,
    comments_enabled = new.comments_enabled,
    comment_audience = new.comment_audience,
    comments_paused_until = new.comments_paused_until,
    cover_kind = new.cover_kind,
    cover_design = new.cover_design,
    cover_background = new.cover_background,
    cover_accent = new.cover_accent,
    cover_tall_path = new.cover_tall_path,
    cover_square_path = new.cover_square_path
  where editions.edition_of_story_id = new.id
    -- Only when something shared really changed; stories_edition_rules() copies the rest.
    and (editions.category_id, editions.rating, editions.rating_reasons, editions.is_fan_fiction,
         editions.is_parody, editions.deals_with_abuse_or_coercion, editions.ai_disclosure,
         editions.ai_undisclosed_labelled_at, editions.classic_author_id, editions.first_published_year,
         editions.visibility, editions.class_only, editions.class_space_id, editions.is_app_only,
         editions.comments_enabled, editions.comment_audience, editions.comments_paused_until,
         editions.quote_cards_enabled, editions.picture_sharing_enabled, editions.card_colour,
         editions.cover_kind, editions.cover_design, editions.cover_background, editions.cover_accent,
         editions.cover_tall_path, editions.cover_square_path, editions.cover_hidden_at)
      is distinct from
        (new.category_id, new.rating, new.rating_reasons, new.is_fan_fiction,
         new.is_parody, new.deals_with_abuse_or_coercion, new.ai_disclosure,
         new.ai_undisclosed_labelled_at, new.classic_author_id, new.first_published_year,
         new.visibility, new.class_only, new.class_space_id, new.is_app_only,
         new.comments_enabled, new.comment_audience, new.comments_paused_until,
         new.quote_cards_enabled, new.picture_sharing_enabled, new.card_colour,
         new.cover_kind, new.cover_design, new.cover_background, new.cover_accent,
         new.cover_tall_path, new.cover_square_path, new.cover_hidden_at);
  return null;
end;
$$;

/* ---------- 7. Pauses end by themselves ---------- */

/*
 * end_comment_pauses(): ends the pauses of new comments whose time is up (IDEA-20261109-8:
 * "comments reopen by themselves and the writer gets a quiet note").
 * Runs every 5 minutes (pg_cron job 'end-comment-pauses'). Comments reopen at the pause's end
 * without it (running_comment_pause() compares with now()); the job tidies up and tells the writer.
 * For each first edition whose pause has passed it sends the writer one 'comments_resumed'
 * notification, in the app only (default_email_delivery() has no row for the kind, so no email or
 * digest; there is no push), and only while the story is live with comments on; then it clears
 * the column, and stories_editions_follow_first() clears the other languages. A pause the writer
 * ended early never reaches here, so it sends no note.
 * Returns how many pauses it ended. Raises nothing of its own.
 */
create function public.end_comment_pauses()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  ended public.stories;
  ended_count integer := 0;
begin
  for ended in
    select * from public.stories
    where stories.comments_paused_until <= now()
      and stories.edition_of_story_id is null
    order by stories.comments_paused_until
    for update skip locked
  loop
    -- Step 1: the quiet note, only where comments are open again: a deleted story, or one whose
    -- comments are off, has nothing to reopen.
    if ended.deleted_at is null and ended.comments_enabled then
      perform public.notify(ended.user_id, 'comments_resumed', null,
        jsonb_build_object('story_id', ended.id));
    end if;
    -- Step 2: the pause is over, in every language.
    update public.stories set comments_paused_until = null where stories.id = ended.id;
    ended_count := ended_count + 1;
  end loop;
  return ended_count;
end;
$$;
comment on function public.end_comment_pauses() is
  'Every 5 minutes: ends the pauses of new comments whose time is up and tells each writer in the app (CALM-8).';
revoke execute on function public.end_comment_pauses() from public, anon, authenticated;

-- Naming the job makes this safe to run again: cron.schedule replaces a job of the same name.
select cron.schedule('end-comment-pauses', '*/5 * * * *', 'select public.end_comment_pauses()');

/* ---------- 8. The story page says a pause runs ---------- */

/*
 * get_story_page(story_slug): the story page, as before (TRANSLATE-1a), plus comments_paused_until
 * (CALM-8): when the pause of new comments ends while one runs, otherwise null. The "Comments" row
 * beside the story then reads "Paused until …, Romania time" in place of "On", so a reader knows
 * before opening a chapter. Every edition answers the same end, because the editions share it.
 * Input: the story's address (any edition).
 * Returns the page as JSON, or null when the story doesn't exist or the caller may not see it;
 * never the user ID. Raises nothing of its own.
 * Called by src/features/reading/api/storyPage.ts (StoryPage, StorySideColumn).
 */
create or replace function public.get_story_page(story_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story public.stories;
  caller_id uuid := (select auth.uid());
  is_owner boolean;
begin
  -- Step 1: the story, if it exists and isn't deleted.
  select * into story from public.stories where stories.slug = story_slug and stories.deleted_at is null;
  if not found then
    return null;
  end if;
  is_owner := caller_id is not null and caller_id = story.user_id;
  -- S1-E11-08: a hidden title or cover is masked for readers.
  story := public.story_as_shown(story);

  -- Step 2: readers see it only while a chapter is readable, if their age allows the rating
  -- (rule 18), no moderator hid it and neither side blocks the other (S1-E5-05).
  if not is_owner then
    if not public.story_has_readable_chapter(story.id) then
      return null;
    end if;
    if not public.rating_allows(story.rating) then
      return null;
    end if;
    if public.is_moderated_away('story', story.id) then
      return null;
    end if;
    if public.is_blocked_with(story.user_id) then
      return null;
    end if;
  end if;

  -- Step 3: the page, with the real author of a classic, else the writer's pen name or
  -- username, and never the user ID.
  return jsonb_build_object(
    'id', story.id,
    'slug', story.slug,
    'title', story.title,
    'blurb', story.blurb,
    'language_code', story.language_code,
    'category_slug', (select categories.slug from public.categories where categories.id = story.category_id),
    'tags', coalesce((
      select jsonb_agg(tags.name order by story_tags.created_at)
      from public.story_tags join public.tags on tags.id = story_tags.tag_id
      -- CMS-1e: readers see only approved tags; a waiting one shows only in the writer's settings.
      where story_tags.story_id = story.id and tags.status = 'approved'), '[]'::jsonb),
    'completion_status', story.completion_status,
    'comments_enabled', story.comments_enabled,
    -- CALM-8: the end of a running pause of new comments; null when none runs or it has passed.
    'comments_paused_until', public.running_comment_pause(story),
    'cover', jsonb_build_object('kind', story.cover_kind, 'design', story.cover_design,
      'background', story.cover_background, 'accent', story.cover_accent),
    'labels', jsonb_build_object('rating', story.rating, 'is_fan_fiction', story.is_fan_fiction,
      'is_parody', story.is_parody, 'deals_with_abuse_or_coercion', story.deals_with_abuse_or_coercion,
      'content_note', story.content_note, 'ai_disclosure', story.ai_disclosure,
      'ai_undisclosed_labelled', story.ai_undisclosed_labelled_at is not null),
    'writer', (select jsonb_build_object(
        'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name),
        'handle', profiles.handle, 'bio', public.bio_for_caller(profiles),
        'classic_author', public.story_classic_author(story.id))
      from public.profiles where profiles.id = story.user_id),
    'first_published_at', story.first_published_at,
    'last_chapter_published_at', story.last_chapter_published_at,
    'is_public', public.story_has_readable_chapter(story.id),
    -- TRANSLATE-1a: a reader of a later edition sees every chapter of the story, in order.
    'chapters', case when story.edition_of_story_id is not null and not is_owner
      then public.edition_page_chapters(story.id, story.edition_of_story_id)
      else public.story_page_chapters(story.id, is_owner) end,
    'editions', public.story_editions_json(story),
    'edition', public.story_edition_json(story),
    'is_owner', is_owner,
    -- GAPS-15: the "In the app only" notice (S1-E3-08), only once the apps exist.
    'app_only', public.story_app_only_applies(story.is_app_only),
    'stats', jsonb_build_object(
      'likes', public.story_like_total(story.id),
      'comments', public.story_comment_total(story.id))
  );
end;
$$;
