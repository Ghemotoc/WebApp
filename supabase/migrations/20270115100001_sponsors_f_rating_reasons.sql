/*
 * Migration: why a story is 16+ or 18+, and no network ads on the stories that must not carry
 * them (stories S1-E3-06 and S1-E12-04; bundle SPONSORS-f).
 *
 * Decided by Robert on 2 Nov 2026 (ads decisions, bundle 14 part f): writers picking 16+ or 18+
 * tick why: sexual content, nudity, graphic violence or gore, strong language, drugs, self-harm or
 * dark themes ("Sexual content" starts ticked on 18+, in the form). Network ads switch off on any
 * story with sexual content, nudity or graphic violence ticked, at once when a moderator raises
 * the rating or adds a reason. Sponsor slots and our own house ads are unaffected.
 *
 * What it adds:
 * - the enum story_rating_reason and stories.rating_reasons (empty for All ages and 13+; a
 *   trigger empties it whenever the rating goes below 16+);
 * - check_story_labels() also checks the reasons are known; create_story(), update_my_story() and
 *   the staff settings change (admin_apply_story_settings(), admin_story_settings_json()) read and
 *   save them. They are copied unchanged from their last migrations apart from the lines marked
 *   SPONSORS-f;
 * - network_ads_barred(context) and fill_ad_slot() skipping the network on such a story's pages
 *   (its story page, its chapters and its shared-link page).
 * Who calls it: the story form (src/features/writing/), Staff › Stories › settings
 * (src/features/staff/) and page_ads(). Tests: 276-rating-reasons.test.sql.
 */

/* ---------- 1. The reasons ---------- */

create type public.story_rating_reason as enum (
  'sexual_content', 'nudity', 'graphic_violence', 'strong_language', 'drugs', 'self_harm', 'dark_themes');
comment on type public.story_rating_reason is
  'Why a story is 16+ or 18+: sexual content, nudity, graphic violence or gore, strong language, drugs, self-harm or dark themes (SPONSORS-f).';

alter table public.stories
  add column rating_reasons public.story_rating_reason[] not null default '{}';
comment on column public.stories.rating_reasons is
  'Why the story is 16+ or 18+, ticked by the writer (staff may add); empty for All ages and 13+. Sexual content, nudity or graphic violence keep network ads off its pages (SPONSORS-f).';

/**
 * story_rating_reasons_fit_rating: a trigger that keeps the reasons in step with the rating.
 * Internal. Two rules:
 * - All ages or 13+: no reasons, so a story that moves down never keeps reasons that no longer
 *   apply;
 * - 18+ with no reason given: "sexual content", the usual reason and the safe default, so network
 *   ads go off at once when staff raise a story to 18+ (admin_raise_story_rating(), a picture
 *   check) and on every 18+ story written before reasons existed (bundles.md, part f).
 */
create or replace function public.story_rating_reasons_fit_rating()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Rule 1: below 16+ there is nothing to explain.
  if new.rating not in ('16_plus', '18_plus') then
    new.rating_reasons := '{}';
  -- Rule 2: an 18+ story always says why; with nothing ticked, sexual content.
  elsif new.rating = '18_plus' and cardinality(new.rating_reasons) = 0 then
    new.rating_reasons := '{sexual_content}';
  end if;
  return new;
end;
$$;
comment on function public.story_rating_reasons_fit_rating() is
  'Trigger: a story rated All ages or 13+ has no rating reasons; an 18+ story with none gets sexual_content (SPONSORS-f).';
revoke execute on function public.story_rating_reasons_fit_rating() from public, anon, authenticated;
create trigger stories_rating_reasons_fit_rating
  before insert or update of rating, rating_reasons on public.stories
  for each row execute function public.story_rating_reasons_fit_rating();

-- The 18+ stories written before reasons existed start on sexual content, the safe default.
update public.stories set rating_reasons = '{sexual_content}'
where rating = '18_plus' and cardinality(rating_reasons) = 0;

/**
 * story_rating_reasons_from: the reasons in a labels object, as the column stores them. Internal.
 * Input: labels with rating and rating_reasons (a JSON array of reason names; missing means none).
 * Returns: the reasons, each once, in the enum's order; none when the rating is below 16+.
 *   check_story_labels() has already refused unknown names.
 */
create or replace function public.story_rating_reasons_from(labels jsonb)
returns public.story_rating_reason[]
language sql
immutable
set search_path = ''
as $$
  select case when labels ->> 'rating' in ('16_plus', '18_plus') then coalesce((
      select array_agg(distinct reason::public.story_rating_reason order by reason::public.story_rating_reason)
      from jsonb_array_elements_text(coalesce(labels -> 'rating_reasons', '[]'::jsonb)) as reason), '{}')
    else '{}'::public.story_rating_reason[] end;
