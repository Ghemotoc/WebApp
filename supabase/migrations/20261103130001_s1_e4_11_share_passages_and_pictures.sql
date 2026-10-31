/*
 * Migration: share a passage or a picture from a chapter (story S1-E4-11; board 3.6 Share).
 *
 * How a shared passage travels:
 *   1. a signed-in reader selects lines (or presses Share on a picture) in a chapter; the reader
 *      knows which blocks of the chapter they are in: a block is a run of text between blank
 *      lines in the stored Markdown, counted from 1 (chapter_blocks(), the same rule as
 *      src/lib/chapter-blocks.ts);
 *   2. "Copy link to this passage" gives /s/<story>/<chapter>/p<first>-<last>: no sharer ID and
 *      no tracking code, only where in the chapter (legal note);
 *   3. a chat app asking for that address gets a preview with the passage instead of the blurb,
 *      from get_shared_passage() (criterion 2); someone who opens it reads the chapter from that
 *      passage, highlighted.
 * The writer's switches (criterion 3): quote_cards_enabled now covers passages (quote cards and
 *   passage links); the new picture_sharing_enabled covers the chapters' pictures (picture cards
 *   and picture links). A picture is shared only once its check has passed (legal note).
 * 16+ and 18+ stories (criterion 4): only a plain link goes out. shareable_chapter() now says
 *   "no passages" for them, so quote cards stop too, and get_shared_passage() answers nothing.
 *   App-only stories (S1-E3-08) aren't built yet; when they are, they join the same rule here.
 * Personal data: none new. The switch is a story setting.
 */

/* ---------- The writer's switch for pictures ---------- */

alter table public.stories
  add column picture_sharing_enabled boolean not null default true;

comment on column public.stories.picture_sharing_enabled is
  'Whether readers may share this story''s chapter pictures as picture cards and links (S1-E4-11). On by default.';

/* ---------- Which stories may share text or pictures at all ---------- */

/**
 * story_shares_content: whether anything beyond a plain link may leave the site for a story
 *   (S1-E4-11 criterion 4): not for 16+ and 18+, whose text a visitor may not see (Q6).
 * Input: the story's rating. Returns: true for All ages and 13+.
 * Where it fits: shareable_chapter(), share_options() and get_shared_passage().
 */
create function public.story_shares_content(story_rating public.story_rating)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select story_rating not in ('16_plus', '18_plus');
$$;
comment on function public.story_shares_content(public.story_rating) is
  'Internal: false for 16+ and 18+, which share only a plain link (S1-E4-11).';
revoke execute on function public.story_shares_content(public.story_rating) from public, anon, authenticated;

/**
 * shareable_chapter: as in S1-E4-05, but its quote_cards_enabled column now also says no for a
 *   16+ or 18+ story (S1-E4-11 criterion 4), so quote_card_state() and make_quote_card() offer
 *   and make no card there. The signature is unchanged.
 */
