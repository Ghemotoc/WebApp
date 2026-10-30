/*
 * Migration: the website CMS store (stories S1-E11-06, S1-E11-10 and S1-E11-12; architecture
 * 1.8.6, B31).
 *
 * What it adds:
 *   cms_versions              every version of every piece of website content: the home page
 *                             (per market and language), notice banners (per market, every
 *                             language in one row), help pages and questions (per market and
 *                             language). One table, so the four kinds share one way of working.
 *   cms_live_versions()       internal: the version of each entry that is live today
 *   website_content()         the public read, for anyone, signed in or not, with the fallbacks
 *   cms_content_problems()    what stops a version from being published (empty, too long ...)
 *   admin_save_cms_draft(), admin_publish_cms_version(), admin_restore_cms_version(),
 *   admin_remove_cms_entry()  the editors' writes; owner and admin only (area website_cms),
 *                             each logged in the audit log in the same transaction
 *
 * How "live" works: a version is live when it is published, its "show from" date is today or
 * earlier in Romanian time, and no later published version of the same entry has started. So a
 * version scheduled for a future date goes live at 00:00 Romanian time on that date with no job
 * to run, and the current version stays up until then (S1-E11-06 criterion 6). A removal is a
 * published version that says "this entry is gone".
 *
 * The store contract: the app reads and writes only through these functions and the staff read
 * of cms_versions, wrapped in src/features/website/api/websiteContentStore.ts. When the website's
 * own database exists (set-up OPEN), a second store writes there and the editors don't change
 * (decided 17 Oct 2026, 19:16).
 *
 * Who may edit: only the admin role and the owner (decided 17 Oct 2026, 19:19). The server
 * refuses everyone else, a content editor included.
 */

/* ---------- The store ---------- */

create table public.cms_versions (
  id uuid primary key default gen_random_uuid(),
  -- What this is: home_page, notice, help_page or question.
  content_kind text not null,
  -- Which entry of that kind: 'home' for the home page, a help page's address, a question's or a
  -- notice's key. One entry has many versions.
  entry_key text not null,
  market_code text not null references public.markets (country_code) on delete cascade,
  -- The language of this version, as a BCP 47 code. Null for a notice: one notice holds the text
  -- in every language of its market, because it can't go live with one missing (S1-E11-10).
  language_code text references public.languages (code) on delete cascade,
  -- The fields, shaped by content_kind (src/schemas/websiteContent.ts describes each shape).
  content jsonb not null default '{}'::jsonb,
  -- draft: being edited, never shown; published: live from show_from (scheduled until then).
  status text not null default 'draft',
  -- True for a published version that takes the entry down (a question removed, a notice ended).
  is_removal boolean not null default false,
  -- The day it goes live, at 00:00 Romanian time. Null on a draft until one is chosen.
  show_from date,
  -- Notices only: the day it comes down, at 00:00 Romanian time (S1-E11-10).
  show_until date,
  -- The admin who saved it. Null only on version 1, which this migration seeds.
  user_id uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_versions_kind_is_known
    check (content_kind in ('home_page', 'notice', 'help_page', 'question')),
  constraint cms_versions_status_is_known check (status in ('draft', 'published')),
  constraint cms_versions_key_is_an_address check (entry_key ~ '^[a-z0-9][a-z0-9-]{0,59}$'),
  constraint cms_versions_notice_has_no_language
    check ((content_kind = 'notice') = (language_code is null)),
  constraint cms_versions_published_has_a_date
    check (status = 'draft' or (show_from is not null and published_at is not null)),
  constraint cms_versions_until_after_from
    check (show_until is null or show_from is null or show_until > show_from)
);

comment on table public.cms_versions is
  'kind: platform
Every version of the website''s pages, notices, help pages and questions, per market and language (S1-E11-06, 10, 12). Staff-written site copy, not user content; user_id is the admin who saved it.';

-- One draft per entry, market and language: saving again updates it (S1-E11-06).
create unique index cms_versions_one_draft
  on public.cms_versions (content_kind, entry_key, market_code, coalesce(language_code, ''))
  where status = 'draft';

-- The live lookup reads the published versions of one kind, newest first.
create index cms_versions_published_lookup
  on public.cms_versions (content_kind, market_code, entry_key, show_from desc, published_at desc)
  where status = 'published';

