/**
 * LOCALISE-1: one website page, translated into each language, instead of one page per country.
 *
 * Robert, 11 Nov 2026: "I want the pages translations per market to be done via localisation, not
 * via multiple pages - so one page should be able to translate into multiple languages via the
 * admin", with addresses like /se/sv/help and /se/en/help ("Country and language always"), and
 * "on the admin side, on the side, I can select the language and edit things as needed".
 *
 * What changes in the database:
 * 1. cms_versions.market_code may be empty (null). A row with no country is the shared page: it
 *    shows in every country. A row with a country is wording for that country only, for the few
 *    cases a country needs its own. The pages written so far (all for Romania) become the shared
 *    pages, in Romanian and English.
 * 2. The shared page can be written in every interface language (languages.is_interface). English
 *    is the main language: a translation may leave fields empty and website_content() fills each
 *    empty field from the English page (Builder's choice; "empty fields fall back to English" is
 *    OPEN for Robert).
 * 3. website_content() picks, for each entry, the wanted language before English and the country's
 *    own wording before the shared page.
 * 4. The sitemap lists the new addresses, /<country>/<language>/..., for each open market.
 *
 * Who calls these: the staff Website editors (src/features/website/api/staff/), the public pages
 * (src/features/website/api/websiteContentStore.ts) and server/website-head.ts, server/sitemap.ts.
 */

-- Step 1: the country becomes optional. Null means every country (the shared page).
alter table public.cms_versions alter column market_code drop not null;

comment on column public.cms_versions.market_code is
  'The country this wording is for; null for the shared page every country sees (LOCALISE-1).';

comment on table public.cms_versions is
  'kind: platform
Every version of the website''s pages, notices, help pages and questions. One page per entry, translated per language; market_code is null for the shared page and set only for wording one country needs (S1-E11-06, 10, 12; LOCALISE-1). Staff-written site copy, not user content; user_id is the admin who saved it.';

-- Step 2: the pages written for Romania become the shared pages. Rows for any other country stay
-- as that country's own wording.
update public.cms_versions set market_code = null where market_code = 'RO';

-- Step 3: one draft per entry, country (or none) and language.
drop index if exists public.cms_versions_one_draft;
create unique index cms_versions_one_draft
  on public.cms_versions (content_kind, entry_key, coalesce(market_code, ''), coalesce(language_code, ''))
  where status = 'draft';

/**
 * cms_fill_empty: fills the empty fields of a translation from the English page.
 *
 * @param wanted - the translation's content (or one field of it)
 * @param fallback - the English content (or the same field of it); null when there is none
 * @returns the translation, with every missing or empty text taken from the English page; lists
 *   are filled item by item
 * Where it fits: website_content(), so a half-translated page shows English for the rest instead
 * of a gap (LOCALISE-1; Builder's choice, OPEN for Robert). Raises nothing.
 */