$$;
comment on function public.story_rating_reasons_from(jsonb) is
  'Internal: the rating reasons in a story''s labels, empty below 16+ (SPONSORS-f).';
revoke execute on function public.story_rating_reasons_from(jsonb) from public, anon, authenticated;

/**
 * check_story_labels: as in S1-E3-06, now also checking rating_reasons, when given: a JSON array
 * of known reasons (SPONSORS-f). The writer's form asks for at least one on 16+ and 18+; the
 * server doesn't, so stories rated before this part and staff changes still save.
 * Errors: check_violation as before, and for rating_reasons that isn't an array of known reasons.
 * Internal: create_story(), update_my_story() and admin_apply_story_settings() call it.
 */
create or replace function public.check_story_labels(labels jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if labels ->> 'rating' is null or labels ->> 'rating' not in ('all_ages', '13_plus', '16_plus', '18_plus') then
    raise exception 'Pick a rating: All ages, 13+, 16+ or 18+ (S1-E3-06).' using errcode = 'check_violation';
  end if;
  if labels ->> 'ai_disclosure' is null
     or labels ->> 'ai_disclosure' not in ('no_ai', 'ai_brainstorming', 'partly_ai_written') then
    raise exception 'Say whether AI was used (S1-E3-06).' using errcode = 'check_violation';
  end if;
  if char_length(coalesce(labels ->> 'content_note', '')) > 300 then
    raise exception 'A content note can have at most 300 characters (S1-E3-06).' using errcode = 'check_violation';
  end if;
  if coalesce((labels ->> 'deals_with_abuse_or_coercion')::boolean, false)
     and not (labels ->> 'rating' in ('16_plus', '18_plus') and btrim(coalesce(labels ->> 'content_note', '')) <> '') then
    raise exception 'A story about abuse or coercion must be rated 16+ or 18+ and carry a content note (17 Oct 2026).'
      using errcode = 'check_violation';
  end if;
  -- SPONSORS-f: the reasons, when given, are a list of the seven known ones.
  if labels ? 'rating_reasons' and (jsonb_typeof(labels -> 'rating_reasons') <> 'array' or exists (
      select 1 from jsonb_array_elements(labels -> 'rating_reasons') as reason
      where jsonb_typeof(reason) <> 'string'
        or reason #>> '{}' not in ('sexual_content', 'nudity', 'graphic_violence', 'strong_language',
                                   'drugs', 'self_harm', 'dark_themes'))) then
    raise exception 'Pick the reasons from the list (SPONSORS-f).' using errcode = 'check_violation';
  end if;
end;
$$;

/* ---------- 2. Saving them: the writer's form and the staff change ---------- */

/**
 * create_story: as in S1-E3-06, also saving labels.rating_reasons (SPONSORS-f).
 */
create or replace function public.create_story(
  title text,
  blurb text,
  language_code text,
  category_slug text,
  tag_names text[],
  cover jsonb,
  story_id uuid default null,
  labels jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
    rating_reasons
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
    public.story_rating_reasons_from(labels)
  );

  -- Step 4: the tags, merged and capped.
  perform public.set_story_tags(new_story_id, caller_id, tag_names);

  return jsonb_build_object('outcome', 'ok', 'slug', new_slug);
end;
$$;


/**
 * update_my_story: as in IDEAS-1c, also saving labels.rating_reasons (SPONSORS-f); left out, the
 * story keeps its reasons.
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


/**
 * admin_story_settings_json: as in S1-E11-08, now with rating_reasons, so a reason staff add is
 * versioned and audited like any other setting (SPONSORS-f).
 */
create or replace function public.admin_story_settings_json(target public.stories)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'rating', target.rating,
    'completion_status', target.completion_status,
    'comments_enabled', target.comments_enabled,
    'category_slug', (select categories.slug from public.categories where categories.id = target.category_id),
    'language_code', target.language_code,
    'is_fan_fiction', target.is_fan_fiction,
    'is_parody', target.is_parody,
    'deals_with_abuse_or_coercion', target.deals_with_abuse_or_coercion,
    'rating_reasons', to_jsonb(target.rating_reasons),
    'tag_names', coalesce((
      select jsonb_agg(tags.name order by tags.name)
      from public.story_tags join public.tags on tags.id = story_tags.tag_id
      where story_tags.story_id = target.id), '[]'::jsonb));
$$;


/**
 * admin_apply_story_settings: as in S1-E11-08, now also taking rating_reasons in `changes`
 * (SPONSORS-f); left out, the story keeps its reasons.
 */
