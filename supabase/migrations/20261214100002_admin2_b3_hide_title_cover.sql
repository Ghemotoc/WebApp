/*
 * Staff hide a story's title or cover (bundle ADMIN-2, part b3; story S1-E11-08, criterion
 * "Given a title or cover that breaks the rules, when staff act, then they can hide the cover (the
 * automatic cover from S1-E3-13 shows instead) or hide the title on public screens behind 'Title
 * hidden by the moderation team' until the writer changes it; staff never write a new title").
 *
 * What it adds:
 * 1. stories.title_hidden_at and stories.cover_hidden_at, and a trigger that clears each one when
 *    the writer changes the title or picks another cover ("until the writer changes it").
 * 2. The setting hidden_title_marker: the words readers see instead of the title, by story language.
 * 3. story_as_shown(): one story as a reader sees it (the marker for a hidden title, the automatic
 *    cover for a hidden cover); the writer and staff with the Stories area see the real one. Every
 *    public read of a story's title or cover goes through it: listed_stories(),
 *    reader_visible_story(), story_card_json(), get_story_page(), get_link_preview(),
 *    profile_story_cards(), export_library_of(), public_plan_json() and notification_json(). A
 *    hidden title isn't searchable (story_search_text()) and a hidden uploaded cover is neither
 *    listed (story_cover_picture()) nor served from Storage (picture_is_visible()).
 * 4. admin_set_story_presentation(): staff hide or show the title or the cover with a reason, as a
 *    version of kind 'presentation', audited, with a statement of reasons when hiding and a
 *    notification when showing again. Restore (admin_restore_story_revision()) undoes it.
 * 5. admin_story_overview() gains the cover and whether the title and cover are hidden.
 *
 * Who calls it: the staff story page (src/features/staff) and, indirectly, every public screen
 * that shows a story. What it calls: admin_record_story_change() from part b1.
 */

/* ---------- 1. The two columns and the trigger ---------- */

alter table public.stories
  add column title_hidden_at timestamptz,
  add column cover_hidden_at timestamptz;

comment on column public.stories.title_hidden_at is
  'When staff hid the title on public screens (S1-E11-08); null while it shows. Cleared when the writer changes the title.';
comment on column public.stories.cover_hidden_at is
  'When staff hid the cover (S1-E11-08); readers see the automatic cover meanwhile. Cleared when the writer picks another cover.';

/**
 * stories_clear_hidden_presentation: a trigger function. When the writer changes the title, a
 * hidden title shows again; when they pick another cover (another kind, design, colours or
 * picture), a hidden cover shows again. S1-E11-08: the title stays hidden "until the writer changes
 * it", and staff never write a new one. Staff changes don't touch the title or cover, so they never
 * clear it.
 * Returns: the new row. Called by the trigger stories_clear_hidden_presentation (before update).
 */
create or replace function public.stories_clear_hidden_presentation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Step 1: a new title (more than a change of spaces at either end) shows again.
  if btrim(new.title) is distinct from btrim(old.title) then
    new.title_hidden_at := null;
  end if;
  -- Step 2: another cover shows again.
  if (new.cover_kind, new.cover_design, new.cover_background, new.cover_accent, new.cover_tall_path)
     is distinct from
     (old.cover_kind, old.cover_design, old.cover_background, old.cover_accent, old.cover_tall_path) then
    new.cover_hidden_at := null;
  end if;
  return new;
end;
$$;
comment on function public.stories_clear_hidden_presentation() is
  'Trigger: a hidden title or cover shows again once the writer changes it (S1-E11-08).';

create trigger stories_clear_hidden_presentation
  before update of title, cover_kind, cover_design, cover_background, cover_accent, cover_tall_path
  on public.stories
  for each row execute function public.stories_clear_hidden_presentation();

/* ---------- 2. The marker, in each language ---------- */

-- The words readers see instead of a hidden title, in the story's own language, as for a removed
-- passage (part b2). In the settings, not in code, so a new language needs no release (rule 4).
insert into public.settings (key, value, is_public, description) values
  ('hidden_title_marker',
   jsonb_build_object('ro', 'Titlu ascuns de echipa de moderare', 'en', 'Title hidden by the moderation team'),
   false,
   'The words readers see instead of a title staff hid, by story language; English when the story''s language has none (S1-E11-08).')
