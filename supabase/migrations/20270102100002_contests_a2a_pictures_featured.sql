/*
 * Migration: pictures and Featured stories on landing pages (bundle CONTESTS, part a2a; story
 * S1-E11-14 criteria 5, 7 and 9).
 *
 * What it adds:
 * - Pictures in a Hero or Text block (criterion 5). Admins upload to the private
 *   `landing-pictures` bucket under "<page ID>/"; register_landing_picture() records the file as
 *   pending and the picture check runs as for every upload (CLAUDE.md rule 19). A landing page is
 *   for every age, so its pictures also wait for a moderator's approval, like pictures in All
 *   ages and 13+ stories (picture_needs_person(); Robert's brief of 2 Nov 2026, section 2).
 *   Publishing is refused until the picture is visible and has alt text in both languages.
 * - Featured stories (criterion 7): picked by hand (story addresses) or by tag. Visitors see
 *   only stories rated for the youngest age group the page is for (its Who can enter block, or
 *   13 to 15 when it has none), through listed_stories(), so a story hidden or removed by
 *   moderation, restricted, class-only, deleted or by someone the visitor blocked drops off at
 *   once.
 * - landing_page() now also returns the pictures a visitor may see and each Featured block's
 *   story cards.
 * Who calls it: the landing page store (src/features/landing-pages/api/landingPages.ts) and the
 * picture upload helpers (src/features/pictures/api/pictures.ts). Tests:
 * supabase/tests/database/262-landing-pictures-featured.test.sql.
 */

/* ---------- The bucket and its rules ---------- */

alter table public.picture_checks drop constraint picture_checks_bucket_is_known;
alter table public.picture_checks add constraint picture_checks_bucket_is_known
  check (bucket in ('covers', 'avatars', 'chapter-images', 'atlas-images', 'space-banners',
                    'signature-pictures', 'landing-pictures'));

alter table public.picture_checks drop constraint picture_checks_kind_matches_bucket;
alter table public.picture_checks add constraint picture_checks_kind_matches_bucket check (
  (kind = 'cover' and bucket = 'covers') or (kind = 'avatar' and bucket = 'avatars')
  or (kind in ('chapter_picture', 'drawing') and bucket = 'chapter-images')
  or (kind = 'atlas_image' and bucket = 'atlas-images')
  or (kind = 'space_banner' and bucket = 'space-banners')
  or (kind = 'signature_picture' and bucket = 'signature-pictures')
  or (kind = 'landing_picture' and bucket = 'landing-pictures')
  or kind not in ('cover', 'avatar', 'chapter_picture', 'drawing', 'atlas_image', 'space_banner',
                  'signature_picture', 'landing_picture'));

