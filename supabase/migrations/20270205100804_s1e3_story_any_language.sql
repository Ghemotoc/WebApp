-- S1-E3-01: a story may be written in any language of the world, and readers' language filters
-- list only the languages stories are written in.
--
-- Decision: Robert, 26 Nov 2026, 19:19 UTC: "Add also all languages to the language of the work -
-- we will get an AI moderator eventually." Then, 19:21 UTC: "Only the languages currently written
-- in. But the writer can pick the language from an all language list. Yes on the tags."
-- Until now a story's language had to be an open row of public.languages (S1-E11-05: a language
-- opened only once a moderator read it). That rule goes for stories; the languages table still
-- decides the interface, the emails and which moderators read what, and moderation does not change.
--
-- 1. world_language_codes(): every ISO 639-1 language code (182 since "bh" was withdrawn). The
--    same list is src/lib/world-languages.ts, which the writer's picker offers; a Vitest test
--    (src/lib/world-languages.test.ts) reads this file and fails when the two lists differ.
-- 2. is_story_language_code(): a code a story may be written in: a world language, or any code
--    already in the languages table (so an older story in a regional code still saves).
-- 3. check_story_basics(): the language rule asks is_story_language_code() instead of
--    open_story_languages(). Every way a story's language is set goes through it: create_story(),
--    the writer's and staff's settings and add_story_language() (an edition's language must still
--    differ from the story's other languages; add_story_language() checks that itself).
-- 4. set_my_reading_languages(): a reader may tick any story language, not only the table's.
-- 5. story_languages_written_in(): the languages at least one story this reader may see is
--    written in, for Discover's and search's language filters and Settings › Reading languages.
-- Who calls them: create_story() and the other story functions (1 to 3), the Settings page (4) and
-- src/features/discovery/api/writtenLanguages.ts (5).

/**
 * world_language_codes: every two-letter ISO 639-1 language code, in alphabetical order.
 * Inputs: none. Returns: the codes as a text array. Errors: none.
 * Where it fits: is_story_language_code(); mirrors src/lib/world-languages.ts.
 */
create or replace function public.world_language_codes()
returns text[]
language sql
immutable
set search_path = ''
as $$
  -- world-language-codes:start
  select array[
    'aa', 'ab', 'ae', 'af', 'ak', 'am', 'an', 'ar', 'as', 'av', 'ay', 'az',
    'ba', 'be', 'bg', 'bi', 'bm', 'bn', 'bo', 'br', 'bs',
    'ca', 'ce', 'ch', 'co', 'cr', 'cs', 'cu', 'cv', 'cy',
    'da', 'de', 'dv', 'dz',
    'ee', 'el', 'en', 'eo', 'es', 'et', 'eu',
    'fa', 'ff', 'fi', 'fj', 'fo', 'fr', 'fy',
    'ga', 'gd', 'gl', 'gn', 'gu', 'gv',
    'ha', 'he', 'hi', 'ho', 'hr', 'ht', 'hu', 'hy', 'hz',
    'ia', 'id', 'ie', 'ig', 'ii', 'ik', 'io', 'is', 'it', 'iu',
    'ja', 'jv',
    'ka', 'kg', 'ki', 'kj', 'kk', 'kl', 'km', 'kn', 'ko', 'kr', 'ks', 'ku', 'kv', 'kw', 'ky',
    'la', 'lb', 'lg', 'li', 'ln', 'lo', 'lt', 'lu', 'lv',
    'mg', 'mh', 'mi', 'mk', 'ml', 'mn', 'mr', 'ms', 'mt', 'my',
    'na', 'nb', 'nd', 'ne', 'ng', 'nl', 'nn', 'no', 'nr', 'nv', 'ny',
    'oc', 'oj', 'om', 'or', 'os',
    'pa', 'pi', 'pl', 'ps', 'pt',
    'qu',
    'rm', 'rn', 'ro', 'ru', 'rw',
    'sa', 'sc', 'sd', 'se', 'sg', 'si', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sr', 'ss', 'st',
    'su', 'sv', 'sw',
    'ta', 'te', 'tg', 'th', 'ti', 'tk', 'tl', 'tn', 'to', 'tr', 'ts', 'tt', 'tw', 'ty',
    'ug', 'uk', 'ur', 'uz',
    've', 'vi', 'vo',
    'wa', 'wo',
    'xh',
    'yi', 'yo',
    'za', 'zu'
  ]::text[];
  -- world-language-codes:end
$$;

comment on function public.world_language_codes() is
  'Every ISO 639-1 language code, the languages a story may be written in (S1-E3-01; Robert, 26 Nov 2026).';

revoke all on function public.world_language_codes() from public, anon, authenticated;

/**
 * is_story_language_code: whether a story may be written in this language.
 * Inputs: a language code such as 'ja'. Returns: true for a world language or a code already in
 * the languages table; false otherwise, and for null. Errors: none.
 * Where it fits: check_story_basics() and set_my_reading_languages().
 */
create or replace function public.is_story_language_code(code text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    code = any (public.world_language_codes())
      or exists (select 1 from public.languages where languages.code = is_story_language_code.code),
    false);
$$;

comment on function public.is_story_language_code(text) is
  'Internal: a code a story may be written in: any ISO 639-1 language, or a row of the languages table (S1-E3-01).';

revoke all on function public.is_story_language_code(text) from public, anon, authenticated;

/**
 * check_story_basics: the title, blurb, language and category rules every story function shares.
 * Inputs: the cleaned title and blurb, the language code and the category's slug.
 * Returns: the category's ID.
 * Errors: check_violation for a title outside 1 to 120 characters, a blurb over 500, a code that
 * isn't a language or an unknown category.
 * Where it fits: create_story(), the settings functions, add_story_language() and
 * update_story_language().
 */
create or replace function public.check_story_basics(
  clean_title text, clean_blurb text, language_code text, category_slug text)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  chosen_category_id uuid;
begin
  -- Step 1: the title and the blurb fit their limits (S1-E3-01).
  if char_length(clean_title) not between 1 and 120 then
    raise exception 'A title needs 1 to 120 characters (S1-E3-01).' using errcode = 'check_violation';
  end if;
  if char_length(clean_blurb) > 500 then
    raise exception 'A blurb can have at most 500 characters (S1-E3-01).' using errcode = 'check_violation';
  end if;
  -- Step 2: any language of the world (Robert, 26 Nov 2026), no longer only an open one.
  if not public.is_story_language_code(language_code) then
    raise exception 'A story''s language must be a language code such as "ro" (S1-E3-01).'
      using errcode = 'check_violation';
  end if;
  -- Step 3: a category the platform has.
  select categories.id into chosen_category_id from public.categories where categories.slug = category_slug;
  if chosen_category_id is null then
    raise exception 'Unknown category "%" (S1-E3-01).', coalesce(category_slug, 'none') using errcode = 'check_violation';
  end if;
  return chosen_category_id;
end;
$$;

comment on function public.check_story_basics(text, text, text, text) is
  'Internal: the title, blurb, language (any world language since 26 Nov 2026) and category rules; returns the category ID (S1-E3-05).';

/**
 * set_my_reading_languages: a member saves the story languages they read (MARKETS-2c).
 * Inputs: the codes in the member's order; empty or null goes back to the default.
 * Returns: the saved codes, or null for the default.
 * Errors: insufficient_privilege when signed out; check_violation with hint too_many for more than
 * ten, or unknown_language for a code no story may be written in.
 * Where it fits: Settings › Language (ReadingLanguagesSection).
 */
create or replace function public.set_my_reading_languages(wanted text[])
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  cleaned text[];
begin
  -- Step 1: a signed-in member.
  if me is null then
    raise exception 'Sign in to choose the languages you read.' using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: drop repeats and blanks, keeping the order given.
  select array_agg(code order by first_position) into cleaned
  from (
    select btrim(code) as code, min(position) as first_position
    from unnest(coalesce(wanted, '{}')) with ordinality as given(code, position)
    where btrim(code) <> ''
    group by btrim(code)) as unique_codes;
  -- Step 3: nothing picked means the default.
  if cleaned is null then
    update public.profiles set reading_languages = null where id = me;
    return null;
  end if;
  if cardinality(cleaned) > 10 then
    raise exception 'Pick up to ten languages.' using errcode = 'check_violation', hint = 'too_many';
  end if;
  -- Step 4: every code must be a language stories can be written in, which since S1-E3-01
  -- (Robert, 26 Nov 2026) is any language of the world.
  if exists (select 1 from unnest(cleaned) as picked(picked_code)
             where not public.is_story_language_code(picked.picked_code)) then
    raise exception 'That isn''t a story language.' using errcode = 'check_violation', hint = 'unknown_language';
  end if;
  update public.profiles set reading_languages = cleaned where id = me;
  return cleaned;
end;
$$;

comment on function public.set_my_reading_languages(text[]) is
  'A member saves the story languages they read; empty goes back to the default (MARKETS-2c, S1-E3-01).';

/**
 * story_languages_written_in: the languages that at least one story this reader may see is
 * written in, in any of its language editions.
 * Inputs: none; the reader is the caller (signed out works too).
 * Returns: the language codes, in code order.
 * Errors: none.
 * Where it fits: the language filters on Discover's See all pages and search, and the choices in
 * Settings › Reading languages (Robert, 26 Nov 2026: "Only the languages currently written in").
 * The visibility rules are listed_stories()'s, so a story the reader can't see (its rating,
 * blocks, moderation, the country, a class-only or unlisted story) adds no language.
 */
create or replace function public.story_languages_written_in()
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  -- listed_stories() shows a story in several languages once, so each shown story is widened
  -- back to every edition of it that can itself be read.
  select distinct editions.language_code
  from public.listed_stories('popular', null, null, null, null) as shown
  join public.stories as editions
    on coalesce(editions.edition_of_story_id, editions.id) = coalesce(shown.edition_of_story_id, shown.id)
  where editions.deleted_at is null
    and public.story_has_readable_chapter(editions.id)
    and not public.is_moderated_away('story', editions.id)
  order by editions.language_code;
$$;

comment on function public.story_languages_written_in() is
  'The languages at least one story this reader may see is written in, for the readers'' language filters (S1-E3-01; Robert, 26 Nov 2026).';

revoke all on function public.story_languages_written_in() from public;
grant execute on function public.story_languages_written_in() to anon, authenticated;

comment on function public.open_story_languages() is
  'The open languages of the languages table. Since S1-E3-01 (26 Nov 2026) a story may be written in any language (is_story_language_code()); this list no longer limits it.';