create or replace function public.cms_fill_empty(wanted jsonb, fallback jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
begin
  -- Step 1: nothing to fill from, or nothing written: the other side as it is.
  if fallback is null then return wanted; end if;
  if wanted is null or wanted = 'null'::jsonb then return fallback; end if;
  -- Step 2: an empty text takes the English text.
  if jsonb_typeof(wanted) = 'string' then
    if btrim(wanted #>> '{}') = '' and jsonb_typeof(fallback) = 'string' then return fallback; end if;
    return wanted;
  end if;
  -- Step 3: an object is filled field by field, the English page's extra fields included.
  if jsonb_typeof(wanted) = 'object' and jsonb_typeof(fallback) = 'object' then
    return (
      select coalesce(jsonb_object_agg(fields.name, public.cms_fill_empty(wanted -> fields.name, fallback -> fields.name)), '{}'::jsonb)
      from (
        select jsonb_object_keys(wanted) as name
        union
        select jsonb_object_keys(fallback)
      ) as fields
    );
  end if;
  -- Step 4: a list is filled item by item.
  if jsonb_typeof(wanted) = 'array' and jsonb_typeof(fallback) = 'array' then
    return (
      select coalesce(jsonb_agg(public.cms_fill_empty(wanted -> places.position, fallback -> places.position) order by places.position), '[]'::jsonb)
      from generate_series(0, greatest(jsonb_array_length(wanted), jsonb_array_length(fallback)) - 1) as places (position)
    );
  end if;
  -- Step 5: anything else (a number, a switch, a different shape) stays as written.
  return wanted;
end;
$$;

comment on function public.cms_fill_empty(jsonb, jsonb) is
  'Internal: a translation with its empty fields filled from the English page (LOCALISE-1).';
revoke execute on function public.cms_fill_empty(jsonb, jsonb) from public, anon, authenticated;

/**
 * website_content: the live website content of one kind for a visitor.
 *
 * @param wanted_kind - 'home_page', 'notice', 'help_page' or 'question'
 * @param visitor_country - the country in the address or of the connection; unknown is fine
 * @param wanted_language - the language in the address or of the interface; unknown means English
 * @returns one row per entry: its address, the country its wording is for (null for the shared
 *   page), the language it is shown in, the content and its dates
 * Where it fits: the public pages and the server's head tags. For each entry the wanted language
 * comes before English, and the country's own wording before the shared page; a translation's
 * empty fields come from the English page (LOCALISE-1; replaces "Romania in English" for a country
 * with no page of its own, 17 Oct 2026, 19:16). Never a draft. Raises nothing.
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
  -- Step 3: every other kind: per entry, the best row, then its empty fields from English.
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
    select distinct on (candidates.entry_key) candidates.entry_key as english_key, candidates.content as english_content
    from candidates
    where candidates.language_code = 'en'
    order by candidates.entry_key, (candidates.market_code is not null) desc
  )
  select chosen.entry_key, chosen.market_code, chosen.language_code,
    case when chosen.language_code = 'en' then chosen.content
      else public.cms_fill_empty(chosen.content, english.english_content) end,
    chosen.show_from, chosen.show_until
  from chosen
  left join english on english.english_key = chosen.entry_key
  order by chosen.entry_key;
end;
$$;

comment on function public.website_content(text, text, text) is
  'The live website content of one kind for a visitor''s country and language: the wanted language before English, the country''s wording before the shared page, empty fields from English (S1-E11-06; LOCALISE-1).';

/**
 * cms_entry_problem: why a draft can't be saved at a place.
 *
 * @param wanted_kind - the content kind
 * @param wanted_key - the entry's address
 * @param wanted_market - the country, or null for the shared page
 * @param wanted_language - the language, or null for a notice
 * @returns a reason word, or null when the place is fine
 * Where it fits: admin_save_cms_draft(). The shared page takes every interface language; a
 * country's wording takes that country's languages (LOCALISE-1).
 */
create or replace function public.cms_entry_problem(
  wanted_kind text,
  wanted_key text,
  wanted_market text,
  wanted_language text
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when wanted_kind not in ('home_page', 'notice', 'help_page', 'question') then 'unknown_kind'
    when wanted_key !~ '^[a-z0-9][a-z0-9-]{0,59}$' then 'bad_address'
    when wanted_kind = 'home_page' and wanted_key <> 'home' then 'bad_address'
    when wanted_market is not null
      and not exists (select 1 from public.markets where country_code = wanted_market) then 'unknown_market'
    when wanted_kind = 'notice' and wanted_language is not null then 'unknown_language'
    when wanted_kind <> 'notice' and wanted_market is null and not exists (
      select 1 from public.languages where code = wanted_language and is_interface
    ) then 'unknown_language'
    when wanted_kind <> 'notice' and wanted_market is not null and not exists (
      select 1 from public.markets
      where country_code = wanted_market and wanted_language = any (languages)
    ) then 'unknown_language'
  end;
$$;

/**
 * cms_link_problems: links to our own pages that don't exist.
 *
 * @param markdown - the text with its links
 * @param market - the country the text is for, or null for the shared page
 * @param field_name - the field, for the answer
 * @returns field:broken_link:address for each link that leads nowhere
 * Where it fits: cms_content_problems(). A help page link must lead to a shared help page or one
 * of the same country (LOCALISE-1). Links are written without the country and language
 * ("/help/reporting"); the page adds them when it shows the text.
 */
create or replace function public.cms_link_problems(markdown text, market text, field_name text)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(field_name || ':broken_link:' || links.address), array[]::text[])
  from (
    select (regexp_matches(coalesce(markdown, ''), '\]\((/[^)\s]*)\)', 'g'))[1] as address
  ) as links
  where case
    -- A help page must exist as a shared page or in the same country, live or drafted.
    when links.address ~ '^/help/[a-z0-9-]+$' then not exists (
      select 1 from public.cms_versions as versions
      where versions.content_kind = 'help_page'
        and (versions.market_code is null or versions.market_code = market)
        and versions.entry_key = substring(links.address from '^/help/([a-z0-9-]+)$')
    )
    -- A landing page must exist and not be archived (CONTESTS-13a2c).
    when links.address ~ '^/c/[a-z0-9-]+/?$' then not exists (
      select 1 from public.landing_pages as pages
      where pages.slug = substring(links.address from '^/c/([a-z0-9-]+)')
        and pages.archived_at is null
    )
    -- Otherwise the path must start with one of the app's public addresses.
    else links.address !~ '^/(help|legal(/[a-z-]+)?|discover|sign-up|sign-in|contact|report|write|settings|moderator-mail|my-reports|s/[a-z0-9-]+|u/[A-Za-z0-9._-]+)?/?(#[a-z0-9-]+)?$'
  end;
$$;

/**
 * cms_content_problems: what stops a website content version from being published.
 *
 * @param version_row - the version
 * @returns field:problem pairs ("lede:empty", "body:too_long"); an empty array when all is well
 * Where it fits: admin_publish_cms_version() and the editors' list of fields to fix. A translation
 * of the shared page (any language but English) may leave fields empty once the English page
 * exists: the page shows English there (LOCALISE-1). A shared notice needs its English text only.
 */
create or replace function public.cms_content_problems(version_row public.cms_versions)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  body jsonb := version_row.content;
  problems text[] := array[]::text[];
  notice_languages text[];
  language text;
begin
  if version_row.content_kind = 'home_page' then
    -- A home page: its own fields, then its search fields (S1-E11-37).
    problems := public.cms_home_page_problems(body) || public.cms_search_problems(body -> 'search');
  elsif version_row.content_kind = 'question' then
    -- A question: the question, the answer (safe Markdown) and where it shows.
    problems := problems || public.cms_text_problem(body ->> 'question', 'question', 160)
      || public.cms_text_problem(body ->> 'answer', 'answer', 1500)
      || public.cms_link_problems(body ->> 'answer', version_row.market_code, 'answer');
    if coalesce(body ->> 'showOn', '') not in ('home', 'help', 'both') then problems := problems || 'showOn:empty'::text; end if;
  elsif version_row.content_kind = 'help_page' then
    -- A help page: its title, section and body (safe Markdown), then its search fields.
    problems := problems || public.cms_text_problem(body ->> 'title', 'title', 80)
      || public.cms_text_problem(body ->> 'section', 'section', 40)
      || public.cms_text_problem(body ->> 'body', 'body', 20000)
      || public.cms_link_problems(body ->> 'body', version_row.market_code, 'body')
      || public.cms_search_problems(body -> 'search');
  else
    -- A notice: a country's notice needs the text in every language of that country (S1-E11-10
    -- criterion 2); a shared notice needs English, and any other language only fits the length.
    if version_row.market_code is null then
      problems := problems || public.cms_text_problem(body -> 'texts' ->> 'en', 'texts.en', 120);
      select array_agg(languages.code order by languages.code) into notice_languages
      from public.languages where languages.is_interface and languages.code <> 'en';
      foreach language in array coalesce(notice_languages, array[]::text[]) loop
        if char_length(coalesce(body -> 'texts' ->> language, '')) > 120 then
          problems := problems || ('texts.' || language || ':too_long');
        end if;
      end loop;
    else
      select markets.languages into notice_languages from public.markets where markets.country_code = version_row.market_code;
      foreach language in array coalesce(notice_languages, array[]::text[]) loop
        problems := problems || public.cms_text_problem(body -> 'texts' ->> language, 'texts.' || language, 120);
      end loop;
    end if;
    if coalesce(body ->> 'noticeType', '') not in ('news', 'contest', 'important') then problems := problems || 'noticeType:empty'::text; end if;
    if coalesce(body ->> 'showOn', '') not in ('all', 'home') then problems := problems || 'showOn:empty'::text; end if;
    if coalesce(body ->> 'link', '') <> '' then
      problems := problems || public.cms_link_problems('](' || (body ->> 'link') || ')', version_row.market_code, 'link');
    end if;
  end if;
  problems := array_remove(problems, null);
  -- LOCALISE-1: a translation of the shared page may leave fields empty once there is an English
  -- page to fill them from.
  if version_row.market_code is null and version_row.language_code is not null
    and version_row.language_code <> 'en'
    and exists (
      select 1 from public.cms_versions as english
      where english.content_kind = version_row.content_kind and english.entry_key = version_row.entry_key
        and english.market_code is null and english.language_code = 'en' and not english.is_removal
    ) then
    problems := array(select problem from unnest(problems) as listed (problem) where problem not like '%:empty');
  end if;
  return problems;
end;
$$;

/**
 * admin_save_cms_draft: saves the draft of one entry at one place.
 *
 * @param content_kind - the kind
 * @param entry_key - the entry's address
 * @param market_code - the country, or empty for the shared page (LOCALISE-1)
 * @param language_code - the language, or empty for a notice
 * @param new_content - the fields
 * @param new_show_from - the day it should go live, or null
 * @param new_show_until - the day a notice comes down, or null
 * @returns the draft's id
 * Errors: insufficient_privilege for anyone but owner and admin in a staff session;
 * check_violation with a reason word in the hint when the place is wrong.
 * Where it fits: every save in the staff Website editors.
 */
create or replace function public.admin_save_cms_draft(
  content_kind text,
  entry_key text,
  market_code text,
  language_code text,
  new_content jsonb,
  new_show_from date default null,
  new_show_until date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  place_problem text;
  draft_id uuid;
begin
  perform public.require_website_staff();
  -- Step 1: the entry's place must make sense. An empty country means every country (the shared
  -- page); an empty language means none (a notice).
  market_code := nullif(btrim(market_code), '');
  language_code := nullif(btrim(language_code), '');
  place_problem := public.cms_entry_problem(content_kind, entry_key, market_code, language_code);
  if place_problem is not null then
    raise exception 'This draft can''t be saved there.' using errcode = 'check_violation', hint = place_problem;
  end if;
  -- Step 2: update the entry's draft, or start one.
  update public.cms_versions as versions
  set content = coalesce(new_content, '{}'::jsonb), show_from = new_show_from,
    show_until = new_show_until, user_id = (select auth.uid())
  where versions.status = 'draft' and versions.content_kind = admin_save_cms_draft.content_kind
    and versions.entry_key = admin_save_cms_draft.entry_key
    and versions.market_code is not distinct from admin_save_cms_draft.market_code
    and versions.language_code is not distinct from admin_save_cms_draft.language_code
  returning versions.id into draft_id;
  if draft_id is null then
    insert into public.cms_versions (content_kind, entry_key, market_code, language_code, content, show_from, show_until, user_id)
    values (content_kind, entry_key, market_code, language_code, coalesce(new_content, '{}'::jsonb),
      new_show_from, new_show_until, (select auth.uid()))
    returning id into draft_id;
  end if;
  return draft_id;
end;
$$;

/**
 * cms_live_content_of: the content an entry shows today at one place.
 *
 * @param version_row - a version naming the kind, entry, country (or none) and language
 * @returns the live content there, or null when nothing is live
 * Where it fits: the audit log's "before" on publish and remove.
 */
create or replace function public.cms_live_content_of(version_row public.cms_versions)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select live.content
  from public.cms_live_versions(version_row.content_kind) as live
  where live.entry_key = version_row.entry_key
    and live.market_code is not distinct from version_row.market_code
    and live.language_code is not distinct from version_row.language_code;
$$;

/**
 * admin_remove_cms_entry: takes a notice, help page or question down from today.
 *
 * @param content_kind - the kind (never the home page)
 * @param entry_key - the entry's address
 * @param market_code - the country, or empty for the shared page (LOCALISE-1)
 * @param language_code - the language, or empty for a notice
 * Errors: insufficient_privilege; check_violation (home_page_stays); no_data_found when nothing is
 * live there.
 * Where it fits: "Remove" in the staff Website editors; earlier versions stay for Restore.
 */
create or replace function public.admin_remove_cms_entry(
  content_kind text,
  entry_key text,
  market_code text,
  language_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  removal public.cms_versions;
  live_content jsonb;
begin
  perform public.require_website_staff();
  market_code := nullif(btrim(market_code), '');
  language_code := nullif(btrim(language_code), '');
  -- Step 1: the home page always has a version; it is replaced, never removed.
  if content_kind = 'home_page' then
    raise exception 'The home page can be replaced, not removed.' using errcode = 'check_violation', hint = 'home_page_stays';
  end if;
  removal := row(null, content_kind, entry_key, market_code, language_code, '{}'::jsonb, 'published', true,
    public.romania_today(), null, (select auth.uid()), now(), now(), now())::public.cms_versions;
  live_content := public.cms_live_content_of(removal);
  if live_content is null then
    raise exception 'Nothing is live there.' using errcode = 'no_data_found';
  end if;
  -- Step 2: a published removal from today hides the entry; earlier versions stay for Restore.
  insert into public.cms_versions (content_kind, entry_key, market_code, language_code, status, is_removal, show_from, user_id, published_at)
  values (content_kind, entry_key, market_code, language_code, 'published', true, public.romania_today(), (select auth.uid()), now())
  returning * into removal;
  perform public.log_staff_action('website.removed', 'cms_versions', removal.id::text, null, null,
    jsonb_build_object('content', live_content),
    jsonb_build_object('kind', content_kind, 'entry', entry_key, 'market', market_code, 'language', language_code));
end;
$$;

/**
 * contest_rules_are_published: whether a contest's rules page can be read in every country of the
 * contest.
 *
 * @param target - the contest
 * @returns true when, for each of its countries, the rules help page is live in English (as the
 *   shared page or that country's wording), or in every language of that country
 * Where it fits: opening a contest (S1-E11-15). English fills any language that has no page
 * (LOCALISE-1), so English alone is enough; without English every language of the country must
 * have the page.
 */
create or replace function public.contest_rules_are_published(target public.contests)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target.rules_page_key is not null
    and cardinality(target.market_codes) > 0
    and not exists (
      select 1
      from unnest(target.market_codes) as wanted (market_code)
      where not exists (
        -- English, shared or the country's own.
        select 1 from public.cms_live_versions('help_page') as live
        where live.entry_key = target.rules_page_key
          and (live.market_code is null or live.market_code = wanted.market_code)
          and live.language_code = 'en'
      )
      and exists (
        -- Or no gap among the country's own languages.
        select 1
        from public.markets
        cross join unnest(markets.languages) as spoken (language_code)
        where markets.country_code = wanted.market_code
          and not exists (
            select 1 from public.cms_live_versions('help_page') as live
            where live.entry_key = target.rules_page_key
              and (live.market_code is null or live.market_code = wanted.market_code)
              and live.language_code = spoken.language_code
          )
      )
    );
$$;

comment on function public.contest_rules_are_published(public.contests) is
  'Internal: true when the contest rules help page is live for every market of the contest, in English or in each of the market''s languages (S1-E11-15; LOCALISE-1).';

/**
 * sitemap_entries: every address search engines may list.
 *
 * @returns each path with the day it last changed (null when unknown), at most 50,000
 * Where it fits: server/sitemap.ts builds /sitemap.xml from it. Website pages are listed at their
 * own addresses, /<country>/<language>/..., once for each language of each open market
 * (LOCALISE-1); Discover and the stories have one address each.
 */
create or replace function public.sitemap_entries()
returns table (path text, changed_on date)
language sql
stable
security definer
set search_path = ''
as $$
  with places as (
    -- Each open market in each of its languages: "/ro/ro", "/ro/en".
    select markets.country_code, spoken.language_code,
      '/' || lower(markets.country_code) || '/' || spoken.language_code as prefix
    from public.markets
    cross join unnest(markets.languages) as spoken (language_code)
    where markets.is_open
  )
  (
    -- Step 1: the home page and the help centre at each place, and Discover. The home page and
    -- Discover change every day.
    select places.prefix, public.romania_today() from places
    union all
    select '/discover', public.romania_today()
    union all
    select places.prefix || '/help', null::date from places
    union all
    -- Step 2: each help page a visitor there can read (in that language or in English), unless
    -- staff hid it (S1-E11-37).
    select places.prefix || '/help/' || live.entry_key, max(live.show_from)
    from places
    join public.cms_live_versions('help_page') as live
      on (live.market_code is null or live.market_code = places.country_code)
      and live.language_code in (places.language_code, 'en')
    where (live.content -> 'search' -> 'hidden') is distinct from 'true'::jsonb
    group by places.prefix, live.entry_key
    union all
    -- Step 3: each landing page with a live version, unless staff hid it (S1-E11-38).
    select places.prefix || '/c/' || pages.slug, live.show_from
    from places
    cross join public.landing_pages as pages
    cross join lateral public.landing_page_live_version(pages.id) as live
    where pages.archived_at is null and live.id is not null
      and (live.content -> 'search' -> 'hidden') is distinct from 'true'::jsonb
    union all
    -- Step 4: public stories: published once, public, for everyone (not a class's), readable on
    -- the web, not deleted and not hidden by a moderator. Every rating alike (S1-E11-36).
    select '/s/' || stories.slug, coalesce(stories.last_chapter_published_at, stories.first_published_at)::date
    from public.stories
    where stories.first_published_at is not null and stories.deleted_at is null
      and stories.visibility = 'public' and not stories.class_only
      and not public.story_app_only_applies(stories.is_app_only)
      and not public.is_moderated_away('story', stories.id)
  )
  limit 50000;
$$;