on conflict (key) do nothing;

/**
 * hidden_title_marker: the words for a hidden title in a story's language.
 * Input: language_code. Returns: text; the English words when the language has none.
 * Internal: story_as_shown().
 */
create or replace function public.hidden_title_marker(language_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    public.setting_value('hidden_title_marker') ->> language_code,
    public.setting_value('hidden_title_marker') ->> 'en',
    'Title hidden by the moderation team');
$$;
comment on function public.hidden_title_marker(text) is
  'Internal: the words readers see instead of a hidden title, in the story''s language (S1-E11-08).';
revoke execute on function public.hidden_title_marker(text) from public, anon, authenticated;

/* ---------- 3. A story as readers see it ---------- */

/**
 * story_as_shown: one story as the caller may see it. When staff hid the title, readers get the
 *   marker in the story's language; when staff hid the cover, readers get the automatic cover
 *   (S1-E3-13), which draws the title readers see. The writer and staff with the Stories area see
 *   the real title and cover, as they see a hidden story (S1-E10-06).
 * Input: target, a stories row. Returns: the row, changed only in memory (never saved).
 * Internal: every public read of a story's title or cover (see the file header).
 */
create or replace function public.story_as_shown(target public.stories)
returns public.stories
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Step 1: nothing hidden, nothing to change (the common case, so it is checked first).
  if target.title_hidden_at is null and target.cover_hidden_at is null then
    return target;
  end if;
  -- Step 2: the writer and staff who may open stories see what is really there.
  if target.user_id = (select auth.uid()) or public.staff_may('stories', 'view') then
    return target;
  end if;
  -- Step 3: the marker instead of the title.
  if target.title_hidden_at is not null then
    target.title := public.hidden_title_marker(target.language_code);
  end if;
  -- Step 4: the automatic cover instead of the writer's.
  if target.cover_hidden_at is not null then
    target.cover_kind := 'automatic';
    target.cover_design := null;
    target.cover_background := null;
    target.cover_accent := null;
    target.cover_tall_path := null;
    target.cover_square_path := null;
  end if;
  return target;
end;
$$;
comment on function public.story_as_shown(public.stories) is
  'Internal: a story with a hidden title or cover masked, unless the caller is its writer or staff (S1-E11-08).';
revoke execute on function public.story_as_shown(public.stories) from public, anon, authenticated;

/* ---------- 4. Lists and the reader read the story as shown ---------- */

/**
 * listed_stories: as in ADMIN-2b1, with each story as shown (story_as_shown()), so no list shows a
 *   hidden title or cover (S1-E11-08).
 */
create or replace function public.listed_stories(
  list_kind text, list_key text, category_slug text, completion public.completion_status, language text
)
returns setof public.stories
language sql
stable
security definer
set search_path = ''
as $$
  select (public.story_as_shown(stories)).* from public.stories
  join public.categories on categories.id = stories.category_id
  where stories.deleted_at is null
    and public.story_has_readable_chapter(stories.id)
    and not public.is_moderated_away('story', stories.id)
    -- S1-E8-11: a class-only story is in no public list, only on its class's page.
    and (not stories.class_only or stories.user_id = (select auth.uid()))
    -- S1-E11-08: a restricted story still opens, but no list promotes it.
    and (list_kind in ('library', 'reader_library', 'writer')
         or stories.user_id = (select auth.uid())
         or not public.is_story_restricted(stories.id))
    and (
      stories.user_id = (select auth.uid())
      or (public.rating_allows(stories.rating) and not public.is_blocked_with(stories.user_id))
    )
    and (category_slug is null or categories.slug = category_slug)
    and (completion is null or stories.completion_status = completion)
    and (language is null or stories.language_code = language)
    and public.list_holds_story(stories, list_kind, list_key);
$$;

/**
 * reader_visible_story: as in CLASSES-c, with the story as shown (story_as_shown()), so the reader,
 *   the chapter page and everything built on them show the marker for a hidden title (S1-E11-08).
 */