create or replace function public.shareable_chapter(story_slug text, chapter_code text)
returns table (chapter_id uuid, writer_id uuid, quote_cards_enabled boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select chapters.id, story.user_id,
    story.quote_cards_enabled and public.story_shares_content(story.rating)
  from public.reader_visible_story(story_slug) as story
  join public.chapters on chapters.story_id = story.id and chapters.code = chapter_code
  where public.chapter_is_readable(chapters.id);
$$;
comment on function public.shareable_chapter(text, text) is
  'Internal: a chapter the caller may read, with its writer and whether passages may be shared (S1-E4-05, S1-E4-07, S1-E4-11).';
revoke execute on function public.shareable_chapter(text, text) from public, anon, authenticated;

/**
 * share_options: what the reader may share from a chapter (S1-E4-11 criterion 3).
 * Inputs: story_slug, chapter_code.
 * Returns: {passages, pictures}: passages when the writer's quote card switch is on, pictures
 *   when their picture switch is on; both false for 16+ and 18+, a signed-out visitor, or a
 *   chapter the caller may not read.
 * Errors: none. Flow: the reader's share bar and picture Share button → this.
 */
create function public.share_options(story_slug text, chapter_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  shared record;
  pictures_on boolean;
begin
  select * into shared from public.shareable_chapter(story_slug, chapter_code);
  if (select auth.uid()) is null or not found then
    return jsonb_build_object('passages', false, 'pictures', false);
  end if;
  select stories.picture_sharing_enabled and public.story_shares_content(stories.rating)
    into pictures_on
  from public.chapters join public.stories on stories.id = chapters.story_id
  where chapters.id = shared.chapter_id;
  return jsonb_build_object('passages', shared.quote_cards_enabled, 'pictures', coalesce(pictures_on, false));
end;
$$;
comment on function public.share_options(text, text) is
  'Whether the caller may share passages and pictures from a chapter (S1-E4-11).';
revoke execute on function public.share_options(text, text) from public;
grant execute on function public.share_options(text, text) to anon, authenticated;

/* ---------- Blocks and the shared passage ---------- */

/**
 * chapter_blocks: a chapter body cut into blocks: the runs of text between blank lines, counted
 *   from 1, empty ones left out and line breaks trimmed from each end. src/lib/chapter-blocks.ts cuts the same way, so a block number
 *   means the same paragraph to the reader's screen and to the link preview.
 * Input: the body. Returns: one row per block.
 */
create function public.chapter_blocks(body text)
returns table (block_number integer, block_text text)
language sql
immutable
set search_path = ''
as $$
  select (row_number() over (order by piece.position))::integer, btrim(piece.part, E'\n')
  from regexp_split_to_table(coalesce(body, ''), '\n[ \t]*\n') with ordinality as piece(part, position)
  where btrim(piece.part, E' \t\n') <> '';
$$;
comment on function public.chapter_blocks(text) is
  'Internal: a chapter body as numbered blocks between blank lines (S1-E4-11).';
revoke execute on function public.chapter_blocks(text) from public, anon, authenticated;

/**
 * get_shared_passage: the passage a shared link points to, for its link preview (S1-E4-11
 *   criterion 2). Anyone may ask (chat apps aren't logged in), so it shows only what the
 *   chapter's link preview already shows a visitor, plus the passage.
 * Inputs: story_slug, chapter_code, first_block and last_block (at most 5 blocks).
 * Returns: {blocks: [{kind: 'text', markdown} | {kind: 'picture', alt}]}; null when the chapter
 *   has no preview, the story is 16+ or 18+ (criterion 4), the range is wrong, or nothing in it
 *   may be shared: text only while the writer's passage switch is on, a picture only while their
 *   picture switch is on and its check has passed (legal note).
 * Flow: server/link-preview.ts → this → the preview's description.
 */
create function public.get_shared_passage(
  story_slug text,
  chapter_code text,
  first_block integer,
  last_block integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story public.stories;
  chapter public.chapters;
  shared_blocks jsonb;
begin
  -- Step 1: a chapter a visitor may see a preview of, from a story that shares content.
  if first_block < 1 or last_block < first_block or last_block - first_block > 4
     or public.get_link_preview(story_slug, chapter_code) is null then
    return null;
  end if;
  select * into story from public.stories where stories.slug = story_slug and stories.deleted_at is null;
  select * into chapter from public.chapters where chapters.story_id = story.id and chapters.code = chapter_code;
  if not public.story_shares_content(story.rating) then
    return null;
  end if;
  -- Step 2: each block in the range: a lone picture as its alt text, anything else as text.
  select jsonb_agg(block.shared order by block.block_number) into shared_blocks
  from (
    select blocks.block_number, public.shared_block(blocks.block_text, story, chapter.id) as shared
    from public.chapter_blocks(chapter.published_body) as blocks
    where blocks.block_number between first_block and last_block
  ) as block
  where block.shared is not null;
  if shared_blocks is null then
    return null;
  end if;
  return jsonb_build_object('blocks', shared_blocks);
end;
$$;

/**
 * shared_block: one block as a shared passage may show it, or null when it may not be shared.
 * Inputs: the block's Markdown, its story and its chapter.
 * Returns: {kind: 'picture', alt} for a block that is only a passed chapter picture while the
 *   picture switch is on; {kind: 'text', markdown} (its first 400 characters) for text while
 *   the passage switch is on;
 *   null otherwise (a music or video card is never shared as text).
 * Where it fits: get_shared_passage().
 */
create function public.shared_block(block_text text, story public.stories, target_chapter_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  reference record;
begin
  select * into reference from public.chapter_picture_references(block_text) limit 1;
  if found and btrim(block_text) ~ '^!\[(?:[^]\\]|\\.)*\]\(picture:[0-9a-f-]{36}\)$' then
    if story.picture_sharing_enabled and exists (
      select 1 from public.picture_checks
      where picture_checks.id = reference.picture_id and picture_checks.user_id = story.user_id
        and picture_checks.kind in ('chapter_picture', 'drawing') and picture_checks.deleted_at is null
        and (public.picture_state_json(picture_checks) ->> 'state') = 'visible') then
      return jsonb_build_object('kind', 'picture', 'alt', reference.alt_text);
    end if;
    return null;
  end if;
  if not story.quote_cards_enabled or btrim(block_text) ~ '^!\[[^]]*\]\(embed:' then
    return null;
  end if;
  -- At most 400 characters a block: enough for a preview (about 280 are shown), never a way
  -- to read past the signed-out teaser (S1-E4-04) a few blocks at a time.
  return jsonb_build_object('kind', 'text', 'markdown', left(block_text, 400));
end;
$$;
comment on function public.shared_block(text, public.stories, uuid) is
  'Internal: one block of a shared passage as a preview may show it (S1-E4-11).';
revoke execute on function public.shared_block(text, public.stories, uuid) from public, anon, authenticated;

comment on function public.get_shared_passage(text, text, integer, integer) is
  'The passage a shared link points to, for its link preview; only what may be shared (S1-E4-11).';
revoke execute on function public.get_shared_passage(text, text, integer, integer) from public;
grant execute on function public.get_shared_passage(text, text, integer, integer) to anon, authenticated;

/* ---------- update_my_story() with the picture switch ---------- */

/**
 * update_my_story: as in S1-E4-07, now also taking `picture_sharing_enabled` in `changes`
 * (S1-E4-11); left out, it keeps its current value.
 */
create or replace function public.update_my_story(story_slug text, changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
    'content_note', current_row.content_note, 'ai_disclosure', current_row.ai_disclosure
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
    -- S1-E4-07: the writer's switch for quote cards.
    quote_cards_enabled = coalesce((changes ->> 'quote_cards_enabled')::boolean, quote_cards_enabled),
    -- S1-E4-11: the writer's switch for sharing the chapters' pictures.
    picture_sharing_enabled = coalesce((changes ->> 'picture_sharing_enabled')::boolean, picture_sharing_enabled),
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
    ai_disclosure = (new_labels ->> 'ai_disclosure')::public.ai_disclosure
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
comment on function public.update_my_story(text, jsonb) is
  'Changes the writer''s own story: basics, cover, status, comments, quote cards, picture sharing, labels and tags (S1-E3-05, S1-E3-06, S1-E4-07, S1-E4-11).';
revoke execute on function public.update_my_story(text, jsonb) from public, anon;
grant execute on function public.update_my_story(text, jsonb) to authenticated;
