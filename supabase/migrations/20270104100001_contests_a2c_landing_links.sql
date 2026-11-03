/*
 * Migration: links to landing pages from the CMS (bundle CONTESTS, part a2c; story S1-E11-14
 * criterion 13).
 *
 * A live landing page can be linked from a notice banner (S1-E11-10), a help page or an answer
 * (S1-E11-12). cms_link_problems() now accepts /c/<name> when a landing page with that name
 * exists and isn't archived; any other /c/ address is a broken link, as before. Its link preview
 * for shared links is server/landing-preview.ts (functions/c/[[path]].ts), which needs no
 * database change: it reads the public landing_page().
 * Who calls it: the CMS publish checks (cms_version_problems()). Tests:
 * supabase/tests/database/264-landing-page-links.test.sql.
 */

/**
 * cms_link_problems: the links inside a help page, an answer or a notice (S1-E11-12 criterion 7),
 *   as in S1-E11-06, plus /c/<name> for a landing page that exists and isn't archived
 *   (CONTESTS-13a2c). Internal.
 * Inputs: markdown (the text), market (the version's market) and field_name (for the problem).
 * Returns: 'field:broken_link:<address>' for each link to one of our own pages that doesn't
 *   exist; an empty array when every link is fine.
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