-- Private: served only through signed URLs once the check passed; 5 MB; the three picture types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('landing-pictures', 'landing-pictures', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

/**
 * landing_picture_upload_allowed: may the signed-in person add this file to `landing-pictures`?
 * Input: object_name, "<page ID>/<random ID>.<ending>". Returns: true only while picture_uploads
 *   is on, for owner and admin (the website area), under a page that isn't archived.
 * Where it fits: the landing_pictures_insert_website_staff policy and register_landing_picture().
 */
create or replace function public.landing_picture_upload_allowed(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_feature_enabled('picture_uploads')
    and public.staff_may('website_cms', 'act')
    and coalesce(object_name, '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpe?g|png|webp)$'
    and exists (
      select 1 from public.landing_pages
      where landing_pages.id = split_part(object_name, '/', 1)::uuid and landing_pages.archived_at is null);
$$;
comment on function public.landing_picture_upload_allowed(text) is
  'True for owner and admin, a random file name under a live landing page''s ID and picture_uploads on (CONTESTS-13a2a).';
revoke execute on function public.landing_picture_upload_allowed(text) from public, anon;
grant execute on function public.landing_picture_upload_allowed(text) to authenticated;

/**
 * Policy landing_pictures_insert_website_staff: owner and admin add a picture under a landing
 * page's folder while picture uploads are on.
 */
create policy landing_pictures_insert_website_staff
  on storage.objects for insert to authenticated
  with check (bucket_id = 'landing-pictures' and public.landing_picture_upload_allowed(name));
comment on policy landing_pictures_insert_website_staff on storage.objects is
  'Allows owner and admin to add a picture under a landing page''s folder while picture_uploads is on (CONTESTS-13a2a).';

/**
 * Policy landing_pictures_select_visible: anyone, signed in or not, reads a landing page picture
 * once its check passed and a moderator approved it (S1-E10-05 criterion 2).
 */
create policy landing_pictures_select_visible
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'landing-pictures' and public.picture_is_visible(bucket_id, name));
comment on policy landing_pictures_select_visible on storage.objects is
  'Allows anyone to read a landing page picture once it passed its check or was approved (CONTESTS-13a2a).';

/**
 * Policy landing_pictures_select_uploader_and_staff: the uploader reads their picture at every
 * stage, and moderation staff read the pictures they decide on (S1-E10-05 criterion 3).
 */
create policy landing_pictures_select_uploader_and_staff
  on storage.objects for select to authenticated
  using (bucket_id = 'landing-pictures' and public.picture_reader_may_see(bucket_id, name));
comment on policy landing_pictures_select_uploader_and_staff on storage.objects is
  'Allows the uploader and moderation staff to read a landing page picture at any stage of its check (CONTESTS-13a2a).';

/**
 * register_landing_picture: records a picture an admin just uploaded, as pending its check.
 * Input: target_path ("<page ID>/<random ID>.<ending>" in `landing-pictures`).
 * Returns: the picture's ID, which the editor sends to /api/picture-check and keeps in the block.
 * Errors: insufficient_privilege for anyone but owner and admin; feature_not_supported while
 *   picture_uploads is off; check_violation when the file isn't there, isn't the caller's or
 *   isn't under a live page; program_limit_exceeded over the hourly upload limit (S1-E10-12).
 * Where it fits: uploadLandingPicture(), straight after the upload.
 */
create or replace function public.register_landing_picture(target_path text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  new_id uuid;
begin
  -- Step 1: owner or admin, while uploads are on.
  perform public.require_website_staff();
  if not public.is_feature_enabled('picture_uploads') then
    raise exception 'Picture uploads are switched off.' using errcode = 'feature_not_supported';
  end if;
  -- Step 2: the file is there, the caller uploaded it, under a live page.
  if not public.landing_picture_upload_allowed(target_path)
     or not exists (select 1 from storage.objects where objects.bucket_id = 'landing-pictures'
                    and objects.name = target_path and objects.owner_id = caller_id::text) then
    raise exception 'That picture isn''t uploaded to a landing page.' using errcode = 'check_violation';
  end if;
  -- Step 3: the upload limit (S1-E10-12), then the pending row.
  perform public.take_rate_limit('picture_upload');
  insert into public.picture_checks (user_id, bucket, path, kind)
  values (caller_id, 'landing-pictures', target_path, 'landing_picture')
  on conflict (bucket, path) do nothing
  returning id into new_id;
  if new_id is null then
    raise exception 'That picture is already registered.' using errcode = 'check_violation';
  end if;
  return new_id;
end;
$$;
comment on function public.register_landing_picture(text) is
  'Records a just-uploaded landing page picture as pending its check; owner and admin only (CONTESTS-13a2a).';
revoke execute on function public.register_landing_picture(text) from public, anon;
grant execute on function public.register_landing_picture(text) to authenticated;

/**
 * picture_needs_person: must a moderator approve this picture before anyone else sees it?
 * Input: the picture. Returns: true for a picture in a story rated All ages or 13+, for any
 *   picture uploaded by someone under 16 (brief section 2, Robert 08:41 and 08:50), and, from
 *   part a2a, for every landing page picture, because a landing page is for every age.
 * Internal: record_picture_check(), admin_pictures_to_check().
 */
create or replace function public.picture_needs_person(picture public.picture_checks)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.age_band_of(picture.user_id) in ('under_13', '13_to_15')
    or picture.kind = 'landing_picture'
    or exists (select 1 from public.stories
               where stories.id = picture.story_id and stories.rating in ('all_ages', '13_plus'));
$$;

/**
 * admin_landing_picture_states: every picture uploaded for one landing page, with its check
 * state, for the editor ("Being checked", "Waiting for a moderator", "Ready").
 * Input: target_page_id. Returns: {"<picture ID>": {state, bucket, path}} (picture_state_json()).
 * Errors: insufficient_privilege for anyone but owner and admin.
 * Where it fits: the editor's picture fields (useLandingPictureStates()).
 */
create or replace function public.admin_landing_picture_states(target_page_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_website_staff();
  return (
    select coalesce(jsonb_object_agg(picture_checks.id, public.picture_state_json(picture_checks)), '{}'::jsonb)
    from public.picture_checks
    where picture_checks.kind = 'landing_picture' and picture_checks.deleted_at is null
      and split_part(picture_checks.path, '/', 1) = target_page_id::text);
end;
$$;
comment on function public.admin_landing_picture_states(uuid) is
  'The check state of every picture uploaded for a landing page; owner and admin only (CONTESTS-13a2a).';
revoke execute on function public.admin_landing_picture_states(uuid) from public, anon;
grant execute on function public.admin_landing_picture_states(uuid) to authenticated;

/* ---------- The new block and its checks ---------- */

/**
 * landing_block_field_rules: the text fields of each block kind, with their limits. Internal.
 * Part a2a adds Featured stories (a heading and an optional introduction). A picture's alt text
 *   is checked by landing_picture_problems(), only when the block has a picture.
 */
create or replace function public.landing_block_field_rules()
returns table (block_kind text, field_name text, longest integer, is_required boolean)
language sql
immutable
set search_path = ''
as $$
  values
    ('hero', 'title', 80, true), ('hero', 'intro', 300, false),
    ('text', 'heading', 80, true), ('text', 'body', 4000, true),
    ('key_dates', 'heading', 80, true), ('key_dates', 'note', 300, false),
    ('who_can_enter', 'heading', 80, true), ('who_can_enter', 'body', 1000, true),
    ('prize', 'heading', 80, true), ('prize', 'body', 1000, true),
    ('how_to_enter', 'heading', 80, true), ('how_to_enter', 'body', 2000, true),
    ('rules', 'heading', 80, true), ('rules', 'body', 1000, false), ('rules', 'link_label', 80, true),
    ('questions', 'heading', 80, true),
    ('featured', 'heading', 80, true), ('featured', 'intro', 300, false);
$$;

/**
 * landing_picture_problems: a block's picture problems. Internal.
 * Inputs: the block and its path ("blocks.3"). Returns: an array of problems, empty when the
 *   block has no picture. Rules (criteria 5 and 9): only a Hero or Text block carries a picture;
 *   it is a landing page picture that is still there; it has alt text in both languages (at most
 *   200 characters); it passed the check and a moderator approved it.
 */
create or replace function public.landing_picture_problems(block jsonb, block_path text)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  problems text[] := '{}';
  picture_id_text text := nullif(btrim(coalesce(block ->> 'picture_id', '')), '');
  picture public.picture_checks;
  language_code text;
  alt_text text;
begin
  if picture_id_text is null then
    return problems;
  end if;
  if block ->> 'kind' not in ('hero', 'text') then
    return array[block_path || '.picture:not_allowed'];
  end if;
  -- Step 1: alt text in both languages.
  foreach language_code in array array['ro', 'en'] loop
    alt_text := btrim(coalesce(block #>> array[language_code, 'alt'], ''));
    if alt_text = '' then
      problems := problems || (block_path || '.' || language_code || '.alt:empty');
    elsif char_length(alt_text) > 200 then
      problems := problems || (block_path || '.' || language_code || '.alt:too_long');
    end if;
  end loop;
  -- Step 2: the picture itself, visible to everyone.
  if picture_id_text !~ '^[0-9a-f-]{36}$' then
    return problems || (block_path || '.picture:unknown');
  end if;
  select * into picture from public.picture_checks
  where id = picture_id_text::uuid and kind = 'landing_picture' and deleted_at is null;
  if picture.id is null then
    problems := problems || (block_path || '.picture:unknown');
  elsif picture.status not in ('passed', 'approved') or public.is_moderated_away('picture', picture.id) then
    problems := problems || (block_path || '.picture:not_checked');
  end if;
  return problems;
end;
$$;
comment on function public.landing_picture_problems(jsonb, text) is
  'Internal: a landing page block''s picture problems: alt text in both languages, checked and approved (CONTESTS-13a2a).';
revoke execute on function public.landing_picture_problems(jsonb, text) from public, anon, authenticated;

/**
 * landing_featured_problems: a Featured stories block's problems. Internal.
 * Inputs: the block and its path. Returns: an array of problems, empty for any other block.
 * Rules (criterion 7): by hand, 1 to 12 story addresses, each a story that exists; by tag, a tag
 *   that exists (any language's name).
 */
create or replace function public.landing_featured_problems(block jsonb, block_path text)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  picks jsonb := coalesce(block -> 'story_slugs', '[]'::jsonb);
begin
  if block ->> 'kind' is distinct from 'featured' then
    return '{}';
  end if;
  if block ->> 'mode' = 'tag' then
    if public.tag_for_name(btrim(coalesce(block ->> 'tag', '')), null, false) is null then
      return array[block_path || '.tag:unknown'];
    end if;
    return '{}';
  end if;
  if block ->> 'mode' is distinct from 'hand' then
    return array[block_path || '.mode:unknown'];
  end if;
  if jsonb_typeof(picks) <> 'array' or jsonb_array_length(picks) not between 1 and 12 then
    return array[block_path || '.stories:how_many'];
  end if;
  if exists (select 1 from jsonb_array_elements_text(picks) as pick (slug)
             where not exists (select 1 from public.stories
                               where stories.slug = pick.slug and stories.deleted_at is null)) then
    return array[block_path || '.stories:unknown'];
  end if;
  return '{}';
end;
$$;
comment on function public.landing_featured_problems(jsonb, text) is
  'Internal: a Featured stories block''s problems: 1 to 12 stories that exist, or a known tag (CONTESTS-13a2a).';
revoke execute on function public.landing_featured_problems(jsonb, text) from public, anon, authenticated;

/**
 * landing_page_problems: what stops a version from being published (criterion 9). Callable by
 * the editors so the screen can list the fields to fix before Publish.
 * Inputs: page_type and the version's content. Returns: an array of "<path>:<reason>" (empty when
 *   it may be published).
 * Rules: one of four themes; between 2 and 30 blocks, only the known kinds; one hero, first, so
 *   the page keeps one heading order (WCAG 2.2 AA, criterion 4); every required text in both
 *   languages; a contest page has key dates and a rules link; from part a2a, every picture
 *   with alt text and approved, and every Featured stories block with stories or a tag.
 */
create or replace function public.landing_page_problems(page_type text, content jsonb)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  problems text[] := '{}';
  blocks jsonb := coalesce(content -> 'blocks', '[]'::jsonb);
  block jsonb;
  block_number integer := 0;
  rule record;
  language_code text;
  text_problem text;
begin
  -- Step 1: the page as a whole.
  if coalesce(content ->> 'theme', '') not in ('plum', 'gold', 'sage', 'sky') then
    problems := problems || 'theme:unknown'::text;
  end if;
  if jsonb_typeof(blocks) <> 'array' or jsonb_array_length(blocks) not between 2 and 30 then
    return problems || 'blocks:count'::text;
  end if;
  if blocks -> 0 ->> 'kind' is distinct from 'hero'
     or (select count(*) from jsonb_array_elements(blocks) as each_block where each_block ->> 'kind' = 'hero') <> 1 then
    problems := problems || 'blocks:hero_first'::text;
  end if;
  if page_type = 'contest' and not (blocks @> '[{"kind": "key_dates"}]' and blocks @> '[{"kind": "rules"}]') then
    problems := problems || 'blocks:contest_needs_dates_and_rules'::text;
  end if;
  -- Step 2: every block, its text in both languages and its own rules.
  for block in select value from jsonb_array_elements(blocks) loop
    if not exists (select 1 from public.landing_block_field_rules() as rules where rules.block_kind = block ->> 'kind') then
      problems := problems || ('blocks.' || block_number || ':unknown_kind');
    end if;
    for rule in select * from public.landing_block_field_rules() as rules where rules.block_kind = block ->> 'kind' loop
      foreach language_code in array array['ro', 'en'] loop
        text_problem := public.landing_text_problem(block, language_code, rule.field_name,
          'blocks.' || block_number, rule.longest, rule.is_required);
        if text_problem is not null then
          problems := problems || text_problem;
        end if;
      end loop;
    end loop;
    problems := problems || public.landing_block_extra_problems(block, 'blocks.' || block_number);
    -- Part a2a: a picture's alt text and check, and a Featured stories block's picks.
    problems := problems || public.landing_picture_problems(block, 'blocks.' || block_number)
      || public.landing_featured_problems(block, 'blocks.' || block_number);
    block_number := block_number + 1;
  end loop;
  return problems;
end;
$$;

/* ---------- What visitors see ---------- */

/**
 * landing_youngest_ratings: the ratings a page's youngest readers may see. Internal.
 * Input: the version's content. Returns: the ratings allowed for the youngest age group in its
 *   Who can enter block (13 to 15: All ages and 13+; 16 to 17: also 16+; 18 and over: every
 *   rating), or 13 to 15's when the page has no such block (CLAUDE.md rule 18; criterion 7).
 */
create or replace function public.landing_youngest_ratings(content jsonb)
returns public.story_rating[]
language sql
immutable
set search_path = ''
as $$
  select case
    when groups is null or jsonb_typeof(groups) <> 'array' or jsonb_array_length(groups) = 0 or groups ? '13_to_15' then array['all_ages', '13_plus']::public.story_rating[]
    when groups ? '16_to_17' then array['all_ages', '13_plus', '16_plus']::public.story_rating[]
    else array['all_ages', '13_plus', '16_plus', '18_plus']::public.story_rating[]
  end
  from (select (select each_block -> 'age_groups' from jsonb_array_elements(coalesce(content -> 'blocks', '[]')) as each_block
                where each_block ->> 'kind' = 'who_can_enter' limit 1) as groups) as page_groups;
$$;
comment on function public.landing_youngest_ratings(jsonb) is
  'Internal: the story ratings a landing page''s youngest readers may see (CONTESTS-13a2a).';
revoke execute on function public.landing_youngest_ratings(jsonb) from public, anon, authenticated;

/**
 * landing_featured_cards: each Featured stories block's story cards, for the visitor. Internal.
 * Input: the version's content. Returns: {"<block id>": [story card, ...]}, at most 12 each.
 * Stories come through listed_stories(), so whatever no public list may show (hidden or removed by
 * moderation, restricted, class-only, deleted, a blocked writer, a rating the visitor may not see)
 * is left out at once; on top, only the ratings for the page's youngest readers.
 */
create or replace function public.landing_featured_cards(content jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(featured.block ->> 'id', featured.cards), '{}'::jsonb)
  from (
    select each_block as block, coalesce((
      select jsonb_agg(public.story_card_json(picked.id) order by picked.place)
      from (
        select listed.id, case when each_block ->> 'mode' = 'hand'
                               then (select pick.place from jsonb_array_elements_text(each_block -> 'story_slugs')
                                     with ordinality as pick (slug, place) where pick.slug = listed.slug)
                               else row_number() over (order by listed.last_chapter_published_at desc nulls last) end as place
        from public.listed_stories(
          case when each_block ->> 'mode' = 'tag' then 'tag' else 'updated' end,
          case when each_block ->> 'mode' = 'tag' then each_block ->> 'tag' end, null, null, null) as listed
        where listed.rating = any (public.landing_youngest_ratings(content))
          and (each_block ->> 'mode' = 'tag'
               or listed.slug in (select jsonb_array_elements_text(coalesce(each_block -> 'story_slugs', '[]'))))
        order by 2
        limit 12
      ) as picked), '[]'::jsonb) as cards
    from jsonb_array_elements(coalesce(content -> 'blocks', '[]')) as each_block
    where each_block ->> 'kind' = 'featured'
  ) as featured;
$$;
comment on function public.landing_featured_cards(jsonb) is
  'Internal: each Featured stories block''s story cards for the visitor, filtered like every public list and to the page''s youngest readers (CONTESTS-13a2a).';
revoke execute on function public.landing_featured_cards(jsonb) from public, anon, authenticated;

/**
 * landing_page_pictures: the pictures of a version, as the visitor may see them. Internal.
 * Input: the version's content. Returns: {"<picture ID>": {state, bucket, path}}; the bucket and
 *   path only for a picture the visitor may see (picture_state_json()), so nobody gets an
 *   unchecked file.
 */
create or replace function public.landing_page_pictures(content jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(picture_checks.id, public.picture_state_json(picture_checks)), '{}'::jsonb)
  from public.picture_checks
  where picture_checks.kind = 'landing_picture' and picture_checks.deleted_at is null
    and picture_checks.id::text in (
      select each_block ->> 'picture_id' from jsonb_array_elements(coalesce(content -> 'blocks', '[]')) as each_block);
$$;
comment on function public.landing_page_pictures(jsonb) is
  'Internal: a landing page version''s pictures as the visitor may see them (CONTESTS-13a2a).';
revoke execute on function public.landing_page_pictures(jsonb) from public, anon, authenticated;

/**
 * landing_page: the public read of /c/<slug> (criterion 11), for anyone, signed in or not.
 * Input: page_slug. Returns: {slug, type, state, show_from, take_down_on, content, pictures,
 *   featured}, where state is "live", or "ended" from the take-down date; or null when there is
 *   no such page, it is archived, or nothing is live yet. Part a2a adds the pictures and the
 *   Featured stories cards. Never returns a draft, a scheduled version or who wrote it.
 */
create or replace function public.landing_page(page_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'slug', pages.slug,
    'type', pages.page_type,
    'state', case when live.take_down_on is not null and live.take_down_on <= public.romania_today()
                  then 'ended' else 'live' end,
    'show_from', live.show_from,
    'take_down_on', live.take_down_on,
    'content', live.content,
    -- Part a2a: the pictures visitors may see, and each Featured stories block's story cards.
    'pictures', public.landing_page_pictures(live.content),
    'featured', public.landing_featured_cards(live.content))
  from public.landing_pages as pages
  cross join lateral public.landing_page_live_version(pages.id) as live
  where pages.slug = lower(btrim(page_slug)) and pages.archived_at is null and live.id is not null;
$$;
