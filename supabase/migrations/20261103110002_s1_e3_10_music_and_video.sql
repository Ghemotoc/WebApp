/*
 * Migration: music and video cards in chapters (story S1-E3-10; board 4.3 Editor, the Insert menu
 * and the video card; board 3.5 Reader, the card before and after play; ADR 0008).
 *
 * How a card travels:
 *   1. the writer picks Insert › Music or Insert › Video and pastes a link; only Spotify, Apple
 *      Music, YouTube, Vimeo and Loom are accepted (criterion 1, src/lib/embed-links.ts);
 *   2. our server (/api/embed, server/embeds.ts) reads the link, asks the service's oEmbed for the
 *      title, and calls register_chapter_embed() with the writer's own sign-in; the row keeps the
 *      service and the "media path" (what names the song or video), never a player address, so a
 *      card can only play from that service's own player;
 *   3. the chapter text holds `![title](embed:<card ID>)`; save_chapter_draft() refuses a card that
 *      isn't the writer's own, and more than chapter_max_embeds;
 *   4. get_chapter() sends each card's service, media path and title with the text; nothing loads
 *      from the service until the reader presses play (criteria 2 and 3, ChapterEmbed);
 *   5. a reader reports a card from its Report button; a moderator can remove that one card
 *      (moderated_items, S1-E10-06) and the chapter stays up (criterion 4).
 * What it adds: the media_embeds flag (off until the privacy notice mentions the cards; GO-LIVE),
 *   the settings chapter_max_embeds and the embed_add rate limit, the chapter_embeds table and its
 *   policies, register_chapter_embed(), chapter_embed_references(), check_chapter_embeds(),
 *   chapter_embed_states(), my_embeds(), admin_case_embed(), and new versions of count_words(),
 *   save_chapter_draft(), get_chapter() and the shared reporting and notification functions that
 *   know about cards.
 */

/* ---------- The switch and the settings ---------- */

insert into public.feature_flags (key, is_enabled, is_public, description) values
  ('media_embeds', false, true,
   'Music and video cards in chapters (S1-E3-10). Off until the privacy notice mentions them (GO-LIVE).')
on conflict (key) do nothing;

insert into public.settings (key, value, is_public, description) values
  ('chapter_max_embeds', '10'::jsonb, true,
   'The most music and video cards one chapter may hold (S1-E3-10; proposal).')
on conflict (key) do nothing;

-- The hourly limit for adding cards (S1-E10-12): each one makes our server call another service.
update public.settings
set value = value || '{"embed_add": {"new_account": 10, "older_account": 40}}'::jsonb
where key = 'rate_limits' and not (value ? 'embed_add');

/* ---------- The table ---------- */

create table public.chapter_embeds (
  id uuid primary key default gen_random_uuid(),
  -- The writer who added it (CLAUDE.md rule 15); never shown publicly.
  user_id uuid not null references public.profiles (id),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  service public.embed_service not null,
  -- What names the song or video on the service (src/lib/embed-links.ts); the player host is
  -- fixed per service in the app, so this can never point a player anywhere else.
  media_path text not null,
  -- The link in its clean form, for moderators (the case page) and for oEmbed.
  source_url text not null,
  -- From the service's oEmbed answer, fetched by our server; null when the service has none.
  title text,
  author_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint chapter_embeds_title_length check (char_length(title) <= 200),
  constraint chapter_embeds_author_name_length check (char_length(author_name) <= 200),
  -- The same shapes as src/lib/embed-links.ts: nothing else can be stored.
  constraint chapter_embeds_media_path_shape check (
    (service = 'youtube' and media_path ~ '^[A-Za-z0-9_-]{11}$')
    or (service = 'vimeo' and media_path ~ '^[0-9]{1,12}(\?h=[0-9a-f]{6,20})?$')
    or (service = 'loom' and media_path ~ '^[0-9a-f]{32}$')
    or (service = 'spotify' and media_path ~ '^(track|album|playlist|episode|show|artist)/[A-Za-z0-9]{22}$')
    or (service = 'apple_music' and media_path ~
        '^[a-z]{2}/(album|playlist|song|music-video)/[a-z0-9-]{1,120}/(pl\.)?[A-Za-z0-9-]{1,64}(\?i=[0-9]{1,20})?$')
  ),
  constraint chapter_embeds_source_url_host check (
    (service = 'youtube' and source_url ~ '^https://www\.youtube\.com/watch\?v=')
    or (service = 'vimeo' and source_url ~ '^https://vimeo\.com/')
    or (service = 'loom' and source_url ~ '^https://www\.loom\.com/share/')
    or (service = 'spotify' and source_url ~ '^https://open\.spotify\.com/')
    or (service = 'apple_music' and source_url ~ '^https://music\.apple\.com/')
  )
);

