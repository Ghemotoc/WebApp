-- S1-E11-39 (bundle SEO-1d): the staff "Search and sharing" screen.
--
-- Staff › Website › Search and sharing lists every public page the site writes search and share
-- tags for (the home page in each market and language, each help page and each live landing
-- page) with what a search engine and a share card will show and what is missing. The words are
-- worked out in the app by the same functions the Cloudflare handlers use
-- (src/lib/searchWords.ts), so the screen and the real tags never disagree; this migration only
-- gives staff the live versions to work from.
--
-- 1. admin_search_pages(): the live version of every such page, for staff who may see the
--    website area (Change or View; S1-E11-33 custom roles count). Everyone else is refused.
--    It reads only what the public already sees (the live versions, never a draft), so it writes
--    nothing to the audit log, like the other website reads.

/**
 * admin_search_pages: the live version of every public page with search and share tags
 * (S1-E11-39).
 *
 * Inputs: none.
 * Returns: one row per page: its kind ('home_page', 'help_page' or 'landing_page'), its market
 *   (null for a landing page, which has none), its language (a landing page's tags use its
 *   Romanian words, as server/landing-preview.ts does), its address on the site and the live
 *   content.
 * Errors: insufficient_privilege (42501) for anyone without the website area.
 * Where it fits: called by src/features/website/api/staff/searchPages.ts for the Search and
 *   sharing tab; the public pages themselves keep reading website_content() and landing_page().
 */
create or replace function public.admin_search_pages()
returns table (page_kind text, market_code text, language_code text, address text, content jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- Step 1: only staff who may see the website area (S1-E11-39; decided 17 Oct 2026, 19:19).
  if not public.staff_may('website_cms', 'view') then
    raise exception 'Only staff with the website area can see search and sharing.'
      using errcode = 'insufficient_privilege';
  end if;
  -- Step 2: the home page and the help pages, live in each market and language.
  return query
  select live.content_kind, live.market_code, live.language_code, '/'::text, live.content
  from public.cms_live_versions('home_page') as live
  union all
  select live.content_kind, live.market_code, live.language_code, '/help/' || live.entry_key,
    live.content
  from public.cms_live_versions('help_page') as live
  union all
  -- Step 3: each landing page with a live version that isn't archived (S1-E11-14).
  select 'landing_page'::text, null::text, 'ro'::text, '/c/' || pages.slug, live.content
  from public.landing_pages as pages
  cross join lateral public.landing_page_live_version(pages.id) as live
  where pages.archived_at is null and live.id is not null
  order by 1, 4, 2, 3;
end;
$$;

comment on function public.admin_search_pages() is
  'S1-E11-39: the live version of every public page with search and share tags, for staff with the website area.';

-- Staff call it signed in; visitors never do.
revoke all on function public.admin_search_pages() from public, anon;
grant execute on function public.admin_search_pages() to authenticated;
