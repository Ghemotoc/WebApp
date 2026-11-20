/*
 * CALM-4: cover styles and the title's font (the simplified design, Robert, 20 Nov 2026,
 * 10:07 to 11:55 UTC; handover "Build: handover for the simplified design", Step 2, Covers).
 *
 * What it adds:
 *   - stories.cover_style: how a cover is drawn. Label (a pattern with a paper label, every
 *     automatic cover), Big title, Initial, Picture (an uploaded picture under the label) or
 *     Custom (the writer's whole cover, none of our words). The handover calls this "the cover
 *     kind"; the column is cover_style because cover_kind already says where a cover comes from
 *     (automatic, drawn or upload) and every reader of it stays as it is.
 *   - stories.cover_title_font: the title's font on the covers we draw: reading (Literata, the
 *     default), display (Funnel Display), sans (Inter) or hand (Playwrite Cuba).
 *   - set_my_story_cover_look(): the writer's own way to change both.
 *   - The six functions that hand a cover to the app now carry style and title_font.
 * Existing covers: drawn covers become Label (with their pattern and colours) and uploaded
 * covers become Custom, as the handover says.
 * Who reads it: src/components/covers (DrawnCover, StoryCover), through the functions below.
 */

/* ---------- The two types ---------- */

create type public.cover_style as enum ('label', 'big_title', 'initial', 'picture', 'custom');
comment on type public.cover_style is
  'How a cover is drawn (CALM-4): label, big_title and initial for drawn and automatic covers, picture and custom for uploads.';

create type public.cover_title_font as enum ('reading', 'display', 'sans', 'hand');
comment on type public.cover_title_font is
  'The title''s font on the covers we draw (CALM-4): reading = Literata, display = Funnel Display, sans = Inter, hand = Playwrite Cuba.';

/* ---------- The columns ---------- */

alter table public.stories
  add column cover_style public.cover_style not null default 'label',
  add column cover_title_font public.cover_title_font not null default 'reading';

-- Step 1: every uploaded cover so far is the writer's whole cover.
update public.stories set cover_style = 'custom' where cover_kind = 'upload';

-- Step 2: the style must fit where the cover comes from.
alter table public.stories add constraint stories_cover_style_fits_kind check (
  case cover_kind
    when 'automatic' then cover_style = 'label'
    when 'drawn' then cover_style in ('label', 'big_title', 'initial')
    when 'upload' then cover_style in ('picture', 'custom')
  end
);
comment on constraint stories_cover_style_fits_kind on public.stories is
  'An automatic cover is a Label; a drawn cover is Label, Big title or Initial; an upload is Picture or Custom (CALM-4).';
comment on column public.stories.cover_style is
  'How the cover is drawn (CALM-4); see the cover_style type. Readers see Label while staff hide a cover.';
comment on column public.stories.cover_title_font is
  'The title''s font on the covers we draw (CALM-4); pen names stay Inter.';

/* ---------- Keeping the style in step ---------- */

/**
 * Trigger: keeps cover_style fitting cover_kind when something other than the writer changes the
 * kind (a failed picture check turns a cover automatic, a restored story loses its upload), and
 * gives a language edition the first edition's style and font, like the rest of its cover
 * (TRANSLATE-1a).
 * Inputs: the new row. Returns: the row, adjusted. Raises nothing.
 * Where it fits: before every insert and every update of the cover columns on stories.
 */
create function public.stories_cover_style_fits()
returns trigger
language plpgsql
set search_path to ''
as $$
declare
  first_edition public.stories;
begin
  -- Step 1: an edition shares its cover with the first edition.
  if new.edition_of_story_id is not null then
    select * into first_edition from public.stories where stories.id = new.edition_of_story_id;
    if found then
      new.cover_style := first_edition.cover_style;
      new.cover_title_font := first_edition.cover_title_font;
    end if;
  end if;
  -- Step 2: a style that no longer fits the kind falls back to the plain one for that kind.
  if new.cover_kind = 'automatic' then
    new.cover_style := 'label';
  elsif new.cover_kind = 'drawn' and new.cover_style not in ('label', 'big_title', 'initial') then
    new.cover_style := 'label';
  elsif new.cover_kind = 'upload' and new.cover_style not in ('picture', 'custom') then
    new.cover_style := 'custom';
  end if;
  return new;
end;
$$;
comment on function public.stories_cover_style_fits() is
  'Trigger: keeps cover_style fitting cover_kind and copies an edition''s style and font from the first edition (CALM-4).';

-- "zz" so it runs after stories_edition_rules, which copies the cover kind first.
create trigger stories_zz_cover_style_fits
  before insert or update of cover_kind, cover_style, cover_title_font, edition_of_story_id
  on public.stories
  for each row execute function public.stories_cover_style_fits();

