/**
 * LOCALISE-2: an unfinished translation shows the whole English page, not English field by field.
 *
 * Robert, 12 Nov 2026 (Builder thread): "if a page is not fully completed, then it falls to the
 * English version". This closes the question LOCALISE-1 left open and replaces its choice of
 * filling each empty field from English, which mixed two languages on one page.
 *
 * What changes in the database:
 * 1. cms_is_fully_translated() says whether a translation has every text the English page has
 *    (a field the English page leaves empty is not asked of it).
 * 2. website_content() shows a translation only when it is fully translated; until then the
 *    visitor reads the English page of that entry, marked as English (language_code 'en').
 * Nothing changes for staff: a translation can still be saved and published with empty fields, so
 * work in progress is kept; it starts showing the day its last field is filled and published.
 *
 * Who calls these: the public pages (src/features/website/api/websiteContentStore.ts) and
 * server/website-head.ts, both through website_content().
 */

/**
 * cms_is_fully_translated: whether a translation leaves nothing to the English page.
 *
 * @param translation - the translation's content (or one field of it); null when it is missing
 * @param english_page - the English content of the same entry (or the same field of it); null
 *   when there is none
 * @returns true when every text the English page has written is also written in the translation
 *   (objects are compared field by field, lists item by item); a field the English page leaves
 *   empty is never asked of the translation, numbers and switches are not compared, and the
 *   optional search fields ("search") are left out
 * Where it fits: website_content(), to decide between the translation and the whole English page
 * (LOCALISE-2). Raises nothing, whatever shape either side has.
 */
create or replace function public.cms_is_fully_translated(translation jsonb, english_page jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  -- Step 1: nothing in English to compare with: nothing is missing.
  if english_page is null or english_page = 'null'::jsonb then return true; end if;
  -- Step 2: an English text asks for a text in the translation, unless the English one is empty.
  if jsonb_typeof(english_page) = 'string' then
    if btrim(english_page #>> '{}') = '' then return true; end if;
    return translation is not null
      and jsonb_typeof(translation) = 'string'
      and btrim(translation #>> '{}') <> '';
  end if;
  -- Step 3: an object is checked field by field. A translation of another shape has no fields.
  -- The search fields ("search": title and description for search engines, SEO-1b) are optional
  -- extras with defaults of their own, so leaving them empty never holds a translation back.
  if jsonb_typeof(english_page) = 'object' then
    return not exists (
      select 1
      from jsonb_each(english_page) as fields (name, english_value)
      where fields.name <> 'search'
        and not public.cms_is_fully_translated(
        case when jsonb_typeof(translation) = 'object' then translation -> fields.name end,
        fields.english_value)
    );
  end if;
  -- Step 4: a list is checked item by item, so a shorter translated list is not complete.
  if jsonb_typeof(english_page) = 'array' then
    return not exists (
      select 1
      from jsonb_array_elements(english_page) with ordinality as items (english_value, place)
      where not public.cms_is_fully_translated(
        case when jsonb_typeof(translation) = 'array' then translation -> (items.place - 1)::int end,
        items.english_value)
    );
  end if;
  -- Step 5: numbers and switches are settings, not words to translate.
  return true;
end;
$$;

comment on function public.cms_is_fully_translated(jsonb, jsonb) is
  'Internal: true when a translation has every text its English page has (LOCALISE-2).';
revoke execute on function public.cms_is_fully_translated(jsonb, jsonb) from public, anon, authenticated;

comment on function public.cms_fill_empty(jsonb, jsonb) is
  'Internal: a translation with its empty fields filled from the English page. No longer used by website_content() since LOCALISE-2; kept for its tests and for a later "copy from English" in the editor.';

/**
 * website_content: the live website content of one kind for a visitor.
 *
 * @param wanted_kind - 'home_page', 'notice', 'help_page' or 'question'
 * @param visitor_country - the country in the address or of the connection; unknown is fine
 * @param wanted_language - the language in the address or of the interface; unknown means English
 * @returns one row per entry: its address, the country its wording is for (null for the shared
 *   page), the language it is shown in, the content and its dates
 * Where it fits: the public pages and the server's head tags. For each entry the wanted language
 * comes before English, and the country's own wording before the shared page. A translation that
 * is not fully translated is not shown: the visitor reads the whole English page of that entry
 * instead (LOCALISE-2, Robert, 12 Nov 2026; replaces filling each empty field, LOCALISE-1).
 * Never a draft. Raises nothing.
 */
create or replace function public.website_content(
  wanted_kind text,
  visitor_country text default null,
  wanted_language text default null
)
returns table (entry_key text, market_code text, language_code text, content jsonb, show_from date, show_until date)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  country text;
  language text;
begin
  -- Step 1: a country we know, or none; a language we know, or English.
  select markets.country_code into country
  from public.markets where markets.country_code = upper(coalesce(visitor_country, ''));
  select languages.code into language
  from public.languages where languages.code = wanted_language;
  language := coalesce(language, 'en');
  -- Step 2: a notice holds every language in one row; it shows in the wanted language when it has
  -- that text, else in English.
  if wanted_kind = 'notice' then
    return query
    select live.entry_key, live.market_code,
      case when btrim(coalesce(live.content -> 'texts' ->> language, '')) <> '' then language else 'en' end,
      live.content, live.show_from, live.show_until
    from public.cms_live_versions('notice') as live
    where live.market_code is null or live.market_code = country
    order by live.entry_key;
    return;
  end if;
  -- Step 3: every other kind. Per entry: the best row in the wanted language, and the best
  -- English row. The wanted one shows only when it is fully translated; else the English one.
  return query
  with candidates as (
    select live.*
    from public.cms_live_versions(wanted_kind) as live
    where (live.market_code is null or live.market_code = country)
      and live.language_code in (language, 'en')
  ),
  chosen as (
    select distinct on (candidates.entry_key) candidates.*
    from candidates
    order by candidates.entry_key, (candidates.language_code = language) desc, (candidates.market_code is not null) desc
  ),
  english as (
    select distinct on (candidates.entry_key) candidates.*
    from candidates
    where candidates.language_code = 'en'
    order by candidates.entry_key, (candidates.market_code is not null) desc
  ),
  judged as (
    select chosen.entry_key as judged_key,
      chosen.language_code <> 'en'
        and english.entry_key is not null
        and not public.cms_is_fully_translated(chosen.content, english.content) as shows_english
    from chosen
    left join english on english.entry_key = chosen.entry_key
  )
  select shown.entry_key, shown.market_code, shown.language_code, shown.content, shown.show_from, shown.show_until
  from judged
  join chosen on chosen.entry_key = judged.judged_key
  left join english on english.entry_key = judged.judged_key
  cross join lateral (
    select chosen.entry_key, chosen.market_code, chosen.language_code, chosen.content, chosen.show_from, chosen.show_until
    where not judged.shows_english
    union all
    select english.entry_key, english.market_code, english.language_code, english.content, english.show_from, english.show_until
    where judged.shows_english
  ) as shown
  order by shown.entry_key;
end;
$$;

comment on function public.website_content(text, text, text) is
  'The live website content of one kind for a visitor''s country and language: the wanted language before English, the country''s wording before the shared page; a translation with anything missing gives way to the whole English page (S1-E11-06; LOCALISE-1; LOCALISE-2).';
