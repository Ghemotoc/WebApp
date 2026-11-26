/*
 * books_footer_pages_not_house_ads: information pages are never shown as our own ads.
 *
 * Story: BOOKS-FOOTER (About the apps and For partners, built as information pages in the page
 * builder). Who calls it: the migration runner. What it changes: house_ad_candidates(), which
 * page_ads() reads for every ad slot.
 *
 * Why: every live landing page used to count as a house ad, and house ads come before the ad
 * network (S1-E12-01, decided order: a booked sponsor, our own contest or landing page, the
 * network, then the built-in house ads). The footer's information pages are reference pages, not
 * promotions, so once they existed "The apps" took the network's place on every story page.
 * The story names the pages a house ad may promote: "our own contest or landing page"
 * (S1-E12, docs/stories/s1-e12-banners-and-sponsor-slots.md). Contest and campaign pages still
 * are; information pages no longer are.
 */

/**
 * house_ad_candidates: our own ads that can fill a slot, in a fixed order for today and this page.
 * The order is a hash of the ad's key, the page and the Romanian date, so it changes each day and
 * from page to page but never depends on who is looking.
 * Inputs: page_key. Returns: rows of (ad_key, kind, page_slug, title_ro, title_en, ad_rank, 1 for
 *   the first choice): first our live contest and campaign landing pages (kind landing, with the
 *   page's title in both languages), then the three built-in ones (kind write, classics or
 *   forums: their words are in the locale files). Information pages (About the apps, For
 *   partners) are never ads. The built-in ad for the page itself is left out (no "Read the
 *   classics" on the classics page).
 * Errors: none.
 * Internal: page_ads(), through landing_house_ad_for_slot() and the built-in pick.
 */
create or replace function public.house_ad_candidates(page_key text)
returns table (ad_key text, kind text, page_slug text, title_ro text, title_en text, ad_rank bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with landing as (
    -- Our live contest and campaign landing pages, with the hero block's title in each language
    -- (S1-E11-14). Information pages are reference pages, not promotions (BOOKS-FOOTER).
    select 'landing:' || pages.slug as ad_key, 'landing' as kind, pages.slug as page_slug,
      live.content #>> '{blocks,0,ro,title}' as title_ro, live.content #>> '{blocks,0,en,title}' as title_en,
      0 as tier
    from public.landing_pages as pages
    cross join lateral public.landing_page_live_version(pages.id) as live
    where pages.archived_at is null and live.id is not null
      and pages.page_type in ('contest', 'campaign')
  ), built_in as (
    -- The three built-in house ads; their words live in the ads locale files.
    select 'house:' || built.kind, built.kind, null::text, null::text, null::text, 1
    from (values ('write'), ('classics'), ('forums')) as built (kind)
    where built.kind <> house_ad_candidates.page_key
      and not (built.kind = 'forums' and house_ad_candidates.page_key = 'thread')
  )
  select every_ad.ad_key, every_ad.kind, every_ad.page_slug, every_ad.title_ro, every_ad.title_en,
    row_number() over (order by every_ad.tier,
      md5(every_ad.ad_key || house_ad_candidates.page_key || public.romania_today()::text))
  from (select * from landing union all select * from built_in) as every_ad;
$$;
comment on function public.house_ad_candidates(text) is
  'Internal: our own ads for a page (contest and campaign pages, then the built-in ones), ordered by day and page, never by reader (S1-E12-01, BOOKS-FOOTER).';
revoke execute on function public.house_ad_candidates(text) from public, anon, authenticated;