/**
 * Trigger: when the first edition's cover style or font changes, every language edition follows.
 * Inputs: the updated first edition. Returns: null (after trigger). Raises nothing.
 */
create function public.stories_editions_follow_cover_look()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  update public.stories as editions set
    cover_style = new.cover_style,
    cover_title_font = new.cover_title_font
  where editions.edition_of_story_id = new.id
    and (editions.cover_style, editions.cover_title_font)
      is distinct from (new.cover_style, new.cover_title_font);
  return null;
end;
$$;
comment on function public.stories_editions_follow_cover_look() is
  'Trigger: language editions take the first edition''s cover style and title font (CALM-4).';

create trigger stories_editions_follow_cover_look
  after update of cover_style, cover_title_font on public.stories
  for each row execute function public.stories_editions_follow_cover_look();

/* ---------- The writer's own change ---------- */

/**
 * Changes how the writer's own story's cover is drawn and the title's font.
 * Inputs: story_slug (the writer's live story), style, title_font.
 * Returns: {"outcome": "saved", "style", "title_font"}, or {"outcome": "not_active"} or
 *   {"outcome": "not_found"}.
 * Raises: insufficient_privilege when signed out; invalid_parameter_value (hint
 *   style_does_not_fit) when the style doesn't fit the cover: an automatic cover is always a
 *   Label, a drawn one Label, Big title or Initial, an uploaded one Picture or Custom.
 * Where it fits: the story settings' Cover section saves the cover with update_my_story() or
 * create_story(), then this.
 */
