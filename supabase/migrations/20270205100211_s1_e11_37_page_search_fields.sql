/**
 * S1-E11-37 (bundle SEO-1b): search and share fields for the website's home page and help pages.
 *
 * Robert, 11 Nov 2026: bring the main company website's search features into the admin site (a
 * page title and description for search results and share cards). Each home page and help page
 * version may now carry an optional `search` object: { title, description, hidden }. Empty fields
 * fall back to the page's own words (the headline and introduction, or the help page's title and
 * first lines), so nothing has to be filled in; `hidden` asks search engines not to list the page.
 * What changes: cms_search_problems() checks the two lengths, and cms_content_problems() adds its
 * answer for home pages and help pages, so the editor's counters and the server agree
 * (src/schemas/websiteContent.ts, pageSearchLimits). Who reads the fields: server/website-head.ts,
 * which writes the head tags for "/" and "/help/<address>" before the app loads.
 */

/**
 * cms_search_problems: what stops a page's search fields from being published.
 *
 * @param search - the version's `search` object, or null when the page has none
 * @returns field:problem pairs ("search.title:too_long"); an empty array when all is well
 * Where it fits: cms_content_problems() for home pages and help pages. Both texts may be empty;
 * only their length (70 and 200 characters) and the switch's type are checked.
 */
create or replace function public.cms_search_problems(search jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case
    -- Anything but an object (a text, a list) is refused as a whole.
    when search is not null and jsonb_typeof(search) <> 'object' then array['search:invalid']
    else array_remove(array[
      -- The title: Google shows about 60 characters; 70 leaves room for the brand after it.
      case when char_length(coalesce(search ->> 'title', '')) > 70 then 'search.title:too_long' end,
      -- The description: search results show about 160 characters; share cards a little more.
      case when char_length(coalesce(search ->> 'description', '')) > 200 then 'search.description:too_long' end,
      -- The switch is true or false when it is there at all.
      case when search ? 'hidden' and jsonb_typeof(search -> 'hidden') <> 'boolean' then 'search.hidden:invalid' end
    ], null)
  end;
$$;

comment on function public.cms_search_problems(jsonb) is
  'Internal: S1-E11-37: a home or help page''s search fields: title up to 70 characters, description up to 200, hidden true or false.';

-- Only cms_content_problems() calls it.
revoke all on function public.cms_search_problems(jsonb) from public, anon, authenticated;

/**
 * cms_content_problems: what stops a website content version from being published (S1-E11-06,
 * S1-E11-10, S1-E11-12; S1-E11-37 adds the search fields of home pages and help pages).
 *
 * @param version_row - the version being published
 * @returns field:problem pairs; an empty array when it may be published
 * Where it fits: admin_publish_cms_version() and the editor's "fix these" list.
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
    -- A home page: its own fields, then its search fields (S1-E11-37).
    return public.cms_home_page_problems(body) || public.cms_search_problems(body -> 'search');
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
  'What stops a website content version from being published: field:problem pairs (S1-E11-06; search fields S1-E11-37).';