create or replace function public.admin_apply_story_settings(story_row public.stories, changes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_language text := coalesce(changes ->> 'language_code', story_row.language_code);
  new_category_id uuid;
  new_labels jsonb;
begin
  -- Step 1: category and language, checked as when the writer saves (S1-E3-01).
  new_category_id := public.check_story_basics(story_row.title, story_row.blurb, new_language,
    coalesce(changes ->> 'category_slug',
      (select categories.slug from public.categories where categories.id = story_row.category_id)));
  -- Step 2: the labels, filled from the row and checked together (S1-E3-06).
  new_labels := jsonb_build_object('rating', story_row.rating, 'is_fan_fiction', story_row.is_fan_fiction,
    'is_parody', story_row.is_parody, 'deals_with_abuse_or_coercion', story_row.deals_with_abuse_or_coercion,
    'content_note', story_row.content_note, 'ai_disclosure', story_row.ai_disclosure,
    'rating_reasons', to_jsonb(story_row.rating_reasons))
    || jsonb_strip_nulls(jsonb_build_object('rating', changes -> 'rating', 'rating_reasons', changes -> 'rating_reasons',
      'is_fan_fiction', changes -> 'is_fan_fiction', 'is_parody', changes -> 'is_parody',
      'deals_with_abuse_or_coercion', changes -> 'deals_with_abuse_or_coercion'));
  perform public.check_story_labels(new_labels);
  -- Step 3: save.
  update public.stories set
    language_code = new_language,
    category_id = new_category_id,
    completion_status = coalesce((changes ->> 'completion_status')::public.completion_status, completion_status),
    comments_enabled = coalesce((changes ->> 'comments_enabled')::boolean, comments_enabled),
    rating = (new_labels ->> 'rating')::public.story_rating,
    is_fan_fiction = (new_labels ->> 'is_fan_fiction')::boolean,
    is_parody = (new_labels ->> 'is_parody')::boolean,
    deals_with_abuse_or_coercion = (new_labels ->> 'deals_with_abuse_or_coercion')::boolean,
    -- Staff may add a reason; sexual content, nudity or graphic violence turn network ads off.
    rating_reasons = public.story_rating_reasons_from(new_labels)
  where stories.id = story_row.id;
  -- Step 4: the tags, when given, through the writer's own tag rules (new names wait for staff).
  if changes ? 'tag_names' then
    if jsonb_array_length(changes -> 'tag_names') > 10 then
      raise exception 'A story can have at most 10 tags (S1-E3-01).' using errcode = 'check_violation';
    end if;
    perform public.set_story_tags(story_row.id, story_row.user_id,
      array(select jsonb_array_elements_text(changes -> 'tag_names')));
  end if;
end;
$$;


/* ---------- 3. No network ads on those stories ---------- */

/**
 * network_ads_barred: true when the page belongs to a story whose writer (or a moderator) ticked
 * sexual content, nudity or graphic violence (Robert, 2 Nov 2026). Internal.
 * Input: the page's context as page_ads() gets it (story_slug). Returns: boolean.
 */
create or replace function public.network_ads_barred(context jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.stories
    where stories.slug = context ->> 'story_slug'
      and stories.rating_reasons && array['sexual_content', 'nudity', 'graphic_violence']::public.story_rating_reason[]);
$$;
comment on function public.network_ads_barred(jsonb) is
  'Internal: no network ads on a story with sexual content, nudity or graphic violence ticked (SPONSORS-f).';
revoke execute on function public.network_ads_barred(jsonb) from public, anon, authenticated;

/**
 * fill_ad_slot: as in part e1, but the network step is skipped on a story whose reasons bar it;
 * a sponsor, our house ads and our built-in ads fill the slot as before (SPONSORS-f).
 */
create or replace function public.fill_ad_slot(
  wanted_slot_key text, slot_format public.ad_format, wanted_page_key text, context jsonb, used_keys text[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  chosen jsonb;
  network_ad jsonb;
begin
  -- Step 1: the sponsor booked into this slot today, when the page matches its booking.
  chosen := public.booked_sponsor_ad_for_slot(wanted_slot_key, context, used_keys);
  -- Step 1b: an unbooked slot can still take a live campaign by its placement.
  if chosen is null and not public.ad_slot_is_booked(wanted_slot_key) then
    chosen := public.sponsor_ad_for_slot(wanted_slot_key, wanted_page_key, context, used_keys);
  end if;
  -- Step 2: the network's ad, unless this story's rating reasons bar it (SPONSORS-f).
  if not public.network_ads_barred(context) then
    network_ad := public.network_ad_for_slot(slot_format, used_keys);
  end if;
  -- Step 3: in order, our own house ads, the network, then our built-in ads.
  return coalesce(chosen,
    public.staff_house_ad_for_slot(wanted_slot_key, wanted_page_key, used_keys),
    public.landing_house_ad_for_slot(wanted_page_key, used_keys),
    network_ad,
    public.house_ad_for_slot(wanted_page_key, used_keys));
end;
$$;