comment on table public.chapter_embeds is
  'kind: user_content; reportable: embed
One row per music or video card a writer added to a chapter: the service and what to play, never a player address (S1-E3-10).';
comment on column public.chapter_embeds.user_id is
  'The writer''s user ID; never shown publicly (rule 15).';
comment on column public.chapter_embeds.media_path is
  'What names the song or video on its service; the app fixes the player host per service (ADR 0008).';

create index chapter_embeds_chapter_id_idx on public.chapter_embeds (chapter_id);
create index chapter_embeds_user_id_idx on public.chapter_embeds (user_id);

create trigger chapter_embeds_set_updated_at
  before update on public.chapter_embeds
  for each row execute function public.set_updated_at();

create trigger chapter_embeds_refuse_user_id_change
  before update on public.chapter_embeds
  for each row execute function public.refuse_user_id_change('user_id');

alter table public.chapter_embeds enable row level security;

-- Readers get cards only through get_chapter(); writes only through register_chapter_embed().
grant select on public.chapter_embeds to authenticated;

/**
 * chapter_embeds_select_own: the writer reads their own cards (the editor shows them).
 */
create policy chapter_embeds_select_own
  on public.chapter_embeds for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy chapter_embeds_select_own on public.chapter_embeds is
  'Allows the writer to read their own music and video cards, for the editor (S1-E3-10).';

/**
 * chapter_embeds_select_moderation: moderation staff read every card, so a reported one can be
 * judged from its link (criterion 4).
 */
create policy chapter_embeds_select_moderation
  on public.chapter_embeds for select to authenticated
  using ((select public.staff_may('moderation', 'view')));

comment on policy chapter_embeds_select_moderation on public.chapter_embeds is
  'Allows moderation staff to read every music and video card, to judge a report (S1-E3-10 criterion 4).';

/* ---------- Adding a card ---------- */

/**
 * register_chapter_embed: records a card the writer is adding to one of their chapters.
 * Called by our server (/api/embed) with the writer's own sign-in, after it read the link and
 * fetched the oEmbed title (criterion 1).
 * Inputs: target_chapter_id; the service and media path read from the link; the clean link; the
 *   oEmbed title and author name (null when the service gave none).
 * Returns: the card's ID, which the editor puts in the text.
 * Errors: insufficient_privilege when signed out or the account may not write;
 *   feature_not_supported while media_embeds is off; check_violation when the chapter isn't the
 *   caller's, or the link's shape is wrong (the table's checks); program_limit_exceeded over the
 *   hourly limit (S1-E10-12).
 */