create trigger cms_versions_set_updated_at
  before update on public.cms_versions
  for each row execute function public.set_updated_at();

alter table public.cms_versions enable row level security;

/**
 * Policy cms_versions_select_staff: owner and admin, in a staff session, read every version.
 * Why: the editors show drafts, scheduled versions and earlier versions (S1-E11-06). Everyone
 * else reads only what is live, through website_content(), never this table.
 */
create policy cms_versions_select_staff
  on public.cms_versions for select to authenticated
  using ((select public.staff_may('website_cms', 'view')));

comment on policy cms_versions_select_staff on public.cms_versions is
  'Allows owner and admin, in a staff session, to read every website content version (S1-E11-06).';

grant select on public.cms_versions to authenticated;  -- cms_versions_select_staff

/* ---------- Today, and what is live ---------- */

/**
 * romania_today: today's date in Romania, where "show from" dates start (architecture 1.8.6).
 * Returns: the date. Where it fits: every live and publish check below.
 */
create or replace function public.romania_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Bucharest')::date;
$$;

comment on function public.romania_today() is 'Today''s date in Romanian time (S1-E11-06).';

/**
 * cms_live_versions: the live version of every entry of one kind. Internal.
 * Inputs: wanted_kind, for example 'question'.
 * Returns: one row per entry, market and language that is live today (removals left out).
 * Where it fits: website_content() and the tests.
 */
create or replace function public.cms_live_versions(wanted_kind text)
returns setof public.cms_versions
language sql
stable
security definer
set search_path = ''
as $$
  -- Step 1: for each entry, the published version that started most recently.
  with latest as (
    select distinct on (versions.entry_key, versions.market_code, versions.language_code) versions.*
    from public.cms_versions as versions
    where versions.content_kind = wanted_kind
      and versions.status = 'published'
      and versions.show_from <= public.romania_today()
    order by versions.entry_key, versions.market_code, versions.language_code,
      versions.show_from desc, versions.published_at desc
  )
  -- Step 2: an entry that was taken down, or whose notice has ended, shows nothing.
  select latest.*
  from latest
  where not latest.is_removal
    and (latest.show_until is null or latest.show_until > public.romania_today());
$$;

comment on function public.cms_live_versions(text) is 'Internal: the live version of each website entry of one kind (S1-E11-06).';
revoke execute on function public.cms_live_versions(text) from public, anon, authenticated;

/* ---------- The public read ---------- */

/**
 * website_content: what a visitor sees of one kind of website content (S1-E11-06 criterion 10,
 * S1-E11-10 criterion 3, S1-E11-12 criterion 4).
 * Inputs: wanted_kind; visitor_country, the country from the connection (S1-E2-10) or null;
 *   wanted_language, the interface language or null.
 * Returns: the live rows for the chosen market and language, each with the market and language
 *   that were chosen.
 * The fallbacks (decided 17 Oct 2026, 19:16):
 *   1. a country with no content of its own (or an unknown country) gets the Romanian market's
 *      English content;
 *   2. in a market with content, the wanted language when it has content, otherwise the market's
 *      first language with content (proposal in S1-E11-06).
 * Never returns a draft or a scheduled version. Where it fits: the home page, the notice strip
 * and Help, through the WebsiteContentStore.
 */