create or replace function public.reader_visible_story(story_slug text)
returns setof public.stories
language sql
stable
security definer
set search_path = ''
as $$
  select (public.story_as_shown(stories)).* from public.stories
  where stories.slug = story_slug
    and stories.deleted_at is null
    and not public.is_moderated_away('story', stories.id)
    -- S1-E8-11: a story shared only with a class opens only for its writer and that class.
    and public.story_class_allows(stories.class_only, stories.class_space_id, stories.user_id)
    and (
      stories.user_id = (select auth.uid())
      or (public.rating_allows(stories.rating) and not public.is_blocked_with(stories.user_id))
    );
$$;

/**
 * story_cover_picture: as in CLASSES-c, plus: a cover staff hid is shown only to its writer and to
 *   staff with the Stories area; everyone else gets null and draws the automatic cover (S1-E11-08).
 */
create or replace function public.story_cover_picture(story_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.picture_state_json(picture_checks)
  from public.stories
  join public.picture_checks on picture_checks.bucket = 'covers' and picture_checks.path = stories.cover_tall_path
  where stories.slug = story_slug and stories.cover_kind = 'upload' and stories.deleted_at is null
    and (stories.user_id = (select auth.uid())
         or (stories.first_published_at is not null and public.rating_allows(stories.rating)
             -- S1-E8-11: a class-only story's cover shows only to that class.
             and public.story_class_allows(stories.class_only, stories.class_space_id, stories.user_id)
             -- S1-E11-08: a hidden cover shows only to staff who may open stories.
             and (stories.cover_hidden_at is null or public.staff_may('stories', 'view'))));
$$;

/**
 * picture_is_visible: as in S1-E10-05, plus: an uploaded cover staff hid isn't served to readers
 *   from Storage either (S1-E11-08). Its writer and staff still see it through the policy
 *   pictures_select_uploader_and_staff.
 */
create or replace function public.picture_is_visible(bucket text, path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.picture_checks
    where picture_checks.bucket = picture_is_visible.bucket and picture_checks.path = picture_is_visible.path
      and picture_checks.status in ('passed', 'approved')
      and picture_checks.deleted_at is null
      and not public.is_moderated_away('picture', picture_checks.id))
    and not exists (
      select 1 from public.stories
      where picture_is_visible.bucket = 'covers'
        and picture_is_visible.path in (stories.cover_tall_path, stories.cover_square_path)
        and stories.cover_hidden_at is not null);
$$;

/* ---------- 5. Cards, pages and previews show the story as shown ---------- */

/**
 * story_card_json: as before, with the story as shown (story_as_shown(); S1-E11-08).
 */
create or replace function public.story_card_json(target_story_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'id', stories.id,
    'slug', stories.slug,
    'title', stories.title,
    'blurb', stories.blurb,
    'writer', jsonb_build_object(
      'handle', profiles.handle,
      'display_name', public.story_writer_name(stories.id, profiles.handle, profiles.pen_name),
      'classic_author', public.story_classic_author(stories.id)),
    'category_slug', categories.slug,
    'language_code', stories.language_code,
    'completion_status', stories.completion_status,
    'rating', stories.rating,
    'cover', jsonb_build_object('kind', stories.cover_kind, 'design', stories.cover_design,
      'background', stories.cover_background, 'accent', stories.cover_accent),
    'chapter_count', (select count(*) from public.chapters
      where chapters.story_id = stories.id and public.chapter_is_readable(chapters.id)),
    'last_chapter_published_at', stories.last_chapter_published_at)
  -- S1-E11-08: the story as the caller may see it (a hidden title or cover masked).
  from (select (public.story_as_shown(raw)).* from public.stories as raw
        where raw.id = target_story_id) as stories
  join public.profiles on profiles.id = stories.user_id
  join public.categories on categories.id = stories.category_id
  where stories.id = target_story_id;
$function$;

/**
 * get_story_page: as before, with the story as shown (story_as_shown(); S1-E11-08).
 */
create or replace function public.get_story_page(story_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    'chapters', public.story_page_chapters(story.id, is_owner),
    'is_owner', is_owner,
    'stats', jsonb_build_object(
      'likes', public.story_like_total(story.id),
      'comments', public.story_comment_total(story.id))
  );
end;
$function$;

/**
 * get_link_preview: as before, with the story as shown (story_as_shown(); S1-E11-08).
 */
create or replace function public.get_link_preview(story_slug text, chapter_code text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  story public.stories;
  chapter public.chapters;
  hides_text boolean;
  chapter_part jsonb;
begin
  -- Step 1: a live story with at least one chapter published once, not hidden by a moderator.
  select * into story from public.stories
  where stories.slug = story_slug and stories.deleted_at is null and stories.first_published_at is not null;
  if not found or public.is_moderated_away('story', story.id) then
    return null;
  end if;
  -- S1-E11-08: a link preview never shows a hidden title or cover.
  story := public.story_as_shown(story);
  -- Step 2: 16+ and 18+ show nothing beyond the title to visitors who aren't logged in (Q6).
  hides_text := story.rating in ('16_plus', '18_plus');
  -- Step 3: the chapter, when the address names one; it must be readable.
  if chapter_code is not null then
    select * into chapter from public.chapters
    where chapters.code = chapter_code and chapters.story_id = story.id;
    if not found or not public.chapter_is_readable(chapter.id) then
      return null;
    end if;
    chapter_part := jsonb_build_object('code', chapter.code,
      'title', case when hides_text then null else chapter.published_title end);
  end if;
  -- Step 4: the preview, with the writer's pen name or username and never the user ID.
  return jsonb_build_object(
    'slug', story.slug,
    'title', story.title,
    'rating', story.rating,
    'language_code', story.language_code,
    'hides_text', hides_text,
    'blurb', case when hides_text then null else story.blurb end,
    'writer', case when hides_text then null else (
      select jsonb_build_object(
        'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name))
      from public.profiles where profiles.id = story.user_id) end,
    'cover', case when hides_text then null else jsonb_build_object(
      'kind', story.cover_kind, 'design', story.cover_design,
      'background', story.cover_background, 'accent', story.cover_accent) end,
    'chapter', chapter_part);
end;
$function$;

/**
 * profile_story_cards: as before, with each story as shown (story_as_shown(); S1-E11-08).
 */
create or replace function public.profile_story_cards(writer_id uuid, is_owner boolean)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', stories.id,
      'slug', stories.slug,
      'title', stories.title,
      'blurb', stories.blurb,
      'category_slug', categories.slug,
      'completion_status', stories.completion_status,
      'rating', stories.rating,
      'cover', jsonb_build_object('kind', stories.cover_kind, 'design', stories.cover_design,
        'background', stories.cover_background, 'accent', stories.cover_accent),
      'chapter_count', (select count(*) from public.chapters
        where chapters.story_id = stories.id and public.chapter_is_readable(chapters.id)),
      'last_chapter_published_at', stories.last_chapter_published_at
    ) order by stories.last_chapter_published_at desc nulls last, stories.title), '[]'::jsonb)
  -- S1-E11-08: each story as the caller may see it (a hidden title or cover masked).
  from (select (public.story_as_shown(raw)).* from public.stories as raw
        where raw.user_id = writer_id) as stories
  join public.categories on categories.id = stories.category_id
  where stories.user_id = writer_id
    and stories.deleted_at is null
    and public.story_has_readable_chapter(stories.id)
    and not public.is_moderated_away('story', stories.id)
    and (is_owner or public.rating_allows(stories.rating))
    -- S1-E8-11: a class-only story isn't on the writer's public profile.
    and (is_owner or not stories.class_only);
