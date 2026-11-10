/*
 * Migration: who may comment on a story, as one setting (bundle MUST-1, part a;
 * IDEA-20261106-2; story S1-E6-01; board NewStory 4.2, "Status and comments").
 *
 * How it works: the writer picks Everyone, Followers only or Nobody. Nobody is the comments
 * switch that already existed (stories.comments_enabled off: existing comments are hidden and
 * nobody adds new ones). The new column comment_audience says who may add comments while they
 * are on: everyone, or only people who follow the writer. The writer can always comment and
 * reply on their own story. A change applies to new comments only: comments already posted stay.
 * A writer under 18 starts at Followers only (IDEA-20261106-2, proposal) and can open it.
 * What it adds:
 * - stories.comment_audience ('everyone' or 'followers').
 * - comment_audience_allows(story, caller): the one check, used by require_comment_allowed()
 *   (so the database refuses a comment from someone the setting leaves out) and by the comment
 *   lists, which tell the page whether to show the comment box or "Only the writer's followers
 *   can comment here".
 * - update_my_story() saves the setting; create_story() starts it at Followers only for a writer
 *   aged 13 to 17.
 * Who calls it: src/features/writing/ (StoryStatusSection), src/features/comments/
 *   (CommentsSection, AddComment) and the paragraph comments panel in src/features/reading/.
 * Tests: supabase/tests/database/346-comment-audience.test.sql.
 */

alter table public.stories
  add column comment_audience text not null default 'everyone',
  add constraint stories_comment_audience_known check (comment_audience in ('everyone', 'followers'));
comment on column public.stories.comment_audience is
  'Who may add comments while they are on: everyone, or the writer''s followers only (MUST-1a).';

/*
 * comment_audience_allows(story, caller_id): whether the story's comment setting lets this person
 * add a comment. Inputs: the story row and the caller's ID (null when signed out). Returns true for
 * Everyone, for the writer and, on Followers only, for someone who follows the writer. It doesn't
 * look at the comments switch, the account gate or blocks: require_comment_allowed() and the
 * comment functions check those. Raises nothing.
 */
create function public.comment_audience_allows(story public.stories, caller_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select story.comment_audience = 'everyone'
    or caller_id = story.user_id
    or exists (select 1 from public.follows_users
               where follows_users.user_id = caller_id
                 and follows_users.followed_user_id = story.user_id);
$$;
comment on function public.comment_audience_allows(public.stories, uuid) is
  'Internal: whether a story''s comment setting lets this person comment (MUST-1a).';
revoke all on function public.comment_audience_allows(public.stories, uuid) from public, anon, authenticated;

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
    'comments', case when page_count > page_size then page - page_size else page end);
end;
$$;

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
    'comments', case when page_count > most_shown then page - most_shown else page end);
end;
$$;

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

CREATE OR REPLACE FUNCTION public.create_story(title text, blurb text, language_code text, category_slug text, tag_names text[], cover jsonb, story_id uuid DEFAULT NULL::uuid, labels jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  caller_id uuid := (select auth.uid());
  clean_title text := regexp_replace(btrim(coalesce(title, '')), '\s+', ' ', 'g');
  clean_blurb text := btrim(coalesce(blurb, ''));
  chosen_category_id uuid;
  new_story_id uuid := coalesce(story_id, gen_random_uuid());
  new_slug text;
begin
  -- Step 1: a signed-in person who may write (the account gate; every write checks it).
  if caller_id is null then
    raise exception 'Sign in to create a story.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('outcome', 'not_active');
  end if;

  -- Step 2: the shared rules, the tags cap, the cover and the labels; an ID in use is never reused.
  chosen_category_id := public.check_story_basics(clean_title, clean_blurb, language_code, category_slug);
  if cardinality(coalesce(tag_names, '{}')) > 10 then
    raise exception 'A story can have at most 10 tags (S1-E3-01).' using errcode = 'check_violation';
  end if;
  perform public.check_story_cover(cover);
  perform public.check_story_labels(coalesce(labels, '{}'::jsonb));
  if exists (select 1 from public.stories where stories.id = new_story_id) then
    raise exception 'That story ID is already in use (S1-E3-13).' using errcode = 'check_violation';
  end if;

  -- Step 3: the row, with a fresh address; a one-in-two-billion clash just picks another.
  loop
    new_slug := public.story_slug_for(clean_title);
    exit when not exists (select 1 from public.stories where stories.slug = new_slug);
  end loop;
  insert into public.stories (
    id, user_id, slug, title, blurb, language_code, category_id,
    cover_kind, cover_design, cover_background, cover_accent, cover_tall_path, cover_square_path,
    rating, is_fan_fiction, is_parody, deals_with_abuse_or_coercion, content_note, ai_disclosure,
    rating_reasons, comment_audience
  ) values (
    new_story_id, caller_id, new_slug, clean_title, clean_blurb, language_code, chosen_category_id,
    (cover ->> 'kind')::public.cover_kind, cover ->> 'design', cover ->> 'background', cover ->> 'accent',
    cover ->> 'tall_path', cover ->> 'square_path',
    (labels ->> 'rating')::public.story_rating,
    coalesce((labels ->> 'is_fan_fiction')::boolean, false),
    coalesce((labels ->> 'is_parody')::boolean, false),
    coalesce((labels ->> 'deals_with_abuse_or_coercion')::boolean, false),
    btrim(coalesce(labels ->> 'content_note', '')),
    (labels ->> 'ai_disclosure')::public.ai_disclosure,
    -- Why it is 16+ or 18+ (SPONSORS-f); empty for a younger rating.
    public.story_rating_reasons_from(labels),
    -- MUST-1a (IDEA-20261106-2, proposal): a writer aged 13 to 17 starts at Followers only.
    case when public.age_band() in ('13_to_15', '16_to_17') then 'followers' else 'everyone' end
  );

  -- Step 4: the tags, merged and capped.
  perform public.set_story_tags(new_story_id, caller_id, tag_names);

  return jsonb_build_object('outcome', 'ok', 'slug', new_slug);
end;
$$;