create or replace function public.website_content(
  wanted_kind text,
  visitor_country text default null,
  wanted_language text default null
)
returns table (
  entry_key text,
  market_code text,
  language_code text,
  content jsonb,
  show_from date,
  show_until date
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  chosen_market text;
  market_languages text[];
  chosen_language text;
begin
  -- Step 1: the visitor's own market, when it has live content of this kind.
  select markets.country_code, markets.languages into chosen_market, market_languages
  from public.markets
  where markets.country_code = upper(coalesce(visitor_country, ''))
    and exists (
      select 1 from public.cms_live_versions(wanted_kind) as live
      where live.market_code = markets.country_code
    );
  -- Step 2: otherwise Romania in English (decided 17 Oct 2026, 19:16).
  if chosen_market is null then
    chosen_market := 'RO';
    chosen_language := 'en';
  elsif wanted_kind = 'notice' then
    -- A notice holds every language of its market, so the wanted one is there when the market has it.
    chosen_language := case when wanted_language = any (market_languages) then wanted_language else market_languages[1] end;
  else
    -- Step 3: the wanted language when it has content here, else the market's first that has.
    select candidate.code into chosen_language
    from unnest(market_languages) with ordinality as candidate (code, position)
    where exists (
      select 1 from public.cms_live_versions(wanted_kind) as live
      where live.market_code = chosen_market and live.language_code = candidate.code
    )
    order by (candidate.code = wanted_language) desc, candidate.position
    limit 1;
  end if;
  -- Step 4: the live rows for that market and language (notices for the whole market).
  return query
  select live.entry_key, live.market_code, coalesce(live.language_code, chosen_language),
    live.content, live.show_from, live.show_until
  from public.cms_live_versions(wanted_kind) as live
  where live.market_code = chosen_market
    and (live.language_code is null or live.language_code = chosen_language)
  order by live.entry_key;
end;
$$;

comment on function public.website_content(text, text, text) is
  'The live website content of one kind for a visitor''s country and language, with the fallbacks (S1-E11-06).';
revoke execute on function public.website_content(text, text, text) from public;
grant execute on function public.website_content(text, text, text) to anon, authenticated;

/* ---------- What stops a publish ---------- */

/**
 * cms_text_problem: checks one text field. Internal.
 * Inputs: field_value, the text (or null); field_name, as the editor names it; longest, the limit.
 * Returns: 'field:empty', 'field:too_long' or null when it is fine.
 */
create or replace function public.cms_text_problem(field_value text, field_name text, longest integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when field_value is null or btrim(field_value) = '' then field_name || ':empty'
    when char_length(field_value) > longest then field_name || ':too_long'
  end;
$$;

comment on function public.cms_text_problem(text, text, integer) is 'Internal: empty or too long, for one CMS field (S1-E11-06).';
revoke execute on function public.cms_text_problem(text, text, integer) from public, anon, authenticated;

/**
 * cms_home_page_problems: the home page's field checks (S1-E11-06 criterion 5, with the
 * proposed limits). Internal.
 * Inputs: page, the content. Returns: the problems, 'field:problem', in the editor's order.
 */
create or replace function public.cms_home_page_problems(page jsonb)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  problems text[] := array[]::text[];
  headline text := coalesce(page ->> 'headlineFirst', '') || ' ' || coalesce(page ->> 'headlineSecond', '');
  position integer;
begin
  -- Step 1: the hero (limits proposed in S1-E11-06: 50, 40 across both lines, 170, 20, 30).
  problems := problems || public.cms_text_problem(page ->> 'eyebrow', 'eyebrow', 50)
    || public.cms_text_problem(page ->> 'headlineFirst', 'headlineFirst', 40)
    || public.cms_text_problem(page ->> 'headlineSecond', 'headlineSecond', 40);
  if char_length(btrim(headline)) > 40 then problems := problems || 'headlineSecond:too_long'::text; end if;
  if position(coalesce(page ->> 'underlinedWord', '') in headline) = 0 or coalesce(page ->> 'underlinedWord', '') = '' then
    problems := problems || 'underlinedWord:not_in_headline'::text;
  end if;
  problems := problems || public.cms_text_problem(page ->> 'lede', 'lede', 170)
    || public.cms_text_problem(page ->> 'primaryButton', 'primaryButton', 20)
    || public.cms_text_problem(page ->> 'secondaryButton', 'secondaryButton', 20);
  -- Step 2: the three short points.
  for position in 0..2 loop
    problems := problems || public.cms_text_problem(page -> 'points' ->> position, 'points.' || position, 30);
  end loop;
  -- Step 3: why write here, four cards.
  problems := problems || public.cms_text_problem(page ->> 'whyHeading', 'whyHeading', 60);
  for position in 0..3 loop
    problems := problems
      || public.cms_text_problem(page -> 'whyCards' -> position ->> 'title', 'whyCards.' || position || '.title', 60)
      || public.cms_text_problem(page -> 'whyCards' -> position ->> 'body', 'whyCards.' || position || '.body', 260);
  end loop;
  -- Step 4: the safety block and the questions heading.
  problems := problems || public.cms_text_problem(page ->> 'safetyHeading', 'safetyHeading', 60);
  for position in 0..1 loop
    problems := problems || public.cms_text_problem(page -> 'safetyLines' ->> position, 'safetyLines.' || position, 200);
  end loop;
  problems := problems || public.cms_text_problem(page ->> 'questionsHeading', 'questionsHeading', 60);
  return array_remove(problems, null);
end;
$$;

comment on function public.cms_home_page_problems(jsonb) is 'Internal: the home page''s field checks (S1-E11-06).';
revoke execute on function public.cms_home_page_problems(jsonb) from public, anon, authenticated;

/**
 * cms_link_problems: the links inside a help page or an answer (S1-E11-12 criterion 7). Internal.
 * Inputs: markdown, the text; market, the entry's market; field_name, for the problem.
 * Returns: 'field:broken_link:<address>' for each link to one of our own pages that doesn't
 *   exist: a help page address that isn't live or drafted in that market, or a path the app
 *   doesn't have. Links to other sites are checked by the reader's sanitiser, not here.
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
    -- A help page must exist in the same market, live or drafted.
    when links.address ~ '^/help/[a-z0-9-]+$' then not exists (
      select 1 from public.cms_versions as versions
      where versions.content_kind = 'help_page'
        and versions.market_code = market
        and versions.entry_key = substring(links.address from '^/help/([a-z0-9-]+)$')
    )
    -- Otherwise the path must start with one of the app's public addresses.
    else links.address !~ '^/(help|legal(/[a-z-]+)?|discover|sign-up|sign-in|contact|report|write|settings|moderator-mail|my-reports|s/[a-z0-9-]+|u/[A-Za-z0-9._-]+)?/?(#[a-z0-9-]+)?$'
  end;
$$;

comment on function public.cms_link_problems(text, text, text) is 'Internal: links to our own pages that don''t exist (S1-E11-12).';
revoke execute on function public.cms_link_problems(text, text, text) from public, anon, authenticated;

/**
 * cms_content_problems: what stops one version from being published (S1-E11-06 criterion 5,
 * S1-E11-10 criterion 2, S1-E11-12 criteria 5 and 7).
 * Inputs: version_row, the version.
 * Returns: the problems as 'field:problem' (empty when it can be published).
 * Errors: none. Where it fits: admin_publish_cms_version() refuses when this isn't empty; the
 *   editor shows the same list.
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
  market_languages text[];
  language text;
begin
  if version_row.content_kind = 'home_page' then
    return public.cms_home_page_problems(body);
  elsif version_row.content_kind = 'question' then
    -- A question: the question, the answer (safe Markdown) and where it shows.
    problems := problems || public.cms_text_problem(body ->> 'question', 'question', 160)
      || public.cms_text_problem(body ->> 'answer', 'answer', 1500)
      || public.cms_link_problems(body ->> 'answer', version_row.market_code, 'answer');
    if coalesce(body ->> 'showOn', '') not in ('home', 'help', 'both') then problems := problems || 'showOn:empty'::text; end if;
  elsif version_row.content_kind = 'help_page' then
    -- A help page: its title, section and body (safe Markdown).
    problems := problems || public.cms_text_problem(body ->> 'title', 'title', 80)
      || public.cms_text_problem(body ->> 'section', 'section', 40)
      || public.cms_text_problem(body ->> 'body', 'body', 20000)
      || public.cms_link_problems(body ->> 'body', version_row.market_code, 'body');
  else
    -- A notice: the text in every language of its market (S1-E11-10 criterion 2), a type and
    -- where it shows. Its link is one of our own pages, so a sponsor can't ride in on it.
    select markets.languages into market_languages from public.markets where markets.country_code = version_row.market_code;
    foreach language in array coalesce(market_languages, array[]::text[]) loop
      problems := problems || public.cms_text_problem(body -> 'texts' ->> language, 'texts.' || language, 120);
    end loop;
    if coalesce(body ->> 'noticeType', '') not in ('news', 'contest', 'important') then problems := problems || 'noticeType:empty'::text; end if;
    if coalesce(body ->> 'showOn', '') not in ('all', 'home') then problems := problems || 'showOn:empty'::text; end if;
    if coalesce(body ->> 'link', '') <> '' then
      problems := problems || public.cms_link_problems('](' || (body ->> 'link') || ')', version_row.market_code, 'link');
    end if;
  end if;
  return array_remove(problems, null);
end;
$$;

comment on function public.cms_content_problems(public.cms_versions) is
  'What stops a website content version from being published: field:problem pairs (S1-E11-06).';
revoke execute on function public.cms_content_problems(public.cms_versions) from public, anon;
grant execute on function public.cms_content_problems(public.cms_versions) to authenticated;

/* ---------- The editors' writes ---------- */

/**
 * require_website_staff: refuses anyone who may not edit the website. Internal.
 * Errors: insufficient_privilege unless the caller is owner or admin in a staff session
 *   (decided 17 Oct 2026, 19:19: admin-only, a content editor included in the refusal).
 */
create or replace function public.require_website_staff()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_may('website_cms', 'act') then
    raise exception 'Only the owner and admins can edit the website.' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

comment on function public.require_website_staff() is 'Internal: refuses anyone who may not edit the website (S1-E11-06).';
revoke execute on function public.require_website_staff() from public, anon, authenticated;

/**
 * cms_entry_problem: checks where a draft would go. Internal.
 * Inputs: the kind, key, market and language. Returns: a reason word or null.
 */
create or replace function public.cms_entry_problem(
  wanted_kind text, wanted_key text, wanted_market text, wanted_language text
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
    when not exists (select 1 from public.markets where country_code = wanted_market) then 'unknown_market'
    when wanted_kind = 'notice' and wanted_language is not null then 'unknown_language'
    when wanted_kind <> 'notice' and not exists (
      select 1 from public.markets
      where country_code = wanted_market and wanted_language = any (languages)
    ) then 'unknown_language'
  end;
$$;

comment on function public.cms_entry_problem(text, text, text, text) is 'Internal: a reason word when a draft''s place is wrong (S1-E11-06).';
revoke execute on function public.cms_entry_problem(text, text, text, text) from public, anon, authenticated;

/**
 * admin_save_cms_draft: saves the editor's work as the entry's draft (S1-E11-06 "Save draft").
 * Inputs: content_kind, entry_key, market_code, language_code (null or empty for a notice), new_content,
 *   new_show_from and new_show_until (notices; both optional).
 * Returns: the draft's id. Saving again updates the same draft. Nothing on the website changes.
 * Errors: insufficient_privilege; check_violation with the hint unknown_kind, bad_address,
 *   unknown_market or unknown_language. Where it fits: every CMS editor's Save draft.
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
  -- Step 1: the entry's place must make sense. An empty language means none (a notice).
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
    and versions.market_code = admin_save_cms_draft.market_code
    and coalesce(versions.language_code, '') = coalesce(admin_save_cms_draft.language_code, '')
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

comment on function public.admin_save_cms_draft(text, text, text, text, jsonb, date, date) is
  'Saves a website content draft; owner and admin only (S1-E11-06).';
revoke execute on function public.admin_save_cms_draft(text, text, text, text, jsonb, date, date) from public, anon;
grant execute on function public.admin_save_cms_draft(text, text, text, text, jsonb, date, date) to authenticated;

/**
 * cms_live_content_of: what an entry shows today, for the audit log's "before". Internal.
 * Inputs: a version. Returns: the live version's content, or null when nothing is live.
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
    and live.market_code = version_row.market_code
    and coalesce(live.language_code, '') = coalesce(version_row.language_code, '');
$$;

comment on function public.cms_live_content_of(public.cms_versions) is 'Internal: the content an entry shows today (S1-E11-06).';
revoke execute on function public.cms_live_content_of(public.cms_versions) from public, anon, authenticated;

/**
 * admin_publish_cms_version: publishes a draft (S1-E11-06 criteria 5, 6 and 8).
 * Inputs: version_id, the draft.
 * Returns: the day it goes live. A "show from" date in the past or missing becomes today, so it
 *   goes live at once; a future date schedules it and the current version stays up until then.
 * Errors: insufficient_privilege; no_data_found when there is no such draft; check_violation
 *   with the hint listing the fields to fix ("lede:too_long,points.1:empty",
 *   "showUntil:before_show_from").
 * Logged as website.published with the page, market and language, the go-live date and the
 * before and after copy. Where it fits: every CMS editor's Publish.
 */
create or replace function public.admin_publish_cms_version(version_id uuid)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  draft public.cms_versions;
  problems text[];
  goes_live date;
begin
  perform public.require_website_staff();
  -- Step 1: the draft, locked so it is published once.
  select * into draft from public.cms_versions where id = version_id and status = 'draft' for update;
  if draft.id is null then
    raise exception 'There is no draft with that id.' using errcode = 'no_data_found';
  end if;
  -- Step 2: refuse while a field is empty, too long or links nowhere, or while a notice would come
  -- down before it goes up (a "show until" date on or before the day it goes live).
  goes_live := greatest(coalesce(draft.show_from, public.romania_today()), public.romania_today());
  problems := public.cms_content_problems(draft);
  if draft.show_until is not null and draft.show_until <= goes_live then
    problems := problems || 'showUntil:before_show_from'::text;
  end if;
  if cardinality(problems) > 0 then
    raise exception 'Fix these fields before publishing.' using errcode = 'check_violation', hint = array_to_string(problems, ',');
  end if;
  -- Step 3: publish, logging what showed before and what will show.
  perform public.log_staff_action('website.published', 'cms_versions', draft.id::text, null, null,
    jsonb_build_object('content', public.cms_live_content_of(draft)),
    jsonb_build_object('kind', draft.content_kind, 'entry', draft.entry_key, 'market', draft.market_code,
      'language', draft.language_code, 'show_from', goes_live, 'show_until', draft.show_until, 'content', draft.content));
  update public.cms_versions
  set status = 'published', show_from = goes_live, published_at = now(), user_id = (select auth.uid())
  where id = draft.id;
  return goes_live;
end;
$$;

comment on function public.admin_publish_cms_version(uuid) is
  'Publishes a website content draft from its show-from date; owner and admin only; logged (S1-E11-06).';
revoke execute on function public.admin_publish_cms_version(uuid) from public, anon;
grant execute on function public.admin_publish_cms_version(uuid) to authenticated;

/**
 * admin_restore_cms_version: brings an earlier version back as the entry's draft (S1-E11-06
 * criterion 7). Nothing on the website changes until it is published again.
 * Inputs: version_id, a published version. Returns: the draft's id.
 * Errors: insufficient_privilege; no_data_found. Logged as website.restored.
 */
create or replace function public.admin_restore_cms_version(version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  earlier public.cms_versions;
  draft_id uuid;
begin
  perform public.require_website_staff();
  -- Step 1: the earlier version (a removal has no copy to restore).
  select * into earlier from public.cms_versions where id = version_id and status = 'published' and not is_removal;
  if earlier.id is null then
    raise exception 'There is no earlier version with that id.' using errcode = 'no_data_found';
  end if;
  -- Step 2: its copy becomes the draft, with no date chosen yet.
  draft_id := public.admin_save_cms_draft(earlier.content_kind, earlier.entry_key, earlier.market_code,
    earlier.language_code, earlier.content, null, earlier.show_until);
  perform public.log_staff_action('website.restored', 'cms_versions', draft_id::text, null, null,
    jsonb_build_object('restored_from', earlier.id, 'published_at', earlier.published_at),
    jsonb_build_object('kind', earlier.content_kind, 'entry', earlier.entry_key, 'market', earlier.market_code,
      'language', earlier.language_code, 'content', earlier.content));
  return draft_id;
end;
$$;

comment on function public.admin_restore_cms_version(uuid) is
  'Restores an earlier website content version as a draft; owner and admin only; logged (S1-E11-06).';
revoke execute on function public.admin_restore_cms_version(uuid) from public, anon;
grant execute on function public.admin_restore_cms_version(uuid) to authenticated;

/**
 * admin_remove_cms_entry: takes an entry down from today (a question removed, a notice ended
 * early, a help page withdrawn). The home page can't be removed, only replaced.
 * Inputs: content_kind, entry_key, market_code, language_code (null or empty for a notice).
 * Returns: nothing. Errors: insufficient_privilege; check_violation (hint home_page_stays or a
 *   place problem); no_data_found when nothing is live. Logged as website.removed.
 */
create or replace function public.admin_remove_cms_entry(
  content_kind text, entry_key text, market_code text, language_code text
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

comment on function public.admin_remove_cms_entry(text, text, text, text) is
  'Takes a notice, help page or question down from today; owner and admin only; logged (S1-E11-06).';
revoke execute on function public.admin_remove_cms_entry(text, text, text, text) from public, anon;
grant execute on function public.admin_remove_cms_entry(text, text, text, text) to authenticated;