$function$;

/**
 * export_library_of: as before, with each story as shown (story_as_shown(); S1-E11-08).
 */
create or replace function public.export_library_of(owner_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object(
      'shelf', library_entries.shelf,
      'title', stories.title,
      'writer', public.display_name(profiles.handle, profiles.pen_name),
      -- The address only while the story is there to read; the browser makes it a full link.
      'path', case when exists (select 1 from public.reader_visible_story(stories.slug))
                   then '/s/' || stories.slug end,
      'added_at', library_entries.created_at,
      'moved_at', library_entries.updated_at)
    order by library_entries.shelf, library_entries.created_at), '[]'::jsonb)
  from public.library_entries
  -- S1-E11-08: a hidden title is exported as readers see it.
  join lateral (select (public.story_as_shown(raw)).* from public.stories as raw
                where raw.id = library_entries.story_id) as stories on true
  join public.profiles on profiles.id = stories.user_id
  where library_entries.user_id = owner_id;
$function$;

/**
 * public_plan_json: as before, with the title as shown (story_as_shown(); S1-E11-08).
 */
create or replace function public.public_plan_json(target_story_id uuid, as_preview boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  areas text[];
begin
  -- Step 1: the areas the writer made public, in the settings' order.
  select array(select area from unnest(public.plan_area_names()) as area
               where area = any (story_plans.public_areas))
    into areas
  from public.story_plans where story_plans.story_id = target_story_id;
  areas := coalesce(areas, '{}');
  -- Step 2: each area's items that show.
  return (select jsonb_build_object(
    'story', jsonb_build_object('slug', stories.slug, 'title', (public.story_as_shown(stories)).title),
    'areas', to_jsonb(areas),
    'characters', public.public_plan_characters(stories.id, areas, as_preview),
    'fields', public.public_plan_fields(stories.id, areas, as_preview),
    'relationships', public.public_plan_relationships(stories.id, areas, as_preview),
    'sections', public.public_plan_bible(stories.id, areas, as_preview),
    'events', public.public_plan_events(stories.id, areas, as_preview),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object('code', chapters.code, 'title', chapters.published_title)
        order by chapters.position)
      from public.chapters
      where chapters.story_id = stories.id and public.chapter_is_readable(chapters.id)), '[]'::jsonb))
    from public.stories where stories.id = target_story_id);