create function public.set_my_story_cover_look(
  story_slug text,
  style public.cover_style,
  title_font public.cover_title_font
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  target_story_id uuid;
  current_kind public.cover_kind;
begin
  -- Step 1: a signed-in writer who may write, and their own live story (as update_my_story()).
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

  -- Step 2: the style must fit the cover the story has.
  select stories.cover_kind into current_kind from public.stories where stories.id = target_story_id;
  if not (
    (current_kind = 'automatic' and style = 'label')
    or (current_kind = 'drawn' and style in ('label', 'big_title', 'initial'))
    or (current_kind = 'upload' and style in ('picture', 'custom'))
  ) then
    raise exception 'That cover style doesn''t fit this cover.'
      using errcode = 'invalid_parameter_value', hint = 'style_does_not_fit';
  end if;

  -- Step 3: save both; editions follow through stories_editions_follow_cover_look().
  update public.stories
  set cover_style = style, cover_title_font = title_font
  where stories.id = target_story_id;
  return jsonb_build_object('outcome', 'saved', 'style', style, 'title_font', title_font);
end;
$$;
comment on function public.set_my_story_cover_look(text, public.cover_style, public.cover_title_font) is
  'The writer changes their own story''s cover style and title font (CALM-4).';

revoke all on function public.set_my_story_cover_look(text, public.cover_style, public.cover_title_font) from public, anon;
grant execute on function public.set_my_story_cover_look(text, public.cover_style, public.cover_title_font) to authenticated;
revoke all on function public.stories_cover_style_fits() from public, anon, authenticated;
revoke all on function public.stories_editions_follow_cover_look() from public, anon, authenticated;

/* ---------- The functions that hand a cover to the app ---------- */
-- Each is today's definition with 'style' and 'title_font' added to its cover object.

CREATE OR REPLACE FUNCTION "public"."get_link_preview"("story_slug" "text", "chapter_code" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  story public.stories;
  chapter public.chapters;
  chapter_part jsonb;
begin
  -- Step 1: a live story with at least one chapter published once, not hidden by a moderator.
  -- A private story is the writer's alone (NEW-1) and a class-only story is the class's
  -- (S1-E8-11): neither has a public preview (S1-E11-36).
  select * into story from public.stories
  where stories.slug = story_slug and stories.deleted_at is null and stories.first_published_at is not null;
  if not found or story.visibility = 'private' or story.class_only
     or public.is_moderated_away('story', story.id) then
    return null;
  end if;
  -- S1-E11-08: a link preview never shows a hidden title or cover.
  story := public.story_as_shown(story);
  -- Step 2: the chapter, when the address names one; it must be readable.
  if chapter_code is not null then
    select * into chapter from public.chapters
    where chapters.code = chapter_code and chapters.story_id = story.id;
    if not found or not public.chapter_is_readable(chapter.id) then
      return null;
    end if;
    chapter_part := jsonb_build_object('code', chapter.code, 'title', chapter.published_title);
  end if;
  -- Step 3: the preview. The same details for every rating (Robert, 11 Nov 2026); only the text
  -- stays closed to visitors on 16+ and 18+ (Q6), which `hides_text` tells the caller.
  return jsonb_build_object(
    'slug', story.slug,
    'title', story.title,
    'rating', story.rating,
    'language_code', story.language_code,
    'hides_text', story.rating in ('16_plus', '18_plus'),
    -- Only a public story is for search engines; an unlisted one is shared by its link only.
    'is_listed', story.visibility = 'public',
    'blurb', story.blurb,
    'writer', (select jsonb_build_object(
        'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name))
      from public.profiles where profiles.id = story.user_id),
    'cover', jsonb_build_object(
      'kind', story.cover_kind, 'design', story.cover_design,
      'background', story.cover_background, 'accent', story.cover_accent,
        -- CALM-4: how the cover is drawn and the title's font.
        'style', story.cover_style, 'title_font', story.cover_title_font),
    'category_slug', (select categories.slug from public.categories where categories.id = story.category_id),
    'tags', public.story_search_tags(story.id, story.language_code),
    'chapter', chapter_part);
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_story_page"("story_slug" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
      'background', story.cover_background, 'accent', story.cover_accent,
        -- CALM-4: how the cover is drawn and the title's font.
        'style', story.cover_style, 'title_font', story.cover_title_font),
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

CREATE OR REPLACE FUNCTION "public"."profile_story_cards"("writer_id" "uuid", "is_owner" boolean) RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', stories.id,
      'slug', stories.slug,
      'title', stories.title,
      'blurb', stories.blurb,
      'category_slug', categories.slug,
      'completion_status', stories.completion_status,
      'rating', stories.rating,
      'cover', jsonb_build_object('kind', stories.cover_kind, 'design', stories.cover_design,
        'background', stories.cover_background, 'accent', stories.cover_accent,
        -- CALM-4: how the cover is drawn and the title's font.
        'style', stories.cover_style, 'title_font', stories.cover_title_font),
      -- QA-2a: only published, undeleted chapters can be readable; saying so lets Postgres use
      -- chapters_published_idx.
      'chapter_count', (select count(*) from public.chapters
        where chapters.story_id = raw.id
          and chapters.status = 'published' and chapters.deleted_at is null
          and public.chapter_is_readable(chapters.id)),
      'last_chapter_published_at', stories.last_chapter_published_at
    ) order by stories.last_chapter_published_at desc nulls last, stories.title), '[]'::jsonb)
  -- S1-E11-08: each story as the caller may see it (a hidden title or cover masked).
  from public.stories as raw
  cross join lateral (select (public.story_as_shown(raw)).*) as stories
  join public.categories on categories.id = stories.category_id
  where raw.user_id = writer_id
    and raw.deleted_at is null
    and public.story_has_readable_chapter(raw.id)
    and not public.is_moderated_away('story', raw.id)
    and (is_owner or public.rating_allows(raw.rating))
    -- S1-E8-11: a class-only story isn't on the writer's public profile.
    and (is_owner or not raw.class_only)
    -- NEW-1: unlisted and private stories aren't on the writer's public profile.
    and (is_owner or raw.visibility = 'public');
$$;

CREATE OR REPLACE FUNCTION "public"."public_plan_json"("target_story_id" "uuid", "as_preview" boolean) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  areas text[];
  shown public.stories;
begin
  -- Step 1: the areas the writer made public, in the settings' order.
  select array(select area from unnest(public.plan_area_names()) as area
               where area = any (story_plans.public_areas))
    into areas
  from public.story_plans where story_plans.story_id = target_story_id;
  areas := coalesce(areas, '{}');
  -- Step 2: the story as this caller may see it (a title or cover staff hid is replaced).
  select (public.story_as_shown(stories)).* into shown
  from public.stories where stories.id = target_story_id;
  if shown.id is null then
    return null;
  end if;
  -- Step 3: the story's band, then each area's items that show.
  return jsonb_build_object(
    'story', jsonb_build_object(
      'id', shown.id, 'slug', shown.slug, 'title', shown.title,
      'cover', jsonb_build_object('kind', shown.cover_kind, 'design', shown.cover_design,
        'background', shown.cover_background, 'accent', shown.cover_accent,
        -- CALM-4: how the cover is drawn and the title's font.
        'style', shown.cover_style, 'title_font', shown.cover_title_font),
      -- The pen name, else the username; never the user ID (rule 15).
      'writer_name', (select public.story_writer_name(shown.id, profiles.handle, profiles.pen_name)
                      from public.profiles where profiles.id = shown.user_id)),
    'areas', to_jsonb(areas),
    'characters', public.public_plan_characters(shown.id, areas, as_preview),
    'fields', public.public_plan_fields(shown.id, areas, as_preview),
    'relationships', public.public_plan_relationships(shown.id, areas, as_preview),
    'sections', public.public_plan_bible(shown.id, areas, as_preview),
    'events', public.public_plan_events(shown.id, areas, as_preview),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object('code', chapters.code, 'title', chapters.published_title)
        order by chapters.position)
      from public.chapters
      where chapters.story_id = shown.id and public.chapter_is_readable(chapters.id)), '[]'::jsonb));