create or replace function public.register_chapter_embed(
  target_chapter_id uuid,
  embed_service public.embed_service,
  embed_media_path text,
  embed_source_url text,
  embed_title text,
  embed_author_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  new_id uuid;
begin
  -- Step 1: a member who may write, while cards are on.
  if caller_id is null or not public.is_active_member() then
    raise exception 'Your account can''t add music or videos right now.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_feature_enabled('media_embeds') then
    raise exception 'Music and video cards are switched off.' using errcode = 'feature_not_supported';
  end if;
  -- Step 2: one of the caller's own live chapters.
  if not exists (select 1 from public.chapters where chapters.id = target_chapter_id
                 and chapters.user_id = caller_id and chapters.deleted_at is null) then
    raise exception 'That chapter isn''t one of yours.' using errcode = 'check_violation';
  end if;
  -- Step 3: the hourly limit, then the row (the table's checks refuse any other shape).
  perform public.take_rate_limit('embed_add');
  insert into public.chapter_embeds (user_id, chapter_id, service, media_path, source_url, title, author_name)
  values (caller_id, target_chapter_id, embed_service, embed_media_path, embed_source_url,
          nullif(left(btrim(coalesce(embed_title, '')), 200), ''),
          nullif(left(btrim(coalesce(embed_author_name, '')), 200), ''))
  returning id into new_id;
  return new_id;
end;
$$;

comment on function public.register_chapter_embed(uuid, public.embed_service, text, text, text, text) is
  'Records a music or video card for one of the caller''s chapters; called by /api/embed (S1-E3-10).';
revoke execute on function public.register_chapter_embed(uuid, public.embed_service, text, text, text, text) from public, anon;
grant execute on function public.register_chapter_embed(uuid, public.embed_service, text, text, text, text) to authenticated;

/* ---------- Cards inside the chapter text ---------- */

/**
 * chapter_embed_references: every card in a chapter body, in order.
 * Input: the body (a card is `![title](embed:<ID>)`, src/lib/chapter-embeds.ts).
 * Returns: one row per card, its ID. Internal: check_chapter_embeds(), chapter_embed_states().
 */
create or replace function public.chapter_embed_references(body text)
returns table (embed_id uuid)
language sql
immutable
set search_path = ''
as $$
  select (found_reference[1])::uuid
  from regexp_matches(coalesce(body, ''),
    '!\[(?:[^]\\]|\\.)*\]\(embed:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)', 'g')
    as found_reference;
$$;

comment on function public.chapter_embed_references(text) is
  'Internal: the music and video cards in a chapter body, in order (S1-E3-10).';
revoke execute on function public.chapter_embed_references(text) from public, anon, authenticated;

/**
 * check_chapter_embeds: the save-time rules for cards in a chapter body (CLAUDE.md rule 8).
 * Inputs: the body and the chapter's writer.
 * Errors (check_violation, with the hint the editor shows): too_many_embeds over the setting
 *   chapter_max_embeds; embed_unknown for a card that isn't one of the writer's own, so a text
 *   can't play something another person added. A card a moderator removed stays allowed: the
 *   reader shows "[Removed by the moderation team]" in its place.
 * Where it fits: save_chapter_draft(), after check_chapter_pictures().
 */
create or replace function public.check_chapter_embeds(body text, owner_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  most_embeds integer := coalesce((public.setting_value('chapter_max_embeds'))::integer, 10);
begin
  if (select count(*) from public.chapter_embed_references(body)) > most_embeds then
    raise exception 'A chapter can hold at most % music and video cards (S1-E3-10).', most_embeds
      using errcode = 'check_violation', hint = 'too_many_embeds';
  end if;
  if exists (select 1 from public.chapter_embed_references(body) as reference
             where not exists (select 1 from public.chapter_embeds
                               where chapter_embeds.id = reference.embed_id
                                 and chapter_embeds.user_id = owner_id
                                 and chapter_embeds.deleted_at is null)) then
    raise exception 'That music or video card isn''t one of yours (S1-E3-10).'
      using errcode = 'check_violation', hint = 'embed_unknown';
  end if;
end;
$$;

comment on function public.check_chapter_embeds(text, uuid) is
  'Internal: refuses too many music and video cards, or one that isn''t the writer''s own (S1-E3-10).';
revoke execute on function public.check_chapter_embeds(text, uuid) from public, anon, authenticated;

/**
 * embed_json: one card as the screens draw it. A card a moderator removed says only that, so a
 * reader learns nothing more about it (criterion 4).
 * Input: the row. Returns: {state: "visible", service, media_path, title, author_name} or
 *   {state: "removed"}. Internal.
 */
create or replace function public.embed_json(card public.chapter_embeds)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_moderated_away('embed', card.id) then jsonb_build_object('state', 'removed')
    else jsonb_build_object('state', 'visible', 'service', card.service, 'media_path', card.media_path,
      'title', card.title, 'author_name', card.author_name)
  end;
$$;

comment on function public.embed_json(public.chapter_embeds) is
  'Internal: a music or video card for the screens, or only "removed" (S1-E3-10).';
revoke execute on function public.embed_json(public.chapter_embeds) from public, anon, authenticated;

/**
 * chapter_embed_states: every card in a text, for the reader to draw.
 * Inputs: the text being sent and the chapter's writer. Returns: {"<card ID>": embed_json} for the
 *   writer's own cards in it; {} when there are none. Where it fits: get_chapter().
 */
create or replace function public.chapter_embed_states(body text, owner_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(chapter_embeds.id::text, public.embed_json(chapter_embeds)), '{}'::jsonb)
  from public.chapter_embeds
  where chapter_embeds.id in (select embed_id from public.chapter_embed_references(body))
    and chapter_embeds.user_id = owner_id
    and chapter_embeds.deleted_at is null;
$$;

comment on function public.chapter_embed_states(text, uuid) is
  'Internal: each music or video card in a chapter text, as the reader draws it (S1-E3-10).';
revoke execute on function public.chapter_embed_states(text, uuid) from public, anon, authenticated;

/**
 * my_embeds: the caller's own cards, for the editor and the writer's preview, which show cards
 * not yet saved into the text.
 * Input: embed_ids. Returns: {"<card ID>": embed_json} for those that are the caller's own; anyone
 *   else's are left out. Errors: none (signed out gives {}).
 */
create or replace function public.my_embeds(embed_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(chapter_embeds.id::text, public.embed_json(chapter_embeds)), '{}'::jsonb)
  from public.chapter_embeds
  where chapter_embeds.id = any (coalesce(embed_ids, '{}'))
    and chapter_embeds.user_id = (select auth.uid())
    and chapter_embeds.deleted_at is null;
$$;

comment on function public.my_embeds(uuid[]) is
  'The caller''s own music and video cards among the IDs, for the editor (S1-E3-10).';
revoke execute on function public.my_embeds(uuid[]) from public, anon;
grant execute on function public.my_embeds(uuid[]) to authenticated;

/**
 * count_words: as in S1-E3-09, and a card counts nothing either: its title isn't the writer's
 * words to read (S1-E3-10).
 */
create or replace function public.count_words(body text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_length(
    array_remove(regexp_split_to_array(regexp_replace(
      regexp_replace(coalesce(body, ''),
        '!\[((?:[^]\\]|\\.)*)\]\((picture|embed):[0-9a-f-]{36}\)', ' ', 'g'),
      '[^[:alnum:]'']+', ' ', 'g'), '\s+'), ''),
    1), 0);
$$;

/**
 * save_chapter_draft: as in S1-E3-09, and the cards in the body follow check_chapter_embeds()
 * (S1-E3-10): at most chapter_max_embeds, only the writer's own.
 */
create or replace function public.save_chapter_draft(
  chapter_code text,
  title text,
  body text,
  expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  chapter public.chapters;
  clean_title text := public.normalise_romanian_letters(regexp_replace(btrim(coalesce(title, '')), '\s+', ' ', 'g'));
  clean_body text;
  saved_time timestamptz := now();
begin
  -- Step 1: a signed-in writer who may write.
  if caller_id is null then
    raise exception 'Sign in to save a chapter.' using errcode = 'insufficient_privilege';
  end if;
  if not public.is_active_member() then
    return jsonb_build_object('status', 'not_active');
  end if;
  -- Step 2: their own live chapter, locked for this save so two devices can't interleave.
  select * into chapter from public.chapters
  where chapters.code = chapter_code and chapters.user_id = caller_id and chapters.deleted_at is null
  for update;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  -- Step 3: a stale version means another device saved first: tell the editor, change nothing.
  if chapter.draft_version <> expected_version then
    return jsonb_build_object('status', 'conflict', 'version', chapter.draft_version, 'saved_at', chapter.draft_saved_at);
  end if;
  -- Step 4: the rules (rule 8): length, no HTML, safe links, ş/ţ corrected; then pictures and cards.
  if char_length(clean_title) > 120 then
    raise exception 'A chapter title can have at most 120 characters (S1-E3-02a).' using errcode = 'check_violation';
  end if;
  clean_body := public.check_chapter_text(body);
  perform public.check_chapter_pictures(clean_body, caller_id);
  perform public.check_chapter_embeds(clean_body, caller_id);
  -- Step 5: save and move the version on.
  update public.chapters set
    draft_title = clean_title,
    draft_body = clean_body,
    draft_version = chapter.draft_version + 1,
    draft_saved_at = saved_time,
    word_count = public.count_words(clean_body)
  where chapters.id = chapter.id;
  return jsonb_build_object('status', 'saved', 'version', chapter.draft_version + 1,
    'saved_at', saved_time, 'word_count', public.count_words(clean_body));
end;
$$;

/**
 * get_chapter: as in S1-E3-09, plus "embeds": each music or video card in the text sent, with its
 * service, what to play and its title, or only "removed" (S1-E3-10). The reader loads nothing
 * from the service until play is pressed.
 */
create or replace function public.get_chapter(story_slug text, chapter_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  story public.stories;
  chapter public.chapters;
  readable_codes text[];
  place integer;
  text_to_send text;
  teaser_words integer;
begin
  -- Step 1: the story, if this caller may read it (age, blocks, deleted, moderated).
  select * into story from public.reader_visible_story(story_slug);
  if not found then
    return null;
  end if;
  -- Step 2: the chapter, published and not moderated away.
  select * into chapter from public.chapters
  where chapters.code = chapter_code and chapters.story_id = story.id;
  if not found or not public.chapter_is_readable(chapter.id) then
    return null;
  end if;
  -- Step 3: its place among the chapters readers can open, for "Chapter n of N" and the arrows.
  select array_agg(others.code order by others.position) into readable_codes
  from public.chapters as others
  where others.story_id = story.id and public.chapter_is_readable(others.id);
  place := array_position(readable_codes, chapter.code);
  -- Step 4: the text: all of it for a signed-in reader, the teaser for a signed-out visitor.
  if caller_id is not null then
    text_to_send := chapter.published_body;
  else
    select coalesce((settings.value #>> '{}')::integer, 600) into teaser_words
    from public.settings where settings.key = 'teaser_length';
    text_to_send := public.teaser_of(chapter.published_body, coalesce(teaser_words, 600));
  end if;
  -- Step 5: the answer, with the pictures and cards in the text that is sent.
  return jsonb_build_object(
    'story', jsonb_build_object(
      'slug', story.slug,
      'title', story.title,
      'language_code', story.language_code,
      'writer', (select jsonb_build_object(
          'display_name', public.story_writer_name(story.id, profiles.handle, profiles.pen_name),
          'handle', profiles.handle,
          'classic_author', public.story_classic_author(story.id))
        from public.profiles where profiles.id = story.user_id)),
    'id', chapter.id,
    'code', chapter.code,
    'title', chapter.published_title,
    'number', place,
    'total', array_length(readable_codes, 1),
    'previous_code', case when place > 1 then readable_codes[place - 1] end,
    'next_code', readable_codes[place + 1],
    'published_at', chapter.first_published_at,
    'edited_at', chapter.edited_at,
    'minutes_to_read', greatest(1, ceil(coalesce(chapter.published_word_count, 0) / 200.0))::integer,
    'is_owner', story.user_id = caller_id,
    'needs_sign_in', caller_id is null,
    'is_teaser', caller_id is null,
    'text_continues', public.word_total(text_to_send) < public.word_total(chapter.published_body),
    'body', text_to_send,
    'pictures', public.chapter_picture_states(text_to_send, story.user_id),
    'embeds', public.chapter_embed_states(text_to_send, story.user_id));
end;
$$;

/* ---------- The case page ---------- */

/**
 * admin_case_embed: the card an embed case is about, for the case page: the service, the title and
 * the writer's link, which a moderator may open in a new tab (never loaded on the page).
 * Input: target_case_id. Returns: {service, source_url, title, author_name, story {slug, title},
 *   chapter_code} or null when the case isn't about a card.
 * Errors: insufficient_privilege unless the caller may see the case.
 */
create or replace function public.admin_case_embed(target_case_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.cases;
begin
  select * into target from public.cases where id = target_case_id;
  if target.id is null or not public.staff_may('moderation', 'view') or not public.may_see_case(target.is_safeguarding) then
    raise exception 'You can''t see this case.' using errcode = 'insufficient_privilege';
  end if;
  if target.item_type <> 'embed' then
    return null;
  end if;
  return (select jsonb_build_object('service', chapter_embeds.service, 'source_url', chapter_embeds.source_url,
      'title', chapter_embeds.title, 'author_name', chapter_embeds.author_name,
      'story', jsonb_build_object('slug', stories.slug, 'title', stories.title),
      'chapter_code', chapters.code)
    from public.chapter_embeds
    join public.chapters on chapters.id = chapter_embeds.chapter_id
    join public.stories on stories.id = chapters.story_id
    where chapter_embeds.id = target.item_id);
end;
$$;

comment on function public.admin_case_embed(uuid) is
  'The music or video card an embed case is about, with its link, for the case page (S1-E3-10).';
revoke execute on function public.admin_case_embed(uuid) from public, anon;
grant execute on function public.admin_case_embed(uuid) to authenticated;

/* ---------- The shared reporting and notification contracts ---------- */

/**
 * reportable_item_owner: as in S1-E10-05, plus the 'embed' branch: a card in a published chapter
 * of a live story, so a draft's card can't be reported (or found out about).
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
  end case;
  if not found then
    raise exception 'There is no such % to report.', item_type using errcode = 'check_violation';
  end if;
end;
$$;
comment on function public.reportable_item_owner(public.reportable_type, text) is
  'The reported item''s ID and owner, one branch per reportable_type (shared contract, S1-E10-01; comment S1-E6-01; picture S1-E10-05; embed S1-E3-10).';

/**
 * reportable_item_summary: as in S1-E3-09, and a card says what and where it is: "Video from
 * YouTube in chapter 3 of <story>" (S1-E3-10).
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
  end case;
  return coalesce(summary, '(gone)');
end;
$$;

/**
 * case_item_content: as in S1-E10-05, and a card's service, link and title for the evidence pack
 * (S1-E3-10).
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
  end;
$$;

/**
 * notification_item_json: as in S1-E3-09, and a card links to its chapter (S1-E3-10).
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
    end)
  from public.cases where cases.id = case_id;
$$;
