/**
 * S1-E11-38 (bundle SEO-1c): the sitemap's list of public addresses and the search engines'
 * verification codes.
 *
 * Robert, 11 Nov 2026: bring the main company website's search features into the admin site.
 * sitemap_entries() lists every address a search engine may list, and nothing else: the home page,
 * Discover, the help centre and its live help pages, live landing pages and public stories. Left
 * out on purpose: drafts, archived landing pages, pages staff hid from search engines (S1-E11-37),
 * and every story that is unlisted, private, class-only, app-only, deleted, unpublished or hidden
 * by a moderator. Who calls it: server/sitemap.ts (/sitemap.xml) with the public anon key.
 * The two verification settings hold the codes Google Search Console and Bing Webmaster Tools ask
 * a site to show as a meta tag; staff fill them in Staff › Settings, and server/website-head.ts
 * writes them on the home page (meta tags only, never a script: CLAUDE.md rule 7).
 */

/**
 * sitemap_entries: the addresses search engines may list, with the day each last changed.
 *
 * @returns one row per address: its path ("/s/statia-meteo") and the day it last changed, or null
 *   when that isn't known; at most 50,000 rows, the most a sitemap file may hold
 * Where it fits: server/sitemap.ts turns the rows into /sitemap.xml.
 */
create or replace function public.sitemap_entries()
returns table (path text, changed_on date)
language sql
stable
security definer
set search_path = ''
as $$
  (
    -- Step 1: the site's own public screens. The home page and Discover change every day.
    select '/'::text, public.romania_today()
    union all
    select '/discover', public.romania_today()
    union all
    select '/help', null::date
    union all
    -- Step 2: each help page with at least one live version staff didn't hide (S1-E11-37).
    select '/help/' || live.entry_key, max(live.show_from)
    from public.cms_live_versions('help_page') as live
    where (live.content -> 'search' -> 'hidden') is distinct from 'true'::jsonb
    group by live.entry_key
    union all
    -- Step 3: each landing page with a live version, unless staff hid it (S1-E11-38).
    select '/c/' || pages.slug, live.show_from
    from public.landing_pages as pages
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

comment on function public.sitemap_entries() is
  'S1-E11-38: every address search engines may list, with the day it last changed, for /sitemap.xml.';

-- The sitemap is public: anyone may read it, as search engines do.
revoke all on function public.sitemap_entries() from public;
grant execute on function public.sitemap_entries() to anon, authenticated;

-- The verification codes (S1-E11-38): public, because the home page shows them to everyone.
insert into public.settings (key, value, is_public, description)
values
  ('search_verification_google', '""'::jsonb, true,
   'The code Google Search Console gives for the meta tag google-site-verification; empty for none (S1-E11-38).'),
  ('search_verification_bing', '""'::jsonb, true,
   'The code Bing Webmaster Tools gives for the meta tag msvalidate.01; empty for none (S1-E11-38).')
on conflict (key) do nothing;

/**
 * landing_search_problems: what stops a landing page's search fields from being published
 * (S1-E11-38). The same limits as the website pages' (cms_search_problems(), S1-E11-37), in each
 * of the page's two languages.
 *
 * @param search - the version's `search` object ({ hidden, ro: { title, description }, en: … }),
 *   or null when the page has none
 * @returns field:problem pairs ("search.en.title:too_long"); an empty array when all is well
 * Where it fits: landing_page_problems().
 */
create or replace function public.landing_search_problems(search jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case
    -- Anything but an object is refused as a whole.
    when search is not null and jsonb_typeof(search) <> 'object' then array['search:invalid']
    else array_remove(array[
      case when search ? 'hidden' and jsonb_typeof(search -> 'hidden') <> 'boolean' then 'search.hidden:invalid' end,
      case when char_length(coalesce(search -> 'ro' ->> 'title', '')) > 70 then 'search.ro.title:too_long' end,
      case when char_length(coalesce(search -> 'en' ->> 'title', '')) > 70 then 'search.en.title:too_long' end,
      case when char_length(coalesce(search -> 'ro' ->> 'description', '')) > 200 then 'search.ro.description:too_long' end,
      case when char_length(coalesce(search -> 'en' ->> 'description', '')) > 200 then 'search.en.description:too_long' end
    ], null)
  end;
$$;

comment on function public.landing_search_problems(jsonb) is
  'Internal: S1-E11-38: a landing page''s search fields in each language: title up to 70 characters, description up to 200, hidden true or false.';

revoke all on function public.landing_search_problems(jsonb) from public, anon, authenticated;

/**
 * landing_page_problems: what stops a landing page version from being published (S1-E11-14
 * criterion 9). Unchanged but for its last step, which now adds the search fields (S1-E11-38).
 *
 * @param page_type - contest, campaign or information
 * @param content - the version's content
 * @returns field:problem pairs; an empty array when it may be published
 * Where it fits: the landing page publish function and the editor's "fix these" list.
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
  -- Part a2b: one Remind me block at most, and only on a page with key dates to remind about.
  if (select count(*) from jsonb_array_elements(blocks) as each_block where each_block ->> 'kind' = 'remind_me') > 1 then
    problems := problems || 'blocks:one_remind_me'::text;
  elsif blocks @> '[{"kind": "remind_me"}]' and not blocks @> '[{"kind": "key_dates"}]' then
    problems := problems || 'blocks:remind_me_needs_dates'::text;
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
  -- S1-E11-38: the page's search fields, in both languages.
  problems := problems || public.landing_search_problems(content -> 'search');
  return problems;
end;
$$;

comment on function public.landing_page_problems(text, jsonb) is
  'What stops a landing page version from being published (S1-E11-14 criterion 9; search fields S1-E11-38).';