end;
$function$;

/**
 * story_search_text: as before, without a title staff hid (S1-E11-08).
 */
create or replace function public.story_search_text(target_story_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select public.search_fold(concat_ws(' ',
    -- S1-E11-08: a hidden title can't be searched for.
    case when stories.title_hidden_at is null then stories.title end, stories.blurb, profiles.handle, profiles.pen_name,
    public.story_classic_author(stories.id) ->> 'name',
    (select string_agg(concat_ws(' ', tags.name,
        (select string_agg(tag_names.name, ' ') from public.tag_names where tag_names.tag_id = tags.id)), ' ')
     from public.story_tags join public.tags on tags.id = story_tags.tag_id
     where story_tags.story_id = stories.id and tags.status = 'approved')))
  from public.stories join public.profiles on profiles.id = stories.user_id
  where stories.id = target_story_id;
$function$;

/**
 * notification_json: as in ADMIN-2b1, with the story's title as shown (story_as_shown(); S1-E11-08).
 */
create or replace function public.notification_json(target public.notifications)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', target.id,
    'kind', target.kind,
    'category', public.notification_category(target.kind),
    'actors', coalesce((
      select jsonb_agg(jsonb_build_object('handle', profiles.handle,
          'display_name', public.display_name(profiles.handle, profiles.pen_name)) order by actor.position)
      from (select listed.id, listed.position
            from unnest(target.actor_user_ids) with ordinality as listed(id, position)
            where not public.is_blocked_with(listed.id)
            order by listed.position limit 2) as actor
      join public.profiles on profiles.id = actor.id), '[]'::jsonb),
    'actor_count', target.actor_count - (select count(*)::integer from unnest(target.actor_user_ids) as listed(id)
      where public.is_blocked_with(listed.id)),
    -- ADMIN-2b3: the title as the recipient may see it (S1-E11-08).
    'story', (select jsonb_build_object('slug', stories.slug, 'title', (public.story_as_shown(stories)).title)
              from public.stories where stories.id = target.story_id),
    'chapter', (select jsonb_build_object('code', chapters.code, 'title', chapters.published_title,
                  'position', chapters.position)
                from public.chapters where chapters.id = target.chapter_id),
    'comment_excerpt', (select left(comments.body, 140) from public.comments
                        where comments.id = target.comment_id and target.kind <> 'comment_reactions'
                          and comments.deleted_at is null
                          and not public.is_moderated_away('comment', comments.id)),
    -- IDEAS-1e: the paragraph a comment is on today (a number), "earlier" when the writer has
    -- since changed it, or null for a comment on the whole chapter; the link opens its thread.
    'comment_place', (select public.comment_paragraph_json(comments, chapters.published_body)
                      from public.comments join public.chapters on chapters.id = comments.chapter_id
                      where comments.id = target.comment_id
                        and target.kind in ('comment_on_chapter', 'comment_reply', 'comment_reactions')
                        and comments.deleted_at is null
                        and not public.is_moderated_away('comment', comments.id)),
    'decision', case when target.kind = 'moderation_decision' then target.decision end,
    'outcome', case when target.kind = 'report_outcome' then public.report_outcome_of(target.decision) end,
    'statement', (select jsonb_build_object('reference', statements_of_reasons.reference,
                    'action', statements_of_reasons.action)
                  from public.statements_of_reasons where statements_of_reasons.id = target.statement_id),
    'item', case when target.case_id is not null and target.kind = 'moderation_decision'
                 then public.notification_item_json(target.case_id) end,
    'report_reference', case when target.kind = 'report_outcome'
                 then (select reports.reference from public.reports
                       where reports.case_id = target.case_id and reports.user_id = target.user_id
                       order by reports.created_at limit 1) end,
    'appeal', (select jsonb_build_object('reference', appeals.reference, 'outcome', appeals.status,
                 'statement_reference', statements_of_reasons.reference)
               from public.appeals join public.statements_of_reasons on statements_of_reasons.id = appeals.statement_id
               where appeals.id = target.appeal_id),
    'mail', (select jsonb_build_object('reference', moderator_mail_threads.reference,
               'subject', moderator_mail_threads.subject)
             from public.moderator_mail_threads where moderator_mail_threads.id = target.mail_thread_id),
    -- FORUMS-2c: the space a join request or approval is about, while the reader may see it.
    'space', (select jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
              from public.spaces where spaces.id = target.space_id and spaces.deleted_at is null
                and public.space_card_visible(spaces)),
    -- FORUMS-2d: what a moderator asked the person to change, why, and by when.
    'change_request', (select jsonb_build_object('item', requests.item, 'reason', requests.reason,
                         'due_at', requests.due_at, 'is_open', requests.resolved_at is null,
                         'space', (select jsonb_build_object('slug', spaces.slug, 'name', spaces.name)
                                   from public.spaces where spaces.id = requests.space_id))
                       from public.customisation_change_requests as requests
                       where requests.id = target.change_request_id),
    -- ADMIN-2b1: what staff changed about the writer's story, and why (S1-E11-08 criterion 4).
    'staff_change', case when target.kind = 'story_changed_by_staff'
                      then public.notification_staff_change_json(target.story_revision_id) end,
    'is_required', target.is_required,
    'is_read', target.read_at is not null,
    'at', target.updated_at);