end;
$$;

CREATE OR REPLACE FUNCTION "public"."share_options"("story_slug" "text", "chapter_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  shared record;
  story public.stories;
  cover_kind public.cover_kind;
begin
  -- Step 1: a signed-in reader and a chapter they may read, or nothing at all.
  select * into shared from public.shareable_chapter(story_slug, chapter_code);
  if (select auth.uid()) is null or not found then
    return jsonb_build_object('passages', false, 'pictures', false, 'card_colour', null, 'cover', null);
  end if;
  -- Step 2: the story, for the writer's switches, their card colour and the cover.
  select stories.* into story
  from public.chapters join public.stories on stories.id = chapters.story_id
  where chapters.id = shared.chapter_id;
  -- Step 3: a cover staff hid shows as the automatic one (S1-E11-08).
  cover_kind := case when story.cover_hidden_at is null then story.cover_kind else 'automatic' end;
  return jsonb_build_object(
    'passages', shared.quote_cards_enabled,
    -- The writer's picture switch, never for 16+ or 18+ (S1-E4-11, criterion 4).
    'pictures', coalesce(story.picture_sharing_enabled and public.story_shares_content(story.rating), false),
    'card_colour', story.card_colour,
    'cover', jsonb_build_object(
      'kind', cover_kind,
      -- The story's ID (never the writer's) draws the automatic cover (S1-E3-13).
      'story_id', story.id,
      'design', case when cover_kind = 'drawn' then story.cover_design end,
      'background', case when cover_kind = 'drawn' then story.cover_background end,
      'accent', case when cover_kind = 'drawn' then story.cover_accent end,
      -- CALM-4: how the cover is drawn and the title's font (a hidden cover draws as a Label).
      'style', case when cover_kind = story.cover_kind then story.cover_style else 'label' end,
      'title_font', story.cover_title_font));
end;
$$;

CREATE OR REPLACE FUNCTION "public"."story_card_json"("target_story_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select jsonb_build_object(
    'id', stories.id,
    'slug', stories.slug,
    'title', stories.title,
    'blurb', stories.blurb,
    'writer', jsonb_build_object(
      'handle', profiles.handle,
      'display_name', public.story_writer_name(stories.id, profiles.handle, profiles.pen_name),
      'classic_author', public.story_classic_author(stories.id),
      -- IDEAS-3a: the writer's rank for the card's pill, when the reader may see it.
      'rank', public.story_card_writer_rank(profiles, stories.id)),
    'category_slug', categories.slug,
    'language_code', stories.language_code,
    'completion_status', stories.completion_status,
    'rating', stories.rating,
    'cover', jsonb_build_object('kind', stories.cover_kind, 'design', stories.cover_design,
      'background', stories.cover_background, 'accent', stories.cover_accent,
        -- CALM-4: how the cover is drawn and the title's font.
        'style', stories.cover_style, 'title_font', stories.cover_title_font),
    -- QA-2a: only published, undeleted chapters can be readable, and saying so lets Postgres
    -- read just this story's chapters through chapters_published_idx.
    'chapter_count', (select count(*) from public.chapters
      where chapters.story_id = target_story_id
        and chapters.status = 'published' and chapters.deleted_at is null
        and public.chapter_is_readable(chapters.id)),
    'last_chapter_published_at', stories.last_chapter_published_at,
    -- GAPS-15: the "In the app only" cover label, only once the apps exist.
    'app_only', public.story_app_only_applies(stories.is_app_only),
    -- TRANSLATE-1a: a story in one language is answered by the index alone.
    'languages', case
      when raw.edition_of_story_id is null and not exists (
        select 1 from public.stories as editions
        where editions.edition_of_story_id = raw.id and editions.deleted_at is null) then '[]'::jsonb
      else public.story_editions_json(raw) end)
  -- S1-E11-08: the story as the caller may see it (a hidden title or cover masked). In FROM, so
  -- story_as_shown() runs once, not once per column ("(story_as_shown(raw)).*", QA-2a).
  from public.stories as raw
  cross join lateral public.story_as_shown(raw) as stories
  join public.profiles on profiles.id = stories.user_id
  join public.categories on categories.id = stories.category_id
  where raw.id = target_story_id;
$$;
