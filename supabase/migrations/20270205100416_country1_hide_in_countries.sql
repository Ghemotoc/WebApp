-- Migration: hide a story in chosen countries (bundle COUNTRY-1; Robert, 21 Nov 2026, 06:18 UTC,
-- approved on canvas v43 at 06:47 UTC; boards D07 Story settings › Where it shows, B11 the
-- reader's page, S29 Classics › Hide in countries).
--
-- What it adds:
-- - stories.hidden_in_countries: the two-letter codes of the countries where a story is hidden.
--   Empty for every story today, so nothing changes until a writer (or staff, for a classic)
--   picks a country.
-- - viewer_country(): the country of the reader's connection, from the signed token our Cloudflare
--   Pages Function makes (/api/signup-context, S1-E2-10), sent by the app on every request in the
--   X-Viewer-Country header (src/lib/viewerCountry.ts). Without a good token it falls back to the
--   signed-in member's own country. Board D07: "A reader's connection decides it, so it works as a
--   block, not a lock: a VPN can get around it."
-- - story_hidden_here(): true when a story is hidden where this reader is. Never for its writer.
-- - The rule in the two places every reader path goes through: reader_visible_story() (the story
--   page, the reader, the chapter list, sharing, following) and listed_stories() (every shelf,
--   See all, search and the Library), plus the writer's profile cards and the featured picks.
-- - story_unavailable_here(): true when the only reason a story can't open is the country, so the
--   page can say "This page isn't available here" (B11) instead of "not available".
-- - set_my_story_hidden_countries(): the writer's own setting; admin_set_classic_hidden_countries():
--   staff's for a classic, in the audit log.
--
-- Editions (TRANSLATE-1a): a story in several languages is one story to readers, so a setting is
-- written to every edition of it at once.
-- Personal data: none. The reader's country is read for the one request and never stored.

-- Step 1: the column. Codes are ISO 3166-1 alpha-2 in capitals; at most 60 countries.
alter table public.stories
  add column hidden_in_countries text[] not null default '{}',
  add constraint stories_hidden_in_countries_are_codes check (
    cardinality(hidden_in_countries) <= 60
    and array_to_string(hidden_in_countries, ',') ~ '^([A-Z]{2}(,[A-Z]{2})*)?$');

comment on column public.stories.hidden_in_countries is
  'The countries where readers can''t find or open the story, by the connection''s country (COUNTRY-1).';

-- Step 2: one checker for the signed country token, with the age it may have. The sign-up keeps
-- its 10 minutes; reading allows an hour, because the app asks for a new token every 20 minutes.

/**
 * verified_country_token: the country inside a genuine country token, else null.
 *
 * Inputs: token "v1.<country>.<seconds>.<signature>" (server/signup-context.ts) and the most
 *   seconds it may be old. Returns: the two-letter code, or null for a missing, malformed, old,
 *   future or forged token, or when Vault holds no secret. Raises nothing.
 * Where it fits: verified_signup_country() (sign-up) and viewer_country() (reading).
 */
create or replace function public.verified_country_token(token text, max_age_seconds integer)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := string_to_array(coalesce(token, ''), '.');
  secret text;
  issued_at bigint;
  now_seconds bigint := extract(epoch from now())::bigint;
begin
  -- Step 1: the shape: version, country, time in seconds, 64-character signature.
  if array_length(parts, 1) is distinct from 4 or parts[1] <> 'v1' or parts[2] !~ '^[A-Z]{2}$'
    or parts[3] !~ '^\d{1,12}$' or parts[4] !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  -- Step 2: young enough (and not from the future, beyond a minute of clock drift).
  issued_at := parts[3]::bigint;
  if issued_at < now_seconds - max_age_seconds or issued_at > now_seconds + 60 then
    return null;
  end if;
  -- Step 3: the signature, with the secret from Vault; without the secret nothing is trusted.
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'signup_context_secret';
  if secret is null or secret = '' then
    return null;
  end if;
  if encode(extensions.hmac(parts[1] || '.' || parts[2] || '.' || parts[3], secret, 'sha256'), 'hex') <> parts[4] then
    return null;
  end if;
  return parts[2];
end;
$$;

comment on function public.verified_country_token(text, integer) is
  'Internal: the country in a genuine country token no older than the seconds given, else null (S1-E2-10, COUNTRY-1).';
revoke all on function public.verified_country_token(text, integer) from public;

/**
 * verified_signup_country: unchanged behaviour (S1-E2-10, Q6a), now through the shared checker.
 *
 * Inputs: the sign-up's token. Returns: the country when the token is at most 10 minutes old.
 * Where it fits: handle_new_auth_user() at sign-up.
 */
create or replace function public.verified_signup_country(token text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.verified_country_token(token, 600);
$$;

comment on function public.verified_signup_country(text) is
  'Internal: the country in a genuine sign-up token at most 10 minutes old, else null (S1-E2-10, Q6a).';

-- Step 3: where the reader is.

/**
 * viewer_country: the country this request comes from, for hiding stories (COUNTRY-1).
 *
 * Inputs: none; reads the X-Viewer-Country request header (a signed token, at most an hour old)
 *   and, without a good one, the signed-in member's profile country.
 * Returns: a two-letter code, or null when neither is known (a visitor whose token didn't arrive).
 * Raises nothing. Never stored, never logged.
 * Where it fits: story_hidden_here() and listed_stories().
 */
create or replace function public.viewer_country()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  connection_country text;
begin
  -- Step 1: the connection's country, when the app sent a genuine token (the board's rule).
  connection_country := public.verified_country_token(
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-viewer-country', 3600);
  if connection_country is not null then
    return connection_country;
  end if;
  -- Step 2: otherwise the member's own country, so a missing token doesn't open a hidden story
  -- to a member who lives where it is hidden.
  return (select profiles.country_code from public.profiles where profiles.id = (select auth.uid()));
end;
$$;

comment on function public.viewer_country() is
  'Internal: the country of the reader''s connection (signed header), else the member''s own country, else null (COUNTRY-1).';
revoke all on function public.viewer_country() from public;

/**
 * story_hidden_here: whether a story is hidden in the country this reader is in.
 *
 * Inputs: the story's hidden_in_countries and its writer. Returns: true when the list holds the
 *   reader's country; always false for the writer and for a story hidden nowhere (answered without
 *   reading the country). Raises nothing.
 * Where it fits: reader_visible_story(), profile_story_cards(), featured_stories_now() and
 *   story_unavailable_here(). listed_stories() asks viewer_country() once instead.
 */
create or replace function public.story_hidden_here(hidden_in_countries text[], writer_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Step 1: most stories are hidden nowhere; the country isn't needed for them.
  if cardinality(hidden_in_countries) = 0 then
    return false;
  end if;
  -- Step 2: the writer always sees their own story, wherever they are.
  if writer_id = (select auth.uid()) then
    return false;
  end if;
  -- Step 3: hidden when the reader's country is on the list; an unknown country isn't.
  return coalesce(public.viewer_country() = any (hidden_in_countries), false);
end;
$$;

comment on function public.story_hidden_here(text[], uuid) is
  'Internal: true when the story is hidden in the reader''s country, never for its writer (COUNTRY-1).';
revoke all on function public.story_hidden_here(text[], uuid) from public;

-- Step 4: the single story. The old rules move unchanged into reader_visible_story_anywhere(), so
-- story_unavailable_here() can ask "would it open, but for the country?" without copying them.

/**
 * reader_visible_story_anywhere: the story behind an address when the caller may read it, leaving
 * the country out (the rules of S1-E4-01a, S1-E8-11, NEW-1, S1-E11-08, CLAUDE.md rules 6 and 18).
 *
 * Inputs: the story's address. Returns: the story as the caller may see it, or no row.
 * Where it fits: reader_visible_story() and story_unavailable_here().
 */
create or replace function public.reader_visible_story_anywhere(story_slug text)
returns setof public.stories
language sql
stable
security definer
set search_path = ''
as $$
  select shown.* from public.stories
  cross join lateral public.story_as_shown(stories) as shown
  where stories.slug = story_slug
    and stories.deleted_at is null
    and not public.is_moderated_away('story', stories.id)
    -- S1-E8-11: a story shared only with a class opens only for its writer and that class.
    and public.story_class_allows(stories.class_only, stories.class_space_id, stories.user_id)
    -- NEW-1: a private story opens only for its writer; an unlisted one for anyone with the link.
    and public.story_visibility_allows(stories.visibility, stories.user_id)
    and (
      stories.user_id = (select auth.uid())
      or (public.rating_allows(stories.rating) and not public.is_blocked_with(stories.user_id))
    );
$$;

comment on function public.reader_visible_story_anywhere(text) is
  'Internal: the story behind an address when the caller may read it, the country aside (S1-E4-01a, COUNTRY-1).';
revoke all on function public.reader_visible_story_anywhere(text) from public;

/**
 * reader_visible_story: the story behind an address when the caller may read it here.
 *
 * Inputs: the story's address. Returns: the story, or no row; COUNTRY-1 adds the country.
 * Where it fits: get_story_page(), get_chapter(), the chapter list, sharing and following.
 */
create or replace function public.reader_visible_story(story_slug text)
returns setof public.stories
language sql
stable
security definer
set search_path = ''
as $$
  select anywhere.* from public.reader_visible_story_anywhere(story_slug) as anywhere
  -- COUNTRY-1: not in a country where it is hidden (never for the writer).
  where not public.story_hidden_here(anywhere.hidden_in_countries, anywhere.user_id);
$$;

comment on function public.reader_visible_story(text) is
  'Internal: the story behind an address when the caller may read it here (S1-E4-01a, COUNTRY-1).';

/**
 * story_unavailable_here: whether a story would open for this reader but for their country.
 *
 * Inputs: the story's address. Returns: true only then; false for a story that opens, doesn't
 *   exist or is closed to the reader for any other reason (so the page says "not available" as
 *   before and nothing more is given away). Raises nothing.
 * Where it fits: StoryPage and ChapterReaderPage call it when their own read answered nothing,
 *   to show board B11 ("This page isn't available here").
 */
create or replace function public.story_unavailable_here(story_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reader_visible_story_anywhere(story_slug) as anywhere
    where public.story_hidden_here(anywhere.hidden_in_countries, anywhere.user_id));
$$;

comment on function public.story_unavailable_here(text) is
  'True when the story would open but is hidden in the reader''s country, for the B11 page (COUNTRY-1).';
revoke all on function public.story_unavailable_here(text) from public;
grant execute on function public.story_unavailable_here(text) to anon, authenticated;

-- Step 5: every list. listed_stories() is as before (S1-E5-01, GAPS-6, TRANSLATE-1a, MARKETS-2c)
-- with the reader's country read once and one more line in the WHERE.

/**
 * listed_stories: the stories in a list this reader may see, after the filters.
 *
 * Inputs: the list's kind and key, and the category, completion and language filters.
 * Returns: the stories as the reader may see them. Raises nothing for a short search (no rows).
 * Where it fits: browse_stories() (shelves, See all, search), my_library(), my_discover_cards().
 */
create or replace function public.listed_stories(list_kind text, list_key text, category_slug text, completion public.completion_status, language text)
returns setof public.stories
language plpgsql
stable
security definer
set search_path = ''
as $_$
declare
  caller_id uuid := (select auth.uid());
  -- The ratings this caller may see, from rating_allows() itself, asked once per rating.
  allowed_ratings public.story_rating[] := array(
    select rating from unnest(enum_range(null::public.story_rating)) as rating
    where public.rating_allows(rating));
  -- Everyone the caller blocked or who blocked the caller (CLAUDE.md rule 6).
  blocked_ids uuid[] := array(
    select blocks.blocked_user_id from public.blocks where blocks.user_id = caller_id
    union
    select blocks.user_id from public.blocks where blocks.blocked_user_id = caller_id);
  is_search boolean := list_kind = 'search';
  -- GAPS-6: a reading list's ID, so its few stories are found through the list's own index
  -- instead of asking every story whether it is in the list. Null for every other list.
  reading_list_id uuid := case
    when list_kind = 'reading_list'
      and list_key ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then list_key::uuid end;
  -- MARKETS-2c: the language filter as a list of codes ("sv,en"), or null for every language.
  wanted_languages text[] := case when language is not null then string_to_array(language, ',') end;
  -- COUNTRY-1: where the reader is, read once for the whole list (null when unknown).
  reader_country text := public.viewer_country();
  search_terms tsquery;
  search_pattern text;
begin
  -- Step 1: for a search, the stories that answer it, found through the two indexes.
  if is_search then
    if char_length(public.search_fold(list_key)) < 2 then
      return;
    end if;
    search_terms := public.search_query(list_key);
    search_pattern := public.search_like_pattern(list_key);
  end if;

  -- Step 2: the list, with each rule as a join or a test on the whole set.
  -- story_as_shown() sits in FROM, so it runs once per story: written as
  -- "(story_as_shown(stories)).*" it ran once per column, about forty times per story.
  return query
  select shown.*
  from public.stories
  join public.categories on categories.id = stories.category_id
  cross join lateral public.story_as_shown(stories) as shown
  where stories.deleted_at is null
    -- At least one published chapter that moderators haven't removed (story_has_readable_chapter()).
    and exists (
      select 1 from public.chapters
      where chapters.story_id = stories.id
        and chapters.status = 'published'
        and chapters.deleted_at is null
        -- TRANSLATE-1a: a translated chapter counts only while its original can be read.
        and (chapters.translation_of_chapter_id is null
             or public.chapter_is_readable(chapters.translation_of_chapter_id))
        and not exists (
          select 1 from public.moderated_items
          where moderated_items.item_type = 'chapter' and moderated_items.item_id = chapters.id
            and moderated_items.restored_at is null))
    -- The story itself isn't removed or hidden by moderators (is_moderated_away()).
    and not exists (
      select 1 from public.moderated_items
      where moderated_items.item_type = 'story' and moderated_items.item_id = stories.id
        and moderated_items.restored_at is null)
    -- S1-E8-11: a class-only story is in no public list, only on its class's page.
    and (not stories.class_only or stories.user_id = caller_id)
    -- NEW-1: unlisted stories are in no public list, only in libraries (story_listing_allows()).
    -- A public story always passes, so that common case is answered without the function.
    and (stories.visibility = 'public' or public.story_listing_allows(stories, list_kind))
    -- S1-E11-08: a restricted story still opens, but no list promotes it.
    and (list_kind in ('library', 'reader_library', 'writer', 'reading_list')
         or stories.user_id = caller_id
         or not exists (
           select 1 from public.story_restrictions
           -- TRANSLATE-1a: a restriction on the story holds for its other languages too.
           where story_restrictions.story_id in (stories.id, stories.edition_of_story_id)
             and story_restrictions.lifted_at is null))
    -- CLAUDE.md rules 18 and 6: the rating, and blocks, unless it is the caller's own story.
    and (stories.user_id = caller_id
         or (stories.rating = any (allowed_ratings) and not (stories.user_id = any (blocked_ids))))
    -- COUNTRY-1: not in a country where it is hidden, in every list, the Library included; the
    -- writer still sees their own. A story hidden nowhere passes on the first test.
    and (cardinality(stories.hidden_in_countries) = 0
         or stories.user_id = caller_id
         or reader_country is null
         or not (reader_country = any (stories.hidden_in_countries)))
    -- GAPS-6: for a reading list, only the stories in it are looked at.
    and (list_kind <> 'reading_list' or stories.id in (
          select entries.story_id from public.reading_list_stories as entries
          where entries.list_id = reading_list_id))
    and (category_slug is null or categories.slug = category_slug)
    and (completion is null or stories.completion_status = completion)
    -- MARKETS-2c: one language or several (the languages someone reads).
    and (wanted_languages is null or stories.language_code = any (wanted_languages))
    -- TRANSLATE-1a: a story in several languages is listed once, in this reader's edition
    -- (handoff, "Shelves and search"). A story in one language is answered by the first line,
    -- through the index, without the function.
    and (list_kind in ('library', 'reader_library', 'reading_list')
         or (stories.edition_of_story_id is null and not exists (
               select 1 from public.stories as editions
               where editions.edition_of_story_id = stories.id and editions.deleted_at is null))
         or stories.id = public.best_edition_id(
              coalesce(stories.edition_of_story_id, stories.id), wanted_languages))
    -- The list's own rule: the three open lists hold every story; search uses the indexes; the
    -- rest ask list_holds_story().
    and (
      list_kind in ('updated', 'new', 'popular')
      -- TRANSLATE-1a: a match in any edition finds the story, whichever edition is shown.
      or (is_search and stories.id in (
            select related.id
            from public.story_search_documents as documents
            join public.stories as matched on matched.id = documents.story_id
            join public.stories as related
              on related.id = matched.id
              or related.id = matched.edition_of_story_id
              or related.edition_of_story_id = coalesce(matched.edition_of_story_id, matched.id)
            where documents.document @@ search_terms or documents.search_text like search_pattern))
      or (list_kind not in ('updated', 'new', 'popular', 'search')
          and public.list_holds_story(stories, list_kind, list_key)));
end;
$_$;

comment on function public.listed_stories(text, text, text, public.completion_status, text) is
  'Internal: the stories in a list this reader may see, after the filters (S1-E5-01, GAPS-6, COUNTRY-1).';

-- Step 6: the writer's profile and the featured picks, which read stories themselves.

/**
 * profile_story_cards: a writer's stories as cards on their profile (unchanged but for COUNTRY-1).
 *
 * Inputs: the writer and whether the caller is that writer. Returns: a JSON array of cards.
 * Where it fits: the profile functions (S1-E5-05).
 */
create or replace function public.profile_story_cards(writer_id uuid, is_owner boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
    and (is_owner or raw.visibility = 'public')
    -- COUNTRY-1: nor a story hidden in the reader's country.
    and not public.story_hidden_here(raw.hidden_in_countries, raw.user_id);
$$;

/**
 * featured_stories_now: the staff's featured picks still on show (unchanged but for COUNTRY-1).
 *
 * Inputs: none. Returns: a JSON array of story cards in the staff's order.
 * Where it fits: the Featured row on Home.
 */
create or replace function public.featured_stories_now()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (
    select (select auth.uid()) as id
  ),
  blocked as (
    select blocks.blocked_user_id as person_id from public.blocks, caller where blocks.user_id = caller.id
    union
    select blocks.user_id from public.blocks, caller where blocks.blocked_user_id = caller.id
  )
  select coalesce(jsonb_agg(public.story_card_json(stories.id) order by featured_picks.position), '[]'::jsonb)
  from public.featured_picks
  join public.stories on stories.id = featured_picks.story_id
  where featured_picks.removed_at is null
    -- The story is still open to everyone and nothing has taken it off show.
    and public.featured_ineligible_reason(stories.id) is null
    -- CLAUDE.md rule 18: never above the reader's rating; rule 6: never across a block.
    and public.rating_allows(stories.rating)
    and not exists (select 1 from blocked where blocked.person_id = stories.user_id)
    -- COUNTRY-1: never a story hidden in the reader's country.
    and not public.story_hidden_here(stories.hidden_in_countries, stories.user_id);
$$;

-- Step 7: saving the setting.

/**
 * clean_country_codes: a list of country codes in one form: capitals, no repeats, in order.
 *
 * Inputs: the codes as sent. Returns: the cleaned list (empty for null).
 * Raises check_violation (hint 'invalid_country') for anything that isn't two letters, and
 *   (hint 'too_many_countries') for more than 60.
 * Where it fits: set_my_story_hidden_countries() and admin_set_classic_hidden_countries().
 */
create or replace function public.clean_country_codes(codes text[])
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  cleaned text[];
begin
  -- Step 1: capitals, trimmed, each once, in alphabetical order.
  cleaned := coalesce(array(
    select distinct upper(btrim(code)) from unnest(coalesce(codes, '{}'::text[])) as code
    order by 1), '{}'::text[]);
  -- Step 2: every one a two-letter code, and not too many.
  if exists (select 1 from unnest(cleaned) as code where code !~ '^[A-Z]{2}$') then
    raise exception 'That isn''t a country code.' using errcode = 'check_violation', hint = 'invalid_country';
  end if;
  if cardinality(cleaned) > 60 then
    raise exception 'Choose at most 60 countries.' using errcode = 'check_violation', hint = 'too_many_countries';
  end if;
  return cleaned;
end;
$$;

comment on function public.clean_country_codes(text[]) is
  'Internal: country codes in capitals, each once, sorted; refuses anything else (COUNTRY-1).';
revoke all on function public.clean_country_codes(text[]) from public;

/**
 * set_story_family_hidden_countries: writes the list to a story and every edition of it.
 *
 * Inputs: any one edition's id and the cleaned list. Returns nothing.
 * Where it fits: the two setters below (TRANSLATE-1a: the editions are one story to readers).
 */
create or replace function public.set_story_family_hidden_countries(target_story_id uuid, countries text[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.stories set hidden_in_countries = countries
  where stories.id = (select coalesce(original.edition_of_story_id, original.id)
                      from public.stories as original where original.id = target_story_id)
     or stories.edition_of_story_id = (select coalesce(original.edition_of_story_id, original.id)
                      from public.stories as original where original.id = target_story_id);
$$;

comment on function public.set_story_family_hidden_countries(uuid, text[]) is
  'Internal: sets the countries where a story is hidden on every edition of it (COUNTRY-1, TRANSLATE-1a).';
revoke all on function public.set_story_family_hidden_countries(uuid, text[]) from public;

/**
 * set_my_story_hidden_countries: the writer chooses the countries where their story is hidden
 * (board D07, Story settings › Where it shows).
 *
 * Inputs: the story's address and the countries (an empty list shows it everywhere).
 * Returns: {"outcome": "ok" | "not_active" | "not_found"}.
 * Raises insufficient_privilege when signed out; check_violation for a bad code (see
 *   clean_country_codes()).
 * Where it fits: updateMyStory() in src/features/writing/api/stories.ts, after the other settings.
 */
create or replace function public.set_my_story_hidden_countries(story_slug text, countries text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_story_id uuid;
  cleaned text[] := public.clean_country_codes(countries);
begin
  -- Step 1: a signed-in writer who may write, and their own live story.
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
  -- Step 2: save it on every edition. Library entries and follows stay as they are; readers
  -- there simply stop seeing the story until it is shown there again.
  perform public.set_story_family_hidden_countries(target_story_id, cleaned);
  return jsonb_build_object('outcome', 'ok');
end;
$$;

comment on function public.set_my_story_hidden_countries(text, text[]) is
  'The writer sets the countries where their story is hidden (COUNTRY-1, board D07).';
revoke all on function public.set_my_story_hidden_countries(text, text[]) from public;
grant execute on function public.set_my_story_hidden_countries(text, text[]) to authenticated;

-- Step 8: classics. Staff see the setting with the work and change it with the classics role.

/**
 * classic_work_json: a classic for the staff's Classics screen (S1-E11-16), now with
 * hidden_in_countries (COUNTRY-1, board S29).
 *
 * Inputs: the work's story id. Returns: the JSON, or null when it isn't a live classic.
 */
create or replace function public.classic_work_json(target_story_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'story_id', stories.id, 'slug', stories.slug, 'title', stories.title, 'blurb', stories.blurb,
    'language_code', stories.language_code, 'rating', stories.rating,
    'content_note', stories.content_note,
    'category_slug', (select categories.slug from public.categories where categories.id = stories.category_id),
    'author', jsonb_build_object('id', classic_authors.id, 'name', classic_authors.name,
      'died_year', classic_authors.died_year),
    'kind', works.kind, 'original_language', works.original_language,
    'source_title', works.source_title, 'source_url', works.source_url,
    'translator_name', works.translator_name, 'translator_died_year', works.translator_died_year,
    'translation_rights', works.translation_rights,
    'edition_of_story_id', stories.edition_of_story_id,
    'first_published_year', works.first_published_year,
    'details_checked', works.details_checked,
    'free_markets', public.classic_free_markets(classic_authors.died_year,
      case when works.translation_rights in ('signed_licence', 'made_for_platform') then null
           else works.translator_died_year end,
      works.first_published_year, (now() at time zone 'Europe/Bucharest')::date),
    -- COUNTRY-1: the countries where readers can't find or open it.
    'hidden_in_countries', to_jsonb(stories.hidden_in_countries),
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object('code', chapters.code, 'title', chapters.draft_title,
          'word_count', chapters.word_count, 'status', chapters.status) order by chapters.position)
      from public.chapters
      where chapters.story_id = stories.id and chapters.deleted_at is null), '[]'::jsonb),
    -- Once any chapter has been live, the text can't be replaced, only corrected (16b).
    'was_published', exists (select 1 from public.chapters where chapters.story_id = stories.id
      and chapters.deleted_at is null and chapters.first_published_at is not null),
    'updated_at', greatest(stories.updated_at, works.updated_at))
  from public.stories
  join public.classic_works as works on works.story_id = stories.id
  join public.classic_authors on classic_authors.id = stories.classic_author_id
  where stories.id = target_story_id and stories.deleted_at is null;
$$;

/**
 * admin_set_classic_hidden_countries: staff choose the countries where a classic is hidden
 * (board S29, Edit details › Where it shows).
 *
 * Inputs: the work's story id and the countries (empty shows it everywhere).
 * Returns: the work as classic_work_json() gives it.
 * Raises insufficient_privilege without the classics role (require_classics_staff());
 *   no_data_found (hint 'not_a_classic'); check_violation for a bad code.
 * Where it fits: setClassicHiddenCountries() in src/features/staff/api/classics.ts. Every change
 *   is in the audit log with the list before and after (architecture 1.8.1).
 */
create or replace function public.admin_set_classic_hidden_countries(target_story_id uuid, countries text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned text[] := public.clean_country_codes(countries);
  before_countries text[];
begin
  -- Step 1: staff with the classics role, and a live classic.
  perform public.require_classics_staff();
  if public.classic_work_json(target_story_id) is null then
    raise exception 'That isn''t a classic.' using errcode = 'no_data_found', hint = 'not_a_classic';
  end if;
  -- Step 2: save it on every edition, and log the change with both lists.
  select hidden_in_countries into before_countries from public.stories where stories.id = target_story_id;
  perform public.set_story_family_hidden_countries(target_story_id, cleaned);
  perform public.log_staff_action('classics.hidden_countries_changed', 'stories', target_story_id::text,
    public.classics_account_id(), 'Where it shows',
    jsonb_build_object('hidden_in_countries', to_jsonb(before_countries)),
    jsonb_build_object('hidden_in_countries', to_jsonb(cleaned)));
  return public.classic_work_json(target_story_id);
end;
$$;

comment on function public.admin_set_classic_hidden_countries(uuid, text[]) is
  'Staff with the classics role set the countries where a classic is hidden, logged (COUNTRY-1, board S29).';
revoke all on function public.admin_set_classic_hidden_countries(uuid, text[]) from public;
grant execute on function public.admin_set_classic_hidden_countries(uuid, text[]) to authenticated;

-- Step 9: a new edition (a translation, TRANSLATE-1a) starts hidden where its original is, so the
-- editions never disagree.

/**
 * copy_hidden_countries_to_new_edition: trigger function, before a story is inserted.
 *
 * Inputs: the new row. Returns: the row with the original's hidden_in_countries when it is an
 *   edition of another story; any other row unchanged. Raises nothing.
 * Where it fits: stories_copy_hidden_countries (below), for create_story_translation() and
 *   admin_save_classic_work() alike.
 */
create or replace function public.copy_hidden_countries_to_new_edition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.edition_of_story_id is not null then
    select original.hidden_in_countries into new.hidden_in_countries
    from public.stories as original where original.id = new.edition_of_story_id;
    new.hidden_in_countries := coalesce(new.hidden_in_countries, '{}'::text[]);
  end if;
  return new;
end;
$$;

comment on function public.copy_hidden_countries_to_new_edition() is
  'Internal trigger: a new edition starts hidden in the same countries as its original (COUNTRY-1).';
revoke all on function public.copy_hidden_countries_to_new_edition() from public;

create trigger stories_copy_hidden_countries
  before insert on public.stories
  for each row execute function public.copy_hidden_countries_to_new_edition();

-- Step 10: the story page reads the story itself (ADR 0004), so it gets the same rule. The body is
-- as before (S1-E3-05 and later bundles) with one more check for readers.

/**
 * get_story_page: the public story page, or null when the reader may not see it; never the user
 * ID (S1-E3-05, ADR 0004). COUNTRY-1 adds: null in a country where the story is hidden.
 *
 * Inputs: the story's address. Returns: the page's JSON, or null.
 * Where it fits: StoryPage through useStoryPage; on null the page asks story_unavailable_here().
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
    -- COUNTRY-1: nor in a country where the writer (or staff, for a classic) hid it.
    if public.story_hidden_here(story.hidden_in_countries, story.user_id) then
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
    -- CALM-6: "of N" only while a last chapter is marked, and the next scheduled chapter.
    'last_chapter_number', public.story_last_chapter_number(story.id),
    'next_chapter', public.next_chapter_json(story.id),
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