$$;


-- Storage asks picture_is_visible() for every cover it serves; hidden covers are few, so a
-- partial index keeps that check cheap.
create index stories_hidden_cover_paths on public.stories (cover_tall_path, cover_square_path)
  where cover_hidden_at is not null;

/* ---------- 6. Staff hide or show the title or the cover ---------- */

-- A version can now record a hidden or shown title or cover.
alter table public.story_revisions
  drop constraint story_revisions_change_kind_is_known,
  add constraint story_revisions_change_kind_is_known
    check (change_kind in ('settings', 'visibility', 'chapter_visibility', 'passage', 'presentation'));

/**
 * admin_story_part_state: whether a story's title or cover shows or is hidden.
 * Input: story_row, story_part ('title' or 'cover'). Returns: 'shown' or 'hidden'.
 * Internal: admin_set_story_presentation().
 */
create or replace function public.admin_story_part_state(story_row public.stories, story_part text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when story_part = 'title' and story_row.title_hidden_at is not null then 'hidden'
    when story_part = 'cover' and story_row.cover_hidden_at is not null then 'hidden'
    else 'shown'
  end;
$$;
comment on function public.admin_story_part_state(public.stories, text) is
  'Internal: whether a story''s title or cover shows or is hidden (S1-E11-08).';
revoke execute on function public.admin_story_part_state(public.stories, text) from public, anon, authenticated;

/**
 * admin_set_story_presentation: staff hide a story's title or cover, or show it again, with a
 *   reason (S1-E11-08 criterion "hide the cover or the title"). A hidden title shows readers
 *   "Title hidden by the moderation team" in the story's language and a hidden cover shows the
 *   automatic cover, until the writer changes it; staff never write a new title.
 * Input: target_story_id; story_part, 'title' or 'cover'; wanted_state, 'shown' or 'hidden'; the
 *   reason (a code from the list and a few words).
 * Returns: the new story_revisions id.
 * Errors: as admin_story_change_target(); check_violation with hint bad_part or bad_visibility for
 *   anything else, no_cover when staff hide an automatic cover (there is nothing to hide), or
 *   nothing_changed when it is already so.
 * Hiding sends the writer a statement of reasons (title_hidden or cover_hidden; DSA art. 17);
 *   showing again sends a notification.
 * Where it fits: StaffStoryPresentationForm → useChangeStaffStory → api/staffStoryChanges.ts → here.
 */
create or replace function public.admin_set_story_presentation(
  target_story_id uuid, story_part text, wanted_state text, reason_code text, reason_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  story_row public.stories := public.admin_story_change_target(target_story_id, reason_code, reason_text);
  current_state text;
  hidden_at timestamptz := case when wanted_state = 'hidden' then now() end;
begin
  -- Step 1: a part and a state staff may set here.
  if story_part is null or story_part not in ('title', 'cover') then
    raise exception 'Pick the title or the cover.' using errcode = 'check_violation', hint = 'bad_part';
  end if;
  if wanted_state is null or wanted_state not in ('shown', 'hidden') then
    raise exception 'Pick shown or hidden.' using errcode = 'check_violation', hint = 'bad_visibility';
  end if;
  current_state := public.admin_story_part_state(story_row, story_part);
  if current_state = wanted_state then
    raise exception 'Nothing changed.' using errcode = 'check_violation', hint = 'nothing_changed';
  end if;
  -- An automatic cover is what readers would see anyway (S1-E3-13).
  if story_part = 'cover' and wanted_state = 'hidden' and story_row.cover_kind = 'automatic' then
    raise exception 'The story already shows the automatic cover.' using errcode = 'check_violation', hint = 'no_cover';
  end if;
  -- Step 2: hide or show it. The writer's title and cover stay exactly as they wrote them.
  if story_part = 'title' then
    update public.stories set title_hidden_at = hidden_at where stories.id = story_row.id;
  else
    update public.stories set cover_hidden_at = hidden_at where stories.id = story_row.id;
  end if;
  -- Step 3: the version, the audit log and the writer's statement (hidden) or notification (shown).
  return public.admin_record_story_change(story_row, null, 'presentation', reason_code, reason_text,
    jsonb_build_object(story_part, current_state), jsonb_build_object(story_part, wanted_state),
    case when wanted_state = 'hidden' then (story_part || '_hidden')::public.statement_action end);
end;
$$;
comment on function public.admin_set_story_presentation(uuid, text, text, text, text) is
  'Staff hide or show a story''s title or cover with a reason; versioned, audited, the writer told (S1-E11-08).';
revoke execute on function public.admin_set_story_presentation(uuid, text, text, text, text) from public, anon;
grant execute on function public.admin_set_story_presentation(uuid, text, text, text, text) to authenticated;

/* ---------- 7. Restore, and the overview ---------- */

/**
 * admin_restore_story_revision: as in ADMIN-2b2, plus a hidden or shown title or cover goes back
 *   to how it was ('presentation').
 */
create or replace function public.admin_restore_story_revision(
  target_revision_id uuid, reason_code text, reason_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  earlier public.story_revisions;
  story_row public.stories;
  revision_id uuid;
  story_part text;
begin
  -- Step 1: the version, read as the server (support may read it too, but not restore it).
  select * into earlier from public.story_revisions where story_revisions.id = target_revision_id;
  -- A missing version has no story, so the shared checks answer no_such_story.
  story_row := public.admin_story_change_target(earlier.story_id, reason_code, reason_text);
  -- Step 2: each kind of change goes back its own way.
  if earlier.change_kind = 'settings' then
    revision_id := (public.admin_change_story_settings(story_row.id, earlier.before_values,
      reason_code, reason_text) ->> 'revision_id')::uuid;
  elsif earlier.change_kind = 'visibility' then
    revision_id := public.admin_set_story_visibility(story_row.id,
      earlier.before_values ->> 'visibility', reason_code, reason_text);
  elsif earlier.change_kind = 'chapter_visibility' then
    revision_id := public.admin_set_chapter_visibility(earlier.chapter_id,
      earlier.before_values ->> 'visibility', reason_code, reason_text);
  elsif earlier.change_kind = 'presentation' then
    -- The version holds one key, 'title' or 'cover', with the state before the change.
    story_part := (select key from jsonb_object_keys(earlier.before_values) as key limit 1);
    revision_id := public.admin_set_story_presentation(story_row.id, story_part,
      earlier.before_values ->> story_part, reason_code, reason_text);
  elsif earlier.after_values ->> 'passage' = 'removed' then
    revision_id := public.admin_put_back_passage(story_row, earlier, reason_code, reason_text);
  else
    raise exception 'These words are already back.' using errcode = 'check_violation', hint = 'cannot_restore';
  end if;
  -- Step 3: the new version says which change it undid.
  update public.story_revisions set restores_revision_id = earlier.id where story_revisions.id = revision_id;
  return revision_id;
end;
$$;

/**
 * admin_story_cover_json: a story's cover as the staff page draws it: the kind, the drawn design
 *   and colours, and whether staff hid it. An uploaded picture is read separately, through
 *   story_cover_picture(), which staff may see even while hidden.
 * Input: story_row. Returns: jsonb. Internal: admin_story_overview().
 */
create or replace function public.admin_story_cover_json(story_row public.stories)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('kind', story_row.cover_kind, 'design', story_row.cover_design,
    'background', story_row.cover_background, 'accent', story_row.cover_accent);
$$;
comment on function public.admin_story_cover_json(public.stories) is
  'Internal: a story''s cover for the staff page (S1-E11-08).';
revoke execute on function public.admin_story_cover_json(public.stories) from public, anon, authenticated;

/**
 * admin_story_overview: as in ADMIN-2b2, plus the slug, the cover and whether staff hid the title or
 *   the cover, so screen 8.11 shows the cover (S1-E11-08 criterion 1) and offers Hide or Show.
 * Input: target_story_id. Returns: JSON, never chapter text, a year of birth or an email.
 * Errors: insufficient_privilege (hint not_allowed) unless the caller may view Stories;
 *   check_violation (hint no_such_story) when there is no such story.
 * Where it fits: /staff/stories/:storyId → useStaffStory → api/staffStories.ts → here.
 */
create or replace function public.admin_story_overview(target_story_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  story_row public.stories;
begin
  -- Step 1: the same staff as the list.
  if not public.staff_may('stories', 'view') then
    raise exception 'Only staff with the Stories area can open a story.'
      using errcode = 'insufficient_privilege', hint = 'not_allowed';
  end if;
  -- Step 2: the story, even one its writer deleted (staff may need it for a case).
  select * into story_row from public.stories where stories.id = target_story_id;
  if not found then
    raise exception 'There is no such story.' using errcode = 'check_violation', hint = 'no_such_story';
  end if;
  -- Step 3: the details, the cover, the settings, the chapter list and the history, never the words.
  return public.admin_story_row(story_row) || jsonb_build_object(
    'slug', story_row.slug,
    'blurb', story_row.blurb,
    'cover', public.admin_story_cover_json(story_row),
    'title_hidden', story_row.title_hidden_at is not null,
    'cover_hidden', story_row.cover_hidden_at is not null,
    'created_at', story_row.created_at,
    'first_published_at', story_row.first_published_at,
    'deleted_at', story_row.deleted_at,
    'comments_enabled', story_row.comments_enabled,
    'settings', public.admin_story_settings_json(story_row),
    'visibility', public.admin_story_visibility(story_row.id),
    'can_change', public.staff_may('story_changes', 'act'),
    'history', public.admin_story_history_json(story_row.id),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', chapters.id,
          'number', chapters.position,
          'title', case when chapters.status = 'published' then chapters.published_title end,
          'status', chapters.status,
          'is_hidden', public.is_moderated_away('chapter', chapters.id),
          'moderated_state', public.moderated_state_of('chapter', chapters.id),
          'has_published_text', chapters.published_body is not null,
          'words', coalesce(chapters.published_word_count, 0),
          'published_at', chapters.last_published_at,
          'updated_at', chapters.updated_at)
        order by chapters.position)
      from public.chapters
      where chapters.story_id = story_row.id and chapters.deleted_at is null), '[]'::jsonb));
end;
$$;
